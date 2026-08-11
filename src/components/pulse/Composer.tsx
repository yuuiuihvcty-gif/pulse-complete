import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Mic, Paperclip, Send, Smile, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { duration } from "@/lib/format";
import { validateFile } from "@/lib/media";
import type { Message } from "@/lib/types";

const EMOJI = [
  "😀","😁","😂","🤣","😊","😍","😘","😜","🤩","🥳","😎","🤔","😴","😢","😭","😡","🙏","👍","👎","👏",
  "🔥","💯","🎉","✨","❤️","🧡","💙","💜","🖤","🤝","🫶","🙌","💪","🎧","📚","🎮","☕","🍕","🌙","⭐",
];

export type OutgoingAttachment = {
  file: File | Blob;
  filename: string;
  kind: "image" | "video" | "voice" | "file";
  seconds?: number;
};

export function Composer({
  replyTo,
  onCancelReply,
  editing,
  onCancelEdit,
  enterToSend,
  onSendText,
  onSendAttachment,
  onActivity,
}: {
  replyTo?: Message | null;
  onCancelReply: () => void;
  editing?: Message | null;
  onCancelEdit: () => void;
  enterToSend: boolean;
  onSendText: (text: string) => void;
  onSendAttachment: (a: OutgoingAttachment, caption?: string) => void;
  onActivity: (kind: "typing" | "recording" | "stop") => void;
}) {
  const [text, setText] = useState("");
  const [emoji, setEmoji] = useState(false);
  const [recording, setRecording] = useState(false);
  const [locked, setLocked] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const cancelled = useRef(false);
  const timer = useRef<number | null>(null);
  const textarea = useRef<HTMLTextAreaElement | null>(null);
  const fileInput = useRef<HTMLInputElement | null>(null);
  const cameraInput = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (editing) {
      setText(editing.body ?? "");
      textarea.current?.focus();
    }
  }, [editing]);

  useEffect(() => {
    const el = textarea.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [text]);

  const submit = () => {
    const value = text.trim();
    if (!value) return;
    onSendText(value);
    setText("");
    setEmoji(false);
    onActivity("stop");
  };

  const stopTimer = () => {
    if (timer.current) window.clearInterval(timer.current);
    timer.current = null;
  };

  const startRecording = async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      toast.error("Voice recording isn't supported on this device");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunks.current = [];
      cancelled.current = false;
      rec.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      rec.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        stopTimer();
        const secs = elapsedRef.current;
        setRecording(false);
        setLocked(false);
        setElapsed(0);
        onActivity("stop");
        if (cancelled.current || secs < 1) return;
        const blob = new Blob(chunks.current, { type: rec.mimeType || "audio/webm" });
        const err = validateFile(blob, "Voice message");
        if (err) {
          toast.error(err);
          return;
        }
        onSendAttachment({ file: blob, filename: "voice.webm", kind: "voice", seconds: secs });
      };
      rec.start();
      recorder.current = rec;
      setRecording(true);
      setElapsed(0);
      onActivity("recording");
      timer.current = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    } catch {
      toast.error("Microphone permission is needed to record");
    }
  };

  const elapsedRef = useRef(0);
  useEffect(() => {
    elapsedRef.current = elapsed;
    if (recording) onActivity("recording");
  }, [elapsed, recording, onActivity]);

  const finishRecording = (cancel: boolean) => {
    cancelled.current = cancel;
    recorder.current?.stop();
    recorder.current = null;
  };

  const handleFiles = (files: FileList | null, forceKind?: "image" | "video") => {
    const file = files?.[0];
    if (!file) return;
    const err = validateFile(file, file.name);
    if (err) {
      toast.error(err);
      return;
    }
    const kind: OutgoingAttachment["kind"] =
      forceKind ??
      (file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "file");
    onSendAttachment({ file, filename: file.name, kind }, text.trim() || undefined);
    setText("");
  };

  const hasText = text.trim().length > 0;

  return (
    <div className="sticky bottom-0 z-30 border-t border-border bg-surface/95 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl">
      <AnimatePresence>
        {(replyTo || editing) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-2 flex items-start gap-2 rounded-2xl border-l-2 border-brand bg-secondary px-3 py-2">
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-brand">
                  {editing ? "Editing message" : "Replying"}
                </p>
                <p className="line-clamp-2 text-xs text-muted-foreground">
                  {(editing ?? replyTo)?.body ?? `[${(editing ?? replyTo)?.type}]`}
                </p>
              </div>
              <button
                type="button"
                aria-label="Cancel"
                onClick={() => {
                  editing ? onCancelEdit() : onCancelReply();
                  if (editing) setText("");
                }}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-surface press"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {emoji && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            className="mb-2 grid max-h-40 grid-cols-10 gap-1 overflow-y-auto rounded-2xl border border-border bg-popover p-2 scrollbar-slim"
          >
            {EMOJI.map((e) => (
              <button
                key={e}
                type="button"
                onClick={() => setText((t) => t + e)}
                className="grid h-8 place-items-center rounded-lg text-lg hover:bg-secondary"
              >
                {e}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {recording ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 rounded-full border border-border bg-surface-2 px-4 py-2.5"
        >
          <span className="h-2.5 w-2.5 animate-pulse rounded-full bg-destructive" />
          <span className="text-sm font-medium tabular-nums">{duration(elapsed)}</span>
          <span className="flex h-6 flex-1 items-end gap-[3px] overflow-hidden">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className="w-[3px] flex-1 rounded-full bg-brand animate-bars"
                style={{ animationDelay: `${(i % 8) * 0.09}s`, height: "100%" }}
              />
            ))}
          </span>
          <button
            type="button"
            aria-label="Cancel recording"
            onClick={() => finishRecording(true)}
            className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-destructive press"
          >
            <Trash2 className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Send voice message"
            onClick={() => finishRecording(false)}
            className="grid h-9 w-9 place-items-center rounded-full bg-brand text-brand-foreground press"
          >
            <Send className="h-4 w-4" />
          </button>
        </motion.div>
      ) : (
        <div className="flex items-end gap-2">
          <div className="flex min-w-0 flex-1 items-end gap-1 rounded-3xl border border-border bg-surface-2 px-2 py-1.5">
            <button
              type="button"
              aria-label="Emoji"
              onClick={() => setEmoji((v) => !v)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground press hover:bg-secondary"
            >
              <Smile className="h-5 w-5" />
            </button>
            <textarea
              ref={textarea}
              rows={1}
              value={text}
              placeholder="Message"
              onChange={(e) => {
                setText(e.target.value);
                onActivity("typing");
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey && enterToSend) {
                  e.preventDefault();
                  submit();
                }
              }}
              className="max-h-36 min-w-0 flex-1 resize-none bg-transparent py-2 text-[15px] outline-none placeholder:text-muted-foreground"
            />
            <button
              type="button"
              aria-label="Attach file"
              onClick={() => fileInput.current?.click()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground press hover:bg-secondary"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Camera"
              onClick={() => cameraInput.current?.click()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted-foreground press hover:bg-secondary"
            >
              <Camera className="h-5 w-5" />
            </button>
          </div>

          <motion.button
            type="button"
            layout
            aria-label={hasText ? "Send message" : "Record voice message"}
            onClick={() => (hasText ? submit() : void startRecording())}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 480, damping: 24 }}
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-full text-brand-foreground shadow-soft",
              hasText ? "bg-brand" : "bg-foreground/85",
            )}
          >
            <AnimatePresence mode="wait" initial={false}>
              {hasText ? (
                <motion.span
                  key="send"
                  initial={{ scale: 0.4, rotate: -35, opacity: 0 }}
                  animate={{ scale: 1, rotate: 0, opacity: 1 }}
                  exit={{ scale: 0.4, rotate: 35, opacity: 0 }}
                >
                  <Send className="h-5 w-5" />
                </motion.span>
              ) : (
                <motion.span
                  key="mic"
                  initial={{ scale: 0.4, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.4, opacity: 0 }}
                >
                  <Mic className="h-5 w-5" />
                </motion.span>
              )}
            </AnimatePresence>
          </motion.button>
        </div>
      )}

      <input
        ref={fileInput}
        type="file"
        hidden
        accept="image/*,video/*,application/pdf,text/plain,.doc,.docx,.xlsx,.zip"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={cameraInput}
        type="file"
        hidden
        accept="image/*,video/*"
        capture="environment"
        onChange={(e) => {
          handleFiles(e.target.files);
          e.target.value = "";
        }}
      />
      {locked && null}
    </div>
  );
}
