import type { Metadata } from "next";
import AdminView from "@/components/admin/AdminView";

export const metadata: Metadata = {
  title: "Admin — Rinova",
  description: "Manage the Rinova fleet, bookings, and customers.",
};

export default function AdminPage() {
  return <AdminView />;
}
