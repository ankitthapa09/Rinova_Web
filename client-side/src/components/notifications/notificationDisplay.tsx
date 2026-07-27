import { CarFront, Droplets } from "lucide-react";
import type { NotificationType } from "@/lib/notificationApi";

// Colour the icon by outcome, new = accent, confirmed/done = blue, ended = fog.
export function tone(type: NotificationType): string {
  if (type.endsWith("_confirmed") || type.endsWith("_completed")) return "text-[#4EA8DE]";
  if (type.endsWith("_declined") || type.endsWith("_cancelled")) return "text-fog";
  return "text-accent";
}

export function NotificationIcon({ type }: { type: NotificationType }) {
  const Glyph = type.startsWith("wash_") ? Droplets : CarFront;
  return <Glyph className={`h-4 w-4 shrink-0 ${tone(type)}`} />;
}

export function timeAgo(iso: string): string {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}
