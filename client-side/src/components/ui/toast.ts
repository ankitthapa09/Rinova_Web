"use client";

export type ToastVariant = "success" | "error";

export interface ToastItem {
  id: number;
  message: string;
  variant: ToastVariant;
  leaving?: boolean;
}

// Tiny module-level store, call toast.success()/toast.error() from anywhere,
// the mounted <Toaster /> re-renders via useSyncExternalStore.
let toasts: ToastItem[] = [];
const listeners = new Set<() => void>();
let nextId = 1;

const SHOW_MS = 4200;
const EXIT_MS = 450;

function emit() {
  listeners.forEach((l) => l());
}

function dismiss(id: number) {
  const item = toasts.find((t) => t.id === id);
  if (!item || item.leaving) return;
  toasts = toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t));
  emit();
  window.setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, EXIT_MS);
}

function push(message: string, variant: ToastVariant) {
  const id = nextId++;
  toasts = [...toasts, { id, message, variant }];
  emit();
  window.setTimeout(() => dismiss(id), SHOW_MS);
}

export const toast = {
  success: (message: string) => push(message, "success"),
  error: (message: string) => push(message, "error"),
  dismiss,
};

export function subscribeToasts(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getToasts(): ToastItem[] {
  return toasts;
}

const EMPTY: ToastItem[] = [];
export function getServerToasts(): ToastItem[] {
  return EMPTY;
}
