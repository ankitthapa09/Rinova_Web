import { request } from "@/lib/api";

export type NotificationType =
  | "rental_created"
  | "rental_confirmed"
  | "rental_declined"
  | "rental_cancelled"
  | "wash_created"
  | "wash_confirmed"
  | "wash_declined"
  | "wash_completed"
  | "wash_cancelled";

export interface AppNotification {
  _id: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
  read: boolean;
  readAt?: string;
  createdAt: string;
}

export interface NotificationList {
  notifications: AppNotification[];
  unreadCount: number;
  /** Total the user has — used to compute page count. */
  total: number;
}

export const notificationApi = {
  list(opts: { limit?: number; page?: number } = {}): Promise<NotificationList> {
    const q = new URLSearchParams();
    if (opts.limit) q.set("limit", String(opts.limit));
    if (opts.page) q.set("page", String(opts.page));
    const qs = q.toString();
    return request<NotificationList>(`/notifications${qs ? `?${qs}` : ""}`);
  },

  async remove(id: string): Promise<void> {
    await request(`/notifications/${id}`, { method: "DELETE" });
  },

  async unreadCount(): Promise<number> {
    const { unreadCount } = await request<{ unreadCount: number }>("/notifications/unread-count");
    return unreadCount;
  },

  async markRead(id: string): Promise<void> {
    await request(`/notifications/${id}/read`, { method: "PATCH" });
  },

  async markAllRead(): Promise<void> {
    await request("/notifications/read-all", { method: "PATCH" });
  },
};
