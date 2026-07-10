"use client";

import { useCallback, useEffect, useState } from "react";
import { Plus, Pencil, Trash2, Eye, EyeOff, Loader2, AlertCircle } from "lucide-react";
import { vehicleApi, CATEGORY_LABELS, formatNpr, type Vehicle } from "@/lib/vehicleApi";
import { ApiError } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import VehicleForm from "@/components/admin/VehicleForm";

export default function VehiclesManager() {
  const [vehicles, setVehicles] = useState<Vehicle[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Vehicle | null>(null);

  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);

  const reload = useCallback(async () => {
    try {
      setLoadError(null);
      const list = await vehicleApi.listAll();
      setVehicles(list);
    } catch (e) {
      setVehicles([]);
      setLoadError(e instanceof ApiError ? e.message : "Couldn't load the fleet.");
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };
  const openEdit = (v: Vehicle) => {
    setEditing(v);
    setFormOpen(true);
  };

  const toggleListed = async (v: Vehicle) => {
    setBusyId(v._id);
    try {
      await vehicleApi.update(v._id, { isAvailable: !v.isAvailable });
      toast.success(v.isAvailable ? `${v.name} unlisted.` : `${v.name} is now listed.`);
      await reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't update the vehicle.");
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (v: Vehicle) => {
    setBusyId(v._id);
    try {
      await vehicleApi.remove(v._id);
      toast.success(`${v.name} deleted.`);
      setConfirmId(null);
      await reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't delete the vehicle.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <header className="flex items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-fog">Manage</p>
          <h1 className="mt-4 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-[-0.02em] text-cream">
            Vehicles
            {vehicles ? <span className="ml-3 align-middle text-lg text-fog">{vehicles.length}</span> : null}
          </h1>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex shrink-0 items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-[13.5px] font-medium text-night transition-opacity hover:opacity-90"
        >
          <Plus className="h-4 w-4" /> Add vehicle
        </button>
      </header>

      {/* Body */}
      <div className="mt-10">
        {vehicles === null ? (
          <div className="flex min-h-[240px] items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-fog" />
          </div>
        ) : loadError ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-line p-8 text-center">
            <AlertCircle className="h-6 w-6 text-red-400" />
            <p className="text-sm text-fog">{loadError}</p>
            <button onClick={reload} className="text-[13px] font-medium text-accent">
              Try again
            </button>
          </div>
        ) : vehicles.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-line p-8 text-center">
            <p className="font-serif text-xl text-cream">No vehicles yet</p>
            <p className="mt-2 max-w-[340px] text-sm text-fog">
              Add your first vehicle, or seed the starter fleet with{" "}
              <code className="text-cream">npm run seed:vehicles</code>.
            </p>
            <button onClick={openAdd} className="mt-5 inline-flex items-center gap-2 text-[13px] font-medium text-accent">
              <Plus className="h-4 w-4" /> Add vehicle
            </button>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {vehicles.map((v) => {
              const rowBusy = busyId === v._id;
              return (
                <li
                  key={v._id}
                  className="flex items-center gap-4 rounded-2xl border border-line bg-surface/60 p-3 pr-4"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={v.imageUrl}
                    alt={v.name}
                    className="h-14 w-20 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] text-cream">{v.name}</p>
                    <p className="truncate text-[12px] text-fog">
                      {CATEGORY_LABELS[v.category]} · {formatNpr(v.pricePerDay)}/day
                    </p>
                  </div>

                  {/* Status */}
                  <span
                    className={`hidden shrink-0 rounded-full px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.1em] sm:inline ${
                      v.isAvailable ? "bg-accent/12 text-accent" : "bg-line text-fog"
                    }`}
                  >
                    {v.isAvailable ? "Listed" : "Unlisted"}
                  </span>

                  {/* Actions */}
                  {confirmId === v._id ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[12px] text-fog">Delete?</span>
                      <button
                        onClick={() => remove(v)}
                        disabled={rowBusy}
                        className="rounded-md bg-red-500/90 px-2.5 py-1 text-[12px] font-medium text-white disabled:opacity-60"
                      >
                        {rowBusy ? "…" : "Yes"}
                      </button>
                      <button
                        onClick={() => setConfirmId(null)}
                        disabled={rowBusy}
                        className="rounded-md px-2 py-1 text-[12px] text-fog hover:text-cream"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 items-center gap-1">
                      <IconBtn title={v.isAvailable ? "Unlist" : "List"} onClick={() => toggleListed(v)} disabled={rowBusy}>
                        {v.isAvailable ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </IconBtn>
                      <IconBtn title="Edit" onClick={() => openEdit(v)} disabled={rowBusy}>
                        <Pencil className="h-4 w-4" />
                      </IconBtn>
                      <IconBtn title="Delete" onClick={() => setConfirmId(v._id)} disabled={rowBusy} danger>
                        <Trash2 className="h-4 w-4" />
                      </IconBtn>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {formOpen ? (
        <VehicleForm
          vehicle={editing ?? undefined}
          onClose={() => setFormOpen(false)}
          onSaved={reload}
        />
      ) : null}
    </div>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  disabled,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      disabled={disabled}
      className={`rounded-lg p-2 text-fog transition-colors disabled:opacity-40 ${
        danger ? "hover:text-red-400" : "hover:text-cream"
      }`}
    >
      {children}
    </button>
  );
}
