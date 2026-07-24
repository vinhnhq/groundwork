import Link from "next/link";
import { loadPortfolio } from "@/lib/ops/load";

export const dynamic = "force-dynamic";

export default async function Home() {
  const projects = await loadPortfolio();

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-12 px-6 py-16">
      <header className="flex flex-col gap-4">
        <h1 className="text-3xl font-semibold tracking-tight">Groundwork</h1>
        <p className="max-w-xl text-neutral-600 dark:text-neutral-400">
          Turns client ideas into ready-to-build tickets, grounded in your real docs — one view
          across every project.
        </p>
        <Link
          href="/ops"
          className="inline-flex w-fit items-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          Open ops console →
        </Link>
      </header>

      <section className="flex flex-col gap-4">
        <h2 className="text-sm font-medium uppercase tracking-wide text-neutral-500">Projects</h2>
        {projects.length === 0 ? (
          <p className="text-sm text-neutral-500">No public projects configured.</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {projects.map((p) => (
              <li
                key={p.slug}
                className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-5 dark:border-neutral-800"
              >
                <div>
                  <h3 className="font-medium">{p.name}</h3>
                  <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-400">{p.tagline}</p>
                </div>
                {p.highlights.length > 0 && (
                  <ul className="flex flex-col gap-1 text-sm text-neutral-600 dark:text-neutral-400">
                    {p.highlights.map((h) => (
                      <li key={h} className="flex gap-2">
                        <span className="text-neutral-400">·</span>
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-auto flex flex-wrap gap-1.5">
                  {p.stack.map((s) => (
                    <span
                      key={s}
                      className="rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
