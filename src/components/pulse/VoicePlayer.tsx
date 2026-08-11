import { useEffect, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";
import { motion } from "motion/react";
import { cn } from "@/lib/utils";
import { duration } from "@/lib/format";
import { useSignedUrl } from "@/hooks/use-signed-url";

function makeBars(seed: string, count = 34) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) % 100003;
  return Array.from({ length: count }, (_, i) => {
    h = (h * 1103515245 + 12345) % 2147483648;
    return 0.25 + ((h >> (i % 7)) % 100) / 130;
  });
}

export function VoicePlayer({
  path,
  seconds,
  outgoing,
}: {
  path: string;
  seconds?: number | undefined;
  outgoing?: boolean | undefined;
}) {

  const { url } = useSignedUrl(path);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(seconds ?? 0);
  const bars = makeBars(path);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onTime = () => setProgress(el.duration ? el.currentTime / el.duration : 0);
    const onMeta = () => Number.isFinite(el.duration) && setTotal(el.duration);
    const onEnd = () => {
      setPlaying(false);
      setProgress(0);
    };
    el.addEventListener("timeupdate", onTime);
    el.addEventListener("loadedmetadata", onMeta);
    el.addEventListener("ended", onEnd);
    return () => {
      el.removeEventListener("timeupdate", onTime);
      el.removeEventListener("loadedmetadata", onMeta);
      el.removeEventListener("ended", onEnd);
    };
  }, [url]);

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play();
      setPlaying(true);
    }
  };

  return (
    <div className="flex w-56 items-center gap-3 py-0.5">
      {url && <audio ref={audioRef} src={url} preload="metadata" />}
      <button
        type="button"
        onClick={toggle}
        disabled={!url}
        aria-label={playing ? "Pause voice message" : "Play voice message"}
        className={cn(
          "grid h-9 w-9 shrink-0 place-items-center rounded-full press",
          outgoing ? "bg-bubble-out-foreground/20" : "bg-brand-soft text-brand",
        )}
      >
        {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
      </button>

      <div className="flex h-8 min-w-0 flex-1 items-center gap-[3px]">
        {bars.map((b, i) => {
          const reached = i / bars.length <= progress;
          return (
            <motion.span
              key={i}
              className={cn(
                "w-[3px] shrink-0 rounded-full",
                outgoing
                  ? reached
                    ? "bg-bubble-out-foreground"
                    : "bg-bubble-out-foreground/35"
                  : reached
                    ? "bg-brand"
                    : "bg-muted-foreground/30",
              )}
              style={{ height: `${Math.round(b * 28)}px` }}
              animate={playing && reached ? { scaleY: [1, 0.6, 1] } : { scaleY: 1 }}
              transition={{ duration: 0.6, repeat: playing ? Infinity : 0, delay: (i % 5) * 0.06 }}
            />
          );
        })}
      </div>

      <span className="shrink-0 text-[11px] tabular-nums opacity-80">
        {duration(total || 0)}
      </span>
    </div>
  );
}
