import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from './firebase';

class StorageService {
  private readonly storagePath = 'blog-images';

  /**
   * Upload an image to Firebase Storage
   * @param file The file to upload
   * @param customFileName Optional custom file name
   * @returns URL of the uploaded image
   */
  async uploadImage(file: File, customFileName?: string): Promise<string> {
    try {
      // Create a unique filename if not provided
      const fileName = customFileName || `${Date.now()}-${file.name}`;
      const storageRef = ref(storage, `${this.storagePath}/${fileName}`);
      
      // Upload the file
      const snapshot = await uploadBytes(storageRef, file);
      
      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      
      return downloadURL;
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }

  /**
   * Delete an image from Firebase Storage
   * @param imageUrl The URL of the image to delete
   */
  async deleteImage(imageUrl: string): Promise<void> {
    try {
      // Extract the path from the URL
      const urlObj = new URL(imageUrl);
      const path = urlObj.pathname;
      
      // Get the reference to the file
      const imageRef = ref(storage, path);
      
      // Delete the file
      await deleteObject(imageRef);
    } catch (error) {
      console.error('Error deleting image:', error);
      throw error;
    }
  }

  /**
   * Upload a base64 image
   * @param base64Data The base64 data string
   * @param fileName The file name to use
   * @returns URL of the uploaded image
   */
  async uploadBase64Image(base64Data: string, fileName: string): Promise<string> {
    try {
      // Remove the data:image/jpeg;base64, part
      const base64Content = base64Data.split(',')[1];
      
      // Convert base64 to blob
      const byteCharacters = atob(base64Content);
      const byteArrays = [];
      
      for (let offset = 0; offset < byteCharacters.length; offset += 512) {
        const slice = byteCharacters.slice(offset, offset + 512);
        
        const byteNumbers = new Array(slice.length);
        for (let i = 0; i < slice.length; i++) {
          byteNumbers[i] = slice.charCodeAt(i);
        }
        
        const byteArray = new Uint8Array(byteNumbers);
        byteArrays.push(byteArray);
      }
      
      const blob = new Blob(byteArrays, { type: 'image/jpeg' });
      const file = new File([blob], fileName, { type: 'image/jpeg' });
      
      return this.uploadImage(file);
    } catch (error) {
      console.error('Error uploading base64 image:', error);
      throw error;
    }
  }
}

export default new StorageService(); 