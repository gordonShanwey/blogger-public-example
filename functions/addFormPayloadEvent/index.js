const { PubSub } = require('@google-cloud/pubsub');

// Create a PubSub client
const pubSubClient = new PubSub();

exports.publishToPubSub = async (req, res) => {
  // Enable CORS
  res.set('Access-Control-Allow-Origin', '*');
  
  if (req.method === 'OPTIONS') {
    // Send response to OPTIONS requests
    res.set('Access-Control-Allow-Methods', 'POST');
    res.set('Access-Control-Allow-Headers', 'Content-Type');
    res.set('Access-Control-Max-Age', '3600');
    res.status(204).send('');
    return;
  }

  try {
    console.log("Cloud Function invoked. Request body:", JSON.stringify(req.body, null, 2));
    console.log("PUBSUB_TOPIC env var:", process.env.PUBSUB_TOPIC);
    console.log("GCP_PROJECT env var:", process.env.GCP_PROJECT);
    const { message } = req.body;

    // Use environment variables for topic and project
    const topic = process.env.PUBSUB_TOPIC;
    const projectId = process.env.GCP_PROJECT;

    if (!topic || !message) {
      return res.status(400).json({
        error: 'Missing required parameters: PUBSUB_TOPIC env and message are required'
      });
    }

    // Get the topic
    const pubSubTopic = pubSubClient.topic(`projects/${projectId}/topics/${topic}`);
    const messageString = JSON.stringify(message);
    const messageBuffer = Buffer.from(messageString);

    const messageId = await pubSubTopic.publishMessage({ data: messageBuffer });

    console.log(`Message ${messageId} published to topic projects/${projectId}/topics/${topic}`);

    res.status(200).json({
      success: true,
      messageId: messageId
    });
  } catch (error) {
    console.error('Error publishing message:', error);
    res.status(500).json({
      error: 'Failed to publish message',
      details: error.message
    });
  }
};