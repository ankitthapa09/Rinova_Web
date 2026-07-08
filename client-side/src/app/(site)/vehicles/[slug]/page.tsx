import type { Metadata } from "next";
import VehicleDetailView from "@/components/vehicles/VehicleDetailView";

interface Props {
  params: { slug: string };
}

/**
 * Dynamic route: one file serves every vehicle at /vehicles/<slug>.
 * Data loads client-side through vehicleApi, so admin added vehicles appear without a rebuild
 */
export function generateMetadata({ params }: Props): Metadata {
  const name = params.slug
    .split("-")
    .map((w) => w[0]?.toUpperCase() + w.slice(1))
    .join(" ");
  return {
    title: `${name} — Rinova`,
    description: `Rent the ${name} in Kathmandu with Rinova.`,
  };
}

export default function VehicleDetailPage({ params }: Props) {
  return <VehicleDetailView slug={params.slug} />;
}
