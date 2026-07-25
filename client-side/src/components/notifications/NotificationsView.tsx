"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { gsap, EASE, MOTION_OK } from "@/components/landing/gsap";
import { notificationApi, type AppNotification } from "@/lib/notificationApi";
import { NotificationIcon, timeAgo } from "@/components/notifications/notificationDisplay";
import { toast } from "@/components/ui/toast";

const PAGE_SIZE = 12;

/** allowDelete is passed for customers; admins keep an unremovable activity log. */
export default function NotificationsView({ allowDelete = false }: { allowDelete?: boolean }) {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async (p: number, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const data = await notificationApi.list({ limit: PAGE_SIZE, page: p });
      // Deleting the last item on a page can leave it empty — step back one.
      if (data.notifications.length === 0 && p > 1) {
        setPage(p - 1);
        return;
      }
      setItems(data.notifications);
      setTotal(data.total);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(page);
  }, [page, load]);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(root);
      const tl = gsap.timeline({ delay: 0.05, defaults: { ease: EASE } });
      tl.fromTo(q("[data-dash-head] > *"), { y: 22, opacity: 0 }, { y: 0, opacity: 1, duration: 0.9, stagger: 0.09 }, 0)
        .fromTo(q("[data-dash-item]"), { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, stagger: 0.04 }, 0.2);
    });
    return () => mm.revert();
  }, [items]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasUnread = items.some((n) => !n.read);

  const onItemClick = (n: AppNotification) => {
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      notificationApi.markRead(n._id).catch(() => {});
    }
    if (n.link) router.push(n.link);
  };

  const markAll = () => {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    notificationApi.markAllRead().catch(() => {});
  };

  const onDelete = async (id: string) => {
    setItems((prev) => prev.filter((n) => n._id !== id));
    setTotal((t) => Math.max(0, t - 1));
    try {
      await notificationApi.remove(id);
    } catch {
      toast.error("Couldn't delete that notification.");
    }
    load(page, true); // backfill from the next page (or step back if now empty)
  };

  return (
    <div ref={rootRef}>
      <header data-dash-head className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-[0.25em] text-fog">Activity</p>
          <h1 className="mt-4 font-serif text-[clamp(2.2rem,4.5vw,3.4rem)] leading-[1.05] tracking-[-0.02em] text-cream">
            Notifications
          </h1>
          <p className="mt-3 text-[15px] text-fog">Everything that&apos;s happened on your account.</p>
        </div>
        {hasUnread ? (
          <button
            onClick={markAll}
            className="inline-flex items-center gap-2 rounded-full border border-line px-5 py-2.5 text-[13px] text-cream transition-colors hover:border-cream/40"
          >
            <Check className="h-4 w-4" /> Mark all read
          </button>
        ) : null}
      </header>

      <div className="mt-10">
        {loading ? (
          <p className="py-16 text-center text-sm text-fog">Loading…</p>
        ) : items.length === 0 ? (
          <div className="flex min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-line p-8 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-surface text-fog">
              <Bell className="h-5 w-5" />
            </span>
            <p className="mt-4 font-serif text-xl text-cream">Nothing here yet</p>
            <p className="mt-2 max-w-[320px] text-sm leading-relaxed text-fog">
              Updates about your rentals and washes will show up here.
            </p>
          </div>
        ) : (
          <>
            <ul className="flex flex-col gap-2">
              {items.map((n) => (
                <li
                  key={n._id}
                  data-dash-item
                  className={`flex items-stretch overflow-hidden rounded-xl border transition-colors ${
                    n.read ? "border-line bg-surface/40" : "border-accent/25 bg-surface/70"
                  }`}
                >
                  <button
                    onClick={() => onItemClick(n)}
                    className="flex flex-1 gap-4 px-5 py-4 text-left transition-colors hover:bg-night/20"
                  >
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-night/50">
                      <NotificationIcon type={n.type} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center justify-between gap-3">
                        <span className="truncate text-[14px] font-medium text-cream">{n.title}</span>
                        <span className="shrink-0 text-[11px] text-fog">{timeAgo(n.createdAt)}</span>
                      </span>
                      <span className="mt-1 block text-[13px] leading-snug text-fog">{n.message}</span>
                    </span>
                    {!n.read ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" /> : null}
                  </button>

                  {allowDelete ? (
                    <button
                      onClick={() => onDelete(n._id)}
                      aria-label="Delete notification"
                      className="flex shrink-0 items-center border-l border-line/60 px-4 text-fog transition-colors hover:bg-night/20 hover:text-red-400"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>

            {totalPages > 1 ? (
              <div className="mt-6 flex items-center justify-between">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[13px] text-cream transition-colors hover:border-cream/40 disabled:cursor-default disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" /> Prev
                </button>
                <span className="text-[13px] text-fog">
                  Page {page} of {totalPages}
                </span>
                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="inline-flex items-center gap-1.5 rounded-full border border-line px-4 py-2 text-[13px] text-cream transition-colors hover:border-cream/40 disabled:cursor-default disabled:opacity-40"
                >
                  Next <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
