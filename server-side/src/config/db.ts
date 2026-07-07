import mongoose from 'mongoose';
import { env } from '@/config/env';
import { logger } from '@/config/logger';

/**
 * Connects to MongoDB. Called once during bootstrap, before the HTTP server
 * starts listening — a failed connection should abort startup, not serve a
 * broken API.
 */
export async function connectDatabase(): Promise<void> {
  mongoose.set('strictQuery', true);

  mongoose.connection.on('error', (err) => {
    logger.error('MongoDB connection error', { error: err.message });
  });
  mongoose.connection.on('disconnected', () => {
    logger.warn('MongoDB disconnected');
  });

  await mongoose.connect(env.MONGO_URI);
  logger.info('MongoDB connected');
}

/** Closes the connection gracefully — used on shutdown signals. */
export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}
