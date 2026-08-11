import { useCallback, useEffect, useRef, useState } from "react";
import type { RealtimeChannel } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export type LiveState = { typing: string[]; recording: string[] };

/**
 * Realtime typing / recording indicators for one conversation, using
 * broadcast events on a per-conversation channel.
 */
export function useConversationLive(conversationId?: string, me?: string, myName?: string) {
  const [state, setState] = useState<LiveState>({ typing: [], recording: [] });
  const channelRef = useRef<RealtimeChannel | null>(null);
  const timers = useRef<Record<string, number>>({});
  const lastSent = useRef(0);

  useEffect(() => {
    if (!conversationId || !me) return;
    const channel = supabase.channel(`conv:${conversationId}`, {
      config: { broadcast: { self: false } },
    });

    const clear = (userId: string) => {
      setState((prev) => ({
        typing: prev.typing.filter((n) => n !== userId),
        recording: prev.recording.filter((n) => n !== userId),
      }));
    };

    channel.on("broadcast", { event: "activity" }, ({ payload }) => {
      const p = payload as { userId: string; name: string; kind: "typing" | "recording" | "stop" };
      if (p.userId === me) return;
      const key = p.name || "Someone";
      window.clearTimeout(timers.current[key]);
      if (p.kind === "stop") {
        clear(key);
        return;
      }
      setState((prev) => {
        const typing = new Set(prev.typing);
        const recording = new Set(prev.recording);
        if (p.kind === "typing") {
          typing.add(key);
          recording.delete(key);
        } else {
          recording.add(key);
          typing.delete(key);
        }
        return { typing: [...typing], recording: [...recording] };
      });
      timers.current[key] = window.setTimeout(() => clear(key), 4000);
    });

    channel.subscribe();
    channelRef.current = channel;

    return () => {
      Object.values(timers.current).forEach((t) => window.clearTimeout(t));
      timers.current = {};
      setState({ typing: [], recording: [] });
      channelRef.current = null;
      supabase.removeChannel(channel);
    };
  }, [conversationId, me]);

  const emit = useCallback(
    (kind: "typing" | "recording" | "stop") => {
      const now = Date.now();
      if (kind !== "stop" && now - lastSent.current < 1200) return;
      lastSent.current = now;
      channelRef.current?.send({
        type: "broadcast",
        event: "activity",
        payload: { userId: me, name: myName ?? "Someone", kind },
      });
    },
    [me, myName],
  );

  return { ...state, emit };
}

export function typingLabel(names: string[], verb = "typing") {
  const short = names.map((n) => n.split(" ")[0]);
  if (short.length === 0) return "";
  if (short.length === 1) return `${short[0]} is ${verb}`;
  if (short.length === 2) return `${short[0]} and ${short[1]} are ${verb}`;
  return `${short[0]} and ${short.length - 1} others are ${verb}`;
}
