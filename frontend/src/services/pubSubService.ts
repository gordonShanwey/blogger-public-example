// We'll use a direct HTTP call to Cloud Functions for simplicity
// In a real application, you might want to use the @google-cloud/pubsub package directly

interface PubSubMessage {
  postId: string;
  action: 'created' | 'updated' | 'deleted' | 'regenerate';
  timestamp: number;
  data: any;
}

class PubSubService {
  private readonly functionUrl: string;
  
  constructor() {
    this.functionUrl = import.meta.env.VITE_PUBSUB_FUNCTION_URL || 
      'https://us-central1-your-project-id.cloudfunctions.net/publishToPubSub';
  }

  /**
   * Publish a message to the Pub/Sub topic via Cloud Function
   * @param topicName The name of the Pub/Sub topic
   * @param message The message to publish
   */
  async publishMessage(topicName: string, message: PubSubMessage): Promise<void> { // Ensure PubSubMessage is an object
    try {
      const payload = {
        message: message // Pass the message object directly
      };

      const response = await fetch(this.functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload), // Stringify the whole payload object once
      });

      if (!response.ok) {
        const errorText = await response.text(); // Get more error details if possible
        throw new Error(`Error publishing message: ${response.status} ${response.statusText} - ${errorText}`);
      }
      // Potentially parse response.json() if your function returns JSON on success

    } catch (error) {
      console.error('Error publishing message:', error);
      throw error;
    }
  }

  /**
   * Publish a post created event
   * @param postId The ID of the created post
   * @param postData The post data
   */
  async publishPostCreated(postId: string, postData: any): Promise<void> {
    const message: PubSubMessage = {
      postId,
      action: 'created',
      timestamp: Date.now(),
      data: postData
    };

    return this.publishMessage('blog-post-events', message);
  }

  /**
   * Publish a post updated event
   * @param postId The ID of the updated post
   * @param postData The updated post data
   */
  async publishPostUpdated(postId: string, postData: any): Promise<void> {
    const message: PubSubMessage = {
      postId,
      action: 'updated',
      timestamp: Date.now(),
      data: postData
    };

    return this.publishMessage('blog-post-events', message);
  }

  /**
   * Publish a post deleted event
   * @param postId The ID of the deleted post
   */
  async publishPostDeleted(postId: string): Promise<void> {
    const message: PubSubMessage = {
      postId,
      action: 'deleted',
      timestamp: Date.now(),
      data: { id: postId }
    };

    return this.publishMessage('blog-post-events', message);
  }

  /**
   * Publish a post regeneration request
   * @param postId The ID of the post to regenerate
   * @param selectedSections Array of sections that need improvement
   * @param feedback User feedback and instructions for improvements
   * @param originalContent The original content/query
   */
  async publishPostRegeneration(
    postId: string, 
    selectedSections: any[], 
    feedback: string,
    originalContent: string
  ): Promise<void> {
    const message: PubSubMessage = {
      postId,
      action: 'regenerate',
      timestamp: Date.now(),
      data: {
        id: postId,
        selectedSections,
        feedback,
        originalContent
      }
    };

    return this.publishMessage('blog-post-events', message);
  }
}

export default new PubSubService(); 