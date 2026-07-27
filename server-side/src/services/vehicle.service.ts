import { vehicleRepository, type UpdateVehicleData } from '@/repositories/vehicle.repository';
import { AppError } from '@/utils/AppError';
import { logger } from '@/config/logger';
import type { VehicleDocument, VehicleCategory } from '@/models/vehicle.model';
import type { CreateVehicleInput, UpdateVehicleInput } from '@/validators/vehicle.validator';

/** "Honda CB750!" to "honda-cb750" */
function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Appends -2, -3… until the slug is free, so two "City Scooter"s can coexist. */
async function uniqueSlug(name: string): Promise<string> {
  const base = slugify(name);
  if (!base) throw AppError.badRequest('Name must contain letters or numbers');
  let slug = base;
  for (let n = 2; await vehicleRepository.existsBySlug(slug); n++) {
    slug = `${base}-${n}`;
  }
  return slug;
}

export const vehicleService = {
  /** Public catalog, available vehicles, optionally one category. */
  list(category?: VehicleCategory): Promise<VehicleDocument[]> {
    return vehicleRepository.findAvailable(category);
  },

  async getBySlug(slug: string): Promise<VehicleDocument> {
    const vehicle = await vehicleRepository.findBySlug(slug);
    if (!vehicle || !vehicle.isAvailable) throw AppError.notFound('Vehicle not found');
    return vehicle;
  },

  // Admin

  listAll(): Promise<VehicleDocument[]> {
    return vehicleRepository.findAll();
  },

  async create(input: CreateVehicleInput): Promise<VehicleDocument> {
    const slug = await uniqueSlug(input.name);
    const vehicle = await vehicleRepository.create({ ...input, slug });
    logger.info('vehicle created', { vehicleId: vehicle.id, slug });
    return vehicle;
  },

  /** Slug stays fixed after creation, renames must not break shared URLs. */
  async update(id: string, input: UpdateVehicleInput): Promise<VehicleDocument> {
    const { modelUrl, modelLength, ...rest } = input;
    const data: UpdateVehicleData = { ...rest };
    const unset: string[] = [];

    if (modelUrl === null) {
      // Admin removed the 3D showcase, drop the model and its length together.
      unset.push('modelUrl', 'modelLength');
    } else {
      if (modelUrl !== undefined) data.modelUrl = modelUrl;
      if (modelLength != null) data.modelLength = modelLength;
    }

    const vehicle = await vehicleRepository.updateById(id, data, unset);
    if (!vehicle) throw AppError.notFound('Vehicle not found');
    logger.info('vehicle updated', { vehicleId: vehicle.id, modelRemoved: modelUrl === null });
    return vehicle;
  },

  async remove(id: string): Promise<void> {
    const vehicle = await vehicleRepository.deleteById(id);
    if (!vehicle) throw AppError.notFound('Vehicle not found');
    logger.info('vehicle deleted', { vehicleId: vehicle.id, slug: vehicle.slug });
  },
};
