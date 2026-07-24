"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Check } from "lucide-react";
import { gsap, EASE, MOTION_OK } from "@/components/landing/gsap";
import { notificationApi, type AppNotification } from "@/lib/notificationApi";
import { NotificationIcon, timeAgo } from "@/components/notifications/notificationDisplay";

// The full page pulls the lot (server clamps to its own ceiling).
const PAGE_LIMIT = 100;

export default function NotificationsView() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement>(null);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await notificationApi.list(PAGE_LIMIT);
        if (!cancelled) setItems(data.notifications);
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

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
          <ul className="flex flex-col gap-2">
            {items.map((n) => (
              <li key={n._id} data-dash-item>
                <button
                  onClick={() => onItemClick(n)}
                  className={`flex w-full gap-4 rounded-xl border px-5 py-4 text-left transition-colors ${
                    n.read
                      ? "border-line bg-surface/40 hover:bg-surface/70"
                      : "border-accent/25 bg-surface/70 hover:bg-surface"
                  }`}
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
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
