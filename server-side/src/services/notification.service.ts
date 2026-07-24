import { Types } from 'mongoose';
import { notificationRepository } from '@/repositories/notification.repository';
import { userRepository } from '@/repositories/user.repository';
import { AppError } from '@/utils/AppError';
import { logger } from '@/config/logger';
import type { NotificationDocument } from '@/models/notification.model';
import type { BookingDocument } from '@/models/booking.model';
import type { WashOrderDocument } from '@/models/washOrder.model';

const CUSTOMER_RENTALS = '/dashboard/rentals';
const ADMIN_RENTALS = '/admin/rentals';
const CUSTOMER_WASHES = '/dashboard/washes';
const ADMIN_WASHES = '/admin/washes';

/**
 * Notifications are a side-effect of the real work (a booking, a wash) — they
 * must never break it. Every emitter runs through here, so a failed write is
 * logged and swallowed rather than bubbling up into the booking flow.
 */
async function safe(label: string, fn: () => Promise<void>): Promise<void> {
  try {
    await fn();
  } catch (err) {
    logger.warn('notification emit failed', { label, err });
  }
}

export const notificationService = {
  // ── Queries the bell reads ────────────────────────────────
  listMine(userId: string): Promise<NotificationDocument[]> {
    return notificationRepository.findByRecipient(userId);
  },

  unreadCount(userId: string): Promise<number> {
    return notificationRepository.countUnread(userId);
  },

  async markRead(id: string, userId: string): Promise<NotificationDocument> {
    // A bad id would otherwise throw a CastError (500) — treat it as "not found".
    if (!Types.ObjectId.isValid(id)) throw AppError.notFound('Notification not found');
    const notification = await notificationRepository.markRead(id, userId);
    if (!notification) throw AppError.notFound('Notification not found');
    return notification;
  },

  markAllRead(userId: string): Promise<number> {
    return notificationRepository.markAllRead(userId);
  },

  // ── Rental lifecycle ──────────────────────────────────────
  rentalCreated(booking: BookingDocument, opts: { customerName: string; vehicleName: string }): Promise<void> {
    return safe('rentalCreated', async () => {
      const nights = `${booking.days} day${booking.days > 1 ? 's' : ''}`;
      await notificationRepository.create({
        recipient: String(booking.user),
        type: 'rental_created',
        title: 'Booking requested',
        message: `Your request to rent ${opts.vehicleName} is in — we'll confirm it shortly.`,
        link: CUSTOMER_RENTALS,
      });
      await notificationRepository.createForMany(await userRepository.findAdminIds(), {
        type: 'rental_created',
        title: 'New booking request',
        message: `${opts.customerName} requested ${opts.vehicleName} for ${nights}.`,
        link: ADMIN_RENTALS,
      });
    });
  },

  /** Admin confirmed or declined — tell the customer. Reads booking.status. */
  rentalResolved(booking: BookingDocument, opts: { vehicleName: string }): Promise<void> {
    return safe('rentalResolved', async () => {
      const confirmed = booking.status === 'confirmed';
      await notificationRepository.create({
        recipient: String(booking.user),
        type: confirmed ? 'rental_confirmed' : 'rental_declined',
        title: confirmed ? 'Booking confirmed' : 'Booking declined',
        message: confirmed
          ? `Your rental of ${opts.vehicleName} is confirmed. See you soon.`
          : `Your request for ${opts.vehicleName} was declined.`,
        link: CUSTOMER_RENTALS,
      });
    });
  },

  /** Customer cancelled — let the admin desk know. */
  rentalCancelled(opts: { customerName: string; vehicleName: string }): Promise<void> {
    return safe('rentalCancelled', async () => {
      await notificationRepository.createForMany(await userRepository.findAdminIds(), {
        type: 'rental_cancelled',
        title: 'Booking cancelled',
        message: `${opts.customerName} cancelled their ${opts.vehicleName} booking.`,
        link: ADMIN_RENTALS,
      });
    });
  },

  // ── Wash lifecycle ────────────────────────────────────────
  washCreated(order: WashOrderDocument, opts: { customerName: string }): Promise<void> {
    return safe('washCreated', async () => {
      await notificationRepository.create({
        recipient: String(order.user),
        type: 'wash_created',
        title: 'Wash booked',
        message: `Your ${order.packageName} wash is in — we'll confirm it shortly.`,
        link: CUSTOMER_WASHES,
      });
      await notificationRepository.createForMany(await userRepository.findAdminIds(), {
        type: 'wash_created',
        title: 'New wash request',
        message: `${opts.customerName} booked a ${order.packageName} wash for ${order.slot}.`,
        link: ADMIN_WASHES,
      });
    });
  },

  /** Admin moved the order along (confirmed / declined / completed) — tell the customer. */
  washResolved(order: WashOrderDocument): Promise<void> {
    return safe('washResolved', async () => {
      const map = {
        confirmed: { type: 'wash_confirmed', title: 'Wash confirmed', body: `is confirmed for ${order.slot}.` },
        declined: { type: 'wash_declined', title: 'Wash declined', body: 'request was declined.' },
        completed: { type: 'wash_completed', title: 'Wash completed', body: 'is done — thanks for visiting.' },
      } as const;
      const entry = map[order.status as keyof typeof map];
      if (!entry) return; // pending/cancelled don't come through this path

      await notificationRepository.create({
        recipient: String(order.user),
        type: entry.type,
        title: entry.title,
        message: `Your ${order.packageName} wash ${entry.body}`,
        link: CUSTOMER_WASHES,
      });
    });
  },

  /** Customer cancelled — let the admin desk know. */
  washCancelled(order: WashOrderDocument, opts: { customerName: string }): Promise<void> {
    return safe('washCancelled', async () => {
      await notificationRepository.createForMany(await userRepository.findAdminIds(), {
        type: 'wash_cancelled',
        title: 'Wash cancelled',
        message: `${opts.customerName} cancelled their ${order.packageName} wash.`,
        link: ADMIN_WASHES,
      });
    });
  },
};
