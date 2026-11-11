import express from 'express';
import cors from 'cors';
import { env } from './config/env.js';
import apiRoutes from './routes/index.js';
import {
  notFoundHandler,
  errorHandler,
} from './middlewares/error.middleware.js';

export function createApp() {
  const app = express();

  const allowedOrigins = env.corsOrigin
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
          callback(null, true);
        } else {
          callback(null, false);
        }
      },
      credentials: true,
    })
  );

  app.use(express.json({ limit: '1mb' }));

  app.get('/', (_req, res) => {
    res.status(200).json({
      name: 'BidZone REST API',
      version: '1.0.0',
      docs: '/api/health',
    });
  });

  app.use('/api', apiRoutes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}

const app = createApp();
export default app;

