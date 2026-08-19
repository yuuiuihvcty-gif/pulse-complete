import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Mic, Search, VolumeX, Image as ImageIcon, Plus } from "lucide-react";
import { AppShell } from "@/components/pulse/AppShell";
import { BottomNav, SideRail } from "@/components/pulse/Navigation";
import { PulseAvatar } from "@/components/pulse/PulseAvatar";
import { EmptyState, ListSkeleton } from "@/components/pulse/EmptyState";
import { useApp } from "@/lib/app-context";
import { listConversations } from "@/lib/api";
import { chatListTime } from "@/lib/format";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { ConversationSummary } from "@/lib/types";
import { supabase } from "@/integrations/supabase/client";
import { PageBackground } from "@/components/pulse/PageBackground";

export const Route = createFileRoute("/chats")({
  head: () => ({
    meta: [
      { title: "Chats — Pulse, The Living Messenger" },
      {
        name: "description",
        content: "Every Pulse conversation in one lively place: presence, moods, typing and voice.",
      },
      { property: "og:title", content: "Chats — Pulse, The Living Messenger" },
      {
        property: "og:description",
        content: "Every Pulse conversation in one lively place: presence, moods, typing and voice.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <ChatsPage />
    </AppShell>
  ),
});

function ChatsPage() {
  const { user, profile } = useApp();
  const queryClient = useQueryClient();
  const [term, setTerm] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["conversations", user.id],
    queryFn: () => listConversations(user.id),
  });

  // Realtime: only messages in conversations the user currently has loaded can nudge the list.
  useEffect(() => {
    const conversationIds = (data ?? []).map((conversation) => conversation.id);
    if (conversationIds.length === 0) return;

    const channel = supabase
      .channel(`chatlist:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "messages",
          filter: `conversation_id=in.(${conversationIds.join(",")})`,
        },
        () => queryClient.invalidateQueries({ queryKey: ["conversations", user.id] }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [data, user.id, queryClient]);

  const rows = useMemo(() => {
    const list = data ?? [];
    const t = term.trim().toLowerCase();
    if (!t) return list;
    return list.filter(
      (c) =>
        (c.name ?? c.other?.display_name ?? "").toLowerCase().includes(t) ||
        (c.lastMessage?.body ?? "").toLowerCase().includes(t),
    );
  }, [data, term]);

  const unread = (data ?? []).reduce((n, c) => n + c.unread, 0);

  return (
    <div className="relative min-h-screen md:flex">
      <PageBackground />
      <SideRail unread={unread} />
      <div className="relative mx-auto w-full max-w-2xl pb-24 md:pb-6">
        <header className="sticky top-0 z-30 border-b border-white/[0.07] bg-[#050608]/82 px-4 pb-4 pt-5 backdrop-blur-2xl md:px-6">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] neon-text">
                PULSE / INBOX
              </p>
              <h1 className="font-display text-[30px] font-semibold tracking-[-0.06em]">Chats</h1>
              <p className="text-xs text-muted-foreground">
                {profile?.display_name
                  ? `Signed in as ${profile.display_name}`
                  : "Alive and listening"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Link
                to="/search"
                aria-label="Search people and messages"
                className="grid h-10 w-10 place-items-center rounded-[14px] border border-white/10 bg-white/[0.035] text-cyan press hover:border-brand/40 hover:bg-white/[0.07]"
              >
                <Search className="h-5 w-5" />
              </Link>
              <PulseAvatar profile={profile} size="md" showPresence showMood />
            </div>
          </div>
          <label className="mt-5 flex items-center gap-2 rounded-[16px] border border-white/10 bg-[#0c0e14]/90 px-3 transition-colors focus-within:border-brand/60 focus-within:shadow-[0_0_24px_-14px_rgba(143,104,255,0.9)]">
            <Search className="h-4 w-4 text-muted-foreground" />
            <input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search conversations"
              className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </label>
        </header>

        {isLoading ? (
          <ListSkeleton />
        ) : rows.length === 0 ? (
          <EmptyState
            scene={term ? "search" : "conversations"}
            title={term ? "Nothing found." : "Your conversations are waiting."}
            description={
              term
                ? "Try another name or a word from a message."
                : "Find someone in Contacts and send the first message."
            }
            action={
              !term && (
                <Link
                  to="/contacts"
                  className="inline-flex h-11 items-center gap-2 rounded-[14px] bg-[linear-gradient(105deg,#38cfff,#8f68ff_52%,#ff5b9b)] px-5 text-sm font-semibold text-white shadow-[0_12px_28px_-14px_rgba(143,104,255,0.95)] press"
                >
                  <Plus className="h-4 w-4" /> Start chatting
                </Link>
              )
            }
          />
        ) : (
          <motion.ul layout className="space-y-1 p-2 md:p-3">
            <AnimatePresence initial={false}>
              {rows.map((c) => (
                <ChatRow key={c.id} conv={c} />
              ))}
            </AnimatePresence>
          </motion.ul>
        )}
      </div>
      <BottomNav unread={unread} />
    </div>
  );
}

function preview(c: ConversationSummary) {
  const m = c.lastMessage;
  if (!m) return "Say hello 👋";
  if (m.deleted_at) return "Message deleted";
  switch (m.type) {
    case "image":
      return "Photo";
    case "video":
      return "Video";
    case "voice":
      return "Voice message";
    case "file":
      return "Document";
    default:
      return m.body ?? "";
  }
}

function ChatRow({ conv }: { conv: ConversationSummary }) {
  const name = conv.name ?? conv.other?.display_name ?? "Conversation";
  const media = conv.lastMessage && ["image", "video"].includes(conv.lastMessage.type);
  const voice = conv.lastMessage?.type === "voice";

  return (
    <motion.li
      layout
      layoutId={`conv-${conv.id}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      transition={SPRING.layout}
    >
      <Link
        to="/chats/$id"
        params={{ id: conv.id }}
        className="group flex items-center gap-3 rounded-[18px] border border-transparent bg-white/[0.018] p-3.5 press hover:border-white/10 hover:bg-white/[0.055]"
      >
        <motion.span layoutId={`avatar-${conv.id}`} className="relative">
          <PulseAvatar profile={conv.other} size="lg" showPresence showMood />
        </motion.span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <motion.span
              layoutId={`title-${conv.id}`}
              className="truncate font-display text-[15px] font-semibold"
            >
              {name}
            </motion.span>
            {conv.muted && <VolumeX className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />}
            {!conv.is_group && conv.other?.ide && (
              <span className="shrink-0 text-[10px] font-semibold tracking-wide text-brand">
                {conv.other.ide}
              </span>
            )}
          </span>
          <span className="mt-0.5 flex items-center gap-1.5 text-[13px] text-muted-foreground">
            {media && <ImageIcon className="h-3.5 w-3.5 text-brand" />}
            {voice && <Mic className="h-3.5 w-3.5 text-brand" />}
            <span className="truncate">{preview(conv)}</span>
          </span>
        </span>
        <span className="flex flex-col items-end gap-1.5">
          <span className="text-[10px] font-medium text-muted-foreground">
            {chatListTime(conv.last_message_at)}
          </span>
          {conv.unread > 0 && (
            <motion.span
              initial={{ scale: 0.4 }}
              animate={{ scale: 1 }}
              transition={SPRING.pop}
              className={cn(
                "grid h-5 min-w-5 place-items-center rounded-full bg-coral px-1.5 text-[11px] font-bold text-foreground",
              )}
            >
              {conv.unread > 99 ? "99+" : conv.unread}
            </motion.span>
          )}
        </span>
      </Link>
    </motion.li>
  );
}
