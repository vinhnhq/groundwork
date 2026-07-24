export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <div className="h-6 w-48 animate-pulse rounded bg-muted " />
      <div className="h-40 animate-pulse rounded-lg bg-muted " />
      <div className="h-40 animate-pulse rounded-lg bg-muted " />
    </div>
  );
}
