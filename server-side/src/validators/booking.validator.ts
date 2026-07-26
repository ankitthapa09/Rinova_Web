import { z } from 'zod';

/** Start of today, bookings may begin today, never in the past. */
function todayStart(): Date {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return now;
}

/** Customer creates a request. Price/days are never accepted, the service
 * computes them from the vehicle. */
export const createBookingSchema = z
  .object({
    vehicleSlug: z
      .string({ error: 'Vehicle is required' })
      .trim()
      .min(1, 'Vehicle is required'),
    startDate: z.coerce.date({ error: 'Pick-up date is required' }),
    endDate: z.coerce.date({ error: 'Return date is required' }),
  })
  .superRefine((body, ctx) => {
    if (body.startDate < todayStart()) {
      ctx.addIssue({ code: 'custom', path: ['startDate'], message: 'Pick-up date cannot be in the past' });
    }
    if (body.endDate <= body.startDate) {
      ctx.addIssue({ code: 'custom', path: ['endDate'], message: 'Return date must be after the pick-up date' });
    }
  });

/** Admin resolves a pending request, approve or decline only. Other states
 * ('cancelled') belong to the customer's own cancel endpoint. */
export const updateBookingStatusSchema = z.object({
  status: z.enum(['confirmed', 'declined'], {
    error: 'Status must be confirmed or declined',
  }),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
export type UpdateBookingStatusInput = z.infer<typeof updateBookingStatusSchema>;
