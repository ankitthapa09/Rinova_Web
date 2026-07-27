import type { Metadata } from "next";
import MyWashes from "@/components/dashboard/MyWashes";

export const metadata: Metadata = {
  title: "Wash Orders | Rinova",
  description: "Your booked washes and their status.",
};

export default function MyWashesPage() {
  return <MyWashes />;
}
