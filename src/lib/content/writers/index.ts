import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";
import { systemClock } from "@/lib/clock";
import type { BacklogWriter, WriteMode } from "@/lib/content/write";
import { createFilesystemWriter } from "@/lib/content/writers/filesystem";
import { createGitWriter, type GitResult } from "@/lib/content/writers/git";
import { createMemoryWriter } from "@/lib/content/writers/memory";

export { createFilesystemWriter } from "@/lib/content/writers/filesystem";
export { createGitWriter } from "@/lib/content/writers/git";
export { createMemoryWriter } from "@/lib/content/writers/memory";

const run = promisify(execFile);

/** Shell out to git, mapping both success and failure onto a plain result. */
async function execGit(args: string[], cwd: string): Promise<GitResult> {
  try {
    const { stdout, stderr } = await run("git", args, { cwd });
    return { code: 0, stdout, stderr };
  } catch (error) {
    const e = error as { code?: number; stdout?: string; stderr?: string };
    return { code: e.code ?? 1, stdout: e.stdout ?? "", stderr: e.stderr ?? String(error) };
  }
}

export const WRITE_MODES = ["memory", "filesystem", "git-branch", "github-pr"] as const;

export function parseWriteMode(value: string | undefined): WriteMode {
  const mode = value?.trim();
  return WRITE_MODES.includes(mode as WriteMode) ? (mode as WriteMode) : "memory";
}

/**
 * Resolve the configured write transport.
 *
 * Defaults to `memory` — a dry run — rather than to anything that touches a
 * repo. Turning on a transport that mutates someone's working tree should be a
 * deliberate act of configuration, not what happens when a variable is unset
 * (ADR-0002).
 *
 * `github-pr` is resolved by the caller that has a GitHub client (S4); asking
 * for it here without one falls back to the dry run rather than pretending.
 */
export function createWriter(mode: WriteMode, githubWriter?: BacklogWriter): BacklogWriter {
  switch (mode) {
    case "filesystem":
      return createFilesystemWriter();
    case "git-branch":
      return createGitWriter({ run: execGit, writeText: writeFile, clock: systemClock });
    case "github-pr":
      return githubWriter ?? createMemoryWriter();
    default:
      return createMemoryWriter();
  }
}
