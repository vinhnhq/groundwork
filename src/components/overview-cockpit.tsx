import { ArrowUpRight, CircleAlert, FileText, ListChecks } from "lucide-react";
import Link from "next/link";
import { DorGaps, TierBadge } from "@/components/badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@/components/ui/item";
import type { DocRef } from "@/lib/content/types";
import { readiness } from "@/lib/tasks/dor";
import type { Task } from "@/lib/tasks/types";

/** How many rows a cockpit card shows before deferring to its full surface. */
const LIMIT = 5;

/**
 * The overview, as a cockpit rather than a scoreboard.
 *
 * Three count tiles answered "how many", which is not the question someone
 * opening a project has — that question is "what should I look at". These cards
 * answer it: what is ready to build, what is blocked or under-specified, and
 * what changed in the docs.
 *
 * A server component: every row comes from the already-loaded project view, so
 * the cockpit costs no extra query (backlog W4's Must-NOT).
 */
export function OverviewCockpit({
  slug,
  tasks,
  docs,
}: {
  slug: string;
  tasks: Task[];
  docs: DocRef[];
}) {
  const open = tasks.filter((t) => t.status !== "done");
  const ready = open.filter((t) => readiness(t).ready);
  const blocked = open.filter((t) => t.status === "blocked");
  // Under-specified: not ready, not blocked — the ones a DoR pass would unlock.
  const draft = open.filter((t) => !readiness(t).ready && t.status !== "blocked");

  return (
    <div className="grid gap-3 lg:grid-cols-3">
      <CockpitCard
        title="Ready to build"
        icon={ListChecks}
        empty="Nothing passes the Definition of Ready yet."
        href={`/ops/${slug}/tasks`}
        total={ready.length}
      >
        {ready.slice(0, LIMIT).map((task) => (
          <Row
            key={task.id}
            href={`/ops/${slug}/tasks`}
            title={task.title}
            description={task.id}
            trailing={<TierBadge tier={task.autonomy} />}
          />
        ))}
      </CockpitCard>

      <CockpitCard
        title={blocked.length > 0 ? "Blocked & under-specified" : "Needs grounding"}
        icon={CircleAlert}
        empty="Every open task carries its Definition of Ready."
        href={`/ops/${slug}/tasks`}
        total={blocked.length + draft.length}
      >
        {[...blocked, ...draft].slice(0, LIMIT).map((task) => (
          <Row
            key={task.id}
            href={`/ops/${slug}/tasks`}
            title={task.title}
            description={task.id}
            trailing={
              task.status === "blocked" ? (
                <span className="text-xs text-red-600 dark:text-red-400">blocked</span>
              ) : (
                <DorGaps missing={readiness(task).missing} />
              )
            }
          />
        ))}
      </CockpitCard>

      <CockpitCard
        title="Docs"
        icon={FileText}
        empty="Nothing under __project__/ yet."
        href={`/ops/${slug}/docs`}
        total={docs.length}
      >
        {docs.slice(0, LIMIT).map((doc) => (
          <Row
            key={`${doc.kind}/${doc.id}`}
            href={`/ops/${slug}/${doc.kind}/${doc.id.split("/").map(encodeURIComponent).join("/")}`}
            title={doc.title}
            description={doc.relPath}
          />
        ))}
      </CockpitCard>
    </div>
  );
}

function CockpitCard({
  title,
  icon: Icon,
  empty,
  href,
  total,
  children,
}: {
  title: string;
  icon: typeof ListChecks;
  empty: string;
  href: string;
  total: number;
  children: React.ReactNode[];
}) {
  return (
    <Card size="sm" className="flex flex-col">
      {/* `flex`, not just `flex-row`: CardHeader is a grid, so the display
          utility has to be overridden or the count drops below the title. */}
      <CardHeader className="flex flex-row items-center gap-2">
        <Icon className="size-4 text-muted-foreground" aria-hidden />
        <CardTitle className="flex-1 text-sm">{title}</CardTitle>
        <span className="text-xs text-muted-foreground tabular-nums">{total}</span>
      </CardHeader>
      <CardContent className="flex-1">
        {children.length === 0 ? (
          <p className="py-2 text-sm text-muted-foreground">{empty}</p>
        ) : (
          <ItemGroup>{children}</ItemGroup>
        )}
      </CardContent>
      {total > LIMIT && (
        <CardContent className="pt-0">
          <Link
            href={href}
            className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground hover:underline"
          >
            {total - LIMIT} more
            <ArrowUpRight className="size-3" aria-hidden />
          </Link>
        </CardContent>
      )}
    </Card>
  );
}

/** One cockpit row — a real anchor, so middle-click and new-tab work. */
function Row({
  href,
  title,
  description,
  trailing,
}: {
  href: string;
  title: string;
  description?: string;
  trailing?: React.ReactNode;
}) {
  return (
    <Item asChild size="sm" className="hover:bg-muted">
      <Link href={href}>
        <ItemContent>
          <ItemTitle className="line-clamp-2">{title}</ItemTitle>
          {description && (
            <ItemDescription className="font-mono text-[11px]">{description}</ItemDescription>
          )}
        </ItemContent>
        {trailing && <ItemActions>{trailing}</ItemActions>}
      </Link>
    </Item>
  );
}
