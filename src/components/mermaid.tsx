"use client";

import { useEffect, useId, useRef, useState } from "react";

/** Client-side mermaid render (kept off the initial bundle via dynamic import). */
export function Mermaid({ chart }: { chart: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const rawId = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const mermaid = (await import("mermaid")).default;
        mermaid.initialize({ startOnLoad: false, theme: "neutral", securityLevel: "strict" });
        const { svg } = await mermaid.render(`m-${rawId}`, chart);
        if (active && ref.current) ref.current.innerHTML = svg;
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [chart, rawId]);

  if (failed) {
    return <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs ">{chart}</pre>;
  }
  return <div ref={ref} data-testid="mermaid" className="my-4 overflow-x-auto" />;
}
