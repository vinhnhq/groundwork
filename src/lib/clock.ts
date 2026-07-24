/**
 * Clock seam — derivers that need time take a `Clock` (or `now: Date`) as an
 * explicit parameter; never call `Date.now()` directly (tech-standards §3).
 */
export interface Clock {
  now: () => Date;
}

export const systemClock: Clock = { now: () => new Date() };

export const makeFixedClock = (at: Date): Clock => ({ now: () => at });
