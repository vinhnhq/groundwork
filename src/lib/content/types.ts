import { z } from "zod";

/** `__project__/project.yml` frontmatter (architecture §5). The keystone both
 * the ops console and the public portfolio read. */
export const projectMetaSchema = z.object({
  slug: z.string().min(1),
  name: z.string().min(1),
  tagline: z.string().default(""),
  status: z.enum(["active", "paused", "shipped", "archived"]).default("active"),
  visibility: z.enum(["public", "private"]).default("public"),
  stack: z.array(z.string()).default([]),
  links: z.object({ repo: z.string().optional(), live: z.string().optional() }).default({}),
  cover: z.string().optional(),
  public_highlights: z.array(z.string()).default([]),
});

export type ProjectMeta = z.infer<typeof projectMetaSchema>;

export type ContentError =
  | { readonly _tag: "InvalidYaml"; readonly message: string }
  | { readonly _tag: "InvalidSchema"; readonly issues: string[] };

export type DocKind = "adr" | "spec" | "retro";

export type DocRef = {
  kind: DocKind;
  /** stable id within a project+kind, e.g. an ADR number or spec slug */
  id: string;
  title: string;
  /** absolute path on disk (filesystem source) */
  path: string;
};

/** One aggregated project, or a root whose frontmatter is missing/invalid. */
export type ProjectEntry =
  | { status: "ok"; root: string; meta: ProjectMeta }
  | { status: "unconfigured"; root: string; reason: string };
