import type { BacklogWriter, WriteRequest } from "@/lib/content/write";
import { ok } from "@/lib/result";

export type RecordedWrite = WriteRequest & { at: string };

/**
 * A writer that persists nothing and records everything.
 *
 * This is the default until a transport is configured, and it is the honest
 * default: with no git identity and no GitHub token, the alternative is either
 * silently mutating the developer's working tree or a write path that only
 * exists in tests. The UI shows the rendered result and says plainly that
 * nothing was committed.
 */
export function createMemoryWriter(now: () => Date = () => new Date()): BacklogWriter & {
  writes: RecordedWrite[];
} {
  const writes: RecordedWrite[] = [];

  return {
    mode: "memory",
    describe: "Dry run — the change is rendered but nothing is written to the repo.",
    writes,
    async write(request) {
      writes.push({ ...request, at: now().toISOString() });
      return ok({
        mode: "memory" as const,
        summary: `Dry run: ${request.message}. Nothing was committed.`,
        pending: true,
      });
    },
  };
}
