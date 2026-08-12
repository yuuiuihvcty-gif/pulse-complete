import { motion, useReducedMotion } from "motion/react";
import { cn } from "@/lib/utils";

/**
 * PULSE CREATURE — the original Pulse mascot.
 * Built purely from circles, capsules and curved paths: a friendly
 * "signal creature" that carries messages. Readable down to 24px.
 */

export type CreatureMood =
  | "idle"
  | "happy"
  | "shy"
  | "wave"
  | "typing"
  | "listening"
  | "celebrate"
  | "confused"
  | "sleepy"
  | "searching"
  | "offline"
  | "repair";

export type LookDir = "center" | "left" | "right" | "up" | "down";

const lookOffset: Record<LookDir, { x: number; y: number }> = {
  center: { x: 0, y: 0 },
  left: { x: -3.2, y: 0 },
  right: { x: 3.2, y: 0 },
  up: { x: 0, y: -2.4 },
  down: { x: 0, y: 2.6 },
};

export function PulseCreature({
  mood = "idle",
  look = "center",
  className,
  variant = "brand",
}: {
  mood?: CreatureMood;
  look?: LookDir;
  className?: string;
  variant?: "brand" | "coral" | "cyan" | "amber";
}) {
  const reduce = useReducedMotion();
  const eyes = lookOffset[mood === "shy" ? "down" : look];
  const asleep = mood === "sleepy";
  const shy = mood === "shy";

  const bodyFrom = `var(--color-${variant === "brand" ? "brand" : variant})`;
  const bodyTo = variant === "brand" ? "var(--color-brand-2)" : "var(--color-brand)";

  const bob = reduce
    ? {}
    : {
        animate: { y: [0, -4, 0], rotate: mood === "celebrate" ? [-3, 3, -3] : [0, 0.8, 0] },
        transition: { duration: mood === "celebrate" ? 1.1 : 3.4, repeat: Infinity, ease: "easeInOut" as const },
      };

  return (
    <motion.svg
      viewBox="0 0 200 200"
      role="img"
      aria-hidden
      className={cn("h-full w-full overflow-visible", className)}
      {...bob}
    >
      <defs>
        <linearGradient id={`pc-body-${variant}`} x1="0" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor={bodyFrom} />
          <stop offset="100%" stopColor={bodyTo} />
        </linearGradient>
        <radialGradient id="pc-shine" cx="0.32" cy="0.24" r="0.55">
          <stop offset="0%" stopColor="var(--color-surface)" stopOpacity="0.5" />
          <stop offset="100%" stopColor="var(--color-surface)" stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* ground shadow */}
      <ellipse cx="100" cy="176" rx="42" ry="8" fill="var(--color-ink)" opacity="0.14" />

      {/* antenna + signal dot */}
      <path
        d="M100 58 C100 42 108 34 118 28"
        stroke={bodyFrom}
        strokeWidth="6"
        strokeLinecap="round"
        fill="none"
      />
      <motion.circle
        cx="120"
        cy="25"
        r="8"
        fill="var(--color-amber)"
        animate={reduce ? {} : { scale: [1, 1.18, 1], opacity: [0.85, 1, 0.85] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "120px 25px" }}
      />

      {/* body: rounded capsule */}
      <rect x="46" y="56" width="108" height="112" rx="52" fill={`url(#pc-body-${variant})`} />
      <rect x="46" y="56" width="108" height="112" rx="52" fill="url(#pc-shine)" />

      {/* feet */}
      <rect x="70" y="162" width="24" height="14" rx="7" fill={bodyTo} />
      <rect x="106" y="162" width="24" height="14" rx="7" fill={bodyTo} />

      {/* arms */}
      <motion.path
        d="M50 112 C34 108 26 118 24 128"
        stroke={bodyFrom}
        strokeWidth="11"
        strokeLinecap="round"
        fill="none"
        style={{ transformOrigin: "50px 112px" }}
        animate={
          reduce
            ? {}
            : mood === "wave"
              ? { rotate: [0, -34, 0, -28, 0] }
              : mood === "typing"
                ? { rotate: [0, -8, 0] }
                : { rotate: 0 }
        }
        transition={{ duration: mood === "typing" ? 0.5 : 1.6, repeat: Infinity }}
      />
      <motion.path
        d="M150 112 C166 108 174 118 176 128"
        stroke={bodyFrom}
        strokeWidth="11"
        strokeLinecap="round"
        fill="none"
        style={{ transformOrigin: "150px 112px" }}
        animate={
          reduce
            ? {}
            : mood === "celebrate"
              ? { rotate: [0, -40, 0] }
              : mood === "typing"
                ? { rotate: [0, 8, 0] }
                : { rotate: 0 }
        }
        transition={{ duration: mood === "typing" ? 0.5 : 1.1, repeat: Infinity, delay: 0.12 }}
      />

      {/* face plate */}
      <rect x="62" y="76" width="76" height="58" rx="28" fill="var(--color-ink)" opacity="0.9" />

      {/* eyes */}
      <motion.g
        animate={{ x: eyes.x, y: eyes.y }}
        transition={{ type: "spring", stiffness: 260, damping: 20 }}
      >
        {asleep ? (
          <>
            <path d="M78 104 q9 8 18 0" stroke="var(--color-surface)" strokeWidth="4" fill="none" strokeLinecap="round" />
            <path d="M104 104 q9 8 18 0" stroke="var(--color-surface)" strokeWidth="4" fill="none" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="87" cy="102" rx="8" ry="9.5" fill="var(--color-surface)" className="animate-blink" style={{ transformOrigin: "87px 102px" }} />
            <ellipse cx="113" cy="102" rx="8" ry="9.5" fill="var(--color-surface)" className="animate-blink" style={{ transformOrigin: "113px 102px" }} />
            <circle cx={87 + eyes.x * 0.3} cy={103 + eyes.y * 0.3} r="3.2" fill="var(--color-ink)" />
            <circle cx={113 + eyes.x * 0.3} cy={103 + eyes.y * 0.3} r="3.2" fill="var(--color-ink)" />
          </>
        )}
      </motion.g>

      {/* mouth */}
      {mood === "confused" ? (
        <path d="M92 122 q8 -6 16 0" stroke="var(--color-surface)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
      ) : mood === "offline" ? (
        <path d="M92 124 h16" stroke="var(--color-surface)" strokeWidth="3.5" strokeLinecap="round" />
      ) : (
        <path
          d="M92 119 q8 8 16 0"
          stroke="var(--color-surface)"
          strokeWidth="3.5"
          fill="none"
          strokeLinecap="round"
        />
      )}

      {/* shy: hands over the face */}
      {shy && (
        <motion.g
          initial={{ y: 26, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
        >
          <rect x="66" y="88" width="30" height="18" rx="9" fill={bodyTo} />
          <rect x="104" y="88" width="30" height="18" rx="9" fill={bodyTo} />
        </motion.g>
      )}

      {/* mood props */}
      {mood === "listening" && (
        <g>
          <path d="M60 92 a40 40 0 0 1 80 0" stroke="var(--color-cyan)" strokeWidth="8" fill="none" strokeLinecap="round" />
          <rect x="50" y="90" width="16" height="26" rx="8" fill="var(--color-cyan)" />
          <rect x="134" y="90" width="16" height="26" rx="8" fill="var(--color-cyan)" />
        </g>
      )}

      {mood === "searching" && (
        <g>
          <rect
            x="118"
            y="72"
            width="66"
            height="20"
            rx="10"
            fill="var(--color-amber)"
            transform="rotate(-24 118 72)"
          />
          <circle cx="174" cy="46" r="12" fill="var(--color-surface)" stroke="var(--color-amber)" strokeWidth="5" />
        </g>
      )}

      {mood === "repair" && (
        <g>
          <path
            d="M132 120 h44 a10 10 0 0 1 10 10 v18 a10 10 0 0 1 -10 10 h-30 l-10 10 v-10 a10 10 0 0 1 -10 -10 v-18 a10 10 0 0 1 6 -10 z"
            fill="var(--color-surface)"
            stroke="var(--color-coral)"
            strokeWidth="5"
          />
          <path d="M150 128 l-8 20 M158 132 l10 14" stroke="var(--color-coral)" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}

      {(mood === "happy" || mood === "celebrate") && !reduce && (
        <g>
          {[
            { x: 40, y: 54, c: "var(--color-amber)" },
            { x: 164, y: 76, c: "var(--color-coral)" },
            { x: 152, y: 40, c: "var(--color-lime)" },
          ].map((s, i) => (
            <motion.path
              key={i}
              d={`M${s.x} ${s.y - 8} l2.6 6.4 6.4 2.6 -6.4 2.6 -2.6 6.4 -2.6 -6.4 -6.4 -2.6 6.4 -2.6 z`}
              fill={s.c}
              animate={{ scale: [0.6, 1, 0.6], opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.35 }}
              style={{ transformOrigin: `${s.x}px ${s.y}px` }}
            />
          ))}
        </g>
      )}

      {mood === "typing" && (
        <g>
          {[0, 1, 2].map((i) => (
            <motion.circle
              key={i}
              cx={82 + i * 18}
              cy={44}
              r="5"
              fill="var(--color-brand)"
              animate={reduce ? {} : { y: [0, -6, 0], opacity: [0.4, 1, 0.4] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.16 }}
            />
          ))}
        </g>
      )}
    </motion.svg>
  );
}

/** A floating Pulse message bubble object used across illustrations. */
export function BubbleObject({
  className,
  tone = "coral",
  delay = 0,
}: {
  className?: string;
  tone?: "coral" | "amber" | "lime" | "cyan" | "orchid" | "brand";
  delay?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.svg
      viewBox="0 0 100 84"
      aria-hidden
      className={cn("overflow-visible", className)}
      animate={reduce ? {} : { y: [0, -12, 0], rotate: [-2, 2, -2] }}
      transition={{ duration: 6 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    >
      <path
        d="M14 6 h72 a12 12 0 0 1 12 12 v36 a12 12 0 0 1 -12 12 h-44 l-18 16 v-16 h-10 a12 12 0 0 1 -12 -12 v-36 a12 12 0 0 1 12 -12 z"
        fill={`var(--color-${tone})`}
      />
      <g fill="var(--color-surface)" opacity="0.85">
        <rect x="24" y="24" width="52" height="7" rx="3.5" />
        <rect x="24" y="39" width="34" height="7" rx="3.5" />
      </g>
    </motion.svg>
  );
}
