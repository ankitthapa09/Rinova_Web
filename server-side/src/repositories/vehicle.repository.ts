import { Vehicle, type IVehicle, type VehicleDocument, type VehicleCategory } from '@/models/vehicle.model';

// Data-access layer for vehicles — the only place that queries the Vehicle model.

// `images` is optional — the model hook derives it from imageUrl when absent.
export type CreateVehicleData = Omit<IVehicle, 'createdAt' | 'updatedAt' | 'featured' | 'isAvailable' | 'images'> &
  Partial<Pick<IVehicle, 'featured' | 'isAvailable' | 'images'>>;

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

  async updateById(id: string, data: UpdateVehicleData): Promise<VehicleDocument | null> {
    const vehicle = await Vehicle.findById(id).exec();
    if (!vehicle) return null;
    vehicle.set(data);
    return vehicle.save();
  },

  deleteById(id: string): Promise<VehicleDocument | null> {
    return Vehicle.findByIdAndDelete(id).exec();
  },
};
