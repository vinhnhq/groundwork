import Link from "next/link";
import { notFound } from "next/navigation";
import { DocRow } from "@/components/doc-row";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { DocKind } from "@/lib/content";
import { loadProject } from "@/lib/ops/load";

export const dynamic = "force-dynamic";

const KIND_LABEL: Record<DocKind, string> = { adr: "ADR", spec: "Spec", retro: "Retro" };

export default async function ProjectDocs({ params }: { params: Promise<{ project: string }> }) {
  const { project: slug } = await params;
  const view = await loadProject(slug);
  if (!view) notFound();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Docs</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Decisions, specs and the retro, read straight from the repo.
        </p>
      </div>

      {view.docs.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No documents under <code>__project__/docs</code> or <code>__project__/specs</code>.
        </p>
      ) : (
        <>
          {/* Phone: the id column is dead weight — the title is the target. */}
          <ul className="flex flex-col gap-1 md:hidden">
            {view.docs.map((doc) => (
              <li key={`${doc.kind}/${doc.id}`}>
                <Link
                  href={`/ops/${slug}/${doc.kind}/${doc.id}`}
                  className="flex items-start gap-2 rounded-lg border p-3"
                >
                  <Badge variant="outline" className="shrink-0">
                    {KIND_LABEL[doc.kind]}
                  </Badge>
                  <span className="text-sm">{doc.title}</span>
                </Link>
              </li>
            ))}
          </ul>

          {/* No card wrapper and no outer border — the header rule and the row
              hairlines carry the structure. */}
          <div className="hidden md:block">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-20">Kind</TableHead>
                  <TableHead className="w-56">ID</TableHead>
                  <TableHead>Title</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {view.docs.map((doc) => (
                  <DocRow
                    key={`${doc.kind}/${doc.id}`}
                    href={`/ops/${slug}/${doc.kind}/${doc.id}`}
                    kindLabel={KIND_LABEL[doc.kind]}
                    id={doc.id}
                    title={doc.title}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
