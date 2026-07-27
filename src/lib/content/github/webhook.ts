import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Push-webhook plumbing (S3), kept pure so the security-relevant half is
 * actually tested.
 */

export type SignatureCheck = { ok: true } | { ok: false; status: 401 | 503; message: string };

/**
 * Verify GitHub's `x-hub-signature-256` over the raw body.
 *
 * Compared with `timingSafeEqual`, and the length is checked first because
 * `timingSafeEqual` throws on a length mismatch rather than returning false.
 * An unsigned webhook endpoint lets anyone force cache churn, so a missing
 * secret disables the endpoint rather than skipping the check.
 */
export function verifySignature(
  rawBody: string,
  header: string | null,
  secret: string | undefined,
): SignatureCheck {
  if (!secret?.trim()) {
    return {
      ok: false,
      status: 503,
      message: "GITHUB_WEBHOOK_SECRET is not configured; the webhook is disabled.",
    };
  }

  if (!header?.startsWith("sha256=")) {
    return { ok: false, status: 401, message: "Missing x-hub-signature-256." };
  }

  const expected = `sha256=${createHmac("sha256", secret).update(rawBody).digest("hex")}`;
  const a = Buffer.from(header);
  const b = Buffer.from(expected);

  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return { ok: false, status: 401, message: "Bad signature." };
  }

  return { ok: true };
}

export type PushPayload = {
  repository?: { full_name?: string };
  commits?: { added?: string[]; removed?: string[]; modified?: string[] }[];
};

/** Did this push touch the docs Groundwork projects? */
export function touchesProjectDocs(payload: PushPayload): boolean {
  const paths = (payload.commits ?? []).flatMap((c) => [
    ...(c.added ?? []),
    ...(c.removed ?? []),
    ...(c.modified ?? []),
  ]);
  return paths.some((p) => p.startsWith("__project__/"));
}

export const pushedRepo = (payload: PushPayload): string | null =>
  payload.repository?.full_name ?? null;
