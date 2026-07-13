import { Types } from 'mongoose';
import { Booking, type IBooking, type BookingDocument } from '@/models/booking.model';

// Data-access layer for bookings — the only place that queries the Booking model.

export type CreateBookingData = Pick<
  IBooking,
  'user' | 'vehicle' | 'startDate' | 'endDate' | 'days' | 'totalPrice'
>;

/** What list views need from the joined records — never more (no password,
 *  no address, no full vehicle document). */
const USER_FIELDS = 'name email phone';
const VEHICLE_FIELDS = 'name slug imageUrl pricePerDay category';

export const bookingRepository = {
  create(data: CreateBookingData): Promise<BookingDocument> {
    return Booking.create(data);
  },

  findById(id: string): Promise<BookingDocument | null> {
    return Booking.findById(id).exec();
  },

  /** A customer's own bookings, newest first, with vehicle info for display. */
  findByUser(userId: string): Promise<BookingDocument[]> {
    return Booking.find({ user: userId })
      .sort({ createdAt: -1 })
      .populate('vehicle', VEHICLE_FIELDS)
      .exec();
  },

  /** Admin view — everything, newest first, with both sides joined in. */
  findAll(): Promise<BookingDocument[]> {
    return Booking.find()
      .sort({ createdAt: -1 })
      .populate('user', USER_FIELDS)
      .populate('vehicle', VEHICLE_FIELDS)
      .exec();
  },

  /** The user's live booking (pending or confirmed) for a vehicle, if any —
   *  one active booking per vehicle per customer. */
  findActiveForUserVehicle(
    userId: string,
    vehicleId: Types.ObjectId,
  ): Promise<BookingDocument | null> {
    return Booking.findOne({
      user: userId,
      vehicle: vehicleId,
      status: { $in: ['pending', 'confirmed'] },
    }).exec();
  },

  /**
   * The availability check: does this vehicle have a confirmed booking that
   * touches [start, end)? Two ranges overlap when each starts before the
   * other ends. `excludeId` lets a booking be re-checked without matching itself.
   */
  async hasConfirmedOverlap(
    vehicleId: Types.ObjectId,
    start: Date,
    end: Date,
    excludeId?: string,
  ): Promise<boolean> {
    const clash = await Booking.exists({
      vehicle: vehicleId,
      status: 'confirmed',
      startDate: { $lt: end },
      endDate: { $gt: start },
      ...(excludeId ? { _id: { $ne: excludeId } } : {}),
    }).exec();
    return clash !== null;
  },
};
