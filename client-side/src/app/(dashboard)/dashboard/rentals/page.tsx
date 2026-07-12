import type { Metadata } from "next";
import MyRentals from "@/components/dashboard/MyRentals";

export const metadata: Metadata = {
  title: "My Rentals — Rinova",
  description: "Your rental bookings and their status.",
};

export default function MyRentalsPage() {
  return <MyRentals />;
}
