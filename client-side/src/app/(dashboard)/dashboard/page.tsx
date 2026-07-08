import type { Metadata } from "next";
import DashboardView from "@/components/dashboard/DashboardView";

export const metadata: Metadata = {
  title: "Dashboard — Rinova",
  description: "Manage your Rinova rentals, washes, and account.",
};

export default function DashboardPage() {
  return <DashboardView />;
}
