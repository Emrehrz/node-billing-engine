import express from 'express';
import { logger } from './logger';
import authRoutes from './routes/auth.routes';
import subscriptionRoutes from './routes/subscription.routes';

export const app = express();

// Middleware
app.use(express.json());

// Request logging middleware
app.use((req, res, next) => {
  logger.info({ method: req.method, url: req.url }, 'Incoming request');
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Routes
app.use('/auth', authRoutes);
app.use('/subscriptions', subscriptionRoutes);

// Basic 404 handler
app.use((req, res) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    },
  });
});
