import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { Logging } from '@google-cloud/logging';
import routes from './routes/index';
import pubsubPushRoutes from './routes/pubsubPush';
import * as logger from './services/logger';
import { SERVER_CONFIG, APP_CONFIG } from './services/config';

// Initialize Express app
const app = express();
const PORT = SERVER_CONFIG.PORT;

// Add middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Initialize Cloud Logging
const logging = new Logging();
const log = logging.log('app-log');

// Define a simple middleware to log requests
app.use((req: Request, res: Response, next: NextFunction) => {
  const startTime = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - startTime;
    const message = `${req.method} ${req.originalUrl} ${res.statusCode} ${duration}ms`;
    
    // Log to Google Cloud Logging in production
    if (APP_CONFIG.IS_PRODUCTION) {
      const entry = log.entry({ severity: 'INFO' }, { 
        message,
        httpRequest: {
          method: req.method,
          url: req.originalUrl,
          status: res.statusCode,
          latency: { seconds: duration / 1000 }
        }
      });
      log.write(entry).catch(err => logger.error('Error writing to Cloud Logging:', err));
    } else {
      // Log to console in development
      logger.info(message);
    }
  });
  
  next();
});

// Routes
app.use('/api', routes);
app.use(pubsubPushRoutes);

// Health check endpoint with a sample debug point
app.get('/', (req: Request, res: Response) => {
  // You can set a breakpoint on the next line for debugging
  const healthStatus = { 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    environment: SERVER_CONFIG.NODE_ENV,
  };
  logger.info('Health check requested', healthStatus);
  res.status(200).json(healthStatus);
});

// Handle 404s
app.use((req: Request, res: Response) => {
  logger.warn(`Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ message: 'Route not found' });
});

// Global error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    message: 'Something went wrong',
    error: APP_CONFIG.IS_PRODUCTION ? {} : err.message
  });
});

// Initialize the application
const initializeApp = async () => {
  try {
    // Start the server
    const server = app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT} in ${SERVER_CONFIG.NODE_ENV} mode`);
    });
    
    // Graceful shutdown
    const handleShutdown = (signal: string) => {
      logger.info(`${signal} signal received: closing HTTP server`);
      
      // First stop accepting new connections
      server.close(() => {
        logger.info('HTTP server closed');
        
        logger.info('Clean shutdown completed');
        process.exit(0);
      });
      
      // Force exit after 10s if graceful shutdown fails
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };
    
    // Register shutdown handlers
    process.on('SIGTERM', () => handleShutdown('SIGTERM'));
    process.on('SIGINT', () => handleShutdown('SIGINT'));
    
    return server;
  } catch (error) {
    logger.error('Failed to initialize application:', error);
    process.exit(1);
  }
};

// Start the application if this file is run directly
if (require.main === module) {
  initializeApp();
}

export default app;
export { initializeApp };
