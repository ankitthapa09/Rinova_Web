import winston from 'winston';
import { env, isProd } from '@/config/env';

/**
 * App-wide logger. Human-readable colored lines in development; structured
 * JSON in production so logs can be shipped and queried. Import this instead
 * of using `console.*`.
 */
const devFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const rest = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `${timestamp} ${level}: ${message}${rest}`;
  }),
);

const prodFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.errors({ stack: true }),
  winston.format.json(),
);

export const logger = winston.createLogger({
  level: isProd ? 'info' : 'debug',
  format: isProd ? prodFormat : devFormat,
  transports: [new winston.transports.Console()],
  // Don't crash the process on a logging error.
  exitOnError: false,
  silent: env.NODE_ENV === 'test',
});
