"use client";

import { Check, Copy, FileDown } from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type State = "idle" | "copied" | "manual";

/**
 * The universal grounding door: hand the digest to any agent, no setup.
 *
 * The clipboard API needs a secure context and a user gesture, and browsers
 * reject it often enough that a button which silently fails would be worse than
 * none — so a rejection falls back to a pre-selected textarea the user can copy
 * by hand (G2 escalate-if).
 */
export function CopyContext({ text, exportHref }: { text: string; exportHref: string }) {
  const [state, setState] = useState<State>("idle");
  const manualRef = useRef<HTMLTextAreaElement>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("copied");
      window.setTimeout(() => setState("idle"), 2000);
    } catch {
      setState("manual");
      window.requestAnimationFrame(() => manualRef.current?.select());
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" size="sm" onClick={copy} data-testid="copy-context">
          {state === "copied" ? <Check aria-hidden /> : <Copy aria-hidden />}
          {state === "copied" ? "Copied" : "Copy context"}
        </Button>
        {/* `asChild` so the export stays a real anchor — the button styling is
            presentation, and is not a reason to lose middle-click or "save as". */}
        <Button asChild size="sm" variant="outline">
          <Link href={exportHref} prefetch={false}>
            <FileDown aria-hidden />
            context.md
          </Link>
        </Button>
        <span className="text-xs text-muted-foreground">
          {text.length.toLocaleString()} characters
        </span>
      </div>

      {state === "manual" && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Clipboard access was blocked — select the text below and copy it manually.
          </p>
          <Textarea
            ref={manualRef}
            readOnly
            value={text}
            rows={8}
            data-testid="copy-context-fallback"
            className="font-mono text-xs"
          />
        </div>
      )}
    </div>
  );
}
