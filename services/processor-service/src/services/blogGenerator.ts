import { generateContent } from './openai';
import { saveDocument, updateDocument, getDocument } from './firestore';
import * as logger from './logger';
import { GENERATED_POSTS_COLLECTION_NAME, BlogPostData } from '../controllers/messageProcessor';

// Define the collection name for storing generated blog posts
// const GENERATED_POSTS_COLLECTION = 'generated_posts'; // Removed since we're using the imported constant

/**
 * Interface for a generated blog post stored in Firestore
 */
interface GeneratedPost {
  originalPostId: string;
  title: string;
  originalContent: string;
  keywords: string[];
  focus: string;
  generatedContent: string;
  generatedAt: string;
  status: 'generated' | 'error';
  previousGeneration?: {
    content: string;
    generatedAt: string;
  };
  [key: string]: any;
}

/**
 * Interface for the input to the blog generation service
 */
interface BlogGenerationInput {
  postId: string;
  data: BlogPostData;
  additionalContext?: string;
}

/**
 * Interface for the output of the blog generation service
 */
interface BlogGenerationOutput {
  originalPostId: string;
  title: string;
  originalContent: string;
  generatedContent: string;
  generatedAt: string;
  generatedPostId: string;
  status: 'generated' | 'error';
  error?: string;
}

/**
 * Service to generate a blog post using AI and store it in the database
 * 
 * @param input The blog post data and context
 * @returns The generated blog post data
 */
export const generateBlogPost = async (
  input: BlogGenerationInput
): Promise<BlogGenerationOutput> => {
  const { postId, data, additionalContext } = input;
  
  try {
    logger.info('Generating blog post content with AI...', { 
      postId, 
      title: data.title || '[No title provided]',
      isRegeneration: !!data.previousGeneration
    });

    // Ensure we have a title before proceeding (fallback if somehow we still don't have one)
    if (!data.title) {
      data.title = `Generated content for ${postId} at ${new Date().toISOString()}`;
      logger.warn(`No title provided for generation, using fallback title: "${data.title}"`);
    }

    // Generate content using OpenAI
    const generatedContent = await generateContent(data, additionalContext);
    
    // Create the generated post object
    const generatedPost: GeneratedPost = {
      originalPostId: postId,
      title: data.title,
      originalContent: data.originalContent || '',
      keywords: data.keywords || [],
      focus: data.focus || '',
      generatedContent,
      generatedAt: new Date().toISOString(),
      status: 'generated'
    };

    // If this is a regeneration, include information about the previous version
    if (data.previousGeneration) {
      generatedPost.previousGeneration = {
        content: data.previousGeneration.content,
        generatedAt: data.previousGeneration.generatedAt
      };
      
      logger.info('Including previous generation information in the generated post');
    }
    
    // Use the original postId as the document ID
    logger.info(`Using postId as document ID: ${postId}`);
    
    // Save the generated post to Firestore
    await saveDocument(
      GENERATED_POSTS_COLLECTION_NAME, 
      generatedPost, 
      postId
    );
    
    logger.info(`Saved generated post to Firestore with ID: ${postId}`);
    
    // Return the output with the generated content and metadata
    return {
      originalPostId: postId,
      title: data.title,
      originalContent: data.content,
      generatedContent,
      generatedAt: new Date().toISOString(),
      generatedPostId: postId, // Use the same postId here
      status: 'generated'
    };
  } catch (error: any) {
    logger.error('Error during blog post generation:', error);
    
    // Return error information
    return {
      originalPostId: postId,
      title: data.title || `Error generating content for ${postId}`,
      originalContent: data.content || '',
      generatedContent: '',
      generatedAt: new Date().toISOString(),
      generatedPostId: '',
      status: 'error',
      error: error.message
    };
  }
}; 