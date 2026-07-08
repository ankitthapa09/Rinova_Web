import { Schema, model, type HydratedDocument, type Model } from 'mongoose';

export const VEHICLE_CATEGORIES = ['bike', 'car', 'suv', 'van', 'bus'] as const;
export type VehicleCategory = (typeof VEHICLE_CATEGORIES)[number];

export interface IVehicle {
  name: string;
  /** URL identity — unique, lowercase, hyphenated (e.g. honda-cb750) */
  slug: string;
  category: VehicleCategory;
  tagline: string;
  pricePerDay: number;
  specs: {
    seats?: number;
    transmission?: 'Manual' | 'Automatic';
    fuel: string;
    topSpeed?: string;
  };
  imageUrl: string;
  modelUrl: string;
  /** Normalized world length for the client's 3D loader */
  modelLength: number;
  featured: boolean;
  description: string;
  /** Admin can pull a vehicle from listing without deleting it */
  isAvailable: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export type VehicleDocument = HydratedDocument<IVehicle>;
type VehicleModel = Model<IVehicle>;

const vehicleSchema = new Schema<IVehicle, VehicleModel>(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: 2,
      maxlength: 80,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug must be lowercase words separated by hyphens'],
      index: true,
    },
    category: {
      type: String,
      enum: VEHICLE_CATEGORIES,
      required: [true, 'Category is required'],
      index: true,
    },
    tagline: {
      type: String,
      required: [true, 'Tagline is required'],
      trim: true,
      maxlength: 80,
    },
    pricePerDay: {
      type: Number,
      required: [true, 'Price per day is required'],
      min: [0, 'Price cannot be negative'],
    },
    specs: {
      seats: { type: Number, min: 1, max: 100 },
      transmission: { type: String, enum: ['Manual', 'Automatic'] },
      fuel: { type: String, required: [true, 'Fuel type is required'], trim: true },
      topSpeed: { type: String, trim: true },
    },
    imageUrl: {
      type: String,
      required: [true, 'Image URL is required'],
      trim: true,
    },
    modelUrl: {
      type: String,
      required: [true, '3D model URL is required'],
      trim: true,
    },
    modelLength: {
      type: Number,
      required: [true, 'Model length is required'],
      min: 0.5,
      max: 20,
    },
    featured: {
      type: Boolean,
      default: false,
    },
    description: {
      type: String,
      required: [true, 'Description is required'],
      trim: true,
      maxlength: 500,
    },
    isAvailable: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret: Record<string, unknown>) {
        delete ret.__v;
        return ret;
      },
    },
  },
);

export const Vehicle = model<IVehicle, VehicleModel>('Vehicle', vehicleSchema);
