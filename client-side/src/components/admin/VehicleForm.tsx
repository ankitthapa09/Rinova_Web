"use client";

import { useState, type ReactNode } from "react";
import { X, Upload, Loader2, Check, Plus, Zap, Box, Trash2, Star, Eye } from "lucide-react";
import {
  vehicleApi,
  CATEGORY_LABELS,
  type Vehicle,
  type VehicleInput,
  type VehicleUpdate,
  type VehicleCategory,
} from "@/lib/vehicleApi";
import { ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast";

const CATEGORIES = Object.keys(CATEGORY_LABELS) as VehicleCategory[];
const FUEL_OPTIONS = ["Petrol", "Diesel", "Electric", "Hybrid", "CNG"];
const DESCRIPTION_MAX = 2000;

/** Electric & hybrid vehicles get the extra range/battery fields. */
const isElectric = (fuel: string) => fuel === "Electric" || fuel === "Hybrid";
/** Anything with a combustion engine gets the cc field. */
const hasEngine = (fuel: string) => fuel !== "Electric";

const inputCls =
  "w-full rounded-lg border border-line bg-night/40 px-3 py-3 text-[14px] text-cream outline-none transition-colors placeholder:text-fog/50 focus:border-accent";
const labelCls = "mb-1.5 block text-[11px] font-medium uppercase tracking-[0.14em] text-fog";

function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className={labelCls}>{label}</span>
      {children}
      {error ? (
        <span className="mt-1 block text-[12px] text-red-400">{error}</span>
      ) : hint ? (
        <span className="mt-1 block text-[11.5px] text-fog/70">{hint}</span>
      ) : null}
    </label>
  );
}

/** A titled group of related fields — a light underlined header, no heavy box,
 *  so the panel reads as airy sections rather than stacked cards. */
function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: typeof Box;
  children: ReactNode;
}) {
  return (
    <section>
      <div className="mb-5 flex items-center gap-2 border-b border-line/60 pb-2.5">
        <Icon className="h-3.5 w-3.5 text-accent" />
        <h3 className="text-[11px] font-medium uppercase tracking-[0.2em] text-cream">{title}</h3>
      </div>
      <div className="space-y-5">{children}</div>
    </section>
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
  const [engineCC, setEngineCC] = useState(
    vehicle?.specs.engineCC ? String(vehicle.specs.engineCC) : "",
  );
  const [range, setRange] = useState(vehicle?.specs.range ? String(vehicle.specs.range) : "");
  const [battery, setBattery] = useState(
    vehicle?.specs.batteryCapacity ? String(vehicle.specs.batteryCapacity) : "",
  );
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
  // Editing: marks the existing model for deletion on save (unless a new one is picked).
  const [removeModel, setRemoveModel] = useState(false);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<"idle" | "uploading" | "saving">("idle");
  const busy = status !== "idle";
  const err = (field: string) => errors[field];

  // ── Dynamic conditions ──────────────────────────────────
  const ev = isElectric(fuel);
  const combustion = hasEngine(fuel);
  const showSeats = category !== "bike";
  // A model is in play if a new file is picked, or an existing one is kept.
  const keepsExistingModel = Boolean(vehicle?.modelUrl) && !removeModel && !model;
  const hasModel = Boolean(model) || keepsExistingModel;
  const fuelOptions = FUEL_OPTIONS.includes(fuel) ? FUEL_OPTIONS : [fuel, ...FUEL_OPTIONS];

  /** Everything is required except the 3D model and the extra photos — only the
   *  cover is mandatory. Conditional fields are required when their row shows. */
  const validate = (): Record<string, string> => {
    const v: Record<string, string> = {};
    if (!name.trim()) v.name = "Name is required.";
    if (!tagline.trim()) v.tagline = "Tagline is required.";
    if (!pricePerDay || Number(pricePerDay) <= 0) v.pricePerDay = "Price is required.";
    if (description.trim().length < 10) v.description = "Description must be at least 10 characters.";
    if (!fuel) v["specs.fuel"] = "Fuel is required.";
    if (!transmission) v["specs.transmission"] = "Transmission is required.";
    if (showSeats && !seats) v["specs.seats"] = "Seats is required.";
    if (!topSpeed.trim()) v["specs.topSpeed"] = "Top speed is required.";
    if (combustion && !engineCC) v["specs.engineCC"] = "Engine size is required.";
    if (ev && !range) v["specs.range"] = "Range is required.";
    if (ev && !battery) v["specs.batteryCapacity"] = "Battery is required.";
    if (!photoSlots[0].file && !photoSlots[0].url) v.imageUrl = "A cover photo is required.";
    return v;
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;

    const found = validate();
    if (Object.keys(found).length > 0) {
      setErrors(found);
      toast.error("Please complete the highlighted fields.");
      return;
    }
    setErrors({});

    try {
      const anyNewFile = photoSlots.some((s) => s.file) || Boolean(model);
      if (anyNewFile) setStatus("uploading");

      const images: string[] = [];
      for (const slot of photoSlots) {
        if (slot.file) images.push((await vehicleApi.uploadFile("image", slot.file)).url);
        else if (slot.url) images.push(slot.url);
      }
      const imageUrl = images[0];

      // Conditional specs — cc for combustion, range/battery for electric.
      const specs: VehicleInput["specs"] = {
        fuel: fuel.trim(),
        ...(showSeats && seats ? { seats: Number(seats) } : {}),
        ...(transmission ? { transmission: transmission as "Manual" | "Automatic" } : {}),
        ...(topSpeed.trim() ? { topSpeed: topSpeed.trim() } : {}),
        ...(combustion && engineCC ? { engineCC: Number(engineCC) } : {}),
        ...(ev && range ? { range: Number(range) } : {}),
        ...(ev && battery ? { batteryCapacity: Number(battery) } : {}),
      };

      const base = {
        name: name.trim(),
        category,
        tagline: tagline.trim(),
        pricePerDay: Number(pricePerDay),
        specs,
        imageUrl: imageUrl ?? "",
        images,
        featured,
        isAvailable,
        description: description.trim(),
      };

      // ── 3D model: upload a new one, keep the old, or remove it ──
      let modelUrl: string | null | undefined;
      let outLength: number | null | undefined;
      if (model) {
        modelUrl = (await vehicleApi.uploadFile("model", model)).url;
        outLength = Number(modelLength);
      } else if (editing && removeModel && vehicle?.modelUrl) {
        modelUrl = null; // clears modelUrl + modelLength server-side
        outLength = null;
      } else if (keepsExistingModel) {
        // Keep the file, but still let the admin retune its length.
        outLength = Number(modelLength);
      }

      setStatus("saving");
      if (editing && vehicle) {
        const payload: VehicleUpdate = {
          ...base,
          ...(modelUrl !== undefined ? { modelUrl } : {}),
          ...(outLength !== undefined ? { modelLength: outLength } : {}),
        };
        await vehicleApi.update(vehicle._id, payload);
        toast.success(`${base.name} updated.`);
      } else {
        const payload: VehicleInput = {
          ...base,
          ...(modelUrl ? { modelUrl, modelLength: Number(modelLength) } : {}),
        };
        await vehicleApi.create(payload);
        toast.success(`${base.name} added to the fleet.`);
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
      <button
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-night/70 backdrop-blur-sm"
      />

      {/* Slide-over panel */}
      <div className="relative flex h-full w-full max-w-[600px] flex-col border-l border-line bg-surface">
        <div className="flex items-start justify-between border-b border-line px-6 py-5">
          <div>
            <h2 className="font-serif text-2xl text-cream">
              {editing ? "Edit vehicle" : "Add vehicle"}
            </h2>
            <p className="mt-0.5 text-[13px] text-fog">
              {editing ? `Updating ${vehicle?.name}` : "List a new vehicle in the fleet"}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-2 text-fog transition-colors hover:text-cream"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="flex-1 space-y-9 overflow-y-auto px-6 py-7">
          {/* ── Basics ── */}
          <Section title="Basics" icon={Box}>
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
                <input className={inputCls} type="number" min={0} value={pricePerDay} onChange={(e) => setPricePerDay(e.target.value)} placeholder="3200" />
              </Field>
            </div>
            <Field label="Tagline" error={err("tagline")} hint="A short line shown under the name.">
              <input className={inputCls} value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="The original superbike" />
            </Field>
            <div>
              <div className="flex items-baseline justify-between">
                <span className={labelCls}>Description</span>
                <span
                  className={`text-[11px] tabular-nums ${
                    description.length > DESCRIPTION_MAX ? "text-red-400" : "text-fog/60"
                  }`}
                >
                  {description.length} / {DESCRIPTION_MAX}
                </span>
              </div>
              <textarea
                className={`${inputCls} max-h-[420px] min-h-[150px] resize-y [field-sizing:content]`}
                value={description}
                maxLength={DESCRIPTION_MAX}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="A classic inline-four with presence — engine, ride quality, standout features…"
              />
              {err("description") ? (
                <span className="mt-1 block text-[12px] text-red-400">{err("description")}</span>
              ) : (
                <span className="mt-1 block text-[11.5px] text-fog/70">
                  At least 10 characters. The box grows as you type.
                </span>
              )}
            </div>
          </Section>

          {/* ── Specifications (dynamic) ── */}
          <Section title="Specifications" icon={Zap}>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Fuel" error={err("specs.fuel")}>
                <select className={inputCls} value={fuel} onChange={(e) => setFuel(e.target.value)}>
                  {fuelOptions.map((f) => (
                    <option key={f} value={f}>
                      {f}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Transmission" error={err("specs.transmission")}>
                <select className={inputCls} value={transmission} onChange={(e) => setTransmission(e.target.value)}>
                  <option value="">—</option>
                  <option value="Manual">Manual</option>
                  <option value="Automatic">Automatic</option>
                </select>
              </Field>
              {showSeats ? (
                <Field label="Seats" error={err("specs.seats")}>
                  <input className={inputCls} type="number" min={1} value={seats} onChange={(e) => setSeats(e.target.value)} placeholder="5" />
                </Field>
              ) : null}
              <Field label="Top speed" error={err("specs.topSpeed")}>
                <input className={inputCls} value={topSpeed} onChange={(e) => setTopSpeed(e.target.value)} placeholder="200 km/h" />
              </Field>
              {combustion ? (
                <Field label="Engine (cc)" error={err("specs.engineCC")} hint="Displacement.">
                  <input className={inputCls} type="number" min={0} value={engineCC} onChange={(e) => setEngineCC(e.target.value)} placeholder="449" />
                </Field>
              ) : null}
            </div>

            {/* EV-only fields, revealed for Electric / Hybrid */}
            {ev ? (
              <div className="rounded-xl border border-[#4EA8DE]/30 bg-[#4EA8DE]/[0.05] p-4">
                <div className="mb-3 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-[#4EA8DE]">
                  <Zap className="h-3.5 w-3.5" /> Electric details
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Range (km)" error={err("specs.range")} hint="On a full charge.">
                    <input className={inputCls} type="number" min={0} value={range} onChange={(e) => setRange(e.target.value)} placeholder="420" />
                  </Field>
                  <Field label="Battery (kWh)" error={err("specs.batteryCapacity")}>
                    <input className={inputCls} type="number" min={0} value={battery} onChange={(e) => setBattery(e.target.value)} placeholder="75" />
                  </Field>
                </div>
              </div>
            ) : null}
          </Section>

          {/* ── Media ── */}
          <Section title="Media" icon={Upload}>
            <div>
              <span className={labelCls}>Photos — up to 4, first is the cover</span>
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

            <ModelField
              file={model}
              existing={vehicle?.modelUrl}
              removed={removeModel}
              onPick={(f) => {
                setModel(f);
                if (f) setRemoveModel(false);
              }}
              onToggleRemove={() => {
                setRemoveModel((r) => !r);
                setModel(null);
              }}
              error={err("modelUrl")}
            />

            {hasModel ? (
              <Field
                label="Model length (world units, 0.5–20)"
                error={err("modelLength")}
                hint="Controls the model's size on the detail page."
              >
                <input className={inputCls} type="number" step="0.1" min={0.5} max={20} value={modelLength} onChange={(e) => setModelLength(e.target.value)} />
              </Field>
            ) : null}
          </Section>

          {/* ── Visibility ── */}
          <Section title="Visibility" icon={Eye}>
            <div className="grid grid-cols-2 gap-3">
              <Toggle
                icon={Star}
                label="Featured"
                hint="Show first in the fleet"
                checked={featured}
                onChange={setFeatured}
              />
              <Toggle
                icon={Eye}
                label="Listed"
                hint="Visible to customers"
                checked={isAvailable}
                onChange={setIsAvailable}
              />
            </div>
          </Section>
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

/** The 3D model uploader: pick a new .glb, or (when editing) keep / remove the
 *  existing one. */
function ModelField({
  file,
  existing,
  removed,
  onPick,
  onToggleRemove,
  error,
}: {
  file: File | null;
  existing?: string;
  removed: boolean;
  onPick: (f: File | null) => void;
  onToggleRemove: () => void;
  error?: string;
}) {
  const hasExisting = Boolean(existing) && !removed;

  return (
    <div>
      <span className={labelCls}>3D model (.glb) — optional</span>

      {/* A newly-picked file wins over anything else. */}
      {file ? (
        <div className="flex items-center gap-2 rounded-lg border border-accent/40 bg-accent/[0.06] px-3 py-2.5 text-[13px] text-cream">
          <Box className="h-4 w-4 shrink-0 text-accent" />
          <span className="min-w-0 flex-1 truncate">{file.name}</span>
          <button type="button" onClick={() => onPick(null)} aria-label="Clear file" className="text-fog transition-colors hover:text-cream">
            <X className="h-4 w-4" />
          </button>
        </div>
      ) : hasExisting ? (
        <div className="flex items-center gap-2 rounded-lg border border-line bg-night/40 px-3 py-2.5 text-[13px]">
          <Box className="h-4 w-4 shrink-0 text-accent" />
          <span className="min-w-0 flex-1 truncate text-cream">3D model attached</span>
          <label className="cursor-pointer text-[12px] font-medium text-fog transition-colors hover:text-cream">
            Replace
            <input type="file" accept=".glb,model/gltf-binary" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
          </label>
          <button
            type="button"
            onClick={onToggleRemove}
            aria-label="Remove 3D model"
            className="inline-flex items-center gap-1 text-[12px] font-medium text-fog transition-colors hover:text-red-400"
          >
            <Trash2 className="h-3.5 w-3.5" /> Remove
          </button>
        </div>
      ) : (
        <>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-line bg-night/40 px-3 py-2.5 text-[13px] text-fog transition-colors hover:border-accent hover:text-cream">
            <Upload className="h-4 w-4 shrink-0" />
            <span className="truncate">Choose .glb file</span>
            <input type="file" accept=".glb,model/gltf-binary" className="hidden" onChange={(e) => onPick(e.target.files?.[0] ?? null)} />
          </label>
          {removed && existing ? (
            <span className="mt-1 block text-[11.5px] text-fog/70">
              Current model will be removed on save.{" "}
              <button type="button" onClick={onToggleRemove} className="text-accent">
                Undo
              </button>
            </span>
          ) : (
            <span className="mt-1 block text-[11.5px] text-fog/70">
              Without a model, the detail page shows the cover photo.
            </span>
          )}
        </>
      )}
      {error ? <span className="mt-1 block text-[12px] text-red-400">{error}</span> : null}
    </div>
  );
}

/** A card-style on/off toggle. */
function Toggle({
  icon: Icon,
  label,
  hint,
  checked,
  onChange,
}: {
  icon: typeof Star;
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-colors ${
        checked ? "border-accent/50 bg-accent/[0.06]" : "border-line bg-night/40 hover:border-cream/25"
      }`}
    >
      <span
        className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
          checked ? "bg-accent/15 text-accent" : "bg-surface text-fog"
        }`}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0">
        <span className={`block text-[13.5px] font-medium ${checked ? "text-cream" : "text-fog"}`}>
          {label}
        </span>
        <span className="block text-[11.5px] text-fog">{hint}</span>
      </span>
    </button>
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
