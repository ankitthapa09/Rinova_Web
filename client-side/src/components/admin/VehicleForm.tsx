"use client";

import { useState, type ReactNode } from "react";
import { X, Upload, Loader2, Check, Plus } from "lucide-react";
import {
  vehicleApi,
  CATEGORY_LABELS,
  type Vehicle,
  type VehicleInput,
  type VehicleCategory,
} from "@/lib/vehicleApi";
import { ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as VehicleCategory[];

const inputCls =
  "w-full rounded-lg border border-line bg-night/40 px-3 py-2.5 text-[14px] text-cream outline-none transition-colors placeholder:text-fog/50 focus:border-accent";
const labelCls = "mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-fog";

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[12px] text-red-400">{error}</span> : null}
    </label>
  );
}

interface Props {
  /** Present = edit mode; absent = create mode. */
  vehicle?: Vehicle;
  onClose: () => void;
  onSaved: () => void;
}

export default function VehicleForm({ vehicle, onClose, onSaved }: Props) {
  const editing = Boolean(vehicle);

  const [name, setName] = useState(vehicle?.name ?? "");
  const [category, setCategory] = useState<VehicleCategory>(vehicle?.category ?? "car");
  const [tagline, setTagline] = useState(vehicle?.tagline ?? "");
  const [pricePerDay, setPricePerDay] = useState(vehicle ? String(vehicle.pricePerDay) : "");
  const [fuel, setFuel] = useState(vehicle?.specs.fuel ?? "Petrol");
  const [seats, setSeats] = useState(vehicle?.specs.seats ? String(vehicle.specs.seats) : "");
  const [transmission, setTransmission] = useState(vehicle?.specs.transmission ?? "");
  const [topSpeed, setTopSpeed] = useState(vehicle?.specs.topSpeed ?? "");
  const [modelLength, setModelLength] = useState(
    vehicle?.modelLength ? String(vehicle.modelLength) : "3.5",
  );
  const [description, setDescription] = useState(vehicle?.description ?? "");
  const [featured, setFeatured] = useState(vehicle?.featured ?? false);
  const [isAvailable, setIsAvailable] = useState(vehicle?.isAvailable ?? true);

  // Up to 4 photo slots — slot 0 is the cover.
  const initialGallery = vehicle ? (vehicle.images?.length ? vehicle.images : [vehicle.imageUrl]) : [];
  const [photoSlots, setPhotoSlots] = useState<{ url: string | null; file: File | null }[]>(
    Array.from({ length: 4 }, (_, i) => ({ url: initialGallery[i] ?? null, file: null })),
  );
  const setSlot = (i: number, patch: Partial<{ url: string | null; file: File | null }>) =>
    setPhotoSlots((slots) => slots.map((s, j) => (j === i ? { ...s, ...patch } : s)));

  const [model, setModel] = useState<File | null>(null);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "uploading" | "saving">("idle");
  const busy = status !== "idle";

  const err = (field: string) => errors[field];

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setErrors({});

    // A cover photo is required; the 3D model is optional.
    const hasCover = Boolean(photoSlots[0].file || photoSlots[0].url);
    if (!hasCover) {
      setErrors({ imageUrl: "A cover photo is required." });
      return;
    }

    try {

      let modelUrl = vehicle?.modelUrl;
      const anyNewFile = photoSlots.some((s) => s.file) || Boolean(model);
      if (anyNewFile) setStatus("uploading");

      const images: string[] = [];
      for (const slot of photoSlots) {
        if (slot.file) images.push((await vehicleApi.uploadFile("image", slot.file)).url);
        else if (slot.url) images.push(slot.url);
      }
      if (model) modelUrl = (await vehicleApi.uploadFile("model", model)).url;
      const imageUrl = images[0];

      // 2) Assemble the payload.
      const payload: VehicleInput = {
        name: name.trim(),
        category,
        tagline: tagline.trim(),
        pricePerDay: Number(pricePerDay),
        specs: {
          fuel: fuel.trim(),
          ...(seats ? { seats: Number(seats) } : {}),
          ...(transmission ? { transmission: transmission as "Manual" | "Automatic" } : {}),
          ...(topSpeed.trim() ? { topSpeed: topSpeed.trim() } : {}),
        },
        imageUrl: imageUrl ?? "",
        images,
        // Only sent when a model exists — vehicles without one are photo-only.
        ...(modelUrl ? { modelUrl, modelLength: Number(modelLength) } : {}),
        featured,
        isAvailable,
        description: description.trim(),
      };

      // 3) Create or update.
      setStatus("saving");
      if (editing && vehicle) {
        await vehicleApi.update(vehicle._id, payload);
        toast.success(`${payload.name} updated.`);
      } else {
        await vehicleApi.create(payload);
        toast.success(`${payload.name} added to the fleet.`);
      }
      onSaved();
      onClose();
    } catch (e2) {
      setStatus("idle");
      if (e2 instanceof ApiError) {
        setErrors(e2.fieldErrors);
        toast.error(e2.message || "Couldn't save the vehicle.");
      } else {
        toast.error("Something went wrong. Please try again.");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-night/70 backdrop-blur-sm"
      />

      {/* Slide-over panel */}
      <div className="relative flex h-full w-full max-w-[560px] flex-col border-l border-line bg-surface">
        <div className="flex items-center justify-between border-b border-line px-6 py-5">
          <h2 className="font-serif text-2xl text-cream">
            {editing ? "Edit vehicle" : "Add vehicle"}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-fog transition-colors hover:text-cream"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex-1 space-y-5 overflow-y-auto px-6 py-6">
          <Field label="Name" error={err("name")}>
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} placeholder="Honda CB750" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Category" error={err("category")}>
              <select
                className={inputCls}
                value={category}
                onChange={(e) => setCategory(e.target.value as VehicleCategory)}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Price / day (Rs.)" error={err("pricePerDay")}>
              <input
                className={inputCls}
                type="number"
                min={0}
                value={pricePerDay}
                onChange={(e) => setPricePerDay(e.target.value)}
                placeholder="3200"
              />
            </Field>
          </div>

          <Field label="Tagline" error={err("tagline")}>
            <input className={inputCls} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="The original superbike" />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Fuel" error={err("specs.fuel")}>
              <input className={inputCls} value={fuel} onChange={(e) => setFuel(e.target.value)} placeholder="Petrol" />
            </Field>
            <Field label="Seats" error={err("specs.seats")}>
              <input className={inputCls} type="number" min={1} value={seats} onChange={(e) => setSeats(e.target.value)} placeholder="2" />
            </Field>
            <Field label="Transmission" error={err("specs.transmission")}>
              <select className={inputCls} value={transmission} onChange={(e) => setTransmission(e.target.value)}>
                <option value="">—</option>
                <option value="Manual">Manual</option>
                <option value="Automatic">Automatic</option>
              </select>
            </Field>
            <Field label="Top speed" error={err("specs.topSpeed")}>
              <input className={inputCls} value={topSpeed} onChange={(e) => setTopSpeed(e.target.value)} placeholder="200 km/h" />
            </Field>
          </div>

          <Field label="Description" error={err("description")}>
            <textarea
              className={`${inputCls} min-h-[90px] resize-y`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A classic inline-four with presence…"
            />
          </Field>

          {/* Photo gallery — up to 4, first is the cover */}
          <div>
            <span className={labelCls}>Photos (up to 4 — first is the cover)</span>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {photoSlots.map((slot, i) => (
                <PhotoSlot
                  key={i}
                  label={i === 0 ? "Cover" : `Photo ${i + 1}`}
                  slot={slot}
                  onPick={(f) => setSlot(i, { file: f })}
                  onClear={() => setSlot(i, { url: null, file: null })}
                />
              ))}
            </div>
            {err("imageUrl") || err("images") ? (
              <span className="mt-1 block text-[12px] text-red-400">
                {err("imageUrl") ?? err("images")}
              </span>
            ) : null}
          </div>

          {/* 3D model upload — optional showcase */}
          <FileField
            label="3D model (.glb) — optional"
            accept=".glb,model/gltf-binary"
            file={model}
            existing={vehicle?.modelUrl}
            onPick={setModel}
            error={err("modelUrl")}
          />

          {/* Only relevant when a model exists — hidden otherwise */}
          {model || vehicle?.modelUrl ? (
            <Field label="Model length (world units, 0.5–20)" error={err("modelLength")}>
              <input className={inputCls} type="number" step="0.1" min={0.5} max={20} value={modelLength} onChange={(e) => setModelLength(e.target.value)} />
            </Field>
          ) : null}

          <div className="flex gap-6">
            <label className="flex items-center gap-2 text-[13px] text-cream">
              <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)} className="accent-accent" />
              Featured
            </label>
            <label className="flex items-center gap-2 text-[13px] text-cream">
              <input type="checkbox" checked={isAvailable} onChange={(e) => setIsAvailable(e.target.checked)} className="accent-accent" />
              Listed (available)
            </label>
          </div>
        </form>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">
          <button onClick={onClose} disabled={busy} className="rounded-lg px-4 py-2.5 text-[13.5px] text-fog transition-colors hover:text-cream disabled:opacity-50">
            Cancel
          </button>
          <button
            onClick={onSubmit}
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-[13.5px] font-medium text-night transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {status === "uploading" ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Uploading…</>
            ) : status === "saving" ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving…</>
            ) : (
              <><Check className="h-4 w-4" /> {editing ? "Save changes" : "Add vehicle"}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

function FileField({
  label,
  accept,
  file,
  existing,
  onPick,
  error,
}: {
  label: string;
  accept: string;
  file: File | null;
  existing?: string;
  onPick: (f: File | null) => void;
  error?: string;
}) {
  return (
    <div>
      <span className={labelCls}>{label}</span>
      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line bg-night/40 px-3 py-2.5 text-[13px] text-fog transition-colors hover:border-accent hover:text-cream">
        <Upload className="h-4 w-4 shrink-0" />
        <span className="truncate">
          {file ? file.name : existing ? "Replace current file" : "Choose file"}
        </span>
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onPick(e.target.files?.[0] ?? null)}
        />
      </label>
      {error ? <span className="mt-1 block text-[12px] text-red-400">{error}</span> : null}
    </div>
  );
}


function PhotoSlot({
  label,
  slot,
  onPick,
  onClear,
}: {
  label: string;
  slot: { url: string | null; file: File | null };
  onPick: (f: File | null) => void;
  onClear: () => void;
}) {
  const preview = slot.file ? URL.createObjectURL(slot.file) : slot.url;

  if (preview) {
    return (
      <div className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-line">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={preview} alt={label} className="h-full w-full object-cover" />
        <span className="absolute bottom-1 left-1 rounded bg-night/70 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.1em] text-cream">
          {label}
        </span>
        <button
          type="button"
          onClick={onClear}
          aria-label={`Remove ${label}`}
          className="absolute right-1 top-1 rounded-full bg-night/70 p-1 text-fog opacity-0 transition-opacity hover:text-cream group-hover:opacity-100"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <label className="flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-line bg-night/40 text-fog transition-colors hover:border-accent hover:text-cream">
      <Plus className="h-4 w-4" />
      <span className="text-[10px] uppercase tracking-[0.1em]">{label}</span>
      <input
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(e) => onPick(e.target.files?.[0] ?? null)}
      />
    </label>
  );
}
