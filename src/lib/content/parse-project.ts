import YAML from "yaml";
import { type ContentError, type ProjectMeta, projectMetaSchema } from "@/lib/content/types";
import { err, ok, type Result } from "@/lib/result";

/**
 * Pure: parse a `project.yml` string into a validated ProjectMeta. No I/O — the
 * filesystem/GitHub source reads the bytes and hands them here.
 */
export function parseProjectMeta(raw: string): Result<ContentError, ProjectMeta> {
  let doc: unknown;
  try {
    doc = YAML.parse(raw);
  } catch (e) {
    return err({ _tag: "InvalidYaml", message: e instanceof Error ? e.message : String(e) });
  }
  const parsed = projectMetaSchema.safeParse(doc);
  if (!parsed.success) {
    return err({
      _tag: "InvalidSchema",
      issues: parsed.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`),
    });
  }
  return ok(parsed.data);
}
