import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { PhoneCall, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/pulse/AppShell";
import { BottomNav, SideRail } from "@/components/pulse/Navigation";
import { PulseAvatar } from "@/components/pulse/PulseAvatar";
import { EmptyState, ListSkeleton } from "@/components/pulse/EmptyState";
import { useApp } from "@/lib/app-context";
import { listCalls, listContacts, logCall, startDirectConversation } from "@/lib/api";
import { chatListTime } from "@/lib/format";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { CallRecord, Profile } from "@/lib/types";
import { PageBackground } from "@/components/pulse/PageBackground";
import bg-callsBg from "@/assets/bg-calls.jpeg.asset.json";

export const Route = createFileRoute("/calls")({
  head: () => ({
    meta: [
      { title: "Calls — Pulse, The Living Messenger" },
      {
        name: "description",
        content: "Your Pulse call history, plus one-tap voice and video calls to your contacts.",
      },
      { property: "og:title", content: "Calls — Pulse" },
      {
        property: "og:description",
        content: "Your Pulse call history, plus one-tap voice and video calls to your contacts.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <CallsPage />
    </AppShell>
  ),
});

function CallsPage() {
  const { user } = useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dialing, setDialing] = useState<{ peer: Profile; type: "voice" | "video" } | null>(null);

  const history = useQuery({ queryKey: ["calls", user.id], queryFn: () => listCalls(user.id) });
  const contacts = useQuery({
    queryKey: ["contacts", user.id],
    queryFn: () => listContacts(user.id),
  });

  const endCall = async (status: "answered" | "declined", seconds: number) => {
    if (!dialing) return;
    try {
      await logCall({
        callerId: user.id,
        calleeId: dialing.peer.id,
        type: dialing.type,
        status,
        durationSeconds: seconds,
      });
      void queryClient.invalidateQueries({ queryKey: ["calls", user.id] });
    } catch {
      toast.error("Couldn't save that call");
    }
    setDialing(null);
  };

  const calls = history.data?.calls ?? [];
  const peers = history.data?.profiles ?? new Map<string, Profile>();

  return (
    <div className="relative min-h-screen md:flex">
      <PageBackground src={bg-callsBg.url} />
      <SideRail />
      <div className="mx-auto w-full max-w-2xl pb-24 md:pb-6">
        <header className="sticky top-0 z-30 border-b border-border bg-surface/85 px-4 pb-3 pt-5 backdrop-blur-xl">
          <h1 className="font-display text-[26px] font-bold tracking-tight">Calls</h1>
          <p className="text-xs text-muted-foreground">Voice and video, straight from a contact</p>
        </header>

        {(contacts.data ?? []).length > 0 && (
          <section className="px-4 pt-4">
            <h2 className="pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Quick call
            </h2>
            <ul className="flex gap-3 overflow-x-auto pb-2 scrollbar-slim">
              {(contacts.data ?? []).map((p) => (
                <li key={p.id} className="w-20 shrink-0 text-center">
                  <button
                    type="button"
                    onClick={() => setDialing({ peer: p, type: "voice" })}
                    className="flex w-full flex-col items-center gap-1.5 press"
                  >
                    <PulseAvatar profile={p} size="lg" showPresence />
                    <span className="w-full truncate text-[12px]">{p.display_name}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {history.isLoading ? (
          <ListSkeleton rows={5} />
        ) : calls.length === 0 ? (
          <EmptyState
            scene="contacts"
            title="No calls yet."
            description="Ring a contact above and your history will show up here."
          />
        ) : (
          <ul className="space-y-1 p-2">
            {calls.map((c) => (
              <CallRow
                key={c.id}
                call={c}
                me={user.id}
                peer={peers.get(c.caller_id === user.id ? c.callee_id : c.caller_id) ?? null}
                onCall={(peer, type) => setDialing({ peer, type })}
              />
            ))}
          </ul>
        )}
      </div>
      <BottomNav />

      <AnimatePresence>
        {dialing && (
          <CallSheet
            peer={dialing.peer}
            type={dialing.type}
            onSwitchType={(type) => setDialing({ peer: dialing.peer, type })}
            onEnd={(status, seconds) => void endCall(status, seconds)}
            onMessage={() =>
              void startDirectConversation(dialing.peer.id).then((id) => {
                setDialing(null);
                void navigate({ to: "/chats/$id", params: { id } });
              })
            }
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CallRow({
  call,
  me,
  peer,
  onCall,
}: {
  call: CallRecord;
  me: string;
  peer: Profile | null;
  onCall: (peer: Profile, type: "voice" | "video") => void;
}) {
  const outgoing = call.caller_id === me;
  const Icon =
    call.status === "missed" ? PhoneMissed : outgoing ? PhoneOutgoing : PhoneIncoming;

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING.layout}
      className="flex items-center gap-3 rounded-3xl p-3 hover:bg-surface-2"
    >
      <PulseAvatar profile={peer} size="lg" showPresence />
      <div className="min-w-0 flex-1">
        <p className="truncate font-display text-[16px] font-semibold">
          {peer?.display_name ?? "Unknown"}
        </p>
        <p
          className={cn(
            "flex items-center gap-1.5 text-[13px]",
            call.status === "missed" ? "text-coral" : "text-muted-foreground",
          )}
        >
          <Icon className="h-3.5 w-3.5" />
          {chatListTime(call.created_at)}
          {call.duration_seconds > 0 && ` · ${formatDuration(call.duration_seconds)}`}
        </p>
      </div>
      {peer && (
        <>
          <button
            type="button"
            aria-label={`Call ${peer.display_name}`}
            onClick={() => onCall(peer, "voice")}
            className="grid h-10 w-10 place-items-center rounded-full border border-border press hover:bg-surface-2"
          >
            <PhoneCall className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label={`Video call ${peer.display_name}`}
            onClick={() => onCall(peer, "video")}
            className="grid h-10 w-10 place-items-center rounded-full border border-border press hover:bg-surface-2"
          >
            <Video className="h-4 w-4" />
          </button>
        </>
      )}
    </motion.li>
  );
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function CallSheet({
  peer,
  type,
  onSwitchType,
  onEnd,
  onMessage,
}: {
  peer: Profile;
  type: "voice" | "video";
  onSwitchType: (type: "voice" | "video") => void;
  onEnd: (status: "answered" | "declined", seconds: number) => void;
  onMessage: () => void;
}) {
  const [started] = useState(() => Date.now());

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-label={`Calling ${peer.display_name}`}
      className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-6 bg-background/95 p-6 backdrop-blur-xl"
    >
      <PulseAvatar profile={peer} size="xl" ring="brand" showPresence />
      <div className="text-center">
        <p className="font-display text-2xl font-semibold">{peer.display_name}</p>
        <p className="text-sm text-muted-foreground">
          {peer.is_online ? "Ringing…" : "They're offline — we'll log a missed call"}
        </p>
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onSwitchType(type === "voice" ? "video" : "voice")}
          className="grid h-12 w-12 place-items-center rounded-full border border-border press hover:bg-surface-2"
          aria-label="Switch call type"
        >
          {type === "voice" ? <Video className="h-5 w-5" /> : <PhoneCall className="h-5 w-5" />}
        </button>
        <button
          type="button"
          onClick={onMessage}
          className="h-12 rounded-full border border-border px-5 text-sm font-semibold press hover:bg-surface-2"
        >
          Message instead
        </button>
        <button
          type="button"
          onClick={() =>
            onEnd(
              peer.is_online ? "answered" : "declined",
              Math.round((Date.now() - started) / 1000),
            )
          }
          className="grid h-12 w-12 place-items-center rounded-full bg-coral text-background press"
          aria-label="End call"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
    </motion.div>
  );
}
