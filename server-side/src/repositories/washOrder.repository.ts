import {
  WashOrder,
  type IWashOrder,
  type WashOrderDocument,
  type WashOrderStatus,
} from '@/models/washOrder.model';
import type { WashSlot } from '@/config/washCatalogue';

// Data-access layer for wash orders — the only place that queries the model.

export type CreateWashOrderData = Pick<
  IWashOrder,
  | 'user'
  | 'packageId'
  | 'packageName'
  | 'vehicleType'
  | 'vehicleLabel'
  | 'plateNumber'
  | 'scheduledDate'
  | 'slot'
  | 'price'
> &
  Partial<Pick<IWashOrder, 'notes'>>;

/** Only what a list view needs off the customer — never the password or address. */
const USER_FIELDS = 'name email phone';

/** A booked bay: confirmed work, or work already done. Pending requests don't
 *  hold a bay, and declined/cancelled ones give theirs back. */
const HOLDS_A_BAY: WashOrderStatus[] = ['confirmed', 'completed'];

export const washOrderRepository = {
  create(data: CreateWashOrderData): Promise<WashOrderDocument> {
    return WashOrder.create(data);
  },

  findById(id: string): Promise<WashOrderDocument | null> {
    return WashOrder.findById(id).exec();
  },

  /** A customer's own orders, newest first. */
  findByUser(userId: string): Promise<WashOrderDocument[]> {
    return WashOrder.find({ user: userId }).sort({ createdAt: -1 }).exec();
  },

  /** Admin view — every order, newest first, with the customer joined in. */
  findAll(): Promise<WashOrderDocument[]> {
    return WashOrder.find().sort({ createdAt: -1 }).populate('user', USER_FIELDS).exec();
  },

  /**
   * The capacity check: how many bays are taken in one slot on one day?
   * `excludeId` lets an order be re-checked at approval time without counting itself.
   */
  countBaysTaken(day: Date, slot: WashSlot, excludeId?: string): Promise<number> {
    return WashOrder.countDocuments({
      scheduledDate: day,
      slot,
      status: { $in: HOLDS_A_BAY },
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).exec();
  },

  /** Bays taken per slot across a whole day — one query behind the slot picker. */
  async countBaysBySlot(day: Date): Promise<Record<string, number>> {
    const rows = await WashOrder.aggregate<{ _id: WashSlot; count: number }>([
      { $match: { scheduledDate: day, status: { $in: HOLDS_A_BAY } } },
      { $group: { _id: '$slot', count: { $sum: 1 } } },
    ]).exec();

    return Object.fromEntries(rows.map((row) => [row._id, row.count]));
  },

  /** Is this vehicle already booked in that day — in any slot? One wash a day
   *  per plate; you can't queue the same car twice. */
  findLiveForPlateOnDay(plateNumber: string, day: Date): Promise<WashOrderDocument | null> {
    return WashOrder.findOne({
      plateNumber,
      scheduledDate: day,
      status: { $in: ['pending', 'confirmed'] },
    }).exec();
  },
};
