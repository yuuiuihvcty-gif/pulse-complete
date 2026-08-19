import type { ReactNode } from "react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { useApp } from "@/lib/app-context";
import {
  acceptCallSession,
  createCallSession,
  finishCallSession,
  getCallSession,
  heartbeatCallSession,
  listActiveCallSessions,
  setCallSessionStatus,
  startDirectConversation,
} from "@/lib/api";
import type { CallSession, CallSessionStatus, Profile } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import {
  createCallSignal,
  PulsePeerConnection,
  sendSignal,
  subscribeToCallChannel,
  subscribeToUserCallChannel,
  type CallSignal,
  type CallSignalKind,
} from "@/lib/calls/peer";
import { ActiveCallSheet } from "@/components/pulse/ActiveCallSheet";
import { IncomingCallDialog } from "@/components/pulse/IncomingCallDialog";

export type ActiveCall = {
  session: CallSession;
  peer: Profile;
  direction: "outgoing" | "incoming";
  phase: "ringing" | "connecting" | "connected";
  localStream: MediaStream | null;
  remoteStream: MediaStream | null;
  muted: boolean;
  cameraEnabled: boolean;
  speakerEnabled: boolean;
  connectedAt: number | null;
  connectionState: RTCPeerConnectionState;
};

type CallContextValue = {
  active: ActiveCall | null;
  incoming: { session: CallSession; caller: Profile } | null;
  startCall: (peer: Profile, type: "voice" | "video", conversationId?: string) => Promise<void>;
  acceptIncoming: () => Promise<void>;
  declineIncoming: () => Promise<void>;
  endCall: () => Promise<void>;
  toggleMute: () => void;
  toggleCamera: () => void;
  toggleSpeaker: () => void;
};

const CallContext = createContext<CallContextValue | null>(null);

export function CallProvider({ children }: { children: ReactNode }) {
  const { user } = useApp();
  const [active, setActive] = useState<ActiveCall | null>(null);
  const [incoming, setIncoming] = useState<{ session: CallSession; caller: Profile } | null>(null);
  const activeRef = useRef<ActiveCall | null>(null);
  const incomingRef = useRef(incoming);
  const userChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const callChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const peerRef = useRef<PulsePeerConnection | null>(null);
  const signalQueueRef = useRef<CallSignal[]>([]);
  const sequenceRef = useRef(0);

  const patchActive = useCallback((patch: Partial<ActiveCall>) => {
    setActive((current) => {
      if (!current) return current;
      const next = { ...current, ...patch };
      activeRef.current = next;
      return next;
    });
  }, []);

  const clearMediaAndChannels = useCallback(() => {
    peerRef.current?.close();
    peerRef.current = null;
    const current = activeRef.current;
    current?.localStream?.getTracks().forEach((track) => track.stop());
    if (callChannelRef.current) void supabase.removeChannel(callChannelRef.current);
    callChannelRef.current = null;
    signalQueueRef.current = [];
    activeRef.current = null;
    setActive(null);
  }, []);

  const sendCallSignal = useCallback(
    async (kind: CallSignalKind, payload?: unknown) => {
      const current = activeRef.current;
      const channel = callChannelRef.current;
      if (!current || !channel) return;
      sequenceRef.current += 1;
      await sendSignal(
        channel,
        createCallSignal(
          current.session.id,
          user.id,
          current.peer.id,
          kind,
          payload,
          sequenceRef.current,
        ),
      );
    },
    [user.id],
  );

  const finishActive = useCallback(
    async (
      status: Extract<CallSessionStatus, "declined" | "cancelled" | "missed" | "failed" | "ended">,
      notifyPeer = true,
    ) => {
      const current = activeRef.current;
      if (!current) return;
      if (notifyPeer) {
        const kind = status === "cancelled" ? "cancel" : "hangup";
        try {
          await sendCallSignal(kind);
        } catch {
          // The database transition below is authoritative when the peer is offline.
        }
      }
      const seconds = current.connectedAt
        ? Math.max(0, Math.round((Date.now() - current.connectedAt) / 1000))
        : 0;
      try {
        await finishCallSession(current.session.id, status, seconds);
      } catch {
        toast.error("Couldn't save the call status");
      }
      clearMediaAndChannels();
    },
    [clearMediaAndChannels, sendCallSignal],
  );

  const handleSignal = useCallback(
    async (signal: CallSignal) => {
      const current = activeRef.current;
      if (!current || signal.callId !== current.session.id) return;
      if (signal.kind === "decline" || signal.kind === "cancel" || signal.kind === "hangup") {
        await finishActive(
          signal.kind === "decline" ? "declined" : signal.kind === "cancel" ? "cancelled" : "ended",
          false,
        );
        return;
      }
      if (signal.kind === "accept") {
        patchActive({ phase: "connecting" });
        try {
          await setCallSessionStatus(current.session.id, "connecting");
          const localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: current.session.type === "video",
          });
          patchActive({ localStream });
          await createPeer(current.session, current.peer, localStream);
        } catch {
          await finishActive("failed");
        }
        return;
      }
      if (signal.kind === "media-state") {
        return;
      }
      if (!peerRef.current) {
        signalQueueRef.current.push(signal);
        return;
      }
      try {
        await peerRef.current.handleSignal(signal.kind, signal.payload);
      } catch {
        await finishActive("failed");
      }
    },
    [finishActive, patchActive],
  );

  const createPeer = useCallback(
    async (session: CallSession, peer: Profile, localStream: MediaStream) => {
      const polite = user.id.localeCompare(peer.id) > 0;
      const controller = new PulsePeerConnection({
        localStream,
        polite,
        send: sendCallSignal,
        onRemoteStream: (remoteStream) => patchActive({ remoteStream }),
        onConnectionState: (connectionState) => {
          if (connectionState === "connected") {
            patchActive({
              phase: "connected",
              connectedAt: activeRef.current?.connectedAt ?? Date.now(),
              connectionState,
            });
            void setCallSessionStatus(session.id, "connected");
          } else {
            patchActive({ connectionState });
            if (connectionState === "failed" || connectionState === "closed")
              void finishActive("failed", false);
          }
        },
      });
      peerRef.current = controller;
      const queued = signalQueueRef.current.splice(0);
      for (const signal of queued) await controller.handleSignal(signal.kind, signal.payload);
    },
    [finishActive, patchActive, sendCallSignal, user.id],
  );

  const startActive = useCallback(
    async (session: CallSession, peer: Profile, direction: "outgoing" | "incoming") => {
      const initial: ActiveCall = {
        session,
        peer,
        direction,
        phase: direction === "outgoing" ? "ringing" : "connecting",
        localStream: null,
        remoteStream: null,
        muted: false,
        cameraEnabled: session.type === "video",
        speakerEnabled: true,
        connectedAt: null,
        connectionState: "new",
      };
      activeRef.current = initial;
      setActive(initial);
      const channel = await subscribeToCallChannel(session.id, user.id, handleSignal);
      callChannelRef.current = channel;

      if (direction === "incoming") {
        await sendSignal(
          channel,
          createCallSignal(
            session.id,
            user.id,
            peer.id,
            "accept",
            undefined,
            ++sequenceRef.current,
          ),
        );
      }

      if (direction === "incoming") {
        try {
          const localStream = await navigator.mediaDevices.getUserMedia({
            audio: true,
            video: session.type === "video",
          });
          patchActive({ localStream });
          await createPeer(session, peer, localStream);
        } catch (error) {
          await finishActive("failed", true);
          const message =
            error instanceof DOMException && error.name === "NotAllowedError"
              ? "Microphone or camera permission was denied"
              : "Unable to start the call on this device";
          toast.error(message);
          throw error;
        }
      }
    },
    [createPeer, finishActive, handleSignal, patchActive, user.id],
  );

  const startCall = useCallback(
    async (peer: Profile, type: "voice" | "video", conversationId?: string) => {
      if (activeRef.current || incomingRef.current) return;
      try {
        const conversation = conversationId ?? (await startDirectConversation(peer.id));
        const callId = await createCallSession({
          conversationId: conversation,
          calleeId: peer.id,
          type,
        });
        const session = await getCallSession(callId);
        if (!session || !userChannelRef.current)
          throw new Error("Call session could not be opened");
        await startActive(session, peer, "outgoing");
        await sendSignal(
          userChannelRef.current,
          createCallSignal(
            callId,
            user.id,
            peer.id,
            "invite",
            {
              type,
              conversationId: conversation,
            },
            ++sequenceRef.current,
          ),
          "invite",
        );
      } catch {
        clearMediaAndChannels();
        toast.error("Couldn't start that call");
      }
    },
    [clearMediaAndChannels, startActive, user.id],
  );

  const acceptIncoming = useCallback(async () => {
    const next = incomingRef.current;
    if (!next || activeRef.current) return;
    setIncoming(null);
    incomingRef.current = null;
    try {
      const accepted = await acceptCallSession(next.session.id);
      if (!accepted) throw new Error("Call is no longer available");
      await startActive(accepted, next.caller, "incoming");
    } catch {
      await finishCallSession(next.session.id, "failed");
      toast.error("This call is no longer available");
    }
  }, [startActive]);

  const declineIncoming = useCallback(async () => {
    const next = incomingRef.current;
    if (!next) return;
    setIncoming(null);
    incomingRef.current = null;
    try {
      await finishCallSession(next.session.id, "declined");
    } catch {
      // The session expiry job remains the fallback.
    }
    if (userChannelRef.current) {
      await sendSignal(
        userChannelRef.current,
        createCallSignal(
          next.session.id,
          user.id,
          next.caller.id,
          "decline",
          undefined,
          ++sequenceRef.current,
        ),
        "invite",
      ).catch(() => undefined);
    }
  }, [user.id]);

  const endCall = useCallback(() => {
    const status = activeRef.current?.phase === "ringing" ? "cancelled" : "ended";
    return finishActive(status);
  }, [finishActive]);

  const toggleMute = useCallback(() => {
    const stream = activeRef.current?.localStream;
    const track = stream?.getAudioTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    patchActive({ muted: !track.enabled });
    void sendCallSignal("media-state", {
      audio: track.enabled,
      video: stream.getVideoTracks()[0]?.enabled ?? false,
    });
  }, [patchActive, sendCallSignal]);

  const toggleCamera = useCallback(() => {
    const stream = activeRef.current?.localStream;
    const track = stream?.getVideoTracks()[0];
    if (!track) return;
    track.enabled = !track.enabled;
    patchActive({ cameraEnabled: track.enabled });
    void sendCallSignal("media-state", {
      audio: stream.getAudioTracks()[0]?.enabled ?? true,
      video: track.enabled,
    });
  }, [patchActive, sendCallSignal]);

  const toggleSpeaker = useCallback(() => {
    patchActive({ speakerEnabled: !activeRef.current?.speakerEnabled });
  }, [patchActive]);

  useEffect(() => {
    let cancelled = false;
    void subscribeToUserCallChannel(user.id, async (signal) => {
      if (cancelled) return;
      if (signal.kind === "cancel") {
        if (incomingRef.current?.session.id === signal.callId) {
          setIncoming(null);
          incomingRef.current = null;
        }
        return;
      }
      if (activeRef.current || incomingRef.current) return;
      const session = await getCallSession(signal.callId);
      if (!session || session.callee_id !== user.id || session.status !== "ringing") return;
      const { data: caller } = await supabase
        .from("profiles")
        .select("id,username,display_name,avatar_url,about,phone,mood,is_online,last_seen")
        .eq("id", session.caller_id)
        .maybeSingle();
      if (!caller || cancelled) return;
      const next = { session, caller: caller as Profile };
      incomingRef.current = next;
      setIncoming(next);
    })
      .then((channel) => {
        if (!cancelled) userChannelRef.current = channel;
        else void supabase.removeChannel(channel);
      })
      .catch(() => undefined);

    void listActiveCallSessions()
      .then(async (sessions) => {
        const ringing = sessions.find(
          (session) => session.callee_id === user.id && session.status === "ringing",
        );
        if (!ringing || cancelled || activeRef.current || incomingRef.current) return;
        const { data: caller } = await supabase
          .from("profiles")
          .select("id,username,display_name,avatar_url,about,phone,mood,is_online,last_seen")
          .eq("id", ringing.caller_id)
          .maybeSingle();
        if (!caller || cancelled) return;
        const next = { session: ringing, caller: caller as Profile };
        incomingRef.current = next;
        setIncoming(next);
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
      if (userChannelRef.current) void supabase.removeChannel(userChannelRef.current);
      userChannelRef.current = null;
      clearMediaAndChannels();
    };
  }, [clearMediaAndChannels, user.id]);

  useEffect(() => {
    const current = incoming;
    if (!current) return;
    const timeout = window.setTimeout(
      () => {
        if (incomingRef.current?.session.id === current.session.id)
          void finishCallSession(current.session.id, "missed");
        setIncoming(null);
        incomingRef.current = null;
      },
      Math.max(1000, new Date(current.session.expires_at).getTime() - Date.now()),
    );
    return () => window.clearTimeout(timeout);
  }, [incoming]);

  useEffect(() => {
    if (!active) return;
    const heartbeat = window.setInterval(() => {
      if (activeRef.current) void heartbeatCallSession(activeRef.current.session.id);
    }, 10_000);
    const expiry =
      active.phase === "ringing"
        ? window.setTimeout(
            () => void finishActive("cancelled"),
            Math.max(1000, new Date(active.session.expires_at).getTime() - Date.now()),
          )
        : undefined;
    return () => {
      window.clearInterval(heartbeat);
      if (expiry) window.clearTimeout(expiry);
    };
  }, [active, finishActive]);

  const value = useMemo<CallContextValue>(
    () => ({
      active,
      incoming,
      startCall,
      acceptIncoming,
      declineIncoming,
      endCall,
      toggleMute,
      toggleCamera,
      toggleSpeaker,
    }),
    [
      acceptIncoming,
      active,
      declineIncoming,
      endCall,
      incoming,
      startCall,
      toggleCamera,
      toggleMute,
      toggleSpeaker,
    ],
  );

  return (
    <CallContext.Provider value={value}>
      {children}
      {incoming && <IncomingCallDialog />}
      {active && <ActiveCallSheet />}
    </CallContext.Provider>
  );
}

export function useCall() {
  const context = useContext(CallContext);
  if (!context) throw new Error("useCall must be used inside CallProvider");
  return context;
}
