import { z } from 'zod';
import { VEHICLE_CATEGORIES } from '@/models/vehicle.model';

const specsSchema = z.object({
  seats: z.coerce.number().int().min(1).max(100).optional(),
  transmission: z.enum(['Manual', 'Automatic']).optional(),
  fuel: z.string({ error: 'Fuel type is required' }).trim().min(1, 'Fuel type is required'),
  topSpeed: z.string().trim().max(20).optional(),
  // Combustion only, sent when the fuel type has an engine
  engineCC: z.coerce.number().min(0).max(10000).optional(),
  // EV-only, the form sends these only when fuel is Electric
  range: z.coerce.number().min(0).max(2000).optional(),
  batteryCapacity: z.coerce.number().min(0).max(500).optional(),
});

/** Admin create, slug is generated server-side from the name, never accepted */
export const createVehicleSchema = z.object({
  name: z
    .string({ error: 'Name is required' })
    .trim()
    .min(2, 'Name must be at least 2 characters')
    .max(80, 'Name must be at most 80 characters'),
  category: z.enum(VEHICLE_CATEGORIES, { error: 'Category must be one of: bike, car, suv, van, bus' }),
  tagline: z.string({ error: 'Tagline is required' }).trim().min(2).max(80),
  pricePerDay: z.coerce.number({ error: 'Price per day is required' }).min(0),
  specs: specsSchema,
  imageUrl: z.string({ error: 'Image URL is required' }).trim().min(1),
  // Optional photo gallery, images[0] becomes the cover (the model keeps
  // imageUrl in sync). Capped at 4 to match the schema rule.
  images: z
    .array(z.string().trim().min(1, 'Image URLs cannot be empty'))
    .max(4, 'A vehicle can have at most 4 photos')
    .optional(),
  // 3D model is optional, vehicles without one show their cover photo instead
  modelUrl: z.string().trim().min(1).optional(),
  modelLength: z.coerce.number().min(0.5).max(20).optional(),
  featured: z.boolean().optional(),
  description: z.string({ error: 'Description is required' }).trim().min(10).max(2000),
  isAvailable: z.boolean().optional(),
});

/** Admin update, any subset of the creatable fields. `modelUrl, null`
 * explicitly removes the 3D model; omitting it leaves the model untouched. */
export const updateVehicleSchema = createVehicleSchema
  .partial()
  .extend({
    modelUrl: z.string().trim().min(1).nullable().optional(),
    modelLength: z.coerce.number().min(0.5).max(20).nullable().optional(),
  })
  .refine((body) => Object.keys(body).length > 0, {
    message: 'Provide at least one field to update',
  });

/** Public list query, ?category=car */
export const listVehiclesQuerySchema = z.object({
  category: z.enum(VEHICLE_CATEGORIES).optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type ListVehiclesQuery = z.infer<typeof listVehiclesQuerySchema>;
