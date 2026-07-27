import type { Metadata } from "next";
import VehiclesManager from "@/components/admin/VehiclesManager";

export const metadata: Metadata = {
  title: "Vehicles | Rinova Admin",
  description: "Manage the Rinova fleet.",
};

export default function AdminVehiclesPage() {
  return <VehiclesManager />;
}
