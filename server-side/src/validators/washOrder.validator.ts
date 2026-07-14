import { z } from 'zod';
import { VEHICLE_CATEGORIES } from '@/models/vehicle.model';
import { WASH_PACKAGE_IDS, WASH_SLOTS, WASH_MAX_DAYS_AHEAD } from '@/config/washCatalogue';

const DAY_MS = 86_400_000;

/** Start of today — a wash may be booked for today, never for yesterday. */
function todayStart(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/** The moment a slot begins on a given day, e.g. '10:30' on 14 July. */
function slotStart(day: Date, slot: string): Date {
  const [hours, minutes] = slot.split(':').map(Number);
  const at = new Date(day);
  at.setHours(hours as number, minutes as number, 0, 0);
  return at;
}

/** Customer books a wash. Price is never accepted from the body — the service
 *  prices the order from the catalogue. */
export const createWashOrderSchema = z
  .object({
    packageId: z.enum(WASH_PACKAGE_IDS, { error: 'Choose a wash package' }),
    vehicleType: z.enum(VEHICLE_CATEGORIES, { error: 'Choose your vehicle type' }),
    vehicleLabel: z
      .string({ error: 'Tell us the make and model' })
      .trim()
      .min(2, 'Tell us the make and model')
      .max(60, 'Keep the make and model under 60 characters'),
    plateNumber: z
      .string({ error: 'Number plate is required' })
      .trim()
      .min(2, 'Number plate is required')
      .max(20, 'That number plate looks too long')
      .transform((plate) => plate.toUpperCase()),
    scheduledDate: z.coerce.date({ error: 'Pick a date for the wash' }),
    slot: z.enum(WASH_SLOTS, { error: 'Pick an arrival time' }),
    notes: z.string().trim().max(300, 'Keep notes under 300 characters').optional(),
  })
  .superRefine((body, ctx) => {
    const today = todayStart();

    if (body.scheduledDate < today) {
      ctx.addIssue({
        code: 'custom',
        path: ['scheduledDate'],
        message: 'The wash date cannot be in the past',
      });
      return;
    }

    if (body.scheduledDate.getTime() > today.getTime() + WASH_MAX_DAYS_AHEAD * DAY_MS) {
      ctx.addIssue({
        code: 'custom',
        path: ['scheduledDate'],
        message: `Washes can only be booked up to ${WASH_MAX_DAYS_AHEAD} days ahead`,
      });
      return;
    }

    // Booking today is fine — booking a slot that has already come and gone isn't.
    if (slotStart(body.scheduledDate, body.slot) <= new Date()) {
      ctx.addIssue({
        code: 'custom',
        path: ['slot'],
        message: 'That arrival time has already passed today',
      });
    }
  });

/** Admin moves an order along: approve, turn away, or mark the job done. */
export const updateWashOrderStatusSchema = z.object({
  status: z.enum(['confirmed', 'declined', 'completed'], {
    error: 'Status must be confirmed, declined or completed',
  }),
});

/** ?date=YYYY-MM-DD — which slots still have a bay free that day. */
export const washAvailabilityQuerySchema = z.object({
  date: z.coerce.date({ error: 'A date is required' }),
});

export type CreateWashOrderInput = z.infer<typeof createWashOrderSchema>;
export type UpdateWashOrderStatusInput = z.infer<typeof updateWashOrderStatusSchema>;
export type WashAvailabilityQuery = z.infer<typeof washAvailabilityQuerySchema>;
