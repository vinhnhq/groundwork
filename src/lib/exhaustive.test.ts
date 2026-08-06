import { describe, expect, it } from "vitest";

import { assertNever } from "@/lib/exhaustive";

describe("assertNever", () => {
  it("throws when reached at runtime", () => {
    expect(() => assertNever("unexpected" as never)).toThrow(/Unexpected value/);
  });
});
