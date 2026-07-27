import Link from "next/link";
import { DorGaps, StatusBadge, TierBadge } from "@/components/badges";
import { DeniedNotice } from "@/components/denied-notice";
import { getSession } from "@/lib/auth";
import { loadOverview } from "@/lib/ops/load";

export const dynamic = "force-dynamic";

export default async function OpsHome({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const [{ projects, ready, draft }, { denied }, session] = await Promise.all([
    loadOverview(),
    searchParams,
    getSession(),
  ]);

  return (
    <div className="flex flex-col gap-10">
      {session && <DeniedNotice denied={denied} role={session.user.role} />}

      <section>
        <h1 className="mb-4 text-xl font-semibold tracking-tight">Projects</h1>
        <ul className="grid gap-3 sm:grid-cols-2">
          {projects.map((entry) =>
            entry.status === "ok" ? (
              <li key={entry.root} className="rounded-lg border bg-card p-4">
                <Link href={`/ops/${entry.meta.slug}`} className="hover:underline">
                  <h2 className="font-medium">{entry.meta.name}</h2>
                </Link>
                <p className="mt-1 text-sm text-muted-foreground ">{entry.meta.tagline}</p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={entry.meta.status === "active" ? "in-progress" : "done"} />
                  {entry.meta.stack.slice(0, 5).map((s) => (
                    <span
                      key={s}
                      className="rounded bg-muted px-1.5 py-0.5 text-xs text-muted-foreground "
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </li>
            ) : (
              <li
                key={entry.root}
                className="rounded-lg border border-dashed border-input p-4 text-sm text-muted-foreground "
              >
                <span className="font-medium text-muted-foreground ">unconfigured</span> —{" "}
                {entry.root}
                <div className="mt-1 text-xs">{entry.reason}</div>
              </li>
            ),
          )}
          {projects.length === 0 && (
            <li className="text-sm text-muted-foreground">
              No project roots configured. Set <code>PROJECT_ROOTS</code> in <code>.env.local</code>
              .
            </li>
          )}
        </ul>
      </section>

      <section data-testid="ready-queue">
        <h2 className="mb-1 text-xl font-semibold tracking-tight">Ready to build</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Tasks passing the Definition of Ready across every project.
        </p>
        {ready.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing ready.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border ">
            {ready.map((t) => (
              <li key={`${t.project}/${t.id}`} className="flex items-center gap-3 p-3">
                <Link
                  href={`/ops/${t.project}`}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  {t.project}
                </Link>
                <span className="font-mono text-xs text-muted-foreground">{t.id}</span>
                <span className="flex-1 text-sm">{t.title}</span>
                <TierBadge tier={t.autonomy} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="draft-list">
        <h2 className="mb-1 text-xl font-semibold tracking-tight">Draft — not ready</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Missing DoR fields. Discuss and ground before building.
        </p>
        {draft.length === 0 ? (
          <p className="text-sm text-muted-foreground">No drafts.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border ">
            {draft.map(({ task, missing }) => (
              <li key={`${task.project}/${task.id}`} className="flex items-center gap-3 p-3">
                <span className="text-xs text-muted-foreground">{task.project}</span>
                <span className="font-mono text-xs text-muted-foreground">{task.id}</span>
                <span className="flex-1 text-sm">{task.title}</span>
                <DorGaps missing={missing} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
