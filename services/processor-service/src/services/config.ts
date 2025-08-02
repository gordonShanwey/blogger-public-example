import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

/**
 * Collection names
 */
export const COLLECTION_NAMES = {
  POSTS: 'posts',
  GENERATED_POSTS: 'generated_posts'
};

/**
 * Message actions
 */
export const ACTIONS = {
  CREATED: 'created',
  UPDATED: 'updated',
  DELETED: 'deleted',
  REGENERATE: 'regenerate'
};

/**
 * Status values for processed blog posts
 */
export const STATUSES = {
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  ERROR: 'error',
  GENERATED: 'generated'
};

/**
 * OpenAI configuration
 */
export const OPENAI_CONFIG = {
  MODEL: process.env.OPENAI_MODEL || 'gpt-4.5-preview',
  API_KEY: process.env.OPENAI_API_KEY_SECRET,
  MAX_TOKENS: 6000,
  TEMPERATURE: 1,
  TOP_P: 1
};

/**
 * PubSub configuration
 */
export const PUBSUB_CONFIG = {
  SUBSCRIPTION_NAME: process.env.PUBSUB_SUBSCRIPTION_NAME || 'default-subscription',
  MAX_MESSAGES: 1
};

/**
 * Blog post generation requirements
 */
export const BLOG_REQUIREMENTS = {
  MIN_CHARS: 4000,
  SECTION_MIN_CHARS: 500,
  SECTION_MAX_CHARS: 800
};

/**
 * Server configuration
 */
export const SERVER_CONFIG = {
  PORT: process.env.PORT || 8080,
  NODE_ENV: process.env.NODE_ENV || 'development'
};

/**
 * General application settings
 */
export const APP_CONFIG = {
  IS_PRODUCTION: process.env.NODE_ENV === 'production',
  LOG_LEVEL: process.env.LOG_LEVEL || 'info'
};

/**
 * Get a configuration value with a fallback
 * 
 * @param key The environment variable key
 * @param defaultValue The default value if not found
 * @returns The configuration value
 */
export const getConfig = <T>(key: string, defaultValue: T): T => {
  const value = process.env[key];
  return value !== undefined ? (value as unknown as T) : defaultValue;
};

export default {
  COLLECTION_NAMES,
  ACTIONS,
  STATUSES,
  OPENAI_CONFIG,
  PUBSUB_CONFIG,
  BLOG_REQUIREMENTS,
  SERVER_CONFIG,
  APP_CONFIG,
  getConfig
}; 