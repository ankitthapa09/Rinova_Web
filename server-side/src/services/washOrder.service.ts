import { Types } from 'mongoose';
import { washOrderRepository } from '@/repositories/washOrder.repository';
import { userRepository } from '@/repositories/user.repository';
import { notificationService } from '@/services/notification.service';
import { AppError } from '@/utils/AppError';
import { logger } from '@/config/logger';
import {
  WASH_PACKAGES,
  WASH_SLOTS,
  WASH_BAYS_PER_SLOT,
  WASH_MAX_DAYS_AHEAD,
  findWashPackage,
  type WashSlot,
} from '@/config/washCatalogue';
import type { WashOrderDocument } from '@/models/washOrder.model';
import type {
  CreateWashOrderInput,
  UpdateWashOrderStatusInput,
} from '@/validators/washOrder.validator';

/** Midnight of a given day, every order is stored flat, so every lookup must
 * ask flat too. */
function dayStart(date: Date): Date {
  const day = new Date(date);
  day.setHours(0, 0, 0, 0);
  return day;
}

/** The moment a slot begins on a given day. */
function slotStart(day: Date, slot: WashSlot): Date {
  const [hours, minutes] = slot.split(':').map(Number);
  const at = new Date(day);
  at.setHours(hours as number, minutes as number, 0, 0);
  return at;
}

export interface SlotAvailability {
  slot: WashSlot;
  baysLeft: number;
  /** Bookable right now, has a free bay and hasn't already come round today */
  available: boolean;
}

export const washOrderService = {
  /** The public menu, packages, arrival times, bay count. */
  catalogue() {
    return {
      packages: WASH_PACKAGES,
      slots: WASH_SLOTS,
      baysPerSlot: WASH_BAYS_PER_SLOT,
      maxDaysAhead: WASH_MAX_DAYS_AHEAD,
    };
  },

  /** What the slot picker draws, for one day, how much room is left in each slot. */
  async availability(date: Date): Promise<SlotAvailability[]> {
    const day = dayStart(date);
    const taken = await washOrderRepository.countBaysBySlot(day);
    const now = new Date();

    return WASH_SLOTS.map((slot) => {
      const baysLeft = Math.max(0, WASH_BAYS_PER_SLOT - (taken[slot] ?? 0));
      return {
        slot,
        baysLeft,
        available: baysLeft > 0 && slotStart(day, slot) > now,
      };
    });
  },

  /** Customer books a wash. The price is looked up here, from the catalogue -
   * whatever the client sent is irrelevant, it never reaches us. */
  async create(userId: string, input: CreateWashOrderInput): Promise<WashOrderDocument> {
    const pkg = findWashPackage(input.packageId);
    if (!pkg) throw AppError.notFound('Wash package not found');

    const day = dayStart(input.scheduledDate);

    // One wash a day per vehicle, cancel the first to move it.
    const existing = await washOrderRepository.findLiveForPlateOnDay(input.plateNumber, day);
    if (existing) {
      throw AppError.conflict('That vehicle is already booked in for a wash that day');
    }

    // Confirmed work holds a bay; pending requests queue behind it.
    const taken = await washOrderRepository.countBaysTaken(day, input.slot);
    if (taken >= WASH_BAYS_PER_SLOT) {
      throw AppError.conflict('That arrival time is fully booked, pick another');
    }

    const order = await washOrderRepository.create({
      user: new Types.ObjectId(userId),
      packageId: pkg.id,
      packageName: pkg.name,
      vehicleType: input.vehicleType,
      vehicleLabel: input.vehicleLabel,
      plateNumber: input.plateNumber,
      scheduledDate: day,
      slot: input.slot,
      price: pkg.prices[input.vehicleType],
      notes: input.notes,
    });

    logger.info('wash requested', {
      orderId: order.id,
      userId,
      package: pkg.id,
      slot: input.slot,
    });

    const customer = await userRepository.findById(userId);
    await notificationService.washCreated(order, { customerName: customer?.name ?? 'A customer' });
    return order;
  },

  /** A customer's own orders. */
  listMine(userId: string): Promise<WashOrderDocument[]> {
    return washOrderRepository.findByUser(userId);
  },

  /** Admin, every order, customer joined in. */
  listAll(): Promise<WashOrderDocument[]> {
    return washOrderRepository.findAll();
  },

  /**
   * Admin moves an order along. Approving re-checks the bays, several pending
   * requests can be queued on the same slot, and only the first three approved
   * can actually be washed.
 */
  async updateStatus(id: string, input: UpdateWashOrderStatusInput): Promise<WashOrderDocument> {
    const order = await washOrderRepository.findById(id);
    if (!order) throw AppError.notFound('Wash order not found');

    if (input.status === 'completed') {
      // A job is only done if it was on the books in the first place.
      if (order.status !== 'confirmed') {
        throw AppError.conflict('Only a confirmed wash can be marked completed');
      }
    } else {
      if (order.status !== 'pending') {
        throw AppError.conflict(`This wash was already ${order.status}`);
      }

      if (input.status === 'confirmed') {
        const taken = await washOrderRepository.countBaysTaken(
          order.scheduledDate,
          order.slot,
          order.id,
        );
        if (taken >= WASH_BAYS_PER_SLOT) {
          throw AppError.conflict('Every bay in that slot is already taken');
        }
      }
    }

    order.status = input.status;
    await order.save();
    logger.info('wash order resolved', { orderId: order.id, status: input.status });

    await notificationService.washResolved(order);
    return order;
  },

  /** Customer cancels their own order, up until the wash begins. Someone else's
   * order 404s rather than 403s, so ids can't be probed for existence. */
  async cancel(id: string, userId: string): Promise<WashOrderDocument> {
    const order = await washOrderRepository.findById(id);
    if (!order || String(order.user) !== userId) throw AppError.notFound('Wash order not found');

    if (order.status !== 'pending' && order.status !== 'confirmed') {
      throw AppError.conflict(`This wash was already ${order.status}`);
    }
    if (slotStart(order.scheduledDate, order.slot) <= new Date()) {
      throw AppError.badRequest('This wash has already started and cannot be cancelled');
    }

    order.status = 'cancelled';
    await order.save();
    logger.info('wash order cancelled by customer', { orderId: order.id, userId });

    const customer = await userRepository.findById(userId);
    await notificationService.washCancelled(order, { customerName: customer?.name ?? 'A customer' });
    return order;
  },
};
