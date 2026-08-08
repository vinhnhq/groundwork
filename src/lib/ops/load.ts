import "server-only";
import type { ContentSource, DocRef, ProjectEntry } from "@/lib/content";
import { getContentSource } from "@/lib/content";
import { readiness } from "@/lib/tasks/dor";
import { parseBacklog, parseBacklogReport, type SkippedLine } from "@/lib/tasks/parse-backlog";
import type { DorField, Task } from "@/lib/tasks/types";

export type DraftTask = { task: Task; missing: DorField[] };

export type Overview = {
  projects: ProjectEntry[];
  ready: Task[];
  draft: DraftTask[];
};

const isOpen = (t: Task) => t.status === "todo" || t.status === "stretch";

/** Cross-project ops overview: projects + the READY queue + the DRAFT list. */
export async function loadOverview(source: ContentSource = getContentSource()): Promise<Overview> {
  const projects = await source.listProjects();
  const ready: Task[] = [];
  const draft: DraftTask[] = [];

  for (const entry of projects) {
    if (entry.status !== "ok") continue;
    const md = await source.readBacklog(entry.meta.slug);
    if (!md) continue;
    for (const task of parseBacklog(md, entry.meta.slug)) {
      if (!isOpen(task)) continue;
      const r = readiness(task);
      if (r.ready) ready.push(task);
      else draft.push({ task, missing: r.missing });
    }
  }

  return { projects, ready, draft };
}

export type ProjectView = {
  slug: string;
  name: string;
  root: string;
  docs: DocRef[];
  tasks: Task[];
  /** Task-shaped backlog lines the strict grammar rejected (Q5). */
  skipped: SkippedLine[];
};

export async function loadProject(
  slug: string,
  source: ContentSource = getContentSource(),
): Promise<ProjectView | null> {
  const project = await source.getProject(slug);
  if (!project) return null;
  const docs = await source.listDocs(slug);
  const md = await source.readBacklog(slug);
  const { tasks, skipped } = md ? parseBacklogReport(md, slug) : { tasks: [], skipped: [] };
  return { slug, name: project.meta.name, root: project.root, docs, tasks, skipped };
}

export type PortfolioProject = {
  slug: string;
  name: string;
  tagline: string;
  stack: string[];
  highlights: string[];
};

/** Public projection — only public projects, only curated fields. */
export async function loadPortfolio(
  source: ContentSource = getContentSource(),
): Promise<PortfolioProject[]> {
  const entries = await source.listProjects();
  return entries.flatMap((e) =>
    e.status === "ok" && e.meta.visibility === "public"
      ? [
          {
            slug: e.meta.slug,
            name: e.meta.name,
            tagline: e.meta.tagline,
            stack: e.meta.stack,
            highlights: e.meta.public_highlights,
          },
        ]
      : [],
  );
}
