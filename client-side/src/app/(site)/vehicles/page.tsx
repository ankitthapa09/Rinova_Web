import type { Metadata } from "next";
import VehiclesView from "@/components/vehicles/VehiclesView";

export const metadata: Metadata = {
  title: "Vehicles | Rinova",
  description:
    "Browse Rinova's rental vehicles, bikes, cars, SUVs, vans and buses in Kathmandu. Pick your ride and book in minutes.",
};

export default function VehiclesPage() {
  return <VehiclesView />;
}
