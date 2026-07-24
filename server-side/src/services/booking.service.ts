import { Types } from 'mongoose';
import { bookingRepository } from '@/repositories/booking.repository';
import { vehicleRepository } from '@/repositories/vehicle.repository';
import { userRepository } from '@/repositories/user.repository';
import { notificationService } from '@/services/notification.service';
import { AppError } from '@/utils/AppError';
import { logger } from '@/config/logger';
import type { BookingDocument } from '@/models/booking.model';
import type { CreateBookingInput, UpdateBookingStatusInput } from '@/validators/booking.validator';

const DAY_MS = 86_400_000;

const VEHICLE_FIELDS = 'name slug imageUrl pricePerDay category';

export const bookingService = {
  /** Customer requests a rental. Price and length are computed here — the
   *  client's numbers are never trusted. */
  async create(userId: string, input: CreateBookingInput): Promise<BookingDocument> {
    const vehicle = await vehicleRepository.findBySlug(input.vehicleSlug);
    if (!vehicle || !vehicle.isAvailable) throw AppError.notFound('Vehicle not found');

    // One live booking per vehicle per customer — cancel it first to rebook.
    const existing = await bookingRepository.findActiveForUserVehicle(userId, vehicle._id);
    if (existing) {
      throw AppError.conflict('You already have an active booking for this vehicle');
    }

    // Confirmed bookings block the calendar; pending requests don't.
    const clash = await bookingRepository.hasConfirmedOverlap(
      vehicle._id,
      input.startDate,
      input.endDate,
    );
    if (clash) {
      throw AppError.conflict('This vehicle is already booked for those dates');
    }

    const days = Math.ceil((input.endDate.getTime() - input.startDate.getTime()) / DAY_MS);
    const booking = await bookingRepository.create({
      user: new Types.ObjectId(userId),
      vehicle: vehicle._id,
      startDate: input.startDate,
      endDate: input.endDate,
      days,
      totalPrice: days * vehicle.pricePerDay,
    });

    logger.info('booking requested', { bookingId: booking.id, userId, vehicle: vehicle.slug, days });

    const populated = await booking.populate('vehicle', VEHICLE_FIELDS);
    const customer = await userRepository.findById(userId);
    await notificationService.rentalCreated(populated, {
      customerName: customer?.name ?? 'A customer',
      vehicleName: vehicle.name,
    });
    return populated;
  },

  /** A customer's own bookings. */
  listMine(userId: string): Promise<BookingDocument[]> {
    return bookingRepository.findByUser(userId);
  },

  /** Admin — every booking, both sides joined. */
  listAll(): Promise<BookingDocument[]> {
    return bookingRepository.findAll();
  },

  /** Admin resolves a pending request. Approving re-checks availability —
   *  two pending requests can compete for the same dates; first approval wins. */
  async updateStatus(id: string, input: UpdateBookingStatusInput): Promise<BookingDocument> {
    const booking = await bookingRepository.findById(id);
    if (!booking) throw AppError.notFound('Booking not found');
    if (booking.status !== 'pending') {
      throw AppError.conflict(`This booking was already ${booking.status}`);
    }

    if (input.status === 'confirmed') {
      const clash = await bookingRepository.hasConfirmedOverlap(
        booking.vehicle,
        booking.startDate,
        booking.endDate,
        booking.id,
      );
      if (clash) {
        throw AppError.conflict('Another confirmed booking already covers those dates');
      }
    }

    booking.status = input.status;
    await booking.save();
    logger.info('booking resolved', { bookingId: booking.id, status: input.status });

    const vehicle = await vehicleRepository.findById(String(booking.vehicle));
    await notificationService.rentalResolved(booking, { vehicleName: vehicle?.name ?? 'your vehicle' });
    return booking;
  },

  /** Customer cancels their own booking — only before it starts. Bookings that
   *  aren't theirs 404 rather than 403, so ids can't be probed for existence. */
  async cancel(id: string, userId: string): Promise<BookingDocument> {
    const booking = await bookingRepository.findById(id);
    if (!booking || String(booking.user) !== userId) throw AppError.notFound('Booking not found');

    if (booking.status !== 'pending' && booking.status !== 'confirmed') {
      throw AppError.conflict(`This booking was already ${booking.status}`);
    }
    if (booking.startDate.getTime() <= Date.now()) {
      throw AppError.badRequest('This rental has already started and cannot be cancelled');
    }

    booking.status = 'cancelled';
    await booking.save();
    logger.info('booking cancelled by customer', { bookingId: booking.id, userId });

    const [customer, vehicle] = await Promise.all([
      userRepository.findById(userId),
      vehicleRepository.findById(String(booking.vehicle)),
    ]);
    await notificationService.rentalCancelled({
      customerName: customer?.name ?? 'A customer',
      vehicleName: vehicle?.name ?? 'a vehicle',
    });
    return booking;
  },
};
