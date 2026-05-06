"use client";

import { useEffect, useState } from "react";

// Detects narrow viewports so chart components can swap to angled x-axis
// labels without bloating the desktop layout. Defaults to 640px (Tailwind
// `sm` breakpoint) since that's where chart width drops below ~400px.
export function useIsMobile(breakpoint = 640): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
    setIsMobile(mql.matches);
    const onChange = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }, [breakpoint]);

  return isMobile;
}
