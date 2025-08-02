import { Logging } from '@google-cloud/logging';
import dotenv from 'dotenv';

dotenv.config();

// Initialize the logger
const logging = new Logging();
const log = logging.log('blogger-processor');

/**
 * Log levels
 */
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

/**
 * Log a message with appropriate formatting and severity
 * 
 * @param level The severity level of the log
 * @param message The main message to log
 * @param data Additional data to include in the log
 */
export const logMessage = (level: LogLevel, message: string, data?: any): void => {
  const timestamp = new Date().toISOString();
  const logPrefix = `[${timestamp}] [${level.toUpperCase()}]`;
  
  // Prepare the log entry
  const logEntry = {
    message: `${logPrefix} ${message}`,
    timestamp,
    severity: level.toUpperCase(),
    data: data ? scrubSensitiveData(data) : undefined
  };
  
  // Choose appropriate console method based on level
  switch (level) {
    case 'debug':
      console.debug(`${logPrefix} ${message}`, data ? data : '');
      break;
    case 'info':
      console.info(`${logPrefix} ${message}`, data ? data : '');
      break;
    case 'warn':
      console.warn(`${logPrefix} ${message}`, data ? data : '');
      break;
    case 'error':
      console.error(`${logPrefix} ${message}`, data ? data : '');
      break;
  }
  
  // Log to Cloud Logging in production
  if (process.env.NODE_ENV === 'production') {
    const entry = log.entry({ severity: level.toUpperCase() }, logEntry);
    log.write(entry).catch(err => {
      console.error('Error writing to Cloud Logging:', err);
    });
  }
};

/**
 * Scrub sensitive data from logs
 * 
 * @param data The data to scrub
 * @returns Scrubbed data safe for logging
 */
const scrubSensitiveData = (data: any): any => {
  // Don't process non-objects
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  // Create a deep copy to avoid modifying the original
  const scrubbed = { ...data };
  
  // Fields to scrub (add more as needed)
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'authorization'];
  
  // Scrub sensitive fields in the object
  Object.keys(scrubbed).forEach(key => {
    const lowerKey = key.toLowerCase();
    
    // Check if the field should be scrubbed
    if (sensitiveFields.some(field => lowerKey.includes(field))) {
      scrubbed[key] = '[REDACTED]';
    }
    // Recursively scrub nested objects
    else if (typeof scrubbed[key] === 'object' && scrubbed[key] !== null) {
      scrubbed[key] = scrubSensitiveData(scrubbed[key]);
    }
  });
  
  return scrubbed;
};

// Convenience methods
export const debug = (message: string, data?: any): void => logMessage('debug', message, data);
export const info = (message: string, data?: any): void => logMessage('info', message, data);
export const warn = (message: string, data?: any): void => logMessage('warn', message, data);
export const error = (message: string, data?: any): void => logMessage('error', message, data); 