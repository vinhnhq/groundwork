import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";

import { NextResponse } from "next/server";

import { getContentSource } from "@/lib/content";

/**
 * Serves images referenced from a project's Markdown (e.g. an ADR's diagram).
 *
 * Two things confine it, because this reads the filesystem on behalf of a
 * browser request:
 *
 * 1. **Inside `__project__/` only.** It previously resolved against the repo
 *    root, so any signed-in role — including a read-only client — could fetch
 *    `.env` or `.git/config` through it. Docs assets live under `__project__/`;
 *    nothing outside it is ever a legitimate target.
 * 2. **Known media extensions only.** The old `application/octet-stream`
 *    fallback meant "unknown type" silently became "download it anyway".
 *
 * Path traversal was already rejected; that check stays.
 */
const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  pdf: "application/pdf",
};

const PROJECT_DIR = "__project__";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ project: string; path: string[] }> },
) {
  const { project, path } = await params;
  const p = await getContentSource().getProject(project);
  if (!p) return new NextResponse("Not found", { status: 404 });

  const rel = normalize(path.join("/"));
  if (rel.startsWith("..") || rel.includes("../")) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const ext = rel.split(".").pop()?.toLowerCase() ?? "";
  const contentType = CONTENT_TYPES[ext];
  if (!contentType) return new NextResponse("Unsupported asset type", { status: 415 });

  // Scope to the docs directory. `normalize` has already collapsed any `..`,
  // and the guard above rejected what it could not collapse.
  const scoped = rel.startsWith(`${PROJECT_DIR}/`) ? rel : join(PROJECT_DIR, rel);

  try {
    const bytes = await readFile(join(p.root, scoped));
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
