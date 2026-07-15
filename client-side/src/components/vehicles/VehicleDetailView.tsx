"use client";

import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Users, Fuel, Gauge, Cog, X, ChevronLeft, ChevronRight, Expand, Route, BatteryCharging } from "lucide-react";
import { gsap, EASE, MOTION_OK } from "@/components/landing/gsap";
import SmoothScroll from "@/components/landing/SmoothScroll";
import Cursor from "@/components/landing/Cursor";
import SplitChars from "@/components/landing/SplitChars";
import { useWebGL } from "@/components/landing/three/useWebGL";
import MagneticSubmit, { type SubmitStatus } from "@/components/auth/MagneticSubmit";
import { useAuth } from "@/lib/useAuth";
import { toast } from "@/components/ui/toast";
import { vehicleApi, CATEGORY_LABELS, formatNpr, type Vehicle } from "@/lib/vehicleApi";
import { bookingApi, type Booking } from "@/lib/bookingApi";
import { STATUS_STYLES, dateRange, isCancellable } from "@/components/dashboard/RentalsList";
import { ApiError } from "@/lib/api";

// Same turntable stage the auth pages use — generic vehicle showcase
const VehicleStage = dynamic(() => import("@/components/auth/AuthScene"), { ssr: false });

const DAY_MS = 86_400_000;

function toDateInput(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Full-page placeholder while the vehicle loads. */
function DetailSkeleton() {
  return (
    <div className="mt-8 grid animate-pulse gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
      <div className="aspect-[4/3] rounded-3xl border border-line bg-surface/50" />
      <div className="space-y-5">
        <div className="h-3 w-24 rounded bg-surface/70" />
        <div className="h-12 w-3/4 rounded bg-surface/80" />
        <div className="h-4 w-1/2 rounded bg-surface/70" />
        <div className="h-20 w-full rounded bg-surface/60" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="h-24 rounded-xl bg-surface/60" />
          ))}
        </div>
        <div className="h-56 rounded-2xl bg-surface/60" />
      </div>
    </div>
  );
}

function NotFound() {
  return (
    <div className="mt-24 text-center">
      <p className="font-serif text-4xl text-cream">This one&apos;s not in the garage.</p>
      <p className="mt-3 text-fog">The vehicle you&apos;re looking for doesn&apos;t exist or was removed.</p>
      <Link href="/vehicles" className="nav-link mt-6 inline-block text-sm font-medium text-accent">
        Browse all vehicles
      </Link>
    </div>
  );
}

export default function VehicleDetailView({ slug }: { slug: string }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const gl = useWebGL();
  const { user, loading: authLoading } = useAuth(true);

  // undefined = loading, null = not found
  const [vehicle, setVehicle] = useState<Vehicle | null | undefined>(undefined);

  const today = toDateInput(new Date());
  const [pickup, setPickup] = useState("");
  const [dropoff, setDropoff] = useState("");
  const [status, setStatus] = useState<SubmitStatus>("idle");

  // The signed-in user's live booking for THIS vehicle, if any — one active
  // booking per vehicle, so the panel offers cancel instead of rebooking.
  const [myBooking, setMyBooking] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  // Photo lightbox — index of the open photo, or null when closed.
  const [lightbox, setLightbox] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    vehicleApi.get(slug).then((v) => {
      if (!cancelled) setVehicle(v);
    });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    bookingApi
      .listMine()
      .then((list) => {
        if (cancelled) return;
        setMyBooking(
          list.find(
            (b) =>
              b.vehicle.slug === slug && (b.status === "pending" || b.status === "confirmed"),
          ) ?? null,
        );
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [user, slug]);

  const onCancelBooking = async () => {
    if (!myBooking || cancelling) return;
    setCancelling(true);
    try {
      await bookingApi.cancel(myBooking._id);
      toast.success(`${myBooking.vehicle.name} booking cancelled.`);
      setMyBooking(null); // the form returns, dates are free again
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "Couldn't cancel the booking.");
    } finally {
      setCancelling(false);
    }
  };

  // Gallery photos: uploaded shots, or the single cover for older vehicles.
  const photos = vehicle ? (vehicle.images?.length ? vehicle.images : [vehicle.imageUrl]) : [];

  // Lightbox keyboard nav + scroll lock while it's open.
  useEffect(() => {
    if (lightbox === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(null);
      if (e.key === "ArrowRight") setLightbox((i) => (i === null ? i : (i + 1) % photos.length));
      if (e.key === "ArrowLeft")
        setLightbox((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
    };
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [lightbox, photos.length]);

  const days = useMemo(() => {
    if (!pickup || !dropoff) return 0;
    const diff = Math.ceil((new Date(dropoff).getTime() - new Date(pickup).getTime()) / DAY_MS);
    return diff > 0 ? diff : 0;
  }, [pickup, dropoff]);

  // Entrance runs once the vehicle has rendered
  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root || !vehicle) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({ delay: 0.05, defaults: { ease: EASE } });
      tl.fromTo(q("[data-detail-back]"), { y: -14, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7 }, 0)
        .to(q(".split-char"), { y: 0, rotate: 0, duration: 1.05, stagger: 0.025 }, 0.05)
        .fromTo(q("[data-detail-stage]"), { opacity: 0, scale: 0.96 }, { opacity: 1, scale: 1, duration: 1.4 }, 0.3)
        .fromTo(
          q("[data-detail-item]"),
          { y: 24, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.85, stagger: 0.08 },
          0.45,
        );
    });
    return () => mm.revert();
  }, [vehicle]);

  const onBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vehicle || status !== "idle" || authLoading) return;

    if (!user) {
      toast.error("Please sign in to book a vehicle.");
      router.push("/login");
      return;
    }
    if (!pickup || !dropoff) {
      toast.error("Choose your pick-up and return dates.");
      return;
    }
    if (days < 1) {
      toast.error("Return date must be after the pick-up date.");
      return;
    }

    setStatus("loading");
    try {
      await bookingApi.create({ vehicleSlug: vehicle.slug, startDate: pickup, endDate: dropoff });
      setStatus("success");
      toast.success(
        `Request sent — ${vehicle.name} for ${days} ${days === 1 ? "day" : "days"}. We'll confirm it shortly.`,
      );
      // Show it in their dashboard, where the status will update.
      window.setTimeout(() => router.push("/dashboard"), 1400);
    } catch (err) {
      setStatus("idle");
      if (err instanceof ApiError) {
        // e.g. 409 "already booked for those dates", or per-field date errors
        const fieldMsg = Object.values(err.fieldErrors)[0];
        toast.error(fieldMsg ?? err.message);
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    }
  };

  // Electric & hybrid vehicles surface range/battery instead of talking fuel.
  const isEV = /electric|hybrid/i.test(vehicle?.specs.fuel ?? "");

  const specRows = vehicle
    ? ([
        vehicle.specs.seats ? { icon: Users, label: "Seats", value: `${vehicle.specs.seats}` } : null,
        vehicle.specs.transmission
          ? { icon: Cog, label: "Transmission", value: vehicle.specs.transmission }
          : null,
        { icon: Fuel, label: isEV ? "Power" : "Fuel", value: vehicle.specs.fuel },
        vehicle.specs.range
          ? { icon: Route, label: "Range", value: `${vehicle.specs.range} km` }
          : null,
        vehicle.specs.batteryCapacity
          ? { icon: BatteryCharging, label: "Battery", value: `${vehicle.specs.batteryCapacity} kWh` }
          : null,
        vehicle.specs.topSpeed ? { icon: Gauge, label: "Top speed", value: vehicle.specs.topSpeed } : null,
      ].filter(Boolean) as { icon: typeof Users; label: string; value: string }[])
    : [];

  return (
    <div ref={rootRef} className="relative min-h-[100svh] overflow-hidden">
      <SmoothScroll />
      <Cursor />
      <div aria-hidden className="glow-orb absolute -left-[20%] -top-[15%] h-[55vw] w-[55vw]" />

      <div className="relative mx-auto w-full max-w-wrap px-6 pb-24 pt-28 md:pt-32">
        <Link
          data-detail-back
          href="/vehicles"
          className="group inline-flex items-center gap-2 text-[12px] font-medium uppercase tracking-[0.18em] text-fog transition-colors hover:text-cream"
        >
          <ArrowLeft className="h-3.5 w-3.5 transition-transform duration-500 ease-expo group-hover:-translate-x-1" />
          All vehicles
        </Link>

        {vehicle === undefined ? (
          <DetailSkeleton />
        ) : vehicle === null ? (
          <NotFound />
        ) : (
          <div className="mt-8 grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
            {/* ── 3D stage + photo gallery ─────────────────────── */}
            <div className="lg:sticky lg:top-28 lg:self-start">
            <div
              data-detail-stage
              className="relative aspect-[4/3] overflow-hidden rounded-3xl border border-line bg-surface/40"
            >
              <span
                aria-hidden
                className="text-outline absolute inset-x-0 top-[8%] select-none text-center font-serif text-[clamp(4rem,9vw,7.5rem)] leading-none"
              >
                {CATEGORY_LABELS[vehicle.category].toUpperCase()}
              </span>
              {gl?.webgl && vehicle.modelUrl ? (
                <VehicleStage url={vehicle.modelUrl} length={vehicle.modelLength ?? 3.5} animate={gl.animate} />
              ) : gl ? (
                // No 3D model (or no WebGL): the cover photo fills the stage and
                // opens the lightbox on click.
                <button
                  type="button"
                  onClick={() => setLightbox(0)}
                  aria-label={`Enlarge ${vehicle.name} photo`}
                  className="group absolute inset-0 cursor-zoom-in"
                >
                  <Image
                    src={vehicle.imageUrl}
                    alt={vehicle.name}
                    fill
                    sizes="(max-width: 1024px) 92vw, 55vw"
                    className="object-contain p-10 transition-transform duration-500 ease-expo group-hover:scale-[1.03]"
                  />
                  <span className="absolute right-4 top-4 flex items-center gap-1.5 rounded-full border border-line bg-night/70 px-3 py-1.5 text-[10px] uppercase tracking-[0.15em] text-fog backdrop-blur-sm">
                    <Expand className="h-3 w-3" /> View
                  </span>
                </button>
              ) : null}
              <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full border border-line bg-night/70 px-3.5 py-1.5 text-[10px] uppercase tracking-[0.15em] text-fog backdrop-blur-sm">
                {gl?.webgl && vehicle.modelUrl ? "Live 3D · follows your cursor" : "Studio shot"}
              </span>
            </div>

            {/* Photo gallery — click any shot to open it full-size */}
            {photos.length > 0 ? (
              <div data-detail-item className="mt-4 grid grid-cols-4 gap-3">
                {photos.map((src, i) => (
                  <button
                    type="button"
                    key={`${src}-${i}`}
                    onClick={() => setLightbox(i)}
                    aria-label={`Enlarge ${vehicle.name} photo ${i + 1}`}
                    className="group relative aspect-[4/3] cursor-zoom-in overflow-hidden rounded-xl border border-line bg-surface/40 transition-colors hover:border-accent/60"
                  >
                    <Image
                      src={src}
                      alt={`${vehicle.name} — photo ${i + 1}`}
                      fill
                      sizes="(max-width: 1024px) 23vw, 13vw"
                      className="object-cover transition-transform duration-500 ease-expo group-hover:scale-105"
                    />
                  </button>
                ))}
              </div>
            ) : null}
            </div>

            {/* ── Facts + booking ──────────────────────────────── */}
            <div>
              <p data-detail-item className="text-[11px] font-medium uppercase tracking-[0.25em] text-fog">
                {CATEGORY_LABELS[vehicle.category]}
                {vehicle.featured ? <span className="ml-3 text-accent">★ Featured</span> : null}
              </p>

              <h1 className="mt-4 font-serif text-[clamp(2.4rem,4.5vw,3.8rem)] leading-[1.04] tracking-[-0.02em] text-cream">
                <span className="split-line" aria-label={vehicle.name}>
                  <SplitChars text={vehicle.name} />
                </span>
              </h1>

              <p data-detail-item className="mt-3 font-serif text-lg italic text-accent">
                {vehicle.tagline}
              </p>

              <p data-detail-item className="mt-5 text-[15px] leading-relaxed text-fog">
                {vehicle.description}
              </p>

              {/* Specs */}
              <dl data-detail-item className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
                {specRows.map((row) => (
                  <div key={row.label} className="rounded-xl border border-line bg-surface/60 p-4">
                    <row.icon className="h-4 w-4 text-accent" />
                    <dd className="mt-2.5 text-[15px] text-cream">{row.value}</dd>
                    <dt className="mt-0.5 text-[10px] uppercase tracking-[0.15em] text-fog">{row.label}</dt>
                  </div>
                ))}
              </dl>

              {/* Booking panel */}
              <form
                data-detail-item
                onSubmit={onBook}
                className="mt-8 rounded-2xl border border-line bg-surface/60 p-6"
              >
                <div className="flex items-baseline justify-between">
                  <p>
                    <span className="font-serif text-3xl text-cream">{formatNpr(vehicle.pricePerDay)}</span>
                    <span className="text-[13px] text-fog"> / day</span>
                  </p>
                  <span className="text-[11px] uppercase tracking-[0.15em] text-fog">
                    {isEV ? "Charging not included" : "Fuel not included"}
                  </span>
                </div>

                {myBooking ? (
                  <div className="mt-6 rounded-xl border border-line bg-night/40 p-5">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[13.5px] text-cream">You already have a booking</p>
                      <span
                        className={`shrink-0 rounded-full px-2.5 py-1 text-[9.5px] font-medium uppercase tracking-[0.1em] ${STATUS_STYLES[myBooking.status]}`}
                      >
                        {myBooking.status}
                      </span>
                    </div>
                    <p className="mt-2 text-[13px] text-fog">
                      {dateRange(myBooking.startDate, myBooking.endDate)} ·{" "}
                      {formatNpr(myBooking.totalPrice)}
                    </p>
                    <p className="mt-1 text-[12px] text-fog">
                      {myBooking.status === "pending"
                        ? "Waiting for confirmation — you can cancel while it's pending."
                        : "Confirmed — cancel before the pick-up date if your plans change."}
                    </p>
                    {isCancellable(myBooking) ? (
                      <button
                        type="button"
                        onClick={onCancelBooking}
                        disabled={cancelling}
                        className="mt-4 w-full rounded-lg border border-line py-2.5 text-[13px] font-medium text-fog transition-colors hover:border-red-400/60 hover:text-red-400 disabled:opacity-50"
                      >
                        {cancelling ? "Cancelling…" : "Cancel booking"}
                      </button>
                    ) : null}
                  </div>
                ) : (
                <>
                <div className="mt-6 grid grid-cols-2 gap-4">
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.18em] text-fog">
                      Pick-up
                    </span>
                    <input
                      type="date"
                      min={today}
                      value={pickup}
                      onChange={(e) => setPickup(e.target.value)}
                      className="w-full rounded-lg border border-line bg-night px-3.5 py-3 text-sm text-cream outline-none transition-colors [color-scheme:dark] focus:border-accent"
                    />
                  </label>
                  <label className="block">
                    <span className="mb-2 block text-[11px] font-medium uppercase tracking-[0.18em] text-fog">
                      Return
                    </span>
                    <input
                      type="date"
                      min={pickup || today}
                      value={dropoff}
                      onChange={(e) => setDropoff(e.target.value)}
                      className="w-full rounded-lg border border-line bg-night px-3.5 py-3 text-sm text-cream outline-none transition-colors [color-scheme:dark] focus:border-accent"
                    />
                  </label>
                </div>

                {days > 0 ? (
                  <div className="mt-5 space-y-2 border-t border-line/60 pt-4 text-sm">
                    <div className="flex justify-between text-fog">
                      <span>
                        {formatNpr(vehicle.pricePerDay)} × {days} {days === 1 ? "day" : "days"}
                      </span>
                      <span>{formatNpr(vehicle.pricePerDay * days)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-cream">Total</span>
                      <span className="font-serif text-xl text-cream">
                        {formatNpr(vehicle.pricePerDay * days)}
                      </span>
                    </div>
                  </div>
                ) : null}

                <div className="mt-6">
                  <MagneticSubmit status={status} successLabel="Request sent">
                    {user ? "Book This Vehicle" : "Sign In to Book"}
                  </MagneticSubmit>
                </div>
                </>
                )}
              </form>
            </div>
          </div>
        )}
      </div>

      {/* Photo lightbox */}
      {vehicle && lightbox !== null ? (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-night/90 backdrop-blur-sm"
          onClick={() => setLightbox(null)}
          role="dialog"
          aria-modal="true"
          aria-label={`${vehicle.name} photo viewer`}
        >
          <button
            type="button"
            onClick={() => setLightbox(null)}
            aria-label="Close"
            className="absolute right-5 top-5 flex h-11 w-11 items-center justify-center rounded-full border border-line bg-surface/70 text-cream transition-colors hover:border-accent hover:text-accent"
          >
            <X className="h-5 w-5" />
          </button>

          <div
            className="relative mx-auto flex h-[80vh] w-[92vw] max-w-5xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={photos[lightbox]}
              alt={`${vehicle.name} — photo ${lightbox + 1}`}
              fill
              sizes="92vw"
              className="object-contain"
              priority
            />
          </div>

          {photos.length > 1 ? (
            <>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((i) => (i === null ? i : (i - 1 + photos.length) % photos.length));
                }}
                aria-label="Previous photo"
                className="absolute left-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/70 text-cream transition-colors hover:border-accent hover:text-accent"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setLightbox((i) => (i === null ? i : (i + 1) % photos.length));
                }}
                aria-label="Next photo"
                className="absolute right-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full border border-line bg-surface/70 text-cream transition-colors hover:border-accent hover:text-accent"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
              <div className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border border-line bg-surface/70 px-4 py-1.5 text-[12px] text-fog backdrop-blur-sm">
                {lightbox + 1} / {photos.length}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
