import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { clientUrlList, env } from '@/config/env';
import { generalLimiter } from '@/middlewares/rateLimiter';
import { notFoundHandler, errorHandler } from '@/middlewares/error.middleware';
import routes from '@/routes';

const app = express();

if (env.TRUST_PROXY > 0) app.set('trust proxy', env.TRUST_PROXY);

app.use(helmet());
app.use(cors({ origin: clientUrlList, credentials: true }));

// Auth payloads are tiny; a small limit blunts oversized-body abuse
app.use(express.json({ limit: '10kb' }));
app.use(cookieParser());

app.use('/api', generalLimiter);
app.use('/api/v1', routes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
