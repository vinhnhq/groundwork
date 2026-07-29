"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { interactiveRowClassName, interactiveRowProps } from "@/components/interactive-row";
import { Badge } from "@/components/ui/badge";
import { TableCell, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

/**
 * A docs row whose whole surface is the target.
 *
 * The title was already a link, which left the other 80% of a wide row inert —
 * you aim at four words in a column that is hundreds of pixels across.
 * `interactiveRowProps` makes the row itself activate, and keeps it operable by
 * keyboard without replacing the `<tr>` semantics a screen reader announces.
 * The inner link stays, so middle-click and "open in new tab" still work.
 */
export function DocRow({
  href,
  kindLabel,
  id,
  title,
}: {
  href: string;
  kindLabel: string;
  id: string;
  title: string;
}) {
  const router = useRouter();

  return (
    <TableRow
      className={cn(interactiveRowClassName)}
      {...interactiveRowProps(() => router.push(href))}
    >
      <TableCell>
        <Badge variant="outline">{kindLabel}</Badge>
      </TableCell>
      <TableCell className="truncate font-mono text-xs text-muted-foreground">{id}</TableCell>
      <TableCell className="font-medium break-words whitespace-normal">
        {/* A real anchor, not just the row handler: this is what gives the row
            an href — middle-click, open-in-new-tab, "copy link address" and the
            accessible link role all come from it. The row click is a
            convenience on top, not a replacement. */}
        <Link href={href} className="hover:underline" onClick={(e) => e.stopPropagation()}>
          {title}
        </Link>
      </TableCell>
    </TableRow>
  );
}
