import { motion } from "motion/react";
import type { ReactNode } from "react";
import { SPRING } from "@/lib/motion";
import { BubbleObject, PulseCreature, type CreatureMood } from "./illo/PulseCreature";

export type EmptyArt = "conversations" | "contacts" | "search" | "offline" | "error" | "stories";

const art: Record<EmptyArt, { mood: CreatureMood; tone: "coral" | "amber" | "lime" | "cyan" }> = {
  conversations: { mood: "happy", tone: "coral" },
  contacts: { mood: "searching", tone: "amber" },
  search: { mood: "searching", tone: "cyan" },
  offline: { mood: "offline", tone: "amber" },
  error: { mood: "repair", tone: "coral" },
  stories: { mood: "wave", tone: "lime" },
};

/**
 * Illustrated Pulse empty state — the mascot always carries the emotion,
 * copy stays human (never a raw backend error).
 */
export function EmptyState({
  scene = "conversations",
  icon,
  title,
  description,
  action,
}: {
  scene?: EmptyArt;
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  const { mood, tone } = art[scene];

  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={SPRING.cinematic}
      className="mx-auto flex max-w-xs flex-col items-center px-6 py-14 text-center"
    >
      <div className="relative mb-6 h-40 w-44">
        {/* soft atmosphere */}
        <div className="absolute inset-0 rounded-full bg-brand/10 blur-2xl" aria-hidden />
        {scene === "conversations" ? (
          <>
            <div className="absolute inset-x-4 bottom-6 top-0">
              <PulseCreature mood={mood} look="down" />
            </div>
            <BubbleObject className="absolute inset-x-6 bottom-0 w-32" tone={tone} />
          </>
        ) : (
          <>
            <div className="absolute inset-2">
              <PulseCreature mood={mood} />
            </div>
            <BubbleObject className="absolute -right-1 bottom-1 w-10 opacity-90" tone={tone} delay={0.6} />
          </>
        )}
        {icon && <span className="sr-only">{icon}</span>}
      </div>
      <h2 className="font-display text-xl font-semibold tracking-tight">{title}</h2>
      {description && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="space-y-1 p-2" aria-hidden>
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 rounded-3xl p-3">
          <div className="h-12 w-12 rounded-full skeleton" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded-full skeleton" />
            <div className="h-3 w-2/3 rounded-full skeleton" />
          </div>
        </li>
      ))}
    </ul>
  );
}

export function BubbleSkeleton() {
  return (
    <div className="space-y-4 p-4" aria-hidden>
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className={i % 2 ? "flex justify-end" : "flex justify-start"}>
          <div
            className={i % 2 ? "h-10 skeleton bubble-out-shape" : "h-10 skeleton bubble-in-shape"}
            style={{ width: `${45 + ((i * 17) % 35)}%` }}
          />
        </div>
      ))}
    </div>
  );
}
