import type { ActionResult } from "@/app/ops/[project]/actions";

/**
 * What happened to a write, stated honestly.
 *
 * `pending` means the change is proposed, not landed (ADR-0002) — a PR awaiting
 * review, or a dry run that touched nothing. Rendering that as a green "Saved"
 * would be the single most misleading thing this UI could do, so pending states
 * are visually distinct from done ones and always say what remains.
 */
export function WriteOutcomeNotice({ result }: { result: ActionResult }) {
  if (!result.ok) {
    return (
      <p
        data-testid="write-error"
        className="rounded-md border border-red-300 bg-red-50 p-2.5 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300"
      >
        {result.error}
      </p>
    );
  }

  const { outcome, mocked } = result;
  const tone = outcome.pending
    ? "border-amber-300 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-200"
    : "border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200";

  return (
    <div data-testid="write-outcome" className={`rounded-md border p-2.5 text-sm ${tone}`}>
      <p>
        <span className="font-medium">{outcome.pending ? "Proposed" : "Written"}</span> ·{" "}
        {outcome.summary}
      </p>

      {outcome.url && (
        <p className="mt-1">
          <a href={outcome.url} className="underline" target="_blank" rel="noreferrer">
            {outcome.url}
          </a>
        </p>
      )}

      {outcome.ref && !outcome.url && (
        <p className="mt-1 font-mono text-xs opacity-80">{outcome.ref}</p>
      )}

      {mocked && (
        <p className="mt-1 text-xs opacity-80">
          This transport is mocked — nothing reached a real repo. Set a real <code>WRITE_BACK</code>{" "}
          transport to make it land.
        </p>
      )}
    </div>
  );
}
