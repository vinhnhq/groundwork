import Link from "next/link";
import { StatusBadge, TierBadge } from "@/components/badges";
import { loadOverview } from "@/lib/ops/load";

export const dynamic = "force-dynamic";

export default async function OpsHome() {
  const { projects, ready, draft } = await loadOverview();

  return (
    <div className="flex flex-col gap-10">
      <section>
        <h1 className="mb-4 text-xl font-semibold tracking-tight">Projects</h1>
        <ul className="grid gap-3 sm:grid-cols-2">
          {projects.map((entry) =>
            entry.status === "ok" ? (
              <li
                key={entry.root}
                className="rounded-lg border border-neutral-200 p-4 dark:border-neutral-800"
              >
                <Link href={`/ops/${entry.meta.slug}`} className="hover:underline">
                  <h2 className="font-medium">{entry.meta.name}</h2>
                </Link>
                <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">
                  {entry.meta.tagline}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                  <StatusBadge status={entry.meta.status === "active" ? "in-progress" : "done"} />
                  {entry.meta.stack.slice(0, 5).map((s) => (
                    <span
                      key={s}
                      className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </li>
            ) : (
              <li
                key={entry.root}
                className="rounded-lg border border-dashed border-neutral-300 p-4 text-sm text-neutral-500 dark:border-neutral-700"
              >
                <span className="font-medium text-neutral-600 dark:text-neutral-400">
                  unconfigured
                </span>{" "}
                — {entry.root}
                <div className="mt-1 text-xs">{entry.reason}</div>
              </li>
            ),
          )}
          {projects.length === 0 && (
            <li className="text-sm text-neutral-500">
              No project roots configured. Set <code>PROJECT_ROOTS</code> in <code>.env.local</code>
              .
            </li>
          )}
        </ul>
      </section>

      <section data-testid="ready-queue">
        <h2 className="mb-1 text-xl font-semibold tracking-tight">Ready to build</h2>
        <p className="mb-4 text-sm text-neutral-500">
          Tasks passing the Definition of Ready across every project.
        </p>
        {ready.length === 0 ? (
          <p className="text-sm text-neutral-500">Nothing ready.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {ready.map((t) => (
              <li key={`${t.project}/${t.id}`} className="flex items-center gap-3 p-3">
                <Link
                  href={`/ops/${t.project}`}
                  className="text-xs text-neutral-500 hover:underline"
                >
                  {t.project}
                </Link>
                <span className="font-mono text-xs text-neutral-400">{t.id}</span>
                <span className="flex-1 text-sm">{t.title}</span>
                <TierBadge tier={t.autonomy} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section data-testid="draft-list">
        <h2 className="mb-1 text-xl font-semibold tracking-tight">Draft — not ready</h2>
        <p className="mb-4 text-sm text-neutral-500">
          Missing DoR fields. Discuss and ground before building.
        </p>
        {draft.length === 0 ? (
          <p className="text-sm text-neutral-500">No drafts.</p>
        ) : (
          <ul className="divide-y divide-neutral-200 rounded-lg border border-neutral-200 dark:divide-neutral-800 dark:border-neutral-800">
            {draft.map(({ task, missing }) => (
              <li key={`${task.project}/${task.id}`} className="flex items-center gap-3 p-3">
                <span className="text-xs text-neutral-500">{task.project}</span>
                <span className="font-mono text-xs text-neutral-400">{task.id}</span>
                <span className="flex-1 text-sm">{task.title}</span>
                <span className="text-xs text-amber-700 dark:text-amber-400">
                  missing: {missing.join(", ")}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
