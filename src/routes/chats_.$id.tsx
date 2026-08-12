import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ChevronDown, Phone, Search, Video, X } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/pulse/AppShell";
import { PulseAvatar } from "@/components/pulse/PulseAvatar";
import { MessageBubble, type BubbleActions } from "@/components/pulse/MessageBubble";
import { Composer, type OutgoingAttachment } from "@/components/pulse/Composer";
import { MediaViewer, type MediaItem } from "@/components/pulse/MediaViewer";
import { BubbleSkeleton, EmptyState } from "@/components/pulse/EmptyState";
import { LiveActivity } from "@/components/pulse/TypingDots";
import { useApp } from "@/lib/app-context";
import { supabase } from "@/integrations/supabase/client";
import { typingLabel, useConversationLive } from "@/hooks/use-conversation-live";
import { uploadMedia } from "@/lib/media";
import { dayLabel, lastSeenLabel } from "@/lib/format";
import { SPRING } from "@/lib/motion";
import { cn } from "@/lib/utils";
import type { Message, Reaction } from "@/lib/types";
import {
  deleteMessage,
  editMessage,
  getConversation,
  listMessages,
  listReactions,
  listReads,
  markConversationRead,
  sendMessage,
  setPinned,
  toggleReaction,
} from "@/lib/api";

export const Route = createFileRoute("/chats_/$id")({
  head: () => ({
    meta: [
      { title: "Conversation — Pulse, The Living Messenger" },
      {
        name: "description",
        content:
          "A Pulse conversation: expressive bubbles, reactions, replies, voice notes and live typing.",
      },
      { property: "og:title", content: "Conversation — Pulse" },
      {
        property: "og:description",
        content: "Expressive bubbles, reactions, replies, voice notes and live typing.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: () => (
    <AppShell>
      <Thread />
    </AppShell>
  ),
});

function Thread() {
  const { id } = Route.useParams();
  const { user, profile, settings } = useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [editing, setEditing] = useState<Message | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [term, setTerm] = useState("");
  const [highlight, setHighlight] = useState<string | null>(null);
  const [viewer, setViewer] = useState<{ items: MediaItem[]; index: number } | null>(null);
  const [atBottom, setAtBottom] = useState(true);

  const scroller = useRef<HTMLDivElement | null>(null);
  const bottom = useRef<HTMLDivElement | null>(null);

  const conversation = useQuery({
    queryKey: ["conversation", id, user.id],
    queryFn: () => getConversation(id, user.id),
  });
  const messages = useQuery({
    queryKey: ["messages", id],
    queryFn: () => listMessages(id),
  });
  const reactions = useQuery({
    queryKey: ["reactions", id],
    queryFn: () => listReactions(id),
  });
  const reads = useQuery({ queryKey: ["reads", id], queryFn: () => listReads(id) });

  const other = conversation.data?.other ?? null;
  const live = useConversationLive(id, user.id, profile?.display_name ?? "Someone");

  const invalidate = useCallback(
    (keys: string[][]) => keys.forEach((k) => void queryClient.invalidateQueries({ queryKey: k })),
    [queryClient],
  );

  // Realtime message + reaction stream for this conversation
  useEffect(() => {
    const channel = supabase
      .channel(`thread:${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${id}` },
        () => invalidate([["messages", id], ["conversations", user.id]]),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reactions" }, () =>
        invalidate([["reactions", id]]),
      )
      .on("postgres_changes", { event: "*", schema: "public", table: "message_reads" }, () =>
        invalidate([["reads", id]]),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [id, user.id, invalidate]);

  // Mark read whenever the thread is open and new messages land
  useEffect(() => {
    if (!messages.data?.length) return;
    void markConversationRead(id, user.id).then(() =>
      queryClient.invalidateQueries({ queryKey: ["conversations", user.id] }),
    );
  }, [id, user.id, messages.data, queryClient]);

  useEffect(() => {
    if (atBottom) bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.data, live.typing.length, atBottom]);

  const send = useMutation({
    mutationFn: (input: Parameters<typeof sendMessage>[0]) => sendMessage(input),
    onSuccess: () => {
      setReplyTo(null);
      setAtBottom(true);
      invalidate([["messages", id], ["conversations", user.id]]);
    },
    onError: () => toast.error("That message didn't make it. Try again?"),
  });

  const mediaItems = useMemo<MediaItem[]>(
    () =>
      (messages.data ?? [])
        .filter((m) => !m.deleted_at && (m.type === "image" || m.type === "video") && m.media_url)
        .map((m) => ({
          path: m.media_url as string,
          type: m.type as "image" | "video",
          caption: m.body,
        })),
    [messages.data],
  );

  const reactionsFor = (messageId: string) =>
    (reactions.data ?? []).filter((r: Reaction) => r.message_id === messageId);

  const seenByOther = (m: Message) =>
    (reads.data ?? []).some((r) => r.message_id === m.id && r.user_id !== user.id);

  const jumpTo = (messageId: string) => {
    setHighlight(messageId);
    document.getElementById(`msg-${messageId}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => setHighlight(null), 1400);
  };

  const actionsFor = (m: Message): BubbleActions => ({
    onReact: (emoji) => {
      void toggleReaction(m.id, user.id, emoji).then(() => invalidate([["reactions", id]]));
    },
    onReply: () => {
      setEditing(null);
      setReplyTo(m);
    },
    onEdit: () => {
      setReplyTo(null);
      setEditing(m);
    },
    onDelete: () => {
      void deleteMessage(m.id)
        .then(() => invalidate([["messages", id], ["conversations", user.id]]))
        .catch(() => toast.error("Couldn't delete that message"));
    },
    onCopy: () => {
      void navigator.clipboard.writeText(m.body ?? "").then(() => toast.success("Copied"));
    },
    onForward: () => toast.info("Pick a chat from Contacts to forward there"),
    onPin: () => {
      void setPinned(m.id, !m.pinned).then(() => invalidate([["messages", id]]));
    },
    onOpenMedia: () => {
      const index = mediaItems.findIndex((it) => it.path === m.media_url);
      if (index >= 0) setViewer({ items: mediaItems, index });
    },
    onJumpTo: jumpTo,
  });

  const sendText = (text: string) => {
    if (editing) {
      const target = editing;
      setEditing(null);
      void editMessage(target.id, text)
        .then(() => invalidate([["messages", id], ["conversations", user.id]]))
        .catch(() => toast.error("Couldn't save that edit"));
      return;
    }
    send.mutate({
      conversationId: id,
      senderId: user.id,
      type: "text",
      body: text,
      replyTo: replyTo?.id ?? null,
    });
  };

  const sendAttachment = async (a: OutgoingAttachment, caption?: string) => {
    try {
      const path = await uploadMedia(user.id, a.file, a.filename);
      send.mutate({
        conversationId: id,
        senderId: user.id,
        type: a.kind,
        body: caption ?? null,
        mediaUrl: path,
        mediaMeta: {
          name: a.filename,
          size: a.file.size,
          mime: a.file.type,
          ...(a.seconds ? { seconds: a.seconds } : {}),
        },
        replyTo: replyTo?.id ?? null,
      });
    } catch {
      toast.error("Upload failed — check your connection and try again");
    }
  };

  const visible = useMemo(() => {
    const list = messages.data ?? [];
    const t = term.trim().toLowerCase();
    if (!searchOpen || !t) return list;
    return list.filter((m) => (m.body ?? "").toLowerCase().includes(t));
  }, [messages.data, term, searchOpen]);

  const byId = useMemo(
    () => new Map((messages.data ?? []).map((m) => [m.id, m])),
    [messages.data],
  );

  const activity =
    live.recording.length > 0
      ? typingLabel(live.recording, "recording")
      : live.typing.length > 0
        ? typingLabel(live.typing)
        : "";

  return (
    <div className="flex h-[100dvh] flex-col bg-background">
      {/* HEADER — shared layout animation from the chat list row */}
      <header className="z-30 flex items-center gap-3 border-b border-border bg-surface/90 px-2 py-2 backdrop-blur-xl">
        <button
          type="button"
          aria-label="Back to chats"
          onClick={() => void navigate({ to: "/chats" })}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full press hover:bg-surface-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <motion.span layoutId={`avatar-${id}`}>
          <PulseAvatar profile={other} size="md" showPresence showMood />
        </motion.span>
        <div className="min-w-0 flex-1">
          <motion.p layoutId={`title-${id}`} className="truncate font-display text-[16px] font-semibold">
            {conversation.data?.name ?? other?.display_name ?? "Conversation"}
          </motion.p>
          <div className="h-4 text-xs text-muted-foreground">
            <AnimatePresence mode="wait" initial={false}>
              {activity ? (
                <LiveActivity key="live" label={activity} />
              ) : (
                <motion.span
                  key="presence"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="truncate"
                >
                  {other?.is_online
                    ? "online"
                    : other?.last_seen
                      ? lastSeenLabel(other.last_seen)
                      : ""}
                </motion.span>
              )}
            </AnimatePresence>
          </div>
        </div>
        <button
          type="button"
          aria-label="Search in conversation"
          onClick={() => setSearchOpen((v) => !v)}
          className="grid h-10 w-10 place-items-center rounded-full press hover:bg-surface-2"
        >
          {searchOpen ? <X className="h-5 w-5" /> : <Search className="h-5 w-5" />}
        </button>
        <Link
          to="/calls"
          aria-label="Voice call"
          className="grid h-10 w-10 place-items-center rounded-full press hover:bg-surface-2"
        >
          <Phone className="h-5 w-5" />
        </Link>
        <Link
          to="/calls"
          aria-label="Video call"
          className="hidden h-10 w-10 place-items-center rounded-full press hover:bg-surface-2 sm:grid"
        >
          <Video className="h-5 w-5" />
        </Link>
      </header>

      <AnimatePresence>
        {searchOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden border-b border-border bg-surface px-3"
          >
            <input
              autoFocus
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search in this conversation"
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* THREAD */}
      <div
        ref={scroller}
        onScroll={(e) => {
          const el = e.currentTarget;
          setAtBottom(el.scrollHeight - el.scrollTop - el.clientHeight < 120);
        }}
        className={cn("relative flex-1 overflow-y-auto scrollbar-slim", `wp-${settings?.wallpaper ?? "aurora"}`, "wallpaper")}
      >
        {messages.isLoading ? (
          <BubbleSkeleton />
        ) : visible.length === 0 ? (
          <EmptyState
            scene={term ? "search" : "conversations"}
            title={term ? "No messages match." : "This is a fresh start."}
            description={
              term ? "Try a different word." : "Send the first message and watch Pulse come alive."
            }
          />
        ) : (
          <div className="mx-auto w-full max-w-3xl space-y-1 px-2 py-4">
            {visible.map((m, i) => {
              const prev = visible[i - 1];
              const newDay = !prev || new Date(prev.created_at).toDateString() !== new Date(m.created_at).toDateString();
              return (
                <div key={m.id}>
                  {newDay && (
                    <div className="my-4 flex justify-center">
                      <span className="rounded-full border border-border bg-surface/80 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground backdrop-blur">
                        {dayLabel(m.created_at)}
                      </span>
                    </div>
                  )}
                  <MessageBubble
                    message={m}
                    mine={m.sender_id === user.id}
                    sender={m.sender_id === user.id ? profile : other}
                    replyTo={m.reply_to ? byId.get(m.reply_to) ?? null : null}
                    reactions={reactionsFor(m.id)}
                    seen={seenByOther(m)}
                    highlight={highlight === m.id}
                    {...(searchOpen && term ? { searchTerm: term } : {})}
                    actions={actionsFor(m)}
                    showAvatar={!!conversation.data?.is_group}
                  />
                </div>
              );
            })}
            <div ref={bottom} className="h-2" />
          </div>
        )}

        <AnimatePresence>
          {!atBottom && (
            <motion.button
              type="button"
              aria-label="Jump to latest"
              initial={{ opacity: 0, scale: 0.6, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.6 }}
              transition={SPRING.pop}
              onClick={() => {
                setAtBottom(true);
                bottom.current?.scrollIntoView({ behavior: "smooth" });
              }}
              className="sticky bottom-4 left-full mr-4 grid h-11 w-11 place-items-center rounded-full bg-surface text-foreground shadow-float"
            >
              <ChevronDown className="h-5 w-5" />
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <Composer
        replyTo={replyTo}
        onCancelReply={() => setReplyTo(null)}
        editing={editing}
        onCancelEdit={() => setEditing(null)}
        enterToSend={settings?.enter_to_send ?? true}
        onSendText={sendText}
        onSendAttachment={(a, caption) => void sendAttachment(a, caption)}
        onActivity={live.emit}
      />

      <AnimatePresence>
        {viewer && (
          <MediaViewer items={viewer.items} index={viewer.index} onClose={() => setViewer(null)} />
        )}
      </AnimatePresence>
    </div>
  );
}
