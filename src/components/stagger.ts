/**
 * Stagger delay for a list of revealed siblings, in seconds.
 *
 * Deliberately NOT in `reveal.tsx`: that module is `"use client"`, which turns
 * every export into a client reference, and a server component calling one gets
 * "Attempted to call staggerDelay() from the server". The overview cockpit is a
 * server component, so the pure helper has to live in a module with no
 * directive — importable from both sides.
 *
 * Capped, because past a handful of items the last one waits long enough that
 * the page feels slow rather than alive: everything beyond `max` shares the
 * final delay instead of extending the cascade.
 */
export function staggerDelay(index: number, step = 0.04, max = 5): number {
  return Math.min(index, max) * step;
}
