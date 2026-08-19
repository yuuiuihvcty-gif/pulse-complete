import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Camera, Lock, Mic, Paperclip, Pause, Play, Send, Smile, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { duration } from "@/lib/format";
import { validateFile } from "@/lib/media";
import type { Message } from "@/lib/types";

const EMOJI = [
  "😀",
  "😁",
  "😂",
  "🤣",
  "😊",
  "😍",
  "😘",
  "😜",
  "🤩",
  "🥳",
  "😎",
  "🤔",
  "😴",
  "😢",
  "😭",
  "😡",
  "🙏",
  "👍",
  "👎",
  "👏",
  "🔥",
  "💯",
  "🎉",
  "✨",
  "❤️",
  "🧡",
  "💙",
  "💜",
  "🖤",
  "🤝",
  "🫶",
  "🙌",
  "💪",
  "🎧",
  "📚",
  "🎮",
  "☕",
  "🍕",
  "🌙",
  "⭐",
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
  const [paused, setPaused] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [levels, setLevels] = useState<number[]>([]);
  const [slide, setSlide] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const cancelled = useRef(false);
  const timer = useRef<number | null>(null);
  const raf = useRef<number | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const startPoint = useRef<{ x: number; y: number } | null>(null);
  const lockedRef = useRef(false);
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
    if (raf.current) cancelAnimationFrame(raf.current);
    raf.current = null;
    void audioCtx.current?.close().catch(() => {});
    audioCtx.current = null;
  };

  const startRecording = async () => {
    if (recorder.current) return;
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
        lockedRef.current = false;
        setPaused(false);
        setElapsed(0);
        setLevels([]);
        setSlide(0);
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
      setLevels([]);
      onActivity("recording");
      if (navigator.vibrate) navigator.vibrate(12);
      timer.current = window.setInterval(() => {
        if (recorder.current?.state === "recording") setElapsed((e) => e + 1);
      }, 1000);

      // Live amplitude meter — real waveform, not a fake animation
      try {
        const Ctx =
          window.AudioContext ??
          (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (Ctx) {
          const ctx = new Ctx();
          audioCtx.current = ctx;
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          ctx.createMediaStreamSource(stream).connect(analyser);
          const buf = new Uint8Array(analyser.frequencyBinCount);
          let last = 0;
          const tick = (t: number) => {
            raf.current = requestAnimationFrame(tick);
            if (t - last < 90) return;
            last = t;
            analyser.getByteTimeDomainData(buf);
            let peak = 0;
            for (const v of buf) peak = Math.max(peak, Math.abs(v - 128) / 128);
            setLevels((l) => [...l.slice(-39), Math.min(1, peak * 2.2)]);
          };
          raf.current = requestAnimationFrame(tick);
        }
      } catch {
        /* meter is optional */
      }
    } catch {
      toast.error("Microphone permission is needed to record");
    }
  };

  const elapsedRef = useRef(0);
  useEffect(() => {
    elapsedRef.current = elapsed;
    if (recording && !paused) onActivity("recording");
  }, [elapsed, recording, paused, onActivity]);

  const finishRecording = (cancel: boolean) => {
    cancelled.current = cancel;
    recorder.current?.stop();
    recorder.current = null;
  };

  const togglePause = () => {
    const rec = recorder.current;
    if (!rec) return;
    if (rec.state === "recording") {
      rec.pause();
      setPaused(true);
      onActivity("stop");
    } else if (rec.state === "paused") {
      rec.resume();
      setPaused(false);
      onActivity("recording");
    }
  };

  // Keep the hold gesture alive even if the pointer leaves the mic button.
  useEffect(() => {
    if (!recording || locked) return;
    const move = (e: PointerEvent) => onMicMove(e);
    const up = () => onMicUp();
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    window.addEventListener("pointercancel", up);
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      window.removeEventListener("pointercancel", up);
    };
  });

  // Press-and-hold gestures: slide left to cancel, slide up to lock hands-free.
  const onMicDown = (e: React.PointerEvent) => {
    if (hasText) return;
    startPoint.current = { x: e.clientX, y: e.clientY };
    void startRecording();
  };

  const onMicMove = (e: { clientX: number; clientY: number }) => {
    if (!startPoint.current || lockedRef.current) return;
    const dx = e.clientX - startPoint.current.x;
    const dy = e.clientY - startPoint.current.y;
    setSlide(Math.min(0, dx));
    if (dy < -64) {
      lockedRef.current = true;
      setLocked(true);
      setSlide(0);
      if (navigator.vibrate) navigator.vibrate(10);
    } else if (dx < -110) {
      startPoint.current = null;
      finishRecording(true);
    }
  };

  const onMicUp = () => {
    if (!startPoint.current) return;
    startPoint.current = null;
    setSlide(0);
    if (lockedRef.current) return; // hands-free: keep recording
    finishRecording(false);
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
      (file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
          ? "video"
          : "file");
    onSendAttachment({ file, filename: file.name, kind }, text.trim() || undefined);
    setText("");
  };

  const hasText = text.trim().length > 0;

  return (
    <div className="sticky bottom-0 z-30 border-t border-white/8 bg-background/92 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-2xl md:px-4">
      <AnimatePresence>
        {(replyTo || editing) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="mb-2 flex items-start gap-2 rounded-[14px] border border-brand/25 border-l-2 bg-brand/[0.06] px-3 py-2">
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
                  if (editing) {
                    onCancelEdit();
                    setText("");
                  } else {
                    onCancelReply();
                  }
                }}
                className="grid h-7 w-7 shrink-0 place-items-center rounded-[9px] border border-white/10 bg-white/[0.06] press"
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
            className="mb-2 grid max-h-40 grid-cols-10 gap-1 overflow-y-auto rounded-[16px] border border-white/10 bg-surface p-2 shadow-float scrollbar-slim"
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
        <div className="flex items-center gap-2">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex min-w-0 flex-1 items-center gap-3 rounded-[16px] border border-brand/30 bg-brand/[0.05] px-4 py-2.5"
          >
            <span
              className={cn(
                "h-2.5 w-2.5 rounded-full bg-destructive",
                paused ? "opacity-40" : "animate-pulse",
              )}
            />
            <span className="text-sm font-medium tabular-nums">{duration(elapsed)}</span>
            {!locked ? (
              <span
                className="flex-1 truncate text-center text-xs text-muted-foreground"
                style={{
                  transform: `translateX(${slide / 3}px)`,
                  opacity: 1 - Math.min(0.8, -slide / 140),
                }}
              >
                ‹ Slide to cancel · slide up to lock
              </span>
            ) : (
              <span className="flex h-6 flex-1 items-center gap-[3px] overflow-hidden" aria-hidden>
                {(levels.length ? levels : [0.05]).slice(-40).map((v, i) => (
                  <span
                    key={i}
                    className="w-[3px] flex-1 rounded-full bg-brand"
                    style={{ height: `${Math.max(12, v * 100)}%` }}
                  />
                ))}
              </span>
            )}
            {locked && (
              <button
                type="button"
                aria-label={paused ? "Resume recording" : "Pause recording"}
                onClick={togglePause}
                className="grid h-9 w-9 place-items-center rounded-[10px] bg-white/[0.08] press"
              >
                {paused ? <Play className="h-4 w-4" /> : <Pause className="h-4 w-4" />}
              </button>
            )}

            <button
              type="button"
              aria-label="Cancel recording"
              onClick={() => finishRecording(true)}
              className="grid h-9 w-9 place-items-center rounded-[10px] bg-white/[0.08] text-destructive press"
            >
              <Trash2 className="h-4 w-4" />
            </button>
            <button
              type="button"
              aria-label="Send voice message"
              onClick={() => finishRecording(false)}
              className="grid h-9 w-9 place-items-center rounded-[10px] bg-brand text-brand-foreground press"
            >
              <Send className="h-4 w-4" />
            </button>
          </motion.div>
          {!locked && (
            <motion.button
              type="button"
              aria-label="Release to send, slide up to lock"
              onPointerMove={onMicMove}
              onPointerUp={onMicUp}
              onPointerCancel={onMicUp}
              animate={{ scale: [1, 1.08, 1] }}
              transition={{ repeat: Infinity, duration: 1.4 }}
              className="relative grid h-11 w-11 shrink-0 place-items-center rounded-[13px] bg-brand text-brand-foreground shadow-soft"
            >
              <Mic className="h-5 w-5" />
              <span className="absolute -top-8 grid h-6 w-6 place-items-center rounded-[8px] bg-white/[0.08] text-muted-foreground">
                <Lock className="h-3.5 w-3.5" />
              </span>
            </motion.button>
          )}
        </div>
      ) : (
        <div className="flex items-end gap-2">
          <div className="flex min-w-0 flex-1 items-end gap-1 rounded-[16px] border border-white/10 bg-white/[0.035] px-2 py-1.5">
            <button
              type="button"
              aria-label="Emoji"
              onClick={() => setEmoji((v) => !v)}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-muted-foreground press hover:bg-white/[0.07]"
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
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-muted-foreground press hover:bg-white/[0.07]"
            >
              <Paperclip className="h-5 w-5" />
            </button>
            <button
              type="button"
              aria-label="Camera"
              onClick={() => cameraInput.current?.click()}
              className="grid h-9 w-9 shrink-0 place-items-center rounded-[10px] text-muted-foreground press hover:bg-white/[0.07]"
            >
              <Camera className="h-5 w-5" />
            </button>
          </div>

          <motion.button
            type="button"
            layout
            aria-label={hasText ? "Send message" : "Hold to record a voice message"}
            onClick={() => hasText && submit()}
            onPointerDown={onMicDown}
            onPointerMove={onMicMove}
            onPointerUp={onMicUp}
            onPointerCancel={onMicUp}
            whileTap={{ scale: 0.9 }}
            transition={{ type: "spring", stiffness: 480, damping: 24 }}
            className={cn(
              "grid h-11 w-11 shrink-0 place-items-center rounded-[13px] text-brand-foreground shadow-soft",
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
