import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import { PhoneCall, PhoneIncoming, PhoneMissed, PhoneOutgoing, Video } from "lucide-react";
import { AppShell } from "@/components/pulse/AppShell";
import { BottomNav, SideRail } from "@/components/pulse/Navigation";
import { PulseAvatar } from "@/components/pulse/PulseAvatar";
import { EmptyState, ListSkeleton } from "@/components/pulse/EmptyState";
import { useApp } from "@/lib/app-context";
import { useCall } from "@/lib/calls/CallProvider";
import { listCalls, listContacts } from "@/lib/api";
import { chatListTime } from "@/lib/format";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { CallRecord, Profile } from "@/lib/types";
import { PageBackground } from "@/components/pulse/PageBackground";
import bgcallsBg from "@/assets/bg-calls.jpeg.asset.json";

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
  const { startCall } = useCall();

  const history = useQuery({ queryKey: ["calls", user.id], queryFn: () => listCalls(user.id) });
  const contacts = useQuery({
    queryKey: ["contacts", user.id],
    queryFn: () => listContacts(user.id),
  });

  const calls = history.data?.calls ?? [];
  const peers = history.data?.profiles ?? new Map<string, Profile>();

  return (
    <div className="relative min-h-screen md:flex">
      <PageBackground src={bgcallsBg.url} />
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
                    onClick={() => void startCall(p, "voice")}
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
                onCall={(peer, type) => void startCall(peer, type, c.conversation_id ?? undefined)}
              />
            ))}
          </ul>
        )}
      </div>
      <BottomNav />
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
  const Icon = call.status === "missed" ? PhoneMissed : outgoing ? PhoneOutgoing : PhoneIncoming;

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
