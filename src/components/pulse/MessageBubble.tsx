import { useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Check,
  CheckCheck,
  Copy,
  CornerUpLeft,
  FileText,
  Forward,
  MapPin,
  Pencil,
  Pin,
  PinOff,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { bytes, timeLabel } from "@/lib/format";
import { QUICK_REACTIONS, type Message, type Profile, type Reaction } from "@/lib/types";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { VoicePlayer } from "./VoicePlayer";

const EXTRA_EMOJI = ["🥳", "🙏", "👏", "😍", "🤔", "😅", "💯", "🎉", "😭", "🤝", "✨", "🫶"];

function MediaThumb({
  path,
  type,
  onOpen,
}: {
  path: string;
  type: "image" | "video";
  onOpen: () => void;
}) {
  const { url } = useSignedUrl(path);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="relative block w-56 overflow-hidden rounded-2xl press sm:w-64"
    >
      {url ? (
        type === "image" ? (
          <img src={url} alt="Shared photo" loading="lazy" className="w-full object-cover" />
        ) : (
          <video src={url} className="w-full" muted playsInline preload="metadata" />
        )
      ) : (
        <div className="aspect-[4/3] w-full skeleton" />
      )}
      {type === "video" && (
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-foreground/55 text-background">
            ▶
          </span>
        </span>
      )}
    </button>
  );
}

function FileCard({ message, mine }: { message: Message; mine: boolean }) {
  const { url } = useSignedUrl(message.media_url);
  const meta = message.media_meta as { name?: string; size?: number };
  return (
    <a
      href={url ?? undefined}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "flex w-56 items-center gap-3 rounded-2xl p-2",
        mine ? "bg-bubble-out-foreground/12" : "bg-secondary",
      )}
    >
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand">
        <FileText className="h-5 w-5" />
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm font-medium">{meta.name ?? "Document"}</span>
        <span className="block text-xs opacity-70">{meta.size ? bytes(meta.size) : "File"}</span>
      </span>
    </a>
  );
}

export type BubbleActions = {
  onReact: (emoji: string) => void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onForward: () => void;
  onPin: () => void;
  onOpenMedia: () => void;
  onJumpTo?: (id: string) => void;
};

export function MessageBubble({
  message,
  mine,
  sender,
  replyTo,
  reactions,
  seen,
  highlight,
  searchTerm,
  actions,
  showAvatar,
}: {
  message: Message;
  mine: boolean;
  sender?: Profile | null;
  replyTo?: Message | null;
  reactions: Reaction[];
  seen: boolean;
  highlight?: boolean;
  searchTerm?: string;
  actions: BubbleActions;
  showAvatar?: boolean;
}) {
  const [menu, setMenu] = useState(false);
  const [more, setMore] = useState(false);
  const pressTimer = useRef<number | null>(null);
  const deleted = !!message.deleted_at;

  const grouped = reactions.reduce<Record<string, number>>((acc, r) => {
    acc[r.emoji] = (acc[r.emoji] ?? 0) + 1;
    return acc;
  }, {});

  const startPress = () => {
    pressTimer.current = window.setTimeout(() => setMenu(true), 380);
  };
  const cancelPress = () => {
    if (pressTimer.current) window.clearTimeout(pressTimer.current);
  };

  const renderBody = () => {
    if (deleted)
      return <span className="text-sm italic opacity-70">This message was deleted</span>;
    if (!message.body) return null;
    if (searchTerm && searchTerm.length > 1) {
      const parts = message.body.split(new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`, "gi"));
      return (
        <span className="whitespace-pre-wrap break-words text-[15px] leading-relaxed">
          {parts.map((p, i) =>
            p.toLowerCase() === searchTerm.toLowerCase() ? (
              <mark key={i} className="rounded bg-coral/40 px-0.5 text-inherit">
                {p}
              </mark>
            ) : (
              <span key={i}>{p}</span>
            ),
          )}
        </span>
      );
    }
    const emojiOnly = /^\p{Extended_Pictographic}{1,3}$/u.test(message.body.trim());
    return (
      <span
        className={cn(
          "whitespace-pre-wrap break-words",
          emojiOnly ? "text-4xl leading-tight" : "text-[15px] leading-relaxed",
        )}
      >
        {message.body}
      </span>
    );
  };

  return (
    <motion.div
      layout="position"
      id={`msg-${message.id}`}
      initial={{ opacity: 0, y: 14, scale: 0.96 }}
      animate={{
        opacity: 1,
        y: 0,
        scale: 1,
        backgroundColor: highlight ? "var(--color-brand-soft)" : "transparent",
      }}
      transition={{ type: "spring", stiffness: 340, damping: 26, mass: 0.6 }}
      className={cn("group relative flex gap-2 rounded-3xl px-1 py-0.5", mine ? "justify-end" : "justify-start")}
    >
      {!mine && showAvatar && (
        <span className="mt-auto grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-[10px] font-semibold">
          {sender?.display_name?.[0]?.toUpperCase() ?? "?"}
        </span>
      )}

      <div className={cn("relative max-w-[86%] sm:max-w-[70%]", mine ? "items-end" : "items-start")}>
        <motion.div
          onPointerDown={startPress}
          onPointerUp={cancelPress}
          onPointerLeave={cancelPress}
          onContextMenu={(e) => {
            e.preventDefault();
            setMenu(true);
          }}
          whileTap={{ scale: 0.985 }}
          className={cn(
            "relative px-3.5 py-2.5 shadow-bubble",
            mine
              ? "bubble-out-shape bg-bubble-out text-bubble-out-foreground"
              : "bubble-in-shape border border-border bg-bubble-in text-bubble-in-foreground",
          )}
        >
          {message.pinned && (
            <span className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide opacity-75">
              <Pin className="h-3 w-3" /> Pinned
            </span>
          )}

          {replyTo && (
            <button
              type="button"
              onClick={() => actions.onJumpTo?.(replyTo.id)}
              className={cn(
                "mb-2 block w-full rounded-xl border-l-2 px-2 py-1 text-left",
                mine ? "border-bubble-out-foreground/60 bg-bubble-out-foreground/12" : "border-brand bg-secondary",
              )}
            >
              <span className="block text-[11px] font-semibold opacity-80">
                {replyTo.sender_id === message.sender_id ? "You" : "Reply"}
              </span>
              <span className="line-clamp-2 text-xs opacity-80">
                {replyTo.body ?? `[${replyTo.type}]`}
              </span>
            </button>
          )}

          {!deleted && message.type === "image" && message.media_url && (
            <div className="mb-1.5">
              <MediaThumb path={message.media_url} type="image" onOpen={actions.onOpenMedia} />
            </div>
          )}
          {!deleted && message.type === "video" && message.media_url && (
            <div className="mb-1.5">
              <MediaThumb path={message.media_url} type="video" onOpen={actions.onOpenMedia} />
            </div>
          )}
          {!deleted && message.type === "voice" && message.media_url && (
            <VoicePlayer
              path={message.media_url}
              seconds={(message.media_meta as { seconds?: number }).seconds}
              outgoing={mine}
            />
          )}
          {!deleted && message.type === "file" && message.media_url && (
            <FileCard message={message} mine={mine} />
          )}
          {!deleted && message.type === "location" && (
            <span className="flex items-center gap-2 text-sm">
              <MapPin className="h-4 w-4" /> {message.body}
            </span>
          )}

          {message.type !== "location" && renderBody()}

          <span
            className={cn(
              "mt-1 flex items-center justify-end gap-1 text-[10px]",
              mine ? "text-bubble-out-foreground/75" : "text-muted-foreground",
            )}
          >
            {message.edited_at && !deleted && <span>edited</span>}
            <span className="tabular-nums">{timeLabel(message.created_at)}</span>
            {mine &&
              !deleted &&
              (seen ? (
                <CheckCheck className="h-3.5 w-3.5 text-brand-soft" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              ))}
          </span>
        </motion.div>

        {Object.keys(grouped).length > 0 && (
          <div className={cn("-mt-2 flex flex-wrap gap-1 px-1", mine ? "justify-end" : "justify-start")}>
            {Object.entries(grouped).map(([emoji, count]) => (
              <motion.button
                key={emoji}
                type="button"
                onClick={() => actions.onReact(emoji)}
                initial={{ scale: 0.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 520, damping: 16 }}
                className="flex items-center gap-1 rounded-full border border-border bg-surface px-1.5 py-0.5 text-xs shadow-soft press"
              >
                <span>{emoji}</span>
                {count > 1 && <span className="text-[10px] text-muted-foreground">{count}</span>}
              </motion.button>
            ))}
          </div>
        )}

        <AnimatePresence>
          {menu && !deleted && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => {
                  setMenu(false);
                  setMore(false);
                }}
                className="fixed inset-0 z-40"
              />
              <motion.div
                initial={{ opacity: 0, y: 8, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 6, scale: 0.94 }}
                transition={{ type: "spring", stiffness: 420, damping: 26 }}
                className={cn(
                  "absolute bottom-full z-50 mb-2 w-max rounded-3xl border border-border bg-popover p-2 shadow-float",
                  mine ? "right-0" : "left-0",
                )}
              >
                <div className="flex items-center gap-1">
                  {QUICK_REACTIONS.map((emoji, i) => (
                    <motion.button
                      key={emoji}
                      type="button"
                      initial={{ scale: 0, y: 8 }}
                      animate={{ scale: 1, y: 0 }}
                      transition={{ type: "spring", stiffness: 520, damping: 18, delay: i * 0.03 }}
                      whileHover={{ scale: 1.25 }}
                      onClick={() => {
                        actions.onReact(emoji);
                        setMenu(false);
                      }}
                      className="grid h-9 w-9 place-items-center rounded-full text-lg hover:bg-secondary"
                    >
                      {emoji}
                    </motion.button>
                  ))}
                  <button
                    type="button"
                    aria-label="More emoji"
                    onClick={() => setMore((v) => !v)}
                    className="grid h-9 w-9 place-items-center rounded-full bg-secondary press"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>

                {more && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    className="mt-1 grid grid-cols-6 gap-1 border-t border-border pt-2"
                  >
                    {EXTRA_EMOJI.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        onClick={() => {
                          actions.onReact(emoji);
                          setMenu(false);
                        }}
                        className="grid h-8 w-8 place-items-center rounded-full text-base hover:bg-secondary"
                      >
                        {emoji}
                      </button>
                    ))}
                  </motion.div>
                )}

                <div className="mt-1 grid gap-0.5 border-t border-border pt-1 text-sm">
                  {[
                    { label: "Reply", icon: CornerUpLeft, run: actions.onReply },
                    { label: "Copy", icon: Copy, run: actions.onCopy },
                    { label: "Forward", icon: Forward, run: actions.onForward },
                    {
                      label: message.pinned ? "Unpin" : "Pin",
                      icon: message.pinned ? PinOff : Pin,
                      run: actions.onPin,
                    },
                    ...(mine
                      ? [
                          { label: "Edit", icon: Pencil, run: actions.onEdit },
                          { label: "Delete", icon: Trash2, run: actions.onDelete },
                        ]
                      : []),
                  ].map(({ label, icon: Icon, run }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => {
                        run();
                        setMenu(false);
                      }}
                      className={cn(
                        "flex items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-secondary",
                        label === "Delete" && "text-destructive",
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
