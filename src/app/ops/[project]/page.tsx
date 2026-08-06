import { Brain, FileText, ListTodo } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

import { OverviewCockpit } from "@/components/overview-cockpit";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSession } from "@/lib/auth";
import { can } from "@/lib/auth/roles";
import { getContentSource } from "@/lib/content";
import { loadProject } from "@/lib/ops/load";
import { readiness } from "@/lib/tasks/dor";

export const dynamic = "force-dynamic";

/** The section landing page: what this project is, and where to go next. */
export default async function ProjectOverview({
  params,
}: {
  params: Promise<{ project: string }>;
}) {
  const { project: slug } = await params;
  const [view, entry, session] = await Promise.all([
    loadProject(slug),
    getContentSource().getProject(slug),
    getSession(),
  ]);
  if (!view || !entry) notFound();

  const role = session?.user.role ?? "client";
  const ready = view.tasks.filter((t) => readiness(t).ready && t.status !== "done");
  const open = view.tasks.filter((t) => t.status !== "done");

  const cards = [
    {
      href: `/ops/${slug}/docs`,
      icon: FileText,
      title: "Docs",
      value: view.docs.length,
      description: `${view.docs.filter((d) => d.kind === "adr").length} ADRs · ${view.docs.filter((d) => d.kind === "spec").length} specs`,
      show: true,
    },
    {
      href: `/ops/${slug}/tasks`,
      icon: ListTodo,
      title: "Tasks",
      value: view.tasks.length,
      description: `${ready.length} ready · ${open.length - ready.length} draft`,
      show: true,
    },
    {
      href: `/ops/${slug}/grounding`,
      icon: Brain,
      title: "Grounding",
      value: null,
      description: "Copy the digest into any agent",
      show: can(role, "grounding.read"),
    },
  ].filter((c) => c.show);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{entry.meta.name}</h1>
        {entry.meta.tagline && (
          <p className="mt-1 text-sm text-muted-foreground">{entry.meta.tagline}</p>
        )}
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Badge variant="secondary">{entry.meta.status}</Badge>
          <Badge variant="outline">{entry.meta.visibility}</Badge>
          {entry.meta.stack.map((s) => (
            <Badge key={s} variant="outline">
              {s}
            </Badge>
          ))}
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {cards.map((card) => (
          <Link key={card.href} href={card.href} className="group">
            <Card className="h-full transition-colors group-hover:border-primary/50">
              <CardHeader>
                <CardDescription className="flex items-center gap-1.5">
                  <card.icon className="size-3.5" />
                  {card.title}
                </CardDescription>
                <CardTitle className="text-2xl">{card.value ?? "—"}</CardTitle>
              </CardHeader>
              <CardContent className="text-xs text-muted-foreground">
                {card.description}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* The tiles above say how many; this says what to look at. */}
      <OverviewCockpit slug={slug} tasks={view.tasks} docs={view.docs} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Repo</CardTitle>
          <CardDescription className="break-all font-mono text-xs">{view.root}</CardDescription>
        </CardHeader>
        <CardContent className="text-sm text-muted-foreground">
          Groundwork projects this repo's <code>__project__/</code> Markdown. That Markdown stays
          the single source of truth — everything here reads from it, and every write goes back to
          it.
        </CardContent>
      </Card>
    </div>
  );
}
