import { motion } from "motion/react";
import type { ReactNode } from "react";
import { SPRING } from "@/lib/motion";

export type EmptyArt =
  | "conversations"
  | "contacts"
  | "search"
  | "offline"
  | "error"
  | "stories"
  | "calls"
  | "notifications";

const accents: Record<EmptyArt, string> = {
  conversations: "bg-lime",
  contacts: "bg-cyan",
  search: "bg-amber",
  offline: "bg-coral",
  error: "bg-coral",
  stories: "bg-lime",
  calls: "bg-cyan",
  notifications: "bg-amber",
};

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
  const accent = accents[scene];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={SPRING.cinematic}
      className="mx-auto flex max-w-sm flex-col items-center px-6 py-16 text-center"
    >
      <div className="relative mb-7 h-28 w-44" aria-hidden>
        <div className="absolute inset-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-lime shadow-[0_0_36px_rgb(190_240_148_/_0.8)]" />
        <div className="absolute inset-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 rounded-full border border-lime/35 animate-signal" />
        <div className="absolute inset-1/2 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-lime/15" />
        <span
          className={`absolute left-1/2 top-1/2 h-px w-40 -translate-x-1/2 ${accent} opacity-60`}
        />
        <span
          className={`absolute left-1/2 top-1/2 h-40 w-px -translate-y-1/2 ${accent} opacity-20`}
        />
        <span className="absolute left-8 top-5 h-1.5 w-1.5 rounded-full bg-cyan/70" />
        <span className="absolute bottom-6 right-9 h-1.5 w-1.5 rounded-full bg-amber/70" />
      </div>
      {icon && <span className="sr-only">{icon}</span>}
      <h2 className="font-display text-xl font-semibold tracking-tight text-balance">{title}</h2>
      {description && (
        <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </motion.div>
  );
}

export function ListSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <ul className="space-y-1 p-2" aria-label="Loading">
      {Array.from({ length: rows }).map((_, i) => (
        <li key={i} className="flex items-center gap-3 rounded-2xl p-3">
          <div className="h-11 w-11 rounded-2xl skeleton" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-1/3 rounded skeleton" />
            <div className="h-3 w-2/3 rounded skeleton" />
          </div>
          <div className="h-3 w-10 rounded skeleton" />
        </li>
      ))}
    </ul>
  );
}

export function BubbleSkeleton() {
  return (
    <div className="space-y-4 p-4" aria-label="Loading messages">
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
