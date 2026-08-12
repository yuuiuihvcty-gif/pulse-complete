import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";
import { BubbleObject, PulseCreature } from "./PulseCreature";

/** Deterministic pseudo-random so SSR and client agree. */
function seeded(n: number, seed = 7) {
  let h = seed;
  return Array.from({ length: n }, () => {
    h = (h * 1103515245 + 12345) % 2147483648;
    return (h >>> 8) / 8388608;
  });
}

/** Atmospheric particle/orb field — the deepest illustration layer. */
export function StarField({ count = 26, className }: { count?: number; className?: string }) {
  const reduce = useReducedMotion();
  const r = seeded(count * 3);
  const v = (i: number) => r[i] ?? 0.5;
  return (
    <div className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)} aria-hidden>
      {Array.from({ length: count }).map((_, i) => {
        const size = 2 + v(i * 3) * 4;
        return (
          <span
            key={i}
            className={cn("absolute rounded-full bg-brand-foreground/70", !reduce && "animate-twinkle")}
            style={{
              left: `${v(i * 3 + 1) * 100}%`,
              top: `${v(i * 3 + 2) * 100}%`,
              width: size,
              height: size,
              animationDelay: `${v(i * 3) * 4}s`,
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * Layered illustrated environment with pointer parallax.
 * BACKGROUND (slow) → MIDGROUND (medium) → FOREGROUND (fast) → UI.
 */
export function ParallaxScene({
  children,
  className,
  intensity = 1,
}: {
  children?: React.ReactNode;
  className?: string;
  intensity?: number;
}) {
  const reduce = useReducedMotion();
  const [p, setP] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (reduce) return;
    const onMove = (e: PointerEvent) => {
      setP({
        x: (e.clientX / window.innerWidth - 0.5) * 2,
        y: (e.clientY / window.innerHeight - 0.5) * 2,
      });
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [reduce]);

  const shift = (depth: number) => ({
    x: p.x * depth * 12 * intensity,
    y: p.y * depth * 12 * intensity,
  });

  return (
    <div className={cn("relative overflow-hidden bg-background wallpaper", className)}>
      {/* BACKGROUND — atmospheric shapes */}
      <motion.div
        animate={shift(0.4)}
        transition={{ type: "spring", stiffness: 60, damping: 20 }}
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        <div className="absolute -left-24 -top-24 h-72 w-72 rounded-full bg-brand/25 blur-3xl animate-drift" />
        <div className="absolute -right-20 top-1/3 h-64 w-64 rounded-full bg-orchid/20 blur-3xl animate-drift" style={{ animationDelay: "3s" }} />
        <div className="absolute bottom-0 left-1/4 h-56 w-56 rounded-full bg-cyan/20 blur-3xl animate-drift" style={{ animationDelay: "6s" }} />
        <StarField />
      </motion.div>

      {/* MIDGROUND — floating communication objects */}
      <motion.div
        animate={shift(0.9)}
        transition={{ type: "spring", stiffness: 60, damping: 20 }}
        className="pointer-events-none absolute inset-0"
        aria-hidden
      >
        <BubbleObject className="absolute left-6 top-16 w-16 opacity-80" tone="coral" delay={0.4} />
        <BubbleObject className="absolute right-8 top-28 w-12 opacity-70" tone="amber" delay={1.2} />
        <BubbleObject className="absolute bottom-24 right-16 w-14 opacity-70" tone="lime" delay={2} />
        <svg viewBox="0 0 400 200" className="absolute inset-x-0 top-1/3 w-full opacity-30">
          <path d="M-20 150 C80 60 200 190 420 70" stroke="var(--color-brand)" strokeWidth="3" strokeDasharray="10 14" fill="none" strokeLinecap="round" />
        </svg>
      </motion.div>

      {/* FOREGROUND + UI */}
      <div className="relative">{children}</div>
    </div>
  );
}

/** Signature Pulse loading loop: the creature tosses a message bubble upward. */
export function PulseLoader({ label = "Loading Pulse…" }: { label?: string }) {
  const reduce = useReducedMotion();
  return (
    <div className="grid place-items-center gap-4 py-14" role="status" aria-live="polite">
      <div className="relative h-32 w-28">
        <motion.div
          className="absolute left-1/2 top-0 w-9 -translate-x-1/2"
          animate={reduce ? {} : { y: [46, 0, 46], rotate: [-8, 8, -8] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
        >
          <BubbleObject className="w-full" tone="amber" />
        </motion.div>
        <div className="absolute inset-x-0 bottom-0 h-24">
          <PulseCreature mood="happy" look="up" />
        </div>
      </div>
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}
