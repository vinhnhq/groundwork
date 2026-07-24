function Bar({ w }: { w: string }) {
  return <div className={`h-4 ${w} animate-pulse rounded bg-neutral-200 dark:bg-neutral-800`} />;
}

export default function Loading() {
  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-3">
        <Bar w="w-32" />
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="h-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
          <div className="h-24 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        <Bar w="w-40" />
        <div className="h-32 animate-pulse rounded-lg bg-neutral-100 dark:bg-neutral-900" />
      </div>
    </div>
  );
}
