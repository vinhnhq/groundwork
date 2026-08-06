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

/**
 * What a Markdown file under `__project__/` is.
 *
 * `adr` / `spec` / `retro` are the *recognised* kinds — the digest keys on them
 * to pull locked decisions and constraints. `doc` is everything else: prose the
 * repo keeps but the digest does not interpret. Adding `doc` is what let the
 * console show `architecture.md` and `tech-standards.md`, which the three
 * hard-coded scan paths had silently excluded even though CLAUDE.md calls them
 * the authoritative sources.
 */
export type DocKind = "adr" | "spec" | "retro" | "doc";

export const DOC_KINDS: readonly DocKind[] = ["adr", "spec", "retro", "doc"] as const;

export const isDocKind = (value: string): value is DocKind =>
  (DOC_KINDS as readonly string[]).includes(value);

export type DocRef = {
  kind: DocKind;
  /**
   * Stable id within a project+kind. For the recognised kinds this is the bare
   * filename without `.md` (so every pre-existing ADR URL still resolves); for
   * `doc` it is the `__project__`-relative path without `.md`, which contains
   * slashes — hence the catch-all route segment.
   */
  id: string;
  title: string;
  /** absolute path on disk (filesystem source) */
  path: string;
  /**
   * Path relative to `__project__/`, e.g. `docs/decisions/0008-auth.md`.
   *
   * The tree is built from this rather than from `path`, because `path` is
   * absolute on the filesystem source and repo-relative on the GitHub one —
   * only this form means the same thing in both.
   */
  relPath: string;
};

/** One aggregated project, or a root whose frontmatter is missing/invalid. */
export type ProjectEntry =
  | { status: "ok"; root: string; meta: ProjectMeta }
  | { status: "unconfigured"; root: string; reason: string };
