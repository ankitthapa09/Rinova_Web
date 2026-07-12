import type { Metadata } from "next";
import AdminOverview from "@/components/admin/AdminOverview";

export const metadata: Metadata = {
  title: "Admin — Rinova",
  description: "Manage the Rinova fleet, bookings, and customers.",
};

export default function AdminPage() {
  return <AdminOverview />;
}
