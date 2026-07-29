"use client";

import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";

/**
 * The house entrance animation: a short lift and fade, once, on mount.
 *
 * Deliberately one primitive rather than per-surface animation. Motion here is
 * meant to say "this content just arrived", which needs to feel the same
 * everywhere or it reads as inconsistency rather than feedback.
 *
 * **transform and opacity only** (`tech-standards §13`). Animating anything
 * that affects layout would reflow every frame, and on the tasks board — a
 * horizontally scrolling track — a width or margin animation can transiently
 * overflow the viewport, which is exactly what `mobile.spec.ts` guards.
 *
 * `useReducedMotion` is checked in JS, not left to the CSS override in
 * `globals.css`: that override caps `animation-duration`/`transition-duration`,
 * and Motion drives values with `requestAnimationFrame` rather than CSS
 * transitions, so it would sail straight past it. When the user asks for
 * reduced motion the element renders in its final state with no animation at
 * all — not a faster one.
 */
export function Reveal({
  children,
  delay = 0,
  className,
}: {
  children: ReactNode;
  /** Seconds. Used to stagger siblings; keep the total under ~0.2s. */
  delay?: number;
  className?: string;
}) {
  const reduced = useReducedMotion();

  if (reduced) return <div className={className}>{children}</div>;

  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
