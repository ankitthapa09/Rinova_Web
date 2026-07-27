import type { Metadata } from "next";
import { Suspense } from "react";
import WashBookingView from "@/components/wash/WashBookingView";

export const metadata: Metadata = {
  title: "Book a Wash | Rinova",
  description:
    "Book a car or bike wash in Kathmandu, basic wash, deep clean or full detail. Pick your package, vehicle and arrival time.",
};

export default function WashBookingPage() {
  // The view reads ?package= and ?type= from the pricing cards, so it has to be
  // wrapped for Next's static pass.
  return (
    <Suspense>
      <WashBookingView />
    </Suspense>
  );
}
