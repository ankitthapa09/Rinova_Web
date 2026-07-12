import { Schema, model, Types, type HydratedDocument, type Model } from 'mongoose';

export const BOOKING_STATUSES = ['pending', 'confirmed', 'declined', 'cancelled'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export interface IBooking {
  // Who requested the rental
  user: Types.ObjectId;
  // What they want to rent
  vehicle: Types.ObjectId;
  startDate: Date;
  endDate: Date;
  /** Rental length in days — computed server-side, stored for display */
  days: number;
  totalPrice: number;
  status: BookingStatus;
  createdAt: Date;
  updatedAt: Date;
}

export type BookingDocument = HydratedDocument<IBooking>;
type BookingModel = Model<IBooking>;

const bookingSchema = new Schema<IBooking, BookingModel>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    vehicle: {
      type: Schema.Types.ObjectId,
      ref: 'Vehicle',
      required: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Pick-up date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'Return date is required'],
    },
    days: {
      type: Number,
      required: true,
      min: 1,
    },
    totalPrice: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: BOOKING_STATUSES,
      default: 'pending',
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

// Cross-field rule: the rental must end after it starts.
bookingSchema.pre('validate', function checkDates() {
  if (this.startDate && this.endDate && this.endDate <= this.startDate) {
    this.invalidate('endDate', 'Return date must be after the pick-up date');
  }
});


bookingSchema.index({ vehicle: 1, status: 1, startDate: 1, endDate: 1 });

export const Booking = model<IBooking, BookingModel>('Booking', bookingSchema);
