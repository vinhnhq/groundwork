import { execFile } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { promisify } from "node:util";

import { systemClock } from "@/lib/clock";
import { createMockGitHubClient, DEMO_GITHUB_FILES } from "@/lib/content/github/mock-client";
import { createRestGitHubClient } from "@/lib/content/github/rest-client";
import type { BacklogWriter, WriteMode } from "@/lib/content/write";
import { createFilesystemWriter } from "@/lib/content/writers/filesystem";
import { createGitWriter, type GitResult } from "@/lib/content/writers/git";
import { createGitHubPrWriter } from "@/lib/content/writers/github-pr";
import { createMemoryWriter, type RecordedWrite } from "@/lib/content/writers/memory";

export { createFilesystemWriter } from "@/lib/content/writers/filesystem";
export { createGitWriter } from "@/lib/content/writers/git";
export { createGitHubPrWriter } from "@/lib/content/writers/github-pr";
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

/**
 * One memory writer for the process, not one per call.
 *
 * The dry run's whole value is being able to inspect what *would* have been
 * written; a fresh recorder per request throws that away the instant it is
 * created. Process-scoped, so it resets on restart and on a dev-server reload —
 * fine for a dry run, and the UI says as much.
 */
let sharedMemoryWriter: ReturnType<typeof createMemoryWriter> | undefined;

function memoryWriter() {
  if (!sharedMemoryWriter) sharedMemoryWriter = createMemoryWriter();
  return sharedMemoryWriter;
}

/** Everything the dry run has recorded this process, newest first. */
export function recordedWrites(): RecordedWrite[] {
  return [...(sharedMemoryWriter?.writes ?? [])].reverse();
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
 * With no `GITHUB_TOKEN`, `github-pr` runs against the mock client: it opens a
 * fake PR and returns a fake link. That keeps the flow explorable end to end,
 * and /ops/integrations labels it as mock so the fake link is never mistaken
 * for a real one.
 */
export function createWriter(mode: WriteMode, githubToken?: string): BacklogWriter {
  switch (mode) {
    case "filesystem":
      return createFilesystemWriter();
    case "git-branch":
      return createGitWriter({ run: execGit, writeText: writeFile, clock: systemClock });
    case "github-pr": {
      const client = githubToken?.trim()
        ? createRestGitHubClient(githubToken)
        : createMockGitHubClient(DEMO_GITHUB_FILES);
      return createGitHubPrWriter(client, systemClock);
    }
    default:
      return memoryWriter();
  }
}

/** Is the configured transport actually backed by a real service? */
export function isWriterMocked(mode: WriteMode, githubToken?: string): boolean {
  if (mode === "memory") return true;
  if (mode === "github-pr") return !githubToken?.trim();
  return false;
}
