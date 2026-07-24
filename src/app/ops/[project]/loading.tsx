export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-6 w-48 animate-pulse rounded bg-neutral-200 dark:bg-neutral-800" />
      <div className="h-40 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
      <div className="h-40 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
    </div>
  );
}
