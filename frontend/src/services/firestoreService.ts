import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  getDoc, 
  getDocs, 
  serverTimestamp,
  onSnapshot,
  type Unsubscribe
} from 'firebase/firestore';
import { db } from './firebase';

export interface BlogPost {
  id?: string;
  title: string;
  content: string;
  keywords: string[];
  focus: string;
  imageUrl?: string;
  author?: string;
  createdAt?: any;
  updatedAt?: any;
  [key: string]: any;
}

export interface GeneratedPostSection {
  subtitle: string;
  content: string;
}

export interface GeneratedPost {
  id?: string;
  title: string;
  sections?: GeneratedPostSection[];
  generatedContent?: string;
  originalContent?: string;
  originalPostId?: string;
  status?: string;
  generatedAt?: string;
  [key: string]: any;
}

// Add the AcceptedPost interface
export interface AcceptedPost {
  id?: string;
  title: string;
  sections?: GeneratedPostSection[];
  generatedContent?: string; // Store the structured content as a string
  originalContent?: string;
  originalPostId?: string;
  status?: 'accepted'; // Status is likely always 'accepted'
  generatedAt?: any; // Timestamp from original generation
  acceptedAt?: any; // Timestamp when accepted
  [key: string]: any;
}

class FirestoreService {
  private readonly collectionName = 'posts';
  private readonly generatedPostsCollection = 'generated_posts';
  private readonly acceptedPostsCollection = 'accepted_posts';

  /**
   * Create a new blog post in Firestore
   */
  async createPost(post: BlogPost): Promise<string> {
    try {
      const postData = {
        ...post,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      };

      const docRef = await addDoc(collection(db, this.collectionName), postData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating post:', error);
      throw error;
    }
  }

  /**
   * Update an existing blog post with image URL
   */
  async updatePostWithImage(postId: string, imageUrl: string): Promise<void> {
    try {
      const postRef = doc(db, this.collectionName, postId);
      await updateDoc(postRef, { 
        imageUrl,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating post with image:', error);
      throw error;
    }
  }

  /**
   * Get all posts
   */
  async getPosts(): Promise<BlogPost[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.collectionName));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as BlogPost
      }));
    } catch (error) {
      console.error('Error getting posts:', error);
      throw error;
    }
  }

  /**
   * Get a post by ID
   */
  async getPostById(postId: string): Promise<BlogPost | null> {
    try {
      const docRef = doc(db, this.collectionName, postId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        return {
          id: docSnap.id,
          ...docSnap.data() as BlogPost
        };
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting post by ID:', error);
      throw error;
    }
  }

  /**
   * Delete a post
   */
  async deletePost(postId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, postId));
    } catch (error) {
      console.error('Error deleting post:', error);
      throw error;
    }
  }

  /**
   * Get all generated posts
   */
  async getGeneratedPosts(): Promise<GeneratedPost[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.generatedPostsCollection));
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data() as GeneratedPost
      }));
    } catch (error) {
      console.error('Error getting generated posts:', error);
      throw error;
    }
  }

  /**
   * Get a generated post by ID
   */
  async getGeneratedPostById(postId: string): Promise<GeneratedPost | null> {
    try {
      // First try to get from generated posts
      const generatedDocRef = doc(db, this.generatedPostsCollection, postId);
      const generatedDocSnap = await getDoc(generatedDocRef);
      
      if (generatedDocSnap.exists()) {
        const data = generatedDocSnap.data() as GeneratedPost;
        const result: GeneratedPost = {
          id: generatedDocSnap.id,
          ...data
        };
        
        // Parse the generatedContent JSON string if it exists
        if (result.generatedContent) {
          try {
            const parsedContent = JSON.parse(result.generatedContent);
            if (parsedContent.title) {
              result.title = parsedContent.title;
            }
            if (parsedContent.sections && Array.isArray(parsedContent.sections)) {
              result.sections = parsedContent.sections;
            }
          } catch (parseError) {
            console.error('Error parsing generatedContent:', parseError);
          }
        }
        
        return result;
      }

      // If not found in generated posts, try accepted posts
      const acceptedDocRef = doc(db, this.acceptedPostsCollection, postId);
      const acceptedDocSnap = await getDoc(acceptedDocRef);
      
      if (acceptedDocSnap.exists()) {
        const data = acceptedDocSnap.data() as GeneratedPost;
        const result: GeneratedPost = {
          id: acceptedDocSnap.id,
          ...data
        };
        
        // Parse the generatedContent JSON string if it exists
        if (result.generatedContent) {
          try {
            const parsedContent = JSON.parse(result.generatedContent);
            if (parsedContent.title) {
              result.title = parsedContent.title;
            }
            if (parsedContent.sections && Array.isArray(parsedContent.sections)) {
              result.sections = parsedContent.sections;
            }
          } catch (parseError) {
            console.error('Error parsing generatedContent:', parseError);
          }
        }
        
        return result;
      }

      return null;
    } catch (error) {
      console.error('Error getting post by ID:', error);
      throw error;
    }
  }

  /**
   * Get an accepted post by ID
   */
  async getAcceptedPostById(postId: string): Promise<AcceptedPost | null> {
    try {
      const docRef = doc(db, this.acceptedPostsCollection, postId);
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        const data = docSnap.data() as AcceptedPost;
        const result: AcceptedPost = {
          id: docSnap.id,
          ...data
        };

        // Parse the generatedContent JSON string if it exists
        // (Similar logic as in getGeneratedPostById)
        if (result.generatedContent) {
          try {
            const parsedContent = JSON.parse(result.generatedContent);
            if (parsedContent.title) {
              result.title = parsedContent.title;
            }
            if (parsedContent.sections && Array.isArray(parsedContent.sections)) {
              result.sections = parsedContent.sections;
            }
          } catch (parseError) {
            console.error('Error parsing generatedContent in accepted post:', parseError);
            // Decide if you want to clear fields or leave as is
          }
        }

        return result;
      } else {
        return null;
      }
    } catch (error) {
      console.error('Error getting accepted post by ID:', error);
      throw error;
    }
  }

  /**
   * Save a generated post as accepted and delete the original generated post
   */
  async acceptPost(post: GeneratedPost): Promise<string> {
    if (!post.id) {
      throw new Error("Cannot accept a post without an ID.");
    }

    const originalPostId = post.id;

    try {
      // Create the generatedContent JSON string with the current content
      const generatedContent = {
        title: post.title,
        sections: post.sections
      };
      
      const acceptedPostData = {
        ...post,
        generatedContent: JSON.stringify(generatedContent),
        acceptedAt: serverTimestamp(),
        status: 'accepted'
      };
      
      // Remove the id field as Firestore will generate a new one
      if (acceptedPostData.id) {
        delete acceptedPostData.id;
      }
      
      const docRef = await addDoc(collection(db, this.acceptedPostsCollection), acceptedPostData);
      const newAcceptedPostId = docRef.id;

      // Now, delete the original post from generated_posts
      try {
        const originalPostRef = doc(db, this.generatedPostsCollection, originalPostId);
        await deleteDoc(originalPostRef);
      } catch (deleteError) {
        console.error(`Error deleting original generated post ${originalPostId}:`, deleteError);
        // Decide how to handle this: Maybe log it, maybe throw an error, 
        // maybe try to delete the just-created accepted post for consistency?
        // For now, we'll log the error but still return the new ID.
      }

      return newAcceptedPostId; // Return the ID of the newly created accepted post
    } catch (error) {
      console.error('Error accepting post:', error);
      throw error;
    }
  }

  /**
   * Get all accepted posts
   */
  async getAcceptedPosts(): Promise<GeneratedPost[]> {
    try {
      const querySnapshot = await getDocs(collection(db, this.acceptedPostsCollection));
      return querySnapshot.docs.map(doc => {
        const data = doc.data() as GeneratedPost;
        const result: GeneratedPost = {
          id: doc.id,
          ...data
        };
        
        // Parse the generatedContent JSON string if it exists
        if (result.generatedContent) {
          try {
            const parsedContent = JSON.parse(result.generatedContent);
            // Only update title and sections if they exist in parsedContent
            if (parsedContent.title) {
              result.title = parsedContent.title;
            }
            if (parsedContent.sections && Array.isArray(parsedContent.sections)) {
              result.sections = parsedContent.sections;
            }
          } catch (parseError) {
            console.error('Error parsing generatedContent:', parseError);
          }
        }
        
        // Ensure we have at least the basic structure
        if (!result.sections) {
          result.sections = [];
        }
        
        return result;
      });
    } catch (error) {
      console.error('Error getting accepted posts:', error);
      throw error;
    }
  }

  /**
   * Update a generated post
   */
  async updateGeneratedPost(postId: string, updatedPost: GeneratedPost): Promise<void> {
    try {
      const postRef = doc(db, this.generatedPostsCollection, postId);
      
      // Remove the id field as it's not needed in the document
      const { ...postData } = updatedPost;
      
      // Create the generatedContent JSON string with the updated content
      const generatedContent = {
        title: postData.title,
        sections: postData.sections
      };
      
      await updateDoc(postRef, {
        ...postData,
        generatedContent: JSON.stringify(generatedContent),
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating generated post:', error);
      throw error;
    }
  }

  /**
   * Delete a generated post by ID
   */
  async deleteGeneratedPost(postId: string): Promise<void> {
    try {
      const docRef = doc(db, this.generatedPostsCollection, postId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting generated post ${postId}:`, error);
      throw error;
    }
  }

  /**
   * Delete an accepted post by ID
   */
  async deleteAcceptedPost(postId: string): Promise<void> {
    try {
      const docRef = doc(db, this.acceptedPostsCollection, postId);
      await deleteDoc(docRef);
    } catch (error) {
      console.error(`Error deleting accepted post ${postId}:`, error);
      throw error;
    }
  }

  /**
   * Subscribe to changes in the generated posts collection
   * Returns an unsubscribe function that should be called when no longer needed
   */
  subscribeToGeneratedPosts(callback: (posts: GeneratedPost[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, this.generatedPostsCollection), 
      (snapshot) => {
        const posts = snapshot.docs.map(doc => {
          const data = doc.data() as GeneratedPost;
          const result: GeneratedPost = {
            id: doc.id,
            ...data
          };
          
          // Parse the generatedContent JSON string if it exists
          if (result.generatedContent) {
            try {
              const parsedContent = JSON.parse(result.generatedContent);
              if (parsedContent.title) {
                result.title = parsedContent.title;
              }
              if (parsedContent.sections && Array.isArray(parsedContent.sections)) {
                result.sections = parsedContent.sections;
              }
            } catch (parseError) {
              console.error('Error parsing generatedContent:', parseError);
            }
          }
          
          return result;
        });
        
        callback(posts);
      },
      (error) => {
        console.error('Error listening to generated posts collection:', error);
      }
    );
  }

  /**
   * Subscribe to changes in the accepted posts collection
   * Returns an unsubscribe function that should be called when no longer needed
   */
  subscribeToAcceptedPosts(callback: (posts: GeneratedPost[]) => void): Unsubscribe {
    return onSnapshot(
      collection(db, this.acceptedPostsCollection), 
      (snapshot) => {
        const posts = snapshot.docs.map(doc => {
          const data = doc.data() as GeneratedPost;
          const result: GeneratedPost = {
            id: doc.id,
            ...data
          };
          
          // Parse the generatedContent JSON string if it exists
          if (result.generatedContent) {
            try {
              const parsedContent = JSON.parse(result.generatedContent);
              if (parsedContent.title) {
                result.title = parsedContent.title;
              }
              if (parsedContent.sections && Array.isArray(parsedContent.sections)) {
                result.sections = parsedContent.sections;
              }
            } catch (parseError) {
              console.error('Error parsing generatedContent:', parseError);
            }
          }
          
          // Ensure we have at least the basic structure
          if (!result.sections) {
            result.sections = [];
          }
          
          return result;
        });
        
        callback(posts);
      },
      (error) => {
        console.error('Error listening to accepted posts collection:', error);
      }
    );
  }
}

export default new FirestoreService(); 