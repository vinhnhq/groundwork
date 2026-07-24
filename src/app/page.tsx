import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-6 px-6 py-16">
      <h1 className="text-3xl font-semibold tracking-tight">Groundwork</h1>
      <p className="text-neutral-600 dark:text-neutral-400">
        Turns client ideas into ready-to-build tickets, grounded in your real docs — one view across
        every project.
      </p>
      <Link
        href="/ops"
        className="inline-flex w-fit items-center rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
      >
        Open ops console →
      </Link>
    </main>
  );
}
