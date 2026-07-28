import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { DeniedNotice } from "@/components/denied-notice";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { loadOverview } from "@/lib/ops/load";

export const dynamic = "force-dynamic";

/**
 * The ops home is a directory, nothing else.
 *
 * It used to also carry the cross-project READY queue and DRAFT list. On two
 * real repos those became a hundred rows of other projects' business before you
 * reached the thing you came for. Per-project work belongs in that project's
 * workspace; the aggregate queue still exists where it is actually useful —
 * inside each project, in the Brain digest, and via the MCP `ready_tasks` tool.
 */
export default async function OpsHome({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const [{ projects, ready }, { denied }, session] = await Promise.all([
    loadOverview(),
    searchParams,
    getSession(),
  ]);

  const readyByProject = new Map<string, number>();
  for (const task of ready) {
    readyByProject.set(task.project, (readyByProject.get(task.project) ?? 0) + 1);
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-8">
      {session && <DeniedNotice denied={denied} role={session.user.role} />}

      <div>
        <h1 className="text-xl font-semibold tracking-tight">Projects</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every repo Groundwork can see. Open one for its docs, tasks and grounding.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2">
        {projects.map((entry) =>
          entry.status === "ok" ? (
            <li key={entry.root}>
              <Link href={`/ops/${entry.meta.slug}`} className="group block h-full">
                <Card className="h-full transition-colors group-hover:border-primary/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      {entry.meta.name}
                      <ArrowRight className="size-4 opacity-0 transition-opacity group-hover:opacity-70" />
                    </CardTitle>
                    <CardDescription>{entry.meta.tagline}</CardDescription>
                  </CardHeader>
                  <CardContent className="flex flex-wrap items-center gap-1.5">
                    <Badge variant="secondary">{entry.meta.status}</Badge>
                    {(readyByProject.get(entry.meta.slug) ?? 0) > 0 && (
                      <Badge>{readyByProject.get(entry.meta.slug)} ready</Badge>
                    )}
                    {entry.meta.stack.slice(0, 4).map((s) => (
                      <Badge key={s} variant="outline">
                        {s}
                      </Badge>
                    ))}
                  </CardContent>
                </Card>
              </Link>
            </li>
          ) : (
            <li key={entry.root}>
              <Card className="h-full border-dashed">
                <CardHeader>
                  <CardTitle className="text-muted-foreground">Unconfigured</CardTitle>
                  <CardDescription className="break-all">{entry.root}</CardDescription>
                </CardHeader>
                <CardContent className="text-xs text-muted-foreground">{entry.reason}</CardContent>
              </Card>
            </li>
          ),
        )}

        {projects.length === 0 && (
          <li className="text-sm text-muted-foreground">
            No project roots configured. Set <code>PROJECT_ROOTS</code> in <code>.env.local</code>.
          </li>
        )}
      </ul>
    </div>
  );
}
