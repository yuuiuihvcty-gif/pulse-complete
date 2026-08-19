import { supabase } from "@/integrations/supabase/client";
import type { RealtimeChannel } from "@supabase/supabase-js";

export type CallSignalKind =
  | "invite"
  | "accept"
  | "decline"
  | "cancel"
  | "offer"
  | "answer"
  | "ice-candidate"
  | "hangup"
  | "media-state";

export type CallSignal = {
  callId: string;
  from: string;
  to: string;
  seq: number;
  sentAt: string;
  kind: CallSignalKind;
  payload?: unknown;
};

type SignalHandler = (signal: CallSignal) => void | Promise<void>;

export async function subscribeToCallChannel(
  callId: string,
  userId: string,
  onSignal: SignalHandler,
) {
  const channel = supabase.channel(`call:${callId}`, {
    config: { private: true, broadcast: { self: false } },
  });
  channel.on("broadcast", { event: "signal" }, ({ payload }) => {
    const signal = payload as CallSignal;
    if (
      signal?.callId === callId &&
      signal.to === userId &&
      signal.from !== userId &&
      typeof signal.seq === "number"
    ) {
      void onSignal(signal);
    }
  });
  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status, error) => {
      if (status === "SUBSCRIBED") resolve();
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        reject(error ?? new Error(`Unable to subscribe to call ${callId}`));
      }
    });
  });
  return channel;
}

export async function subscribeToUserCallChannel(userId: string, onSignal: SignalHandler) {
  const channel = supabase.channel(`user:${userId}:calls`, {
    config: { private: true, broadcast: { self: false } },
  });
  channel.on("broadcast", { event: "invite" }, ({ payload }) => {
    const signal = payload as CallSignal;
    if (
      signal?.to === userId &&
      signal.from !== userId &&
      (signal.kind === "invite" || signal.kind === "cancel")
    ) {
      void onSignal(signal);
    }
  });
  await new Promise<void>((resolve, reject) => {
    channel.subscribe((status, error) => {
      if (status === "SUBSCRIBED") resolve();
      if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") {
        reject(error ?? new Error("Unable to subscribe to incoming calls"));
      }
    });
  });
  return channel;
}

export async function sendSignal(
  channel: RealtimeChannel,
  signal: CallSignal,
  event: "signal" | "invite" = "signal",
) {
  const result = await channel.send({ type: "broadcast", event, payload: signal });
  if (result !== "ok") throw new Error("Call signal was not delivered");
}

export function createCallSignal(
  callId: string,
  from: string,
  to: string,
  kind: CallSignalKind,
  payload?: unknown,
  seq = Date.now(),
): CallSignal {
  return {
    callId,
    from,
    to,
    seq,
    sentAt: new Date().toISOString(),
    kind,
    payload,
  };
}

type PeerOptions = {
  localStream: MediaStream;
  polite: boolean;
  send: (kind: CallSignalKind, payload?: unknown) => Promise<void>;
  onRemoteStream: (stream: MediaStream) => void;
  onConnectionState: (state: RTCPeerConnectionState) => void;
};

export class PulsePeerConnection {
  readonly pc: RTCPeerConnection;
  private readonly polite: boolean;
  private readonly send: PeerOptions["send"];
  private readonly onRemoteStream: PeerOptions["onRemoteStream"];
  private readonly onConnectionState: PeerOptions["onConnectionState"];
  private makingOffer = false;
  private ignoreOffer = false;
  private isSettingRemoteAnswerPending = false;
  private pendingCandidates: RTCIceCandidateInit[] = [];

  constructor(options: PeerOptions) {
    this.polite = options.polite;
    this.send = options.send;
    this.onRemoteStream = options.onRemoteStream;
    this.onConnectionState = options.onConnectionState;
    this.pc = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }, ...getTurnServers()],
    });
    for (const track of options.localStream.getTracks())
      this.pc.addTrack(track, options.localStream);

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) void this.send("ice-candidate", candidate.toJSON());
    };
    this.pc.ontrack = ({ streams }) => {
      if (streams[0]) this.onRemoteStream(streams[0]);
    };
    this.pc.onconnectionstatechange = () => this.onConnectionState(this.pc.connectionState);
    this.pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;
        await this.pc.setLocalDescription();
        if (this.pc.localDescription) {
          const type = this.pc.localDescription.type;
          if (type === "offer" || type === "answer")
            await this.send(type, this.pc.localDescription);
        }
      } finally {
        this.makingOffer = false;
      }
    };
  }

  async handleSignal(kind: CallSignalKind, payload: unknown) {
    if (kind === "ice-candidate") {
      const candidate = payload as RTCIceCandidateInit;
      if (!this.pc.remoteDescription) {
        this.pendingCandidates.push(candidate);
        return;
      }
      await this.pc.addIceCandidate(candidate).catch((error) => {
        if (!this.ignoreOffer) throw error;
      });
      return;
    }
    if (kind !== "offer" && kind !== "answer") return;
    const description = payload as RTCSessionDescriptionInit;
    const readyForOffer =
      !this.makingOffer &&
      (this.pc.signalingState === "stable" || this.isSettingRemoteAnswerPending);
    const offerCollision = description.type === "offer" && !readyForOffer;
    this.ignoreOffer = !this.polite && offerCollision;
    if (this.ignoreOffer) return;

    this.isSettingRemoteAnswerPending = description.type === "answer";
    await this.pc.setRemoteDescription(description);
    this.isSettingRemoteAnswerPending = false;
    for (const candidate of this.pendingCandidates.splice(0)) {
      await this.pc.addIceCandidate(candidate);
    }
    if (description.type === "offer") {
      await this.pc.setLocalDescription();
      if (this.pc.localDescription) {
        const type = this.pc.localDescription.type;
        if (type === "offer" || type === "answer") await this.send(type, this.pc.localDescription);
      }
    }
  }

  close() {
    this.pc.onicecandidate = null;
    this.pc.ontrack = null;
    this.pc.onnegotiationneeded = null;
    this.pc.close();
  }
}

function getTurnServers(): RTCIceServer[] {
  const urls = import.meta.env["VITE_TURN_URLS"] as string | undefined;
  const username = import.meta.env["VITE_TURN_USERNAME"] as string | undefined;
  const credential = import.meta.env["VITE_TURN_CREDENTIAL"] as string | undefined;
  if (!urls || !username || !credential) return [];
  return [{ urls: urls.split(",").map((url) => url.trim()), username, credential }];
}
