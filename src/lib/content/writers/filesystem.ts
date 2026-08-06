import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { BacklogWriter } from "@/lib/content/write";
import { err, ok } from "@/lib/result";

export const backlogPath = (root: string): string =>
  join(root, "__project__", "tasks", "backlog.md");

/**
 * Writes straight to `backlog.md` on disk, no git involved.
 *
 * For a scratch repo or a solo working tree where the edit *is* the intent.
 * Not the default: on a real repo this mutates the working tree under whoever
 * happens to be editing it, with no review step and no record of who asked —
 * which is exactly what ADR-0002 argues against for team write-back.
 */
export function createFilesystemWriter(): BacklogWriter {
  return {
    mode: "filesystem",
    describe: "Writes backlog.md directly on disk. No branch, no review step.",
    async write({ root, content, message, actor }) {
      const path = backlogPath(root);
      try {
        await writeFile(path, content, "utf8");
        return ok({
          mode: "filesystem" as const,
          summary: `Wrote ${path} (${message}, by ${actor}).`,
          ref: path,
          pending: false,
        });
      } catch (error) {
        return err({
          _tag: "Failed" as const,
          message: `Could not write ${path}: ${String(error)}`,
        });
      }
    },
  };
}
