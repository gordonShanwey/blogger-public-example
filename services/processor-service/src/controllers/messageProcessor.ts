import { saveDocument, updateDocument, getDocument } from '../services/firestore';
import { uploadFile } from '../services/storage';
import { generateBlogPost } from '../services/blogGenerator';
import * as logger from '../services/logger';

// Define the collection name for storing messages
const COLLECTION_NAME = 'posts';
export const GENERATED_POSTS_COLLECTION_NAME = 'generated_posts';
/**
 * Define the structure of a message from Pub/Sub
 */
interface PubSubMessage {
  id?: string;
  data: any; // Using any to accommodate different data structures
  contentType?: string;
  publishTime?: string;
}

/**
 * Interface for a blog post section
 */
export interface BlogPostSection {
  index: number;
  subtitle: string;
  content: string;
}

/**
 * Define the structure of a blog post data
 */
export interface BlogPostData {
  id: string;
  title?: string; // Make title optional so we can handle cases where it's not provided
  content: string;
  keywords: string[];
  focus: string;
  regenerationInstructions?: string;
  selectedSections?: BlogPostSection[];
  originalContent?: string;
  feedback?: string;
  previousGeneration?: {
    content: string;
    generatedAt: string;
  };
  [key: string]: any; // For any additional fields
}

/**
 * Define the structure of a blog post message
 */
interface BlogPostMessage {
  postId: string;
  action: 'created' | 'updated' | 'deleted' | 'regenerate';
  timestamp: number;
  data: BlogPostData;
}

/**
 * Define the structure of a processed blog post record
 */
interface ProcessedBlogPost {
  postId: string;
  action: 'created' | 'updated' | 'deleted' | 'regenerate';
  timestamp: number;
  processedAt: string;
  blogPost: BlogPostData;
  status: 'processing' | 'completed' | 'error';
  generatedPostId?: string;
  previousGeneratedPostId?: string;
  regenerationAttempt?: number;
  regenerationHistory?: Array<{
    timestamp: number;
    previousGeneratedPostId: string | null;
    note?: string;
  }>;
  fileUrl?: string;
  fileUploadedAt?: string;
  completedAt?: string;
  error?: string;
  errorAt?: string;
  note?: string;
  previousGenerationInfo?: {
    generatedPostId: string;
    generatedContent: string;
    generatedAt: string;
    title: string;
  };
  [key: string]: any; // For any additional fields
}

/**
 * Define the structure of a generated blog post record
 */
interface GeneratedBlogPost {
  originalPostId: string;
  title: string;
  originalContent: string;
  generatedContent: string;
  generatedAt: string;
  status: 'generated' | 'error';
  error?: string;
  keywords?: string[];
  focus?: string;
  [key: string]: any;
}

/**
 * Extract a title from the blog post data if not explicitly provided
 * Used for regeneration requests that might come with different data structures
 */
const extractTitleFromBlogPostData = (data: BlogPostData): string => {
  // If title already exists, return it
  if (data.title) {
    return data.title;
  }
  
  
  // Try to extract from selectedSections
  if (data.selectedSections && data.selectedSections.length > 0) {
    // If we have selectedSections, check if any has a title-like subtitle
    const introSection = data.selectedSections.find(
      (section: BlogPostSection) => section.subtitle?.toLowerCase().includes('wstęp') || 
                section.index === 0
    );
    
    if (introSection) {
      // Take first 5-10 words from the content to create a title
      const words = introSection.content.split(' ').slice(0, 10);
      const extractedTitle = words.join(' ').trim() + '...';
      logger.info(`Generated title from intro section content: "${extractedTitle}"`);
      return extractedTitle;
    }
  }
  
  // Try from originalContent if available
  if (data.originalContent) {
    const words = data.originalContent.split(' ').slice(0, 10);
    const extractedTitle = words.join(' ').trim() + '...';
    logger.info(`Generated title from original content: "${extractedTitle}"`);
    return extractedTitle;
  }
  
  // Last resort - use a generic title with timestamp
  const fallbackTitle = `Post ${new Date().toISOString()}`;
  logger.info(`Using generic title as last resort: "${fallbackTitle}"`);
  return fallbackTitle;
};

/**
 * Parse message data from different formats into a BlogPostMessage
 * @param messageData The raw message data in various formats
 * @returns A parsed BlogPostMessage object
 */
const parseMessageData = async (messageData: any): Promise<BlogPostMessage> => {
  // Case 1: messageData is a string (direct JSON)
  if (typeof messageData === 'string') {
    return parseStringMessageData(messageData);
  } 
  // Case 2: messageData is a PubSub message with base64 encoded data
  else if (messageData && messageData.data && typeof messageData.data === 'string') {
    return parseBase64MessageData(messageData.data);
  }
  // Case 3: messageData is already an object (assuming proper structure)
  else if (typeof messageData === 'object') {
    return parseObjectMessageData(messageData);
  } 
  else {
    logger.error('Unrecognized message format:', messageData);
    throw new Error(`Invalid message format: Unrecognized message type ${typeof messageData}`);
  }
};

/**
 * Parse message data from a string format
 * @param messageData String message data
 * @returns A parsed BlogPostMessage object
 */
const parseStringMessageData = (messageData: string): BlogPostMessage => {
  try {
    const parsedMessage = JSON.parse(messageData);
    return validateAndNormalizeMessage(parsedMessage);
  } catch (parseError: any) {
    logger.error('Error parsing message data as JSON:', parseError);
    throw new Error(`Invalid message format: Unable to parse JSON string - ${parseError.message}`);
  }
};

/**
 * Parse message data from base64 encoded format
 * @param base64Data Base64 encoded message data
 * @returns A parsed BlogPostMessage object
 */
const parseBase64MessageData = (base64Data: string): BlogPostMessage => {
  try {
    // Decode base64 string to UTF-8
    const decodedData = Buffer.from(base64Data, 'base64').toString('utf-8');
    
    try {
      const parsedMessage = JSON.parse(decodedData);
      return validateAndNormalizeMessage(parsedMessage);
    } catch (jsonError: any) {
      logger.error('Error parsing decoded data as JSON:', jsonError);
      throw new Error(`Invalid message format: Unable to parse decoded data as JSON - ${jsonError.message}`);
    }
  } catch (decodeError: any) {
    logger.error('Error decoding base64 data:', decodeError);
    throw new Error(`Invalid message format: Unable to decode base64 data - ${decodeError.message}`);
  }
};

/**
 * Parse message data from object format
 * @param messageData Object message data
 * @returns A parsed BlogPostMessage object
 */
const parseObjectMessageData = (messageData: any): BlogPostMessage => {
  // If it's a PubSub message object with a data property that's an object
  if (messageData.data && typeof messageData.data === 'object') {
    return validateAndNormalizeMessage(messageData.data);
  } 
  // If the messageData itself has the expected structure
  else if (messageData.postId && messageData.action && messageData.data) {
    return validateAndNormalizeMessage(messageData);
  }
  else {
    logger.error('Message data does not have expected structure:', messageData);
    throw new Error('Invalid message format: Message data does not have expected structure');
  }
};

/**
 * Validate and normalize a message to ensure it has the required structure
 * @param message The message to validate and normalize
 * @returns A valid BlogPostMessage object
 */
const validateAndNormalizeMessage = (message: any): BlogPostMessage => {
  let parsedMessage = message;
  
  // Check if message is still a string (sometimes happens with certain message formats)
  if (typeof parsedMessage === 'string') {
    try {
      parsedMessage = JSON.parse(parsedMessage);
    } catch (parseError: any) {
      logger.error('Failed to parse the string message:', parseError);
      throw new Error(`Invalid message format: Failed to parse the string message - ${parseError.message}`);
    }
  }
  
  // Validate the required fields
  if (!parsedMessage.postId || !parsedMessage.action) {
    // Special case: If data field is missing but we have title, content and id at the top level
    if (!parsedMessage.data && parsedMessage.title && parsedMessage.content && parsedMessage.id) {
      logger.info('Data field is missing but found title, content and id at top level, reconstructing data object');
      
      // Create a new blog post message with the correct structure
      parsedMessage = {
        postId: parsedMessage.id,
        action: 'created', // Default to 'created' action
        timestamp: parsedMessage.timestamp || Date.now(),
        data: {
          id: parsedMessage.id,
          title: parsedMessage.title,
          content: parsedMessage.content,
          keywords: parsedMessage.keywords || [],
          focus: parsedMessage.focus || ''
        }
      };
      
    } else {
      logger.error('Missing required fields in parsed message:', parsedMessage);
      throw new Error('Invalid message format: Missing required fields (postId, action)');
    }
  }

  // Ensure data has the required fields for BlogPostData
  if (parsedMessage.data) {
    // Add missing fields with default values if necessary
    if (!parsedMessage.data.keywords) {
      parsedMessage.data.keywords = [];
    }
    
    if (!parsedMessage.data.focus) {
      parsedMessage.data.focus = '';
    }
  }
  
  return parsedMessage as BlogPostMessage;
};

/**
 * Process a message from Pub/Sub
 * 
 * This function implements your business logic for processing messages.
 * Customize this to handle your specific Pub/Sub message format and processing needs.
 * 
 * @param message The message data from Pub/Sub
 * @returns The ID of the processed message document in Firestore
 */
export const processMessage = async (messageData: any): Promise<string> => {
  try {
    logger.info('Processing message:', typeof messageData === 'string' ? messageData : JSON.stringify(messageData));
    
    // Special case: If messageData is already a JSON string with the exact expected format
    // Example: '{"postId":"FPpOJKecVsrPH3yIwnmq","action":"created","timestamp":1742405269705,...}'
    if (typeof messageData === 'string' && 
        messageData.startsWith('{') && 
        messageData.includes('"postId"') && 
        messageData.includes('"action"')) {
      try {
        const directParsed = JSON.parse(messageData);
        if (directParsed.postId && directParsed.action && directParsed.data) {
          logger.info('Detected direct JSON string with valid BlogPostMessage format');
          return await processValidBlogPostMessage(directParsed);
        }
      } catch (err: any) {
        // Continue with regular parsing flow if this special case fails
      }
    }
    
    // Parse the message data into a standardized format
    const parsedMessage = await parseMessageData(messageData);
    
    // Now that we have a valid message, process it
    return await processValidBlogPostMessage(parsedMessage);
    
  } catch (error: any) {
    logger.error('Error processing message:', error);
    throw error;
  }
};

/**
 * Get a processed message by ID
 * @param id The ID of the message to retrieve
 * @returns The processed message
 */
export const getProcessedMessage = async (id: string): Promise<any> => {
  try {
    logger.info(`Retrieving message with ID: ${id} from collection: ${COLLECTION_NAME}`);
    const document = await getDocument(COLLECTION_NAME, id);
    
    if (!document) {
      logger.warn(`No document found with ID: ${id} in collection: ${COLLECTION_NAME}`);
      return null;
    }
    
    return document;
  } catch (error: any) {
    logger.error(`Error retrieving message with ID: ${id}:`, error);
    throw new Error(`Failed to retrieve message: ${error.message}`);
  }
};

/**
 * Process a valid blog post message that's already properly parsed
 * 
 * @param blogPostMessage A valid BlogPostMessage object
 * @returns The ID of the processed message document in Firestore 
 */
const processValidBlogPostMessage = async (blogPostMessage: BlogPostMessage): Promise<string> => {
  const { postId, action, timestamp, data } = blogPostMessage;
  
  logger.info(`Processing valid blog post: Post ID: ${postId}, Action: ${action}`, { data });
  
  // Check if we already have this post in the database
  let existingPost: ProcessedBlogPost | null = null;
  
  // First try the normal collection
  existingPost = await getDocument<ProcessedBlogPost>(COLLECTION_NAME, postId);
  
  // If not found, check in the generated_posts collection
  if (!existingPost) {
    logger.info(`Post not found in ${COLLECTION_NAME}, checking ${GENERATED_POSTS_COLLECTION_NAME} collection`);
    const generatedPost = await getDocument<GeneratedBlogPost>(GENERATED_POSTS_COLLECTION_NAME, postId);
    
    if (generatedPost) {
      logger.info(`Found post in ${GENERATED_POSTS_COLLECTION_NAME} collection: ${postId}`);
      
      // Create a synthetic "processed post" from the generated post data
      existingPost = {
        postId: generatedPost.originalPostId,
        action: 'created',
        timestamp: new Date(generatedPost.generatedAt).getTime(),
        processedAt: new Date().toISOString(),
        blogPost: {
          id: generatedPost.originalPostId,
          title: generatedPost.title,
          content: generatedPost.originalContent,
          keywords: generatedPost.keywords || [],
          focus: generatedPost.focus || ''
        },
        status: 'completed',
        generatedPostId: postId
      };
      
      // Make sure data has a title - required for generation
      if (!data.title && generatedPost.title) {
        data.title = generatedPost.title;
        logger.info(`Added missing title to data from generated post: "${data.title}"`);
      }
    } else {
      logger.warn(`Post not found in ${GENERATED_POSTS_COLLECTION_NAME} collection either: ${postId}`);
    }
  }
  
  
  // Create a processed data object
  const processedData: ProcessedBlogPost = {
    postId,
    action,
    timestamp,
    processedAt: new Date().toISOString(),
    blogPost: data,
    status: 'processing' // Initially set to processing
  };
  
  // For 'regenerate' action, create a version identifier to track regeneration attempts
  if (action === 'regenerate') {
    // If we have an existing post, ensure we're not losing any data
    if (existingPost) {
      logger.info(`Regenerating content for existing post: ${postId}`);
      
      // Keep track of previous generated content if it exists
      if (existingPost.generatedPostId) {
        processedData.previousGeneratedPostId = existingPost.generatedPostId;
        
        // Fetch the previously generated content from generated_posts collection
        try {
          const generatedPostId = existingPost.generatedPostId;
          logger.info(`Fetching previously generated content with ID: ${generatedPostId}`);
          
          const previousGeneratedPost = await getDocument<GeneratedBlogPost>(GENERATED_POSTS_COLLECTION_NAME, generatedPostId);
          
          if (previousGeneratedPost) {
            logger.info(`Found previously generated content for post: ${postId}`);
            
            // Store information about the previous generation
            processedData.previousGenerationInfo = {
              generatedPostId: generatedPostId,
              generatedContent: previousGeneratedPost.generatedContent,
              generatedAt: previousGeneratedPost.generatedAt,
              title: previousGeneratedPost.title
            };
            
            // Use original post data as source of truth
            if (existingPost.blogPost) {
              logger.info('Using original post data as source of truth');
              
              // Preserve original fields from the original post
              if (!data.originalContent && existingPost.blogPost.content) {
                data.originalContent = existingPost.blogPost.content;
                logger.info('Preserved original content from source post');
              }
              
              if (!data.keywords?.length && existingPost.blogPost.keywords?.length) {
                data.keywords = existingPost.blogPost.keywords;
                logger.info('Preserved keywords from source post');
              }
              
              if (!data.focus && existingPost.blogPost.focus) {
                data.focus = existingPost.blogPost.focus;
                logger.info('Preserved focus from source post');
              }
              
              if (!data.title && existingPost.blogPost.title) {
                data.title = existingPost.blogPost.title;
                logger.info('Preserved title from source post');
              }
            } else {
              // Fallback to previous generation data if original post data is not available
              logger.warn('Original post data not available, falling back to previous generation data');
              
              if (!data.originalContent && previousGeneratedPost.originalContent) {
                data.originalContent = previousGeneratedPost.originalContent;
                logger.info('Preserved original content from previous generation (fallback)');
              }
              
              if (!data.keywords?.length && previousGeneratedPost.keywords?.length) {
                data.keywords = previousGeneratedPost.keywords;
                logger.info('Preserved keywords from previous generation (fallback)');
              }
              
              if (!data.focus && previousGeneratedPost.focus) {
                data.focus = previousGeneratedPost.focus;
                logger.info('Preserved focus from previous generation (fallback)');
              }
            }
            
          } else {
            logger.warn(`Referenced generated post ID ${generatedPostId} not found in ${GENERATED_POSTS_COLLECTION_NAME} collection`);
          }
        } catch (fetchError) {
          logger.error(`Error fetching previously generated content:`, fetchError);
          // Continue with regeneration even if we can't fetch the previous content
        }
      }
      
      // Add regeneration metadata
      processedData.regenerationAttempt = (existingPost.regenerationAttempt || 0) + 1;
      processedData.regenerationHistory = existingPost.regenerationHistory || [];
      
      // Record this regeneration in history
      processedData.regenerationHistory.push({
        timestamp: Date.now(),
        previousGeneratedPostId: existingPost.generatedPostId || null
      });
      
    } else {
      logger.warn(`Attempting to regenerate non-existent post: ${postId}. Will proceed as a new post.`);
      processedData.regenerationAttempt = 1;
      processedData.regenerationHistory = [{
        timestamp: Date.now(),
        previousGeneratedPostId: null,
        note: 'First regeneration attempt, no previous version found'
      }];
    }
  }
  
  // Ensure we have a title for the post data
  if (!data.title) {
    data.title = extractTitleFromBlogPostData(data);
  }
  
  // Store in Firestore using the postId as the document ID
  const docId = await saveDocument(COLLECTION_NAME, processedData, postId);
  logger.info(`Saved processed message to Firestore with ID: ${docId}`);
  
  // Handle any file content if present (example from previous code)
  if (data.fileContent && data.fileName) {
    // Convert base64 content to buffer if necessary
    const fileBuffer = data.fileContent.startsWith('data:')
      ? Buffer.from(data.fileContent.split(',')[1], 'base64')
      : Buffer.from(data.fileContent, 'base64');
    
    // Upload to Cloud Storage
    const fileUrl = await uploadFile(data.fileName, fileBuffer);
    
    // Update the Firestore document with the file URL
    await updateDocument(COLLECTION_NAME, docId, {
      fileUrl,
      fileUploadedAt: new Date().toISOString()
    });
    
    logger.info(`Uploaded file to Cloud Storage: ${fileUrl}`);
  }
  
  // Generate content for create, update, or regenerate actions, but not for delete
  if (action !== 'deleted') {
    logger.info('Calling blog generation service...');
    
    // Add specific context for regeneration
    let additionalContext = `This post was ${action} at ${new Date(timestamp).toISOString()}.`;
    
    if (action === 'regenerate') {
      additionalContext += ` This is regeneration attempt #${processedData.regenerationAttempt}.`;
      
      // If we have specific instructions for regeneration, add them
      if (data.regenerationInstructions) {
        additionalContext += ` Regeneration instructions: ${data.regenerationInstructions}`;
      }
      
      // If we have previous generation info, add it to the context
      if (processedData.previousGenerationInfo) {
        additionalContext += ` Previous version was generated at ${processedData.previousGenerationInfo.generatedAt}.`;
        
        // Create a special object to pass to the generation service
        data.previousGeneration = {
          content: processedData.previousGenerationInfo.generatedContent,
          generatedAt: processedData.previousGenerationInfo.generatedAt
        };
        
      }
    }
    
    // Use the blog generation service to generate and store the content
    const generationResult = await generateBlogPost({
      postId,
      data,
      additionalContext
    });
    
    // Update the original document based on the generation result
    if (generationResult.status === 'generated') {
      const updateData: Partial<ProcessedBlogPost> = {
        generatedPostId: generationResult.generatedPostId,
        status: 'completed',
        completedAt: new Date().toISOString()
      };
      
      // For regeneration, store the previous version ID
      if (action === 'regenerate' && processedData.previousGeneratedPostId) {
        updateData.previousGeneratedPostId = processedData.previousGeneratedPostId;
      }
      
      await updateDocument(COLLECTION_NAME, docId, updateData);
      logger.info('Content generation completed successfully');
    } else {
      // Handle error case
      await updateDocument(COLLECTION_NAME, docId, {
        status: 'error',
        error: generationResult.error || 'Unknown error during generation',
        errorAt: new Date().toISOString()
      });
      logger.error('Error during content generation:', generationResult.error);
    }
  } else {
    // For deleted posts, we don't generate content
    await updateDocument(COLLECTION_NAME, docId, {
      status: 'completed',
      completedAt: new Date().toISOString(),
      note: 'Post was deleted, no content generation required'
    });
  }
  
  return docId;
};