import firestoreService, { BlogPost } from './firestoreService';
import storageService from './storageService';
import pubSubService from './pubSubService';

class DataHandler {
  /**
   * Create a new blog post with an image
   * @param post Blog post data
   * @param imageFile Optional image file
   */
  async createPostWithImage(post: BlogPost, imageFile?: File): Promise<string> {
    try {
      // 1. First create the blog post in Firestore
      const postId = await firestoreService.createPost(post);
      
      // 2. If there's an image, upload it to Cloud Storage
      if (imageFile) {
        const imageUrl = await storageService.uploadImage(imageFile);
        
        // 3. Update the post with the image URL
        await firestoreService.updatePostWithImage(postId, imageUrl);
        
        // Use the updated post data with image URL
        post = { ...post, id: postId, imageUrl };
      } else {
        post = { ...post, id: postId };
      }
      
      // 4. Publish an event to Pub/Sub to trigger processing
      await pubSubService.publishPostCreated(postId, post);
      
      return postId;
    } catch (error) {
      console.error('Error in createPostWithImage:', error);
      throw error;
    }
  }

  /**
   * Create a new blog post with a base64 image
   * @param post Blog post data
   * @param base64Image Base64 encoded image
   * @param fileName Image file name
   */
  async createPostWithBase64Image(post: BlogPost, base64Image: string, fileName: string): Promise<string> {
    try {
      // 1. First create the blog post in Firestore
      const postId = await firestoreService.createPost(post);
      
      // 2. Upload the base64 image to Cloud Storage
      const imageUrl = await storageService.uploadBase64Image(base64Image, fileName);
      
      // 3. Update the post with the image URL
      await firestoreService.updatePostWithImage(postId, imageUrl);
      
      // 4. Publish an event to Pub/Sub to trigger processing
      const updatedPost = { ...post, id: postId, imageUrl };
      await pubSubService.publishPostCreated(postId, updatedPost);
      
      return postId;
    } catch (error) {
      console.error('Error in createPostWithBase64Image:', error);
      throw error;
    }
  }

  /**
   * Delete a blog post and its associated image
   * @param postId The ID of the post to delete
   */
  async deletePostWithImage(postId: string): Promise<void> {
    try {
      // 1. Get the post to check if it has an image
      const post = await firestoreService.getPostById(postId);
      
      if (!post) {
        throw new Error(`Post with ID ${postId} not found`);
      }
      
      // 2. If there's an image URL, delete the image from Storage
      if (post.imageUrl) {
        await storageService.deleteImage(post.imageUrl);
      }
      
      // 3. Delete the post from Firestore
      await firestoreService.deletePost(postId);
      
      // 4. Publish an event to Pub/Sub
      await pubSubService.publishPostDeleted(postId);
    } catch (error) {
      console.error('Error in deletePostWithImage:', error);
      throw error;
    }
  }

  /**
   * Get all blog posts
   */
  async getAllPosts(): Promise<BlogPost[]> {
    try {
      return await firestoreService.getPosts();
    } catch (error) {
      console.error('Error in getAllPosts:', error);
      throw error;
    }
  }

  /**
   * Get a blog post by ID
   * @param postId The ID of the post to get
   */
  async getPostById(postId: string): Promise<BlogPost | null> {
    try {
      return await firestoreService.getPostById(postId);
    } catch (error) {
      console.error('Error in getPostById:', error);
      throw error;
    }
  }
}

export default new DataHandler(); 