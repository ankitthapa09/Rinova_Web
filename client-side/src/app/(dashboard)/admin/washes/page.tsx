import type { Metadata } from "next";
import WashesManager from "@/components/admin/WashesManager";

export const metadata: Metadata = {
  title: "Wash Orders — Rinova Admin",
  description: "Approve wash requests and track the day's bays.",
};

export default function AdminWashesPage() {
  return <WashesManager />;
}
