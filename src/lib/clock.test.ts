import { describe, expect, it } from "vitest";

import { makeFixedClock, systemClock } from "@/lib/clock";

describe("clock", () => {
  it("systemClock is within 1s of real now", () => {
    expect(Math.abs(systemClock.now().getTime() - Date.now())).toBeLessThan(1000);
  });

  it("makeFixedClock returns the fixed instant", () => {
    const at = new Date("2026-01-01T00:00:00Z");
    const clock = makeFixedClock(at);
    expect(clock.now()).toEqual(at);
    expect(clock.now()).toEqual(at);
  });
});
