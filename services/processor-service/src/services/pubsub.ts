import { PubSub, Subscription, Message } from '@google-cloud/pubsub';
import { processMessage } from '../controllers/messageProcessor';
import * as logger from './logger';
import { PUBSUB_CONFIG } from './config';

const pubsub = new PubSub();
const subscriptionName = PUBSUB_CONFIG.SUBSCRIPTION_NAME;

let subscription: Subscription;
let isListening = false;

/**
 * Initialize the Pub/Sub listener
 */
export const initPubSub = async (): Promise<void> => {
  try {
    // Get the subscription
    subscription = pubsub.subscription(subscriptionName, {
      flowControl: {
        maxMessages: PUBSUB_CONFIG.MAX_MESSAGES
      }
    });
    
    // Handle incoming messages
    subscription.on('message', handleMessage);
    
    // Handle errors
    subscription.on('error', (error) => {
      logger.error('Pub/Sub subscription error:', error);
    });
    
    isListening = true;
    logger.info(`Listening for messages on ${subscriptionName}...`);
  } catch (error) {
    logger.error('Error initializing Pub/Sub:', error);
    throw error;
  }
};

/**
 * Handle a Pub/Sub message
 * @param message The Pub/Sub message
 */
const handleMessage = async (message: Message): Promise<void> => {
  const messageId = message.id || 'unknown';
  
  try {
    logger.info(`Received message ${messageId}`);
    
    // Get message data as string
    const rawData = message.data.toString();
    logger.debug('Raw message data:', rawData);
    
    try {
      // Process the message with your business logic
      // Pass the raw string - the processor will handle the parsing
      await processMessage(rawData);
      
      // Acknowledge the message to remove it from the queue
      message.ack();
      logger.info(`Successfully processed and acknowledged message ${messageId}`);
    } catch (processingError) {
      logger.error(`Error processing message content (${messageId}):`, processingError);
      // Don't ack the message so it can be retried
      message.nack();
    }
  } catch (error) {
    logger.error(`Error in message handler (${messageId}):`, error);
    // Don't ack the message so it can be retried
    message.nack();
  }
};

/**
 * Stop listening for Pub/Sub messages
 */
export const stopPubSub = (): void => {
  if (subscription && isListening) {
    subscription.removeListener('message', handleMessage);
    isListening = false;
    logger.info('Stopped listening for Pub/Sub messages');
  }
};

/**
 * Check if the PubSub service is currently listening for messages
 */
export const isListeningForMessages = (): boolean => {
  return isListening;
}; 