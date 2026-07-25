import type { Metadata } from "next";
import NotificationsView from "@/components/notifications/NotificationsView";

export const metadata: Metadata = {
  title: "Notifications — Rinova Admin",
  description: "Booking and wash activity across the desk.",
};

export default function AdminNotificationsPage() {
  return <NotificationsView allowDelete />;
}
