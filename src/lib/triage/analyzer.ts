import type { ContentSource } from "@/lib/content";
import { parseBacklog } from "@/lib/tasks/parse-backlog";
import { analyzeIdeaPure } from "@/lib/triage/analyze-pure";
import type { IdeaInput, TriageResult } from "@/lib/triage/types";

export interface TriageAnalyzer {
  analyze(input: IdeaInput): Promise<TriageResult>;
}

/** Mock analyzer — reads the project's real docs, runs the pure heuristic. */
export function createMockAnalyzer(source: ContentSource): TriageAnalyzer {
  return {
    async analyze({ project, text }) {
      const docs = await source.listDocs(project);
      const md = await source.readBacklog(project);
      const tasks = md
        ? parseBacklog(md, project).map((t) => ({ id: t.id, title: t.title, intent: t.intent }))
        : [];
      return analyzeIdeaPure(
        text,
        docs.map((d) => ({ kind: d.kind, id: d.id, title: d.title })),
        tasks,
      );
    },
  };
}

/**
 * Factory. A real Anthropic analyzer (streaming, tool-scoped to the project docs)
 * drops in here when ANTHROPIC_API_KEY is set — same interface, callers untouched
 * (tech-standards §15 provider-stub). Mock for the demo.
 */
export function getAnalyzer(source: ContentSource): TriageAnalyzer {
  return createMockAnalyzer(source);
}
