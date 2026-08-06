import * as React from "react";

/**
 * Below this, the sidebar is an overlay sheet rather than a column.
 *
 * 1024 rather than shadcn's default 768, because a portrait tablet (768–834) is
 * the case that mattered: the sidebar held its full 256px there, leaving the
 * triage composer ~470px of a ~800px screen — a cramped column beside a nav you
 * were not using. Overlaying below 1024 is also the conventional editor
 * behaviour, and it keeps every ops surface consistent rather than giving triage
 * its own chrome.
 *
 * Landscape tablets (≥1024) keep the persistent sidebar.
 */
const MOBILE_BREAKPOINT = 1024;

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined);

  React.useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`);
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    mql.addEventListener("change", onChange);
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    return () => mql.removeEventListener("change", onChange);
  }, []);

  return !!isMobile;
}
