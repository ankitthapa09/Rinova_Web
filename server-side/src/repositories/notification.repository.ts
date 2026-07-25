import { Types } from 'mongoose';
import {
  Notification,
  type NotificationDocument,
  type NotificationType,
} from '@/models/notification.model';

// Data-access layer for notifications — the only place that touches the model.

export interface NewNotification {
  recipient: string;
  type: NotificationType;
  title: string;
  message: string;
  link?: string;
}

// Newest first; the caller picks how many (the bell wants a few, the full
// page a page-worth), and this hard ceiling keeps any single payload bounded.
export const DEFAULT_LIMIT = 30;
export const MAX_LIMIT = 100;

export const notificationRepository = {
  create(data: NewNotification): Promise<NotificationDocument> {
    return Notification.create({ ...data, recipient: new Types.ObjectId(data.recipient) });
  },

  /** Fan one message out to several recipients (e.g. every admin) in a single write. */
  async createForMany(recipients: string[], data: Omit<NewNotification, 'recipient'>): Promise<void> {
    if (recipients.length === 0) return;
    await Notification.insertMany(
      recipients.map((id) => ({ ...data, recipient: new Types.ObjectId(id) })),
    );
  },

  findByRecipient(
    userId: string,
    limit: number = DEFAULT_LIMIT,
    skip = 0,
  ): Promise<NotificationDocument[]> {
    return Notification.find({ recipient: userId })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();
  },

  /** Total notifications for a user — drives the page count. */
  countByRecipient(userId: string): Promise<number> {
    return Notification.countDocuments({ recipient: userId }).exec();
  },

  countUnread(userId: string): Promise<number> {
    return Notification.countDocuments({ recipient: userId, read: false }).exec();
  },

  /** Owner-scoped delete — returns null if it isn't theirs (or doesn't exist). */
  deleteOwned(id: string, userId: string): Promise<NotificationDocument | null> {
    return Notification.findOneAndDelete({ _id: id, recipient: userId }).exec();
  },

  // Scoped to the owner — you can't read (or probe) someone else's notification.
  // Idempotent: re-marking an already-read item still returns it.
  markRead(id: string, userId: string): Promise<NotificationDocument | null> {
    return Notification.findOneAndUpdate(
      { _id: id, recipient: userId },
      { read: true, readAt: new Date() },
      { new: true },
    ).exec();
  },

  async markAllRead(userId: string): Promise<number> {
    const res = await Notification.updateMany(
      { recipient: userId, read: false },
      { read: true, readAt: new Date() },
    ).exec();
    return res.modifiedCount;
  },
};
