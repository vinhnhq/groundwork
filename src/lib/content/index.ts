import { createFilesystemSource } from "@/lib/content/filesystem-source";
import type { ContentSource } from "@/lib/content/source";
import { serverEnv } from "@/lib/env-server";

export type { ContentSource, Project } from "@/lib/content/source";
export type { DocKind, DocRef, ProjectEntry, ProjectMeta } from "@/lib/content/types";

/** ADR-0001 (to write): filesystem-local first; GitHub adapter when deployed. */
export function getContentSource(): ContentSource {
  const roots = (serverEnv().PROJECT_ROOTS ?? "").split(",");
  return createFilesystemSource(roots);
}
