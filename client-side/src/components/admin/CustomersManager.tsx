"use client";

import { useCallback, useEffect, useState } from "react";
import { Trash2, Loader2, AlertCircle, BadgeCheck, CircleDashed, ShieldCheck } from "lucide-react";
import { userApi } from "@/lib/userApi";
import { ApiError, type ApiUser } from "@/lib/api";
import { toast } from "@/components/ui/toast";
import CustomerDetailDrawer from "@/components/admin/CustomerDetailDrawer";

function initials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

function joined(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export default function CustomersManager() {
  const [users, setUsers] = useState<ApiUser[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = users?.find((u) => u._id === selectedId) ?? null;

  const reload = useCallback(async () => {
    try {
      setLoadError(null);
      setUsers(await userApi.list());
    } catch (e) {
      setUsers([]);
      setLoadError(e instanceof ApiError ? e.message : "Couldn't load customers.");
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const remove = async (u: ApiUser) => {
    setBusyId(u._id);
    try {
      await userApi.remove(u._id);
      toast.success(`${u.name}'s account deleted.`);
      setConfirmId(null);
      await reload();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.message : "Couldn't delete the account.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div>
      <header>
        <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-fog">Manage</p>
        <h1 className="mt-4 font-serif text-[clamp(2rem,4vw,3rem)] leading-[1.05] tracking-[-0.02em] text-cream">
          Customers
          {users ? <span className="ml-3 align-middle text-lg text-fog">{users.length}</span> : null}
        </h1>
      </header>

      <div className="mt-10">
        {users === null ? (
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
        ) : users.length === 0 ? (
          <div className="flex min-h-[240px] flex-col items-center justify-center rounded-2xl border border-dashed border-line p-8 text-center">
            <p className="font-serif text-xl text-cream">No customers yet</p>
            <p className="mt-2 max-w-[320px] text-sm text-fog">
              Accounts will appear here as people sign up.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {users.map((u) => {
              const rowBusy = busyId === u._id;
              const isAdmin = u.role === "admin";
              return (
                <li
                  key={u._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedId(u._id)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setSelectedId(u._id);
                    }
                  }}
                  className="flex cursor-pointer items-center gap-4 rounded-2xl border border-line bg-surface/60 p-4 transition-colors hover:border-accent/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                >
                  {u.profileImageUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.profileImageUrl} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
                  ) : (
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent/12 font-medium text-[13px] text-accent">
                      {initials(u.name)}
                    </span>
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 truncate text-[14.5px] text-cream">
                      {u.name}
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-accent/12 px-2 py-0.5 text-[9px] font-medium uppercase tracking-[0.12em] text-accent">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </span>
                      ) : null}
                    </p>
                    <p className="truncate text-[12px] text-fog">
                      {u.email} · {u.phone}
                    </p>
                  </div>

                  {/* Verified + joined */}
                  <span className="hidden shrink-0 items-center gap-1.5 text-[11px] sm:inline-flex">
                    {u.isEmailVerified ? (
                      <span className="inline-flex items-center gap-1.5 text-accent">
                        <BadgeCheck className="h-3.5 w-3.5" /> Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-fog">
                        <CircleDashed className="h-3.5 w-3.5" /> Unverified
                      </span>
                    )}
                  </span>
                  <span className="hidden shrink-0 text-[11px] text-fog md:inline">
                    Joined {joined(u.createdAt)}
                  </span>

                  {/* Delete — admins can't be removed (server enforces it too) */}
                  {isAdmin ? null : confirmId === u._id ? (
                    <div className="flex shrink-0 items-center gap-2">
                      <span className="text-[12px] text-fog">Delete?</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          remove(u);
                        }}
                        disabled={rowBusy}
                        className="rounded-md bg-red-500/90 px-2.5 py-1 text-[12px] font-medium text-white disabled:opacity-60"
                      >
                        {rowBusy ? "…" : "Yes"}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmId(null);
                        }}
                        disabled={rowBusy}
                        className="rounded-md px-2 py-1 text-[12px] text-fog hover:text-cream"
                      >
                        No
                      </button>
                    </div>
                  ) : (
                    <button
                      title="Delete account"
                      aria-label={`Delete ${u.name}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setConfirmId(u._id);
                      }}
                      disabled={rowBusy}
                      className="shrink-0 rounded-lg p-2 text-fog transition-colors hover:text-red-400 disabled:opacity-40"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <CustomerDetailDrawer customer={selected} onClose={() => setSelectedId(null)} />
    </div>
  );
}
