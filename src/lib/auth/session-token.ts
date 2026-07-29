import { isRole, type Role } from "@/lib/auth/types";

/**
 * Signed session tokens: `base64url(payload).base64url(hmac)`.
 *
 * The v1 mock treated *any* value of the session cookie as a valid admin, which
 * was survivable when the only thing behind it was a demo. With roles (R1) it
 * is not: an unsigned cookie means a client can type themselves into the
 * engineer role. So the payload is HMAC-signed and verified on every request.
 *
 * Built on Web Crypto rather than `node:crypto` because the proxy runs on the
 * edge runtime, where `node:crypto` is unavailable — and the proxy is precisely
 * where the check has to happen.
 */

export type TokenPayload = {
  sub: string;
  email: string;
  name: string;
  role: Role;
  /** Unix seconds. */
  exp: number;
};

const encoder = new TextEncoder();
const decoder = new TextDecoder();

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded.padEnd(Math.ceil(padded.length / 4) * 4, "="));
    return Uint8Array.from(binary, (c) => c.charCodeAt(0));
  } catch {
    return null;
  }
}

async function key(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
}

async function mac(body: string, secret: string): Promise<string> {
  const signature = await crypto.subtle.sign("HMAC", await key(secret), encoder.encode(body));
  return toBase64Url(new Uint8Array(signature));
}

/** Constant-time string compare — a fast reject leaks the signature byte by byte. */
function equals(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function signToken(payload: TokenPayload, secret: string): Promise<string> {
  const body = toBase64Url(encoder.encode(JSON.stringify(payload)));
  return `${body}.${await mac(body, secret)}`;
}

/** Returns the payload only when the signature checks out AND it is unexpired. */
export async function verifyToken(
  token: string | undefined,
  secret: string,
  now: Date = new Date(),
): Promise<TokenPayload | null> {
  if (!token) return null;

  const [body, signature] = token.split(".");
  if (!body || !signature) return null;
  if (!equals(signature, await mac(body, secret))) return null;

  const bytes = fromBase64Url(body);
  if (!bytes) return null;

  try {
    const payload = JSON.parse(decoder.decode(bytes)) as Partial<TokenPayload>;
    if (
      typeof payload.sub !== "string" ||
      typeof payload.email !== "string" ||
      typeof payload.name !== "string" ||
      typeof payload.exp !== "number" ||
      typeof payload.role !== "string" ||
      !isRole(payload.role)
    ) {
      return null;
    }

    if (payload.exp * 1000 <= now.getTime()) return null;
    return payload as TokenPayload;
  } catch {
    return null;
  }
}
