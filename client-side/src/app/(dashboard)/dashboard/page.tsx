import type { Metadata } from "next";
import DashboardOverview from "@/components/dashboard/DashboardOverview";

export const metadata: Metadata = {
  title: "Dashboard — Rinova",
  description: "Manage your Rinova rentals, washes, and account.",
};

export default function DashboardPage() {
  return <DashboardOverview />;
}
