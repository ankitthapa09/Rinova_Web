"use client";

import { useSyncExternalStore } from "react";
import { Check, TriangleAlert, X } from "lucide-react";
import { subscribeToasts, getToasts, getServerToasts, toast, type ToastItem } from "./toast";

function ToastCard({ item }: { item: ToastItem }) {
  const isError = item.variant === "error";
  return (
    <div
      role={isError ? "alert" : "status"}
      className={`toast-card pointer-events-auto relative flex w-[min(92vw,380px)] items-center gap-3 overflow-hidden rounded-xl border border-line bg-surface/95 py-3.5 pl-4 pr-3 shadow-lift backdrop-blur-sm transition-[transform,opacity] duration-500 ease-expo ${
        item.leaving ? "translate-x-6 opacity-0" : ""
      }`}
    >
      <span
        aria-hidden
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          isError ? "bg-accent/15 text-accent" : "bg-accent text-night"
        }`}
      >
        {isError ? <TriangleAlert className="h-3.5 w-3.5" /> : <Check className="h-4 w-4" />}
      </span>

      <p className="flex-1 text-[13.5px] leading-snug text-cream">{item.message}</p>

      <button
        onClick={() => toast.dismiss(item.id)}
        aria-label="Dismiss notification"
        className="shrink-0 rounded-full p-1.5 text-fog transition-colors hover:text-cream"
      >
        <X className="h-3.5 w-3.5" />
      </button>

      {/* Lifetime indicator draining left <- right */}
      <span aria-hidden className="toast-progress absolute bottom-0 left-0 h-[2px] w-full bg-accent/70" />
    </div>
  );
}

/** Mount once (root layout); stacks toasts bottom-right. */
export default function Toaster() {
  const toasts = useSyncExternalStore(subscribeToasts, getToasts, getServerToasts);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-6 right-6 z-[120] flex flex-col items-end gap-3"
    >
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} />
      ))}
    </div>
  );
}
