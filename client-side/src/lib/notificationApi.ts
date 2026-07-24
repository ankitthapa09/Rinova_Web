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

export const notificationApi = {
  list(limit?: number): Promise<{ notifications: AppNotification[]; unreadCount: number }> {
    const query = limit ? `?limit=${limit}` : "";
    return request<{ notifications: AppNotification[]; unreadCount: number }>(`/notifications${query}`);
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
