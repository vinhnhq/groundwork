import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { RecordedWrite } from "@/lib/content/writers/memory";

/**
 * What the dry run would have written, kept visible after the inline notice is
 * gone.
 *
 * Without this the mocked write-back is unfalsifiable: you click "Add to
 * backlog", a message flashes, and a reload leaves no trace — indistinguishable
 * from a write that silently did nothing. Showing the resulting file is the
 * evidence that the transport is the only missing piece.
 */
export function ProposedChanges({ writes }: { writes: RecordedWrite[] }) {
  if (writes.length === 0) return null;

  return (
    <Card
      className="border border-dashed border-amber-400/60 ring-0"
      data-testid="proposed-changes"
    >
      <CardHeader>
        <div className="flex flex-wrap items-baseline gap-2">
          <CardTitle className="text-lg">Proposed changes</CardTitle>
          <span className="text-xs text-muted-foreground">
            {writes.length} this session · nothing was written to the repo
          </span>
        </div>
        <CardDescription>
          The write-back transport is a dry run. These are the exact file contents it would have
          committed — set <code>WRITE_BACK</code> to a real transport to make them land. Cleared
          when the server restarts.
        </CardDescription>
      </CardHeader>

      <CardContent>
      <ul className="flex flex-col gap-2">
        {writes.map((write) => (
          <li key={`${write.at}-${write.message}`} className="rounded-md border border-border p-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="text-sm font-medium">{write.message}</span>
              <span className="text-xs text-muted-foreground">
                by {write.actor} · {new Date(write.at).toLocaleTimeString()}
              </span>
            </div>
            <details className="mt-1.5">
              <summary className="cursor-pointer text-xs text-muted-foreground hover:underline">
                Resulting backlog.md ({write.content.length.toLocaleString()} chars)
              </summary>
              <pre className="mt-2 max-h-72 overflow-auto rounded bg-muted/40 p-2 text-xs whitespace-pre-wrap">
                {write.content}
              </pre>
            </details>
          </li>
        ))}
      </ul>
      </CardContent>
    </Card>
  );
}
