import { describe, expect, it } from "vitest";

import { secretEquals } from "@/lib/secure-compare";

describe("secretEquals", () => {
  it("accepts equal strings", () => {
    expect(secretEquals("s3cret-token", "s3cret-token")).toBe(true);
  });

  it("rejects a different string of the same length", () => {
    expect(secretEquals("s3cret-token", "s3cret-tokeX")).toBe(false);
  });

  it("rejects a length mismatch instead of throwing", () => {
    expect(secretEquals("short", "a-much-longer-secret")).toBe(false);
    expect(secretEquals("", "x")).toBe(false);
  });

  it("compares bytes, not rendered text", () => {
    // NFC and NFD spell the same word with different byte sequences.
    const nfc = "café".normalize("NFC");
    const nfd = "café".normalize("NFD");
    expect(nfc).not.toBe(nfd);
    expect(secretEquals(nfc, nfd)).toBe(false);
  });
});
