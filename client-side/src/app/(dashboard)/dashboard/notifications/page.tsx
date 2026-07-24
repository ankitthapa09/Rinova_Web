import type { Metadata } from "next";
import NotificationsView from "@/components/notifications/NotificationsView";

export const metadata: Metadata = {
  title: "Notifications — Rinova",
  description: "Your rental and wash activity.",
};

export default function NotificationsPage() {
  return <NotificationsView />;
}
