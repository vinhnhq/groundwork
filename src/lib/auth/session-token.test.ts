import { describe, expect, it } from "vitest";
import { signToken, type TokenPayload, verifyToken } from "@/lib/auth/session-token";

const SECRET = "test-secret";
const NOW = new Date("2026-07-28T12:00:00Z");
const future = Math.floor(NOW.getTime() / 1000) + 3600;

const payload = (over: Partial<TokenPayload> = {}): TokenPayload => ({
  sub: "u1",
  email: "vinh@example.com",
  name: "Vinh",
  role: "engineer",
  exp: future,
  ...over,
});

describe("session tokens", () => {
  it("round-trips a payload", async () => {
    const token = await signToken(payload(), SECRET);
    expect(await verifyToken(token, SECRET, NOW)).toEqual(payload());
  });

  /** The whole reason for signing: a client must not type themselves an upgrade. */
  it("rejects a tampered role", async () => {
    const token = await signToken(payload({ role: "client" }), SECRET);
    const [body] = token.split(".");

    const forged = JSON.parse(atob(body.replace(/-/g, "+").replace(/_/g, "/")));
    forged.role = "engineer";
    const forgedBody = btoa(JSON.stringify(forged))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");

    expect(await verifyToken(`${forgedBody}.${token.split(".")[1]}`, SECRET, NOW)).toBeNull();
  });

  it("rejects a token signed with another secret", async () => {
    const token = await signToken(payload(), "other-secret");
    expect(await verifyToken(token, SECRET, NOW)).toBeNull();
  });

  it("rejects an expired token", async () => {
    const token = await signToken(payload({ exp: Math.floor(NOW.getTime() / 1000) - 1 }), SECRET);
    expect(await verifyToken(token, SECRET, NOW)).toBeNull();
  });

  it("rejects garbage rather than throwing", async () => {
    expect(await verifyToken(undefined, SECRET, NOW)).toBeNull();
    expect(await verifyToken("", SECRET, NOW)).toBeNull();
    expect(await verifyToken("nodot", SECRET, NOW)).toBeNull();
    expect(await verifyToken("not.base64!!", SECRET, NOW)).toBeNull();
  });

  it("rejects an unknown role", async () => {
    const token = await signToken({ ...payload(), role: "admin" } as never, SECRET);
    expect(await verifyToken(token, SECRET, NOW)).toBeNull();
  });
});
