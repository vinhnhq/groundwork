import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { pushedRepo, touchesProjectDocs, verifySignature } from "@/lib/content/github/webhook";

const SECRET = "shhh";
const body = JSON.stringify({ hello: "world" });
const sign = (payload: string, secret = SECRET) =>
  `sha256=${createHmac("sha256", secret).update(payload).digest("hex")}`;

describe("verifySignature", () => {
  it("accepts a correctly signed body", () => {
    expect(verifySignature(body, sign(body), SECRET)).toEqual({ ok: true });
  });

  it("rejects a body signed with the wrong secret", () => {
    expect(verifySignature(body, sign(body, "wrong"), SECRET)).toMatchObject({ status: 401 });
  });

  it("rejects a tampered body", () => {
    const signature = sign(body);
    expect(verifySignature(`${body} `, signature, SECRET)).toMatchObject({ status: 401 });
  });

  it("rejects a missing or malformed header", () => {
    expect(verifySignature(body, null, SECRET)).toMatchObject({ status: 401 });
    expect(verifySignature(body, "sha1=abc", SECRET)).toMatchObject({ status: 401 });
  });

  /** timingSafeEqual throws on a length mismatch — the guard must come first. */
  it("rejects a truncated signature without throwing", () => {
    expect(() => verifySignature(body, "sha256=abc", SECRET)).not.toThrow();
    expect(verifySignature(body, "sha256=abc", SECRET)).toMatchObject({ status: 401 });
  });

  it("disables the endpoint when no secret is configured", () => {
    expect(verifySignature(body, sign(body), undefined)).toMatchObject({ status: 503 });
    expect(verifySignature(body, sign(body), "  ")).toMatchObject({ status: 503 });
  });
});

describe("push payload", () => {
  it("detects a push that touched the project docs", () => {
    expect(touchesProjectDocs({ commits: [{ modified: ["__project__/tasks/backlog.md"] }] })).toBe(
      true,
    );
    expect(touchesProjectDocs({ commits: [{ added: ["src/index.ts"] }] })).toBe(false);
    expect(touchesProjectDocs({})).toBe(false);
  });

  it("names the repo that was pushed", () => {
    expect(pushedRepo({ repository: { full_name: "acme/checkout" } })).toBe("acme/checkout");
    expect(pushedRepo({})).toBeNull();
  });
});
