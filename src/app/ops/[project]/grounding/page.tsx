import { notFound, redirect } from "next/navigation";
import { CopyContext } from "@/components/copy-context";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/auth/roles";
import { loadProjectBrain } from "@/lib/ops/brain";

export const dynamic = "force-dynamic";

export default async function ProjectGrounding({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: slug } = await params;
  const session = await getSession();

  // The proxy gates this path; re-checked because a page is directly reachable.
  if (!session || !can(session.user.role, "grounding.read")) {
    redirect("/ops?denied=grounding.read");
  }

  const brain = await loadProjectBrain(slug);
  if (!brain) notFound();

  return (
    <div className="flex flex-col gap-6" data-testid="grounding">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Grounding</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          One distilled digest of this project's current truth. Paste it into any agent — GPT or
          Claude — so it reasons from the same decisions you did.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Copy context</CardTitle>
          <CardDescription>
            {brain.decisions.length} locked decision(s) · {brain.constraints.length} constraint(s) ·{" "}
            {brain.ready.length} ready task(s)
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <CopyContext text={brain.text} exportHref={`/ops/${slug}/context.md`} />

          {brain.omitted.length > 0 && (
            <ul className="flex flex-col gap-0.5 text-xs text-amber-700 dark:text-amber-400">
              {brain.omitted.map((note) => (
                <li key={note}>⚠ {note}</li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {brain.decisions.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Locked decisions</h2>
          {/* Phone: a two-column table of long prose is a column of single
              words. Stack them instead. */}
          <ul className="flex flex-col gap-2 md:hidden">
            {brain.decisions.map((decision) => (
              <li key={decision.id} className="rounded-lg border p-3">
                <p className="text-sm font-medium">{decision.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">{decision.statement}</p>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            {/* Fixed layout so a long decision statement wraps instead of
                running the column off the right edge. */}
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-72">Decision</TableHead>
                  <TableHead>What was settled</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brain.decisions.map((decision) => (
                  <TableRow key={decision.id}>
                    <TableCell className="align-top text-sm font-medium break-words whitespace-normal">
                      {decision.title}
                    </TableCell>
                    <TableCell className="align-top text-sm break-words whitespace-normal text-muted-foreground">
                      {decision.statement}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      {brain.constraints.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-lg font-semibold">Open constraints</h2>
          <ul className="flex flex-col gap-2 md:hidden">
            {brain.constraints.map((constraint) => (
              <li
                key={`${constraint.source}-${constraint.text}`}
                className="flex flex-col gap-1.5 rounded-lg border p-3"
              >
                <span className="text-sm">{constraint.text}</span>
                <Badge variant="outline" className="w-fit">
                  {constraint.source}
                </Badge>
              </li>
            ))}
          </ul>

          <div className="hidden md:block">
            <Table className="table-fixed">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Constraint</TableHead>
                  <TableHead className="w-64">Source</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {brain.constraints.map((constraint) => (
                  <TableRow key={`${constraint.source}-${constraint.text}`}>
                    <TableCell className="align-top text-sm break-words whitespace-normal">
                      {constraint.text}
                    </TableCell>
                    <TableCell className="align-top">
                      <Badge variant="outline">{constraint.source}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
      )}

      <details>
        <summary className="cursor-pointer text-sm text-muted-foreground hover:underline">
          Preview the raw digest ({brain.text.length.toLocaleString()} chars)
        </summary>
        <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-muted/40 p-3 text-xs whitespace-pre-wrap">
          {brain.text}
        </pre>
      </details>
    </div>
  );
}
