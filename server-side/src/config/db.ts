import mongoose from 'mongoose';
import { env } from '@/config/env';
import { logger } from '@/config/logger';

// connect to mongo at startup, before the server listens. a failed connect
// should abort boot rather than serve a broken api
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

// close the connection on shutdown
export async function disconnectDatabase(): Promise<void> {
  await mongoose.connection.close();
  logger.info('MongoDB connection closed');
}
