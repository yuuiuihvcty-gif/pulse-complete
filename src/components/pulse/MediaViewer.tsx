import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Download, Share2, X } from "lucide-react";
import { useSignedUrl } from "@/hooks/use-signed-url";
import { toast } from "sonner";

export type MediaItem = { path: string; type: "image" | "video"; caption?: string | null };

function Frame({ item }: { item: MediaItem }) {
  const { url } = useSignedUrl(item.path);
  const [zoomed, setZoomed] = useState(false);
  if (!url) return <div className="h-64 w-64 rounded-3xl skeleton" />;
  if (item.type === "video")
    return <video src={url} controls autoPlay className="max-h-[80vh] max-w-full rounded-2xl" />;
  return (
    <motion.img
      src={url}
      alt={item.caption ?? "Shared photo"}
      onClick={() => setZoomed((z) => !z)}
      animate={{ scale: zoomed ? 1.8 : 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 26 }}
      className="max-h-[80vh] max-w-full cursor-zoom-in rounded-2xl object-contain"
    />
  );
}

export function MediaViewer({
  items,
  index,
  onClose,
}: {
  items: MediaItem[];
  index: number;
  onClose: () => void;
}) {
  const [i, setI] = useState(index);
  const item = items[i];
  const { url } = useSignedUrl(item?.path);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") setI((v) => Math.min(v + 1, items.length - 1));
      if (e.key === "ArrowLeft") setI((v) => Math.max(v - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [items.length, onClose]);

  if (!item) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex flex-col bg-foreground/95 backdrop-blur-md"
      >
        <div className="flex items-center justify-between p-4">
          <span className="text-xs font-medium text-background/70">
            {i + 1} / {items.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              aria-label="Share"
              onClick={async () => {
                if (!url) return;
                if (navigator.share) {
                  await navigator.share({ url }).catch(() => undefined);
                } else {
                  await navigator.clipboard.writeText(url);
                  toast.success("Link copied");
                }
              }}
              className="grid h-10 w-10 place-items-center rounded-full bg-background/15 text-background press"
            >
              <Share2 className="h-4 w-4" />
            </button>
            <a
              href={url ?? undefined}
              download
              aria-label="Download"
              className="grid h-10 w-10 place-items-center rounded-full bg-background/15 text-background press"
            >
              <Download className="h-4 w-4" />
            </a>
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="grid h-10 w-10 place-items-center rounded-full bg-background/15 text-background press"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        <motion.div
          key={item.path}
          drag="y"
          dragConstraints={{ top: 0, bottom: 0 }}
          dragElastic={0.35}
          onDragEnd={(_, info) => Math.abs(info.offset.y) > 120 && onClose()}
          initial={{ opacity: 0, scale: 0.94 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 240, damping: 26 }}
          className="flex flex-1 items-center justify-center px-4 pb-4"
        >
          <Frame item={item} />
        </motion.div>

        {item.caption && (
          <p className="px-6 pb-4 text-center text-sm text-background/85">{item.caption}</p>
        )}

        {items.length > 1 && (
          <div className="flex justify-center gap-2 pb-8">
            {items.map((m, idx) => (
              <button
                key={m.path}
                type="button"
                aria-label={`View item ${idx + 1}`}
                onClick={() => setI(idx)}
                className={
                  idx === i
                    ? "h-1.5 w-6 rounded-full bg-background"
                    : "h-1.5 w-1.5 rounded-full bg-background/40"
                }
              />
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
