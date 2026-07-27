"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, Check, Droplets } from "lucide-react";
import { gsap, EASE, MOTION_OK } from "@/components/landing/gsap";
import SmoothScroll from "@/components/landing/SmoothScroll";
import Cursor from "@/components/landing/Cursor";
import SplitChars from "@/components/landing/SplitChars";
import MagneticSubmit, { type SubmitStatus } from "@/components/auth/MagneticSubmit";
import { useAuth } from "@/lib/useAuth";
import { toast } from "@/components/ui/toast";
import { CATEGORY_LABELS, formatNpr, type VehicleCategory } from "@/lib/vehicleApi";
import {
  washApi,
  washPriceFor,
  formatSlot,
  type WashCatalogue,
  type WashPackageId,
  type SlotAvailability,
} from "@/lib/washApi";
import { ApiError } from "@/lib/api";

const PACKAGE_IDS: WashPackageId[] = ["basic", "deep", "detail"];

function isPackageId(value: string | null): value is WashPackageId {
  return value !== null && PACKAGE_IDS.includes(value as WashPackageId);
}

function isVehicleType(value: string | null): value is VehicleCategory {
  return value !== null && value in CATEGORY_LABELS;
}

function todayInput(): string {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

/** The furthest day the server will accept, as a date-input max. */
function maxInput(daysAhead: number): string {
  const day = new Date();
  day.setDate(day.getDate() + daysAhead);
  day.setMinutes(day.getMinutes() - day.getTimezoneOffset());
  return day.toISOString().slice(0, 10);
}

export default function WashBookingView() {
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const params = useSearchParams();
  const { user, loading: authLoading } = useAuth(true);

  // The landing page's pricing cards deep-link in with the choice already made.
  const [catalogue, setCatalogue] = useState<WashCatalogue | null>(null);
  const [packageId, setPackageId] = useState<WashPackageId>(
    isPackageId(params.get("package")) ? (params.get("package") as WashPackageId) : "deep",
  );
  const [vehicleType, setVehicleType] = useState<VehicleCategory>(
    isVehicleType(params.get("type")) ? (params.get("type") as VehicleCategory) : "car",
  );

  const [vehicleLabel, setVehicleLabel] = useState("");
  const [plateNumber, setPlateNumber] = useState("");
  const [date, setDate] = useState("");
  const [slot, setSlot] = useState("");
  const [notes, setNotes] = useState("");

  const [slots, setSlots] = useState<SlotAvailability[] | null>(null);
  const [status, setStatus] = useState<SubmitStatus>("idle");

  const today = todayInput();

  useEffect(() => {
    washApi
      .catalogue()
      .then(setCatalogue)
      .catch(() => toast.error("Couldn't load the wash menu. Is the server running?"));
  }, []);

  // Slots belong to a day, every date change asks the server what's left.
  useEffect(() => {
    if (!date) {
      setSlots(null);
      return;
    }
    let cancelled = false;
    setSlots(null);
    washApi
      .availability(date)
      .then((rows) => {
        if (cancelled) return;
        setSlots(rows);
        // A slot picked on another day may be full (or past) on this one.
        setSlot((current) =>
          rows.some((row) => row.slot === current && row.available) ? current : "",
        );
      })
      .catch(() => {
        if (!cancelled) toast.error("Couldn't check the free slots for that day.");
      });
    return () => {
      cancelled = true;
    };
  }, [date]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !catalogue) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({ delay: 0.05, defaults: { ease: EASE } });
      tl.fromTo(q("[data-wash-back]"), { y: -14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0)
        .to(q(".split-char"), { y: 0, rotate: 0, duration: 1.05, stagger: 0.025 }, 0.05)
        .fromTo(
          q("[data-wash-item]"),
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.85, stagger: 0.08 },
          0.35,
        );
    });
    return () => mm.revert();
  }, [catalogue]);

  const pkg = catalogue?.packages.find((p) => p.id === packageId);
  const price = catalogue ? washPriceFor(catalogue.packages, packageId, vehicleType) : undefined;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (status !== "idle" || authLoading) return;

    if (!user) {
      toast.error("Please sign in to book a wash.");
      router.push("/login");
      return;
    }
    if (!vehicleLabel.trim() || !plateNumber.trim()) {
      toast.error("Tell us your vehicle and its number plate.");
      return;
    }
    if (!date || !slot) {
      toast.error("Pick a day and an arrival time.");
      return;
    }

    setStatus("loading");
    try {
      await washApi.create({
        packageId,
        vehicleType,
        vehicleLabel: vehicleLabel.trim(),
        plateNumber: plateNumber.trim(),
        scheduledDate: date,
        slot,
        notes: notes.trim() || undefined,
      });
      setStatus("success");
      toast.success(`Wash requested, ${pkg?.name} at ${formatSlot(slot)}. We'll confirm it shortly.`);
      window.setTimeout(() => router.push("/dashboard/washes"), 1400);
    } catch (err) {
      setStatus("idle");
      if (err instanceof ApiError) {
        // e.g. 409 "that slot is fully booked", or a per-field date/plate error
        const fieldMsg = Object.values(err.fieldErrors)[0];
        toast.error(fieldMsg ?? err.message);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    }
  };

  const fieldClass =
    "w-full rounded-lg border border-line bg-night px-3.5 py-3 text-sm text-cream outline-none transition-colors placeholder:text-fog/60 [color-scheme:dark] focus:border-accent";
  const labelClass = "mb-2 block text-[11px] font-medium uppercase tracking-[0.18em] text-fog";

  return (
    <div ref={rootRef} className="relative min-h-[100svh] overflow-hidden">
      <SmoothScroll />
      <Cursor />
      <div aria-hidden className="glow-orb absolute -left-[20%] -top-[15%] h-[55vw] w-[55vw]" />

      <div className="relative mx-auto w-full max-w-wrap px-6 pb-24 pt-28 md:pt-32">
        <Link
          data-wash-back
          href="/#pricing"
          className="group inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-fog transition-colors hover:text-cream"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-500 ease-expo group-hover:-translate-x-1" />
          Wash packages
        </Link>

        <h1 className="mt-8 font-serif text-[clamp(2.6rem,6vw,4.5rem)] leading-[1.05] tracking-[-0.02em] text-cream">
          <SplitChars text="Book a wash" />
        </h1>
        <p data-wash-item className="mt-4 max-w-md text-[15px] leading-relaxed text-fog">
          Pick your package, tell us what you drive, and choose when to roll in. We&apos;ll confirm
          your bay shortly after.
        </p>

        {!catalogue ? (
          <div className="mt-10 grid animate-pulse gap-8 lg:grid-cols-[1fr_1.1fr]">
            <div className="h-80 rounded-3xl border border-line bg-surface/50" />
            <div className="h-[30rem] rounded-3xl border border-line bg-surface/50" />
          </div>
        ) : (
          <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_1.1fr] lg:gap-12">
            {/* What you're buying */}
            <div data-wash-item className="lg:sticky lg:top-28 lg:self-start">
              <div className="relative overflow-hidden rounded-3xl border border-line bg-surface/60 p-8">
                <Droplets
                  aria-hidden
                  className="absolute -right-4 -top-4 h-28 w-28 text-[#4EA8DE]/10"
                  strokeWidth={1}
                />
                <p className="text-[11px] uppercase tracking-[0.18em] text-fog">Your wash</p>
                <h2 className="mt-2 font-serif text-3xl text-cream">{pkg?.name}</h2>
                <p className="mt-1 text-[13px] text-fog">
                  {pkg?.duration} · {CATEGORY_LABELS[vehicleType]}
                </p>

                <p className="mt-7 font-serif text-5xl tracking-tight text-cream">
                  <span className="mr-2 text-[0.32em] uppercase tracking-[0.08em] text-fog">NPR</span>
                  {price !== undefined ? price.toLocaleString("en-US") : "-"}
                </p>
                <p className="mt-1 text-[12px] text-fog">
                  Priced by our garage, you pay at the bay.
                </p>

                <ul className="mt-7 divide-y divide-line border-y border-line">
                  {pkg?.features.map((feature) => (
                    <li key={feature} className="flex items-center gap-3 py-3 text-[13.5px] text-fog">
                      <Check className="h-4 w-4 shrink-0 text-[#4EA8DE]" strokeWidth={1.5} />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* The form */}
            <form data-wash-item onSubmit={onSubmit} className="rounded-3xl border border-line bg-surface/60 p-6 md:p-8">
              {/* Package */}
              <p className={labelClass}>Package</p>
              <div className="grid gap-2 sm:grid-cols-3">
                {catalogue.packages.map((option) => {
                  const active = option.id === packageId;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setPackageId(option.id)}
                      className={`rounded-xl border px-4 py-3.5 text-left transition-colors duration-300 ${
                        active
                          ? "border-accent bg-accent/10"
                          : "border-line bg-night hover:border-cream/25"
                      }`}
                    >
                      <span className={`block text-[13.5px] ${active ? "text-cream" : "text-fog"}`}>
                        {option.name}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-fog">
                        {formatNpr(option.prices[vehicleType])}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Vehicle type */}
              <p className={`${labelClass} mt-7`}>Vehicle type</p>
              <div className="flex flex-wrap gap-2">
                {(Object.keys(CATEGORY_LABELS) as VehicleCategory[]).map((type) => {
                  const active = type === vehicleType;
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setVehicleType(type)}
                      className={`shrink-0 whitespace-nowrap rounded-full border px-4 py-2 text-[12.5px] font-medium transition-colors duration-300 ${
                        active
                          ? "border-accent bg-accent text-night"
                          : "border-line text-fog hover:border-cream/25 hover:text-cream"
                      }`}
                    >
                      {CATEGORY_LABELS[type]}
                    </button>
                  );
                })}
              </div>

              {/* The vehicle itself */}
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className={labelClass}>Make &amp; model</span>
                  <input
                    value={vehicleLabel}
                    onChange={(e) => setVehicleLabel(e.target.value)}
                    placeholder="Toyota Hilux"
                    maxLength={60}
                    className={fieldClass}
                  />
                </label>
                <label className="block">
                  <span className={labelClass}>Number plate</span>
                  <input
                    value={plateNumber}
                    onChange={(e) => setPlateNumber(e.target.value.toUpperCase())}
                    placeholder="BA 2 KHA 1234"
                    maxLength={20}
                    className={`${fieldClass} uppercase`}
                  />
                </label>
              </div>

              {/* When */}
              <label className="mt-7 block">
                <span className={labelClass}>Wash date</span>
                <input
                  type="date"
                  min={today}
                  max={maxInput(catalogue.maxDaysAhead)}
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className={fieldClass}
                />
              </label>

              <p className={`${labelClass} mt-7`}>Arrival time</p>
              {!date ? (
                <p className="rounded-lg border border-dashed border-line px-4 py-5 text-center text-[13px] text-fog">
                  Choose a date to see which bays are free.
                </p>
              ) : !slots ? (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {Array.from({ length: 6 }, (_, i) => (
                    <div key={i} className="h-[3.9rem] animate-pulse rounded-xl bg-night/60" />
                  ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {slots.map((row) => {
                    const active = row.slot === slot;
                    return (
                      <button
                        key={row.slot}
                        type="button"
                        disabled={!row.available}
                        onClick={() => setSlot(row.slot)}
                        className={`rounded-xl border px-3 py-3 text-center transition-colors duration-300 disabled:cursor-not-allowed disabled:opacity-40 ${
                          active
                            ? "border-[#4EA8DE] bg-[#4EA8DE]/12"
                            : "border-line bg-night enabled:hover:border-cream/25"
                        }`}
                      >
                        <span className={`block text-[13.5px] ${active ? "text-cream" : "text-fog"}`}>
                          {formatSlot(row.slot)}
                        </span>
                        <span className="mt-0.5 block text-[10.5px] text-fog">
                          {!row.available
                            ? row.baysLeft === 0
                              ? "Fully booked"
                              : "Time passed"
                            : `${row.baysLeft} ${row.baysLeft === 1 ? "bay" : "bays"} left`}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              <label className="mt-7 block">
                <span className={labelClass}>Anything we should know? (optional)</span>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="Muddy boot, pet hair on the back seats…"
                  className={`${fieldClass} resize-none`}
                />
              </label>

              {price !== undefined ? (
                <div className="mt-6 flex items-center justify-between border-t border-line/60 pt-4">
                  <span className="text-sm text-cream">Total</span>
                  <span className="font-serif text-2xl text-cream">{formatNpr(price)}</span>
                </div>
              ) : null}

              <div className="mt-6">
                <MagneticSubmit status={status} successLabel="Wash requested">
                  {user ? "Request This Wash" : "Sign In to Book"}
                </MagneticSubmit>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
