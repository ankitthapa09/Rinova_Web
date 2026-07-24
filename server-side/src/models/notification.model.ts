import { Schema, model, Types, type HydratedDocument, type Model } from 'mongoose';

/** Every in-app notification is one of these — the client keys an icon/colour off it. */
export const NOTIFICATION_TYPES = [
  'rental_created',
  'rental_confirmed',
  'rental_declined',
  'rental_cancelled',
  'wash_created',
  'wash_confirmed',
  'wash_declined',
  'wash_completed',
  'wash_cancelled',
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface INotification {
  /** Who sees it. */
  recipient: Types.ObjectId;
  type: NotificationType;
  title: string;
  message: string;
  /** Where clicking it takes the user (e.g. /dashboard/rentals). */
  link?: string;
  read: boolean;
  readAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type NotificationDocument = HydratedDocument<INotification>;
type NotificationModel = Model<INotification>;

const notificationSchema = new Schema<INotification, NotificationModel>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: NOTIFICATION_TYPES,
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    link: { type: String },
    read: { type: Boolean, default: false },
    readAt: { type: Date },
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

// Unread counts and newest-first listing per user both ride this one index.
notificationSchema.index({ recipient: 1, read: 1, createdAt: -1 });

export const Notification = model<INotification, NotificationModel>('Notification', notificationSchema);
