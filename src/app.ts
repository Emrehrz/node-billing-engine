import express from 'express';
import { logger } from './logger';
import { requestLogger } from './middleware/requestLogger';
import { errorHandler } from './middleware/errorHandler';
import { query } from './db';
import authRoutes from './routes/auth.routes';
import subscriptionRoutes from './routes/subscription.routes';

export const app = express();

// Middleware
app.use(express.json());

// Request logging and ID middleware
app.use(requestLogger);

// Health check
app.get('/health', async (req, res, next) => {
  try {
    await query('SELECT 1');
    res.json({ status: 'ok' });
  } catch (error) {
    req.log.error({ error }, 'Database health check failed');
    res.status(500).json({ status: 'error' });
  }
});

// Routes
app.use('/auth', authRoutes);
app.use('/subscriptions', subscriptionRoutes);

// Basic 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: 'Resource not found',
    },
  });
});

// Global error handler must be last
app.use(errorHandler);
