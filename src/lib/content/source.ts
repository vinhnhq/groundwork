import type { DocKind, DocRef, ProjectEntry, ProjectMeta } from "@/lib/content/types";

export type Project = { root: string; meta: ProjectMeta };

/**
 * A read-only view over the canonical Markdown in each project repo. The
 * dashboard is a projection of this (tech-standards / architecture §4). One
 * interface, swappable adapters: filesystem-local now, GitHub when deployed.
 */
export interface ContentSource {
  /** All roots, including those whose frontmatter is missing/invalid. */
  listProjects(): Promise<ProjectEntry[]>;
  getProject(slug: string): Promise<Project | null>;
  listDocs(slug: string): Promise<DocRef[]>;
  readDoc(slug: string, kind: DocKind, id: string): Promise<string | null>;
  /** Raw backlog.md (tasks live outside listDocs). */
  readBacklog(slug: string): Promise<string | null>;
}
