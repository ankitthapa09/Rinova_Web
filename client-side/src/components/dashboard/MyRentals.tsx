"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { CarFront, Loader2 } from "lucide-react";
import { bookingApi, type Booking } from "@/lib/bookingApi";
import RentalsList from "@/components/dashboard/RentalsList";

export default function MyRentals() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);

  const reload = useCallback(async () => {
    try {
      setBookings(await bookingApi.listMine());
    } catch {
      setBookings([]);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  return (
    <div>
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-fog">Your garage</p>
        <h1 className="mt-4 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-[-0.02em] text-cream">
          My Rentals
          {bookings ? <span className="ml-3 align-middle text-lg text-fog">{bookings.length}</span> : null}
        </h1>
      </header>

      <div className="mt-10">
        {bookings === null ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-fog" />
          </div>
        ) : bookings.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-line p-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-fog">
              <CarFront className="h-5 w-5" />
            </span>
            <p className="mt-4 font-serif text-xl text-cream">No rentals yet</p>
            <p className="mt-2 max-w-[300px] text-sm leading-relaxed text-fog">
              Book a vehicle from the fleet and it will show up here with its status.
            </p>
            <Link href="/vehicles" className="nav-link mt-5 text-[13px] font-medium text-accent">
              Browse the fleet
            </Link>
          </div>
        ) : (
          <div className="rounded-2xl border border-line bg-surface/60 p-6">
            <RentalsList bookings={bookings} onChanged={reload} />
          </div>
        )}
      </div>
    </div>
  );
}
