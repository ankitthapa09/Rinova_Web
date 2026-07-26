"use client";

import { useEffect } from "react";

/**
 * Deep-link support for notifications, a link like `/dashboard/rentals?focus=<id>`
 * scrolls to the matching item (id `item-<id>`) and briefly rings it. Pass the
 * loaded list as `ready` so the effect re-runs once the item is actually in the
 * DOM. Reads the query straight off `window` (not useSearchParams) so it never
 * forces a Suspense/CSR bailout at build. Safe no-op with no param or no match.
 */
export function useFocusItem(ready: unknown) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const focus = new URLSearchParams(window.location.search).get("focus");
    if (!focus) return;

    const el = document.getElementById(`item-${focus}`);
    if (!el) return;

    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.dataset.focus = "true";
    const t = window.setTimeout(() => {
      delete el.dataset.focus;
    }, 2600);
    return () => window.clearTimeout(t);
  }, [ready]);
}
