import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { env } from '@/config/env';
import { generalLimiter } from '@/middlewares/rateLimiter';
import { notFoundHandler, errorHandler } from '@/middlewares/error.middleware';
import routes from '@/routes';

// App assembly only — no listening here. server.ts owns the lifecycle,
// and tests can import this app without opening a port.
const app = express();

// Behind a reverse proxy the client IP arrives in X-Forwarded-For; without
// this, every visitor shares the proxy's IP and per-IP rate limits collapse.
if (env.TRUST_PROXY > 0) app.set('trust proxy', env.TRUST_PROXY);

app.use(helmet());
app.use(cors({ origin: env.CLIENT_URL, credentials: true }));

// Auth payloads are tiny; a small limit blunts oversized-body abuse
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

app.use('/api', generalLimiter);
app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
