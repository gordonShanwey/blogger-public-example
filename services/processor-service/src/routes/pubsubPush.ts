import express, { Request, Response, Router } from 'express';
import { processMessage } from '../controllers/messageProcessor';
import * as logger from '../services/logger';

const router: Router = express.Router();

interface PubSubPushMessage {
  message: {
    data: string; // Base64 encoded data
    messageId: string;
    publishTime: string;
  };
  subscription: string;
}

/**
 * POST /pubsub/push
 * Endpoint for receiving messages from a Pub/Sub push subscription.
 */
router.post('/pubsub/push', async (req: Request, res: Response): Promise<void> => {
  logger.info('Received Pub/Sub push request:', { body: req.body });

  // Validate the request body structure
  const pubSubMessage = req.body as PubSubPushMessage;
  if (!pubSubMessage || !pubSubMessage.message || !pubSubMessage.message.data) {
    logger.error('Invalid Pub/Sub message format received:', { body: req.body });
    res.status(400).send('Bad Request: Invalid Pub/Sub message format');
    return;
  }

  try {
    // The processMessage function expects the raw data string (base64 encoded)
    // It handles the decoding internally.
    await processMessage(pubSubMessage.message); // Pass the inner message object

    // Acknowledge the message by returning a success status code (2xx).
    // 204 No Content is standard for Pub/Sub push acknowledgements.
    logger.info(`Successfully processed message ${pubSubMessage.message.messageId}`);
    res.status(204).send();
  } catch (error: any) {
    logger.error(`Error processing Pub/Sub push message ${pubSubMessage.message.messageId}:`, error);

    // Signal an error to Pub/Sub to potentially retry the message.
    // Sending a non-2xx status code (like 500) acts as a NACK.
    res.status(500).send(`Internal Server Error: ${error.message}`);
  }
});

export default router; 