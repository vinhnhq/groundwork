import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
        <div className="rounded-lg border">
          <Table className="table-fixed">
            <TableHeader>
              <TableRow>
                <TableHead className="w-20">Kind</TableHead>
                <TableHead className="w-56">ID</TableHead>
                <TableHead>Title</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {view.docs.map((doc) => (
                <TableRow key={`${doc.kind}/${doc.id}`}>
                  <TableCell>
                    <Badge variant="outline">{KIND_LABEL[doc.kind]}</Badge>
                  </TableCell>
                  <TableCell className="truncate font-mono text-xs text-muted-foreground">
                    {doc.id}
                  </TableCell>
                  <TableCell>
                    <Link href={`/ops/${slug}/${doc.kind}/${doc.id}`} className="hover:underline">
                      {doc.title}
                    </Link>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
