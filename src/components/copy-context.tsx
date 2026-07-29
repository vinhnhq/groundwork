"use client";

import { useRef, useState } from "react";

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
        <button
          type="button"
          onClick={copy}
          data-testid="copy-context"
          className="inline-flex items-center rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {state === "copied" ? "Copied ✓" : "Copy context"}
        </button>
        <a
          href={exportHref}
          className="inline-flex items-center rounded-md border border-border px-3 py-1.5 text-sm hover:bg-muted"
        >
          context.md
        </a>
        <span className="text-xs text-muted-foreground">
          {text.length.toLocaleString()} characters
        </span>
      </div>

      {state === "manual" && (
        <div className="flex flex-col gap-1">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            Clipboard access was blocked — select the text below and copy it manually.
          </p>
          <textarea
            ref={manualRef}
            readOnly
            value={text}
            rows={8}
            data-testid="copy-context-fallback"
            className="w-full rounded-md border border-border bg-muted/40 p-2 font-mono text-xs"
          />
        </div>
      )}
    </div>
  );
}
