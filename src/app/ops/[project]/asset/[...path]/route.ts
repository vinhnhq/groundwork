import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { NextResponse } from "next/server";
import { getContentSource } from "@/lib/content";

const CONTENT_TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  pdf: "application/pdf",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ project: string; path: string[] }> },
) {
  const { project, path } = await params;
  const p = await getContentSource().getProject(project);
  if (!p) return new NextResponse("Not found", { status: 404 });

  const rel = normalize(path.join("/"));
  if (rel.startsWith("..") || rel.includes(`..${"/"}`)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  try {
    const bytes = await readFile(join(p.root, rel));
    const ext = rel.split(".").pop()?.toLowerCase() ?? "";
    return new NextResponse(new Uint8Array(bytes), {
      headers: {
        "Content-Type": CONTENT_TYPES[ext] ?? "application/octet-stream",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
