import type { Metadata } from "next";
import RentalsManager from "@/components/admin/RentalsManager";

export const metadata: Metadata = {
  title: "Rental Bookings | Rinova Admin",
  description: "Review and resolve rental booking requests.",
};

export default function AdminRentalsPage() {
  return <RentalsManager />;
}
