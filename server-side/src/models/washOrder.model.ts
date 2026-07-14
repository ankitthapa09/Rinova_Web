import { Schema, model, Types, type HydratedDocument, type Model } from 'mongoose';
import { VEHICLE_CATEGORIES, type VehicleCategory } from '@/models/vehicle.model';
import { WASH_PACKAGE_IDS, WASH_SLOTS, type WashPackageId, type WashSlot } from '@/config/washCatalogue';

/** A wash runs to completion, unlike a rental — so 'completed' is a real state
 *  the admin sets on the day. */
export const WASH_ORDER_STATUSES = [
  'pending',
  'confirmed',
  'completed',
  'declined',
  'cancelled',
] as const;
export type WashOrderStatus = (typeof WASH_ORDER_STATUSES)[number];

export interface IWashOrder {
  // Who booked the wash
  user: Types.ObjectId;

  // What they picked off the menu
  packageId: WashPackageId;
  packageName: string;
  vehicleType: VehicleCategory;

  // Their own vehicle — we hold no record of it, so they describe it
  vehicleLabel: string;
  plateNumber: string;

  // When — a slot on a day, not a date range
  /** Midnight of the booked day */
  scheduledDate: Date;
  slot: WashSlot;

  /** Priced by the server from the catalogue — never sent by the client */
  price: number;
  status: WashOrderStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export type WashOrderDocument = HydratedDocument<IWashOrder>;
type WashOrderModel = Model<IWashOrder>;

const washOrderSchema = new Schema<IWashOrder, WashOrderModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    packageId: {
      type: String,
      enum: WASH_PACKAGE_IDS,
      required: [true, 'Wash package is required'],
    },
    packageName: {
      type: String,
      required: true,
      trim: true,
    },
    vehicleType: {
      type: String,
      enum: VEHICLE_CATEGORIES,
      required: [true, 'Vehicle type is required'],
    },
    vehicleLabel: {
      type: String,
      required: [true, 'Tell us the make and model'],
      trim: true,
      minlength: 2,
      maxlength: 60,
    },
    plateNumber: {
      type: String,
      required: [true, 'Number plate is required'],
      trim: true,
      uppercase: true,
      maxlength: 20,
    },
    scheduledDate: {
      type: Date,
      required: [true, 'Wash date is required'],
    },
    slot: {
      type: String,
      enum: WASH_SLOTS,
      required: [true, 'Arrival time is required'],
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: WASH_ORDER_STATUSES,
      default: 'pending',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 300,
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

/** Store the day flat at midnight so every order in a slot compares equal —
 *  a stray timestamp would quietly split one slot into two. */
washOrderSchema.pre('validate', function normaliseDay() {
  if (this.scheduledDate) {
    this.scheduledDate.setHours(0, 0, 0, 0);
  }
});

// The bay count: "how many confirmed orders already sit in this slot today?"
washOrderSchema.index({ scheduledDate: 1, slot: 1, status: 1 });
// The double-booking guard: "is this plate already booked that day?"
washOrderSchema.index({ plateNumber: 1, scheduledDate: 1, status: 1 });

export const WashOrder = model<IWashOrder, WashOrderModel>('WashOrder', washOrderSchema);
