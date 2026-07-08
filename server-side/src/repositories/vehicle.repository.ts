import { Vehicle, type IVehicle, type VehicleDocument, type VehicleCategory } from '@/models/vehicle.model';

// Data-access layer for vehicles — the only place that queries the Vehicle model.

export type CreateVehicleData = Omit<IVehicle, 'createdAt' | 'updatedAt' | 'featured' | 'isAvailable'> &
  Partial<Pick<IVehicle, 'featured' | 'isAvailable'>>;

export type UpdateVehicleData = Partial<Omit<IVehicle, 'createdAt' | 'updatedAt'>>;

export const vehicleRepository = {
  create(data: CreateVehicleData): Promise<VehicleDocument> {
    return Vehicle.create(data);
  },

  /** Public catalog — listed vehicles only, newest first */
  findAvailable(category?: VehicleCategory): Promise<VehicleDocument[]> {
    return Vehicle.find({ isAvailable: true, ...(category ? { category } : {}) })
      .sort({ featured: -1, createdAt: -1 })
      .exec();
  },

  /** Admin view — everything, including unlisted vehicles */
  findAll(): Promise<VehicleDocument[]> {
    return Vehicle.find().sort({ createdAt: -1 }).exec();
  },

  findBySlug(slug: string): Promise<VehicleDocument | null> {
    return Vehicle.findOne({ slug }).exec();
  },

  findById(id: string): Promise<VehicleDocument | null> {
    return Vehicle.findById(id).exec();
  },

  existsBySlug(slug: string): Promise<boolean> {
    return Vehicle.exists({ slug }).then((res) => res !== null);
  },

  updateById(id: string, data: UpdateVehicleData): Promise<VehicleDocument | null> {
    return Vehicle.findByIdAndUpdate(id, { $set: data }, { new: true, runValidators: true }).exec();
  },

  deleteById(id: string): Promise<VehicleDocument | null> {
    return Vehicle.findByIdAndDelete(id).exec();
  },
};
