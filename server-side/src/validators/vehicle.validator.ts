import { z } from 'zod';
import { VEHICLE_CATEGORIES } from '@/models/vehicle.model';

const specsSchema = z.object({
  seats: z.coerce.number().int().min(1).max(100).optional(),
  transmission: z.enum(['Manual', 'Automatic']).optional(),
  fuel: z.string({ error: 'Fuel type is required' }).trim().min(1, 'Fuel type is required'),
  topSpeed: z.string().trim().max(20).optional(),
});

/** Admin create — slug is generated server-side from the name, never accepted */
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
  modelUrl: z.string({ error: '3D model URL is required' }).trim().min(1),
  modelLength: z.coerce.number({ error: 'Model length is required' }).min(0.5).max(20),
  featured: z.boolean().optional(),
  description: z.string({ error: 'Description is required' }).trim().min(10).max(500),
  isAvailable: z.boolean().optional(),
});

/** Admin update — any subset of the creatable fields */
export const updateVehicleSchema = createVehicleSchema.partial().refine(
  (body) => Object.keys(body).length > 0,
  { message: 'Provide at least one field to update' },
);

/** Public list query — ?category=car */
export const listVehiclesQuerySchema = z.object({
  category: z.enum(VEHICLE_CATEGORIES).optional(),
});

export type CreateVehicleInput = z.infer<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.infer<typeof updateVehicleSchema>;
export type ListVehiclesQuery = z.infer<typeof listVehiclesQuerySchema>;
