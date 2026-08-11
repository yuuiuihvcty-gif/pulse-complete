/** Pulse motion tokens — shared timing/spring language. */

export const DUR = {
  micro: 0.14,
  small: 0.22,
  standard: 0.32,
  cinematic: 0.52,
} as const;

export const EASE = [0.22, 0.61, 0.36, 1] as const;

export const SPRING = {
  press: { type: "spring", stiffness: 620, damping: 26, mass: 0.5 },
  pop: { type: "spring", stiffness: 520, damping: 20, mass: 0.6 },
  settle: { type: "spring", stiffness: 340, damping: 28, mass: 0.7 },
  layout: { type: "spring", stiffness: 420, damping: 34 },
  cinematic: { type: "spring", stiffness: 190, damping: 24 },
} as const;

export const fadeUp = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: DUR.standard, ease: EASE },
} as const;
