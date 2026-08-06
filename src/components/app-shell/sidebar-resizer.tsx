"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

/** Bounds in px. Below MIN the tree is unreadable; above MAX the pane starves. */
const MIN = 200;
const MAX = 520;
const DEFAULT = 256; // 16rem — the primitive's own default.
const STORAGE_KEY = "gw:sidebar-width";

const clamp = (px: number) => Math.min(MAX, Math.max(MIN, px));

/**
 * A draggable sidebar width, persisted.
 *
 * Returns the width to hand `SidebarProvider` as `--sidebar-width` (it merges a
 * `style` override after its own defaults, so no edit to the pristine
 * `ui/sidebar.tsx` is needed) plus the handle to render inside the sidebar.
 *
 * Starts at the default and adopts the stored value after mount: reading
 * localStorage during render would make the server's HTML and the client's first
 * paint disagree about the layout width, which is a hydration mismatch.
 */
export function useSidebarWidth() {
  const [width, setWidth] = useState(DEFAULT);

  useEffect(() => {
    const stored = Number(window.localStorage.getItem(STORAGE_KEY));
    if (Number.isFinite(stored) && stored > 0) setWidth(clamp(stored));
  }, []);

  const commit = useCallback((px: number) => {
    const next = clamp(px);
    setWidth(next);
    window.localStorage.setItem(STORAGE_KEY, String(next));
  }, []);

  return { width, commit };
}

/**
 * The drag handle, on the sidebar's inner edge.
 *
 * Replaces `SidebarRail`, which renders a `cursor-w-resize` affordance at this
 * exact spot and then only *toggles* the sidebar — a handle that looks like a
 * resizer and is not one. The collapse toggle stays available on the header
 * button and ⌘B.
 *
 * `role="separator"` with arrow-key support, because a drag-only control is
 * unreachable without a pointer. Double-click restores the default.
 */
export function SidebarResizer({
  width,
  onCommit,
  className,
}: {
  width: number;
  onCommit: (px: number) => void;
  className?: string;
}) {
  const [dragging, setDragging] = useState(false);
  const start = useRef({ x: 0, width: 0 });

  useEffect(() => {
    if (!dragging) return;

    const move = (e: PointerEvent) => onCommit(start.current.width + (e.clientX - start.current.x));
    const stop = () => setDragging(false);

    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", stop);
    // Suppress text selection and keep the resize cursor while dragging, even
    // when the pointer leaves the 4px handle — which it always does.
    const previous = document.body.style.cssText;
    document.body.style.userSelect = "none";
    document.body.style.cursor = "col-resize";

    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", stop);
      document.body.style.cssText = previous;
    };
  }, [dragging, onCommit]);

  return (
    // Hidden on mobile (the sidebar is a sheet) and when collapsed to icons
    // (there is no width to negotiate).
    //
    // `<hr>` is the right element for a *decorative* separator, but this is the
    // WAI-ARIA window-splitter pattern: a focusable `role="separator"` carrying
    // aria-valuenow/min/max plus arrow-key handling. An `<hr>` cannot take
    // focus, so following the lint rule would delete the keyboard path.
    <button
      type="button"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize sidebar"
      aria-valuenow={width}
      aria-valuemin={MIN}
      aria-valuemax={MAX}
      tabIndex={0}
      onPointerDown={(e) => {
        e.preventDefault();
        start.current = { x: e.clientX, width };
        setDragging(true);
      }}
      onDoubleClick={() => onCommit(DEFAULT)}
      onKeyDown={(e) => {
        const step = e.shiftKey ? 32 : 8;
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          onCommit(width - step);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          onCommit(width + step);
        } else if (e.key === "Home") {
          e.preventDefault();
          onCommit(DEFAULT);
        }
      }}
      title="Drag to resize · double-click to reset"
      className={cn(
        // A wide, invisible hit area straddling the edge — a 1px target is a
        // pointer-accuracy test, not a control.
        "absolute inset-y-0 -right-1.5 z-20 hidden w-3 cursor-col-resize md:block",
        "group-data-[collapsible=icon]:pointer-events-none group-data-[collapsible=icon]:hidden",
        "focus-visible:outline-none",
        // The visible affordance is a short centred pill, present at rest rather
        // than only on hover: a handle you have to discover by sweeping the mouse
        // along the edge is a handle most people never find.
        "after:absolute after:top-1/2 after:left-1/2 after:h-8 after:w-1 after:-translate-x-1/2",
        "after:-translate-y-1/2 after:rounded-full after:bg-sidebar-border after:transition-colors",
        "after:content-[''] hover:after:bg-muted-foreground focus-visible:after:bg-ring",
        dragging && "after:bg-ring",
        className,
      )}
    />
  );
}
