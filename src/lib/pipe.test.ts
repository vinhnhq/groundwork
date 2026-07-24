import { describe, expect, it } from "vitest";
import { pipe } from "@/lib/pipe";

describe("pipe", () => {
  it("returns the value unchanged with no fns", () => {
    expect(pipe(42)).toBe(42);
  });

  it("applies fns left-to-right", () => {
    const result = pipe(
      3,
      (n) => n + 1,
      (n) => n * 2,
      (n) => `=${n}`,
    );
    expect(result).toBe("=8");
  });
});
