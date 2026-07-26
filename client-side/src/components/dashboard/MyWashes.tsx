"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { Droplets, Loader2 } from "lucide-react";
import { washApi, type WashOrder } from "@/lib/washApi";
import WashesList, { isWashCancellable } from "@/components/dashboard/WashesList";

export default function MyWashes() {
  const [orders, setOrders] = useState<WashOrder[] | null>(null);

  const reload = useCallback(async () => {
    try {
      setOrders(await washApi.listMine());
    } catch {
      setOrders([]);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  // Anything still ahead of us goes up top; finished and called-off work drops
  // into history below.
  const upcoming = (orders ?? []).filter(isWashCancellable);
  const past = (orders ?? []).filter((order) => !isWashCancellable(order));

  return (
    <div>
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-fog">Your garage</p>
        <h1 className="mt-4 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-[-0.02em] text-cream">
          Wash Orders
          {orders ? <span className="ml-3 align-middle text-lg text-fog">{orders.length}</span> : null}
        </h1>
      </header>

      <div className="mt-10">
        {orders === null ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-fog" />
          </div>
        ) : orders.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-line p-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-fog">
              <Droplets className="h-5 w-5" />
            </span>
            <p className="mt-4 font-serif text-xl text-cream">No washes yet</p>
            <p className="mt-2 max-w-[300px] text-sm leading-relaxed text-fog">
              Book a wash and it will show up here with its status, right up to the day.
            </p>
            <Link href="/wash/book" className="nav-link mt-5 text-[13px] font-medium text-accent">
              Book a wash
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-6">
            {upcoming.length > 0 ? (
              <section className="rounded-2xl border border-line bg-surface/60 p-6">
                <h2 className="mb-5 text-[11px] font-medium uppercase tracking-[0.18em] text-fog">
                  Coming up
                </h2>
                <WashesList orders={upcoming} onChanged={reload} />
              </section>
            ) : null}

            {past.length > 0 ? (
              <section className="rounded-2xl border border-line bg-surface/60 p-6">
                <h2 className="mb-5 text-[11px] font-medium uppercase tracking-[0.18em] text-fog">
                  History
                </h2>
                <WashesList orders={past} onChanged={reload} />
              </section>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
