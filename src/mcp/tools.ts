import { z } from "zod";

import { type BrainAudience, isBrainAudience, loadBrain } from "@/lib/brain";
import type { ContentSource } from "@/lib/content/source";
import type { DocKind } from "@/lib/content/types";
import { isStartable } from "@/lib/tasks/dor";
import { parseBacklog } from "@/lib/tasks/parse-backlog";
import type { Task } from "@/lib/tasks/types";

/**
 * The MCP layer sees a *narrowed* ContentSource — reads only.
 *
 * v2's read-only rule (ADR-0006) is enforced by this type, not by discipline.
 * `ContentSource` itself carries no write methods (S1 put writes on the
 * separate `BacklogWriter` seam precisely so this stays true), and `loadBrain`
 * takes the same narrow read type — nothing downstream widens it back. An
 * agent grounding itself must not be able to rewrite the ground.
 */
export type ReadOnlySource = Pick<
  ContentSource,
  "listProjects" | "getProject" | "listDocs" | "readDoc" | "readBacklog"
>;

export type ToolDef = {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodRawShape;
  /** Plain text out — the server wraps it into MCP content blocks. */
  handler: (args: Record<string, unknown>) => Promise<string>;
};

/**
 * Mirrors `DOC_KINDS` in content/types. `doc` covers every Markdown file
 * outside the three recognised folders — including `architecture.md` and
 * `tech-standards.md`, which an agent asking "what did this team decide"
 * previously could not reach through this tool at all.
 */
const DOC_KINDS = ["adr", "spec", "retro", "doc"] as const;

function taskLine(t: Task): string {
  const facts = [t.autonomy ? `tier: ${t.autonomy}` : null, t.oracle ? `oracle: ${t.oracle}` : null]
    .filter(Boolean)
    .join(" · ");
  return [
    `- [${t.project}] **${t.id}** ${t.title}${t.intent ? ` — ${t.intent}` : ""}`,
    facts ? `  ${facts}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

async function readyFor(source: ReadOnlySource, slug: string): Promise<Task[]> {
  const backlog = await source.readBacklog(slug);
  if (!backlog) return [];
  return parseBacklog(backlog, slug).filter(isStartable);
}

/** The v2 tool surface: four read tools over the same engine the UI uses. */
export function createGroundworkTools(source: ReadOnlySource): ToolDef[] {
  return [
    {
      name: "list_projects",
      title: "List projects",
      description:
        "List every project Groundwork can see, with status and task counts. Start here when you do not know a project's slug.",
      inputSchema: {},
      async handler() {
        const entries = await source.listProjects();
        if (entries.length === 0) return "No project roots are configured.";

        const lines: string[] = [];
        for (const entry of entries) {
          if (entry.status !== "ok") {
            lines.push(`- (unconfigured) ${entry.root} — ${entry.reason}`);
            continue;
          }
          const ready = await readyFor(source, entry.meta.slug);
          lines.push(
            `- **${entry.meta.slug}** — ${entry.meta.name} (${entry.meta.status})` +
              `${entry.meta.tagline ? `: ${entry.meta.tagline}` : ""} · ${ready.length} ready task(s)`,
          );
        }
        return lines.join("\n");
      },
    },

    {
      name: "ready_tasks",
      title: "Ready tasks",
      description:
        "Tasks that pass the Definition of Ready and are still open — the work that is actually startable. Omit `project` to see every project at once. DRAFT tasks are deliberately excluded: they are not yet agreed.",
      inputSchema: {
        project: z.string().optional().describe("Project slug; omit for all projects"),
      },
      async handler(args) {
        const project = typeof args.project === "string" ? args.project : undefined;

        const slugs: string[] = project
          ? [project]
          : (await source.listProjects()).flatMap((e) => (e.status === "ok" ? [e.meta.slug] : []));

        if (project && !(await source.getProject(project))) {
          return `No project "${project}". Call list_projects for the available slugs.`;
        }

        const tasks: Task[] = [];
        for (const slug of slugs) tasks.push(...(await readyFor(source, slug)));

        if (tasks.length === 0) {
          return "Nothing is READY. Every open task is still a DRAFT (missing Definition-of-Ready fields).";
        }
        return [`${tasks.length} ready task(s):`, "", ...tasks.map(taskLine)].join("\n");
      },
    },

    {
      name: "get_project_context",
      title: "Get project context (the Brain)",
      description:
        "The project's grounding digest: current state, locked decisions, open constraints and the READY queue. Read this before proposing work, so you do not contradict a decision the team already made.",
      inputSchema: {
        project: z.string().describe("Project slug"),
        budget: z
          .number()
          .int()
          .positive()
          .optional()
          .describe("Max characters for the digest (default 8000)"),
        audience: z
          .enum(["tech", "biz", "both"])
          .optional()
          .describe(
            "Who the digest is for. `both` (default) and `tech` include the locked decisions and each task's intent/oracle; `biz` is the delivery view — state, scope and progress, with the engineering rationale withheld.",
          ),
      },
      async handler(args) {
        const project = String(args.project ?? "");
        const budget = typeof args.budget === "number" ? args.budget : undefined;
        const audience = isBrainAudience(String(args.audience ?? "both"))
          ? (args.audience as BrainAudience | undefined)
          : undefined;
        const brain = await loadBrain(project, source, budget, audience);

        if (!brain) return `No project "${project}". Call list_projects for the available slugs.`;
        if (brain.omitted.length === 0) return brain.text;
        return `${brain.text}\n\n---\n_Digest notes: ${brain.omitted.join("; ")}._`;
      },
    },

    {
      name: "get_doc",
      title: "Get a document",
      description:
        "Read one full document when the digest is not enough detail. `kind` is adr, spec, retro, or doc for anything else under __project__/ (a doc's id is its path, e.g. `docs/architecture`). Call with no `id` to list what exists.",
      inputSchema: {
        project: z.string().describe("Project slug"),
        kind: z.enum(DOC_KINDS).describe("Document kind"),
        id: z.string().optional().describe("Document id; omit to list available ids"),
      },
      async handler(args) {
        const project = String(args.project ?? "");
        const kind = args.kind as DocKind;
        const id = typeof args.id === "string" ? args.id : undefined;

        const docs = (await source.listDocs(project)).filter((d) => d.kind === kind);
        if (docs.length === 0) return `No ${kind} documents in "${project}".`;

        if (!id) {
          return [
            `${kind} documents in ${project}:`,
            ...docs.map((d) => `- ${d.id} — ${d.title}`),
          ].join("\n");
        }

        const body = await source.readDoc(project, kind, id);
        if (body === null) {
          return [
            `No ${kind} "${id}" in "${project}". Available:`,
            ...docs.map((d) => `- ${d.id} — ${d.title}`),
          ].join("\n");
        }
        return body;
      },
    },
  ];
}
