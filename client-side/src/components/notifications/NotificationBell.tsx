"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { notificationApi, type AppNotification } from "@/lib/notificationApi";
import { NotificationIcon, timeAgo } from "@/components/notifications/notificationDisplay";

const POLL_MS = 30_000;
const DROPDOWN_LIMIT = 8;

interface NotificationBellProps {
  /** Where "View all" goes — the full page for this area (dashboard vs admin). */
  viewAllHref?: string;
}

export default function NotificationBell({ viewAllHref = "/dashboard/notifications" }: NotificationBellProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const [loading, setLoading] = useState(false);

  // Poll the lightweight count so the badge stays live without pulling the list.
  useEffect(() => {
    let cancelled = false;
    const tick = async () => {
      try {
        const n = await notificationApi.unreadCount();
        if (!cancelled) setUnread(n);
      } catch {
        /* not signed in yet, or a transient error — ignore */
      }
    };
    tick();
    const id = window.setInterval(tick, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  const openPanel = useCallback(async () => {
    setOpen(true);
    setLoading(true);
    try {
      const data = await notificationApi.list(DROPDOWN_LIMIT);
      setItems(data.notifications);
      setUnread(data.unreadCount);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const onItemClick = async (n: AppNotification) => {
    setOpen(false);
    if (!n.read) {
      setItems((prev) => prev.map((x) => (x._id === n._id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      notificationApi.markRead(n._id).catch(() => {});
    }
    if (n.link) router.push(n.link);
  };

  const markAll = async () => {
    setItems((prev) => prev.map((x) => ({ ...x, read: true })));
    setUnread(0);
    notificationApi.markAllRead().catch(() => {});
  };

  const viewAll = () => {
    setOpen(false);
    router.push(viewAllHref);
  };

  return (
    <>
      <button
        onClick={() => (open ? setOpen(false) : openPanel())}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        className="relative rounded-full p-2 text-fog transition-colors hover:text-cream"
      >
        <Bell className="h-[18px] w-[18px]" />
        {unread > 0 ? (
          <span className="absolute right-0.5 top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[9px] font-semibold leading-none text-night">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </button>

      {open && typeof document !== "undefined"
        ? createPortal(
            <>
              {/* Backdrop closes on outside click */}
              <button
                aria-hidden
                tabIndex={-1}
                onClick={() => setOpen(false)}
                className="fixed inset-0 z-[110] cursor-default"
              />
              <div className="fixed right-3 top-16 z-[120] w-[min(360px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-line bg-surface shadow-[0_20px_60px_rgba(0,0,0,0.5)] sm:right-6">
                <div className="flex items-center justify-between border-b border-line px-4 py-3">
                  <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-fog">
                    Notifications
                  </p>
                  {items.some((n) => !n.read) ? (
                    <button
                      onClick={markAll}
                      className="inline-flex items-center gap-1.5 text-[12px] text-accent transition-colors hover:text-[#FF7A45]"
                    >
                      <Check className="h-3.5 w-3.5" /> Mark all read
                    </button>
                  ) : null}
                </div>

                <div className="max-h-[min(70vh,420px)] overflow-y-auto">
                  {loading ? (
                    <p className="px-4 py-10 text-center text-sm text-fog">Loading…</p>
                  ) : items.length === 0 ? (
                    <div className="px-4 py-12 text-center">
                      <Bell className="mx-auto h-6 w-6 text-line" />
                      <p className="mt-3 text-sm text-fog">You&apos;re all caught up.</p>
                    </div>
                  ) : (
                    items.slice(0, DROPDOWN_LIMIT).map((n) => (
                      <button
                        key={n._id}
                        onClick={() => onItemClick(n)}
                        className={`flex w-full gap-3 border-b border-line/50 px-4 py-3 text-left transition-colors last:border-0 hover:bg-night/40 ${
                          n.read ? "" : "bg-night/20"
                        }`}
                      >
                        <span className="mt-0.5">
                          <NotificationIcon type={n.type} />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center justify-between gap-2">
                            <span className="truncate text-[13px] font-medium text-cream">{n.title}</span>
                            <span className="shrink-0 text-[10px] text-fog">{timeAgo(n.createdAt)}</span>
                          </span>
                          <span className="mt-0.5 block text-[12px] leading-snug text-fog">{n.message}</span>
                        </span>
                        {!n.read ? <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-accent" /> : null}
                      </button>
                    ))
                  )}
                </div>

                <button
                  onClick={viewAll}
                  className="block w-full border-t border-line px-4 py-3 text-center text-[12px] font-medium text-accent transition-colors hover:bg-night/40"
                >
                  View all notifications
                </button>
              </div>
            </>,
            document.body,
          )
        : null}
    </>
  );
}
