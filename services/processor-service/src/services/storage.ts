import { Storage } from '@google-cloud/storage';
import { Readable } from 'stream';
import dotenv from 'dotenv';

dotenv.config();

const storage = new Storage();
const bucketName = process.env.GCP_STORAGE_BUCKET || 'default-bucket';
const bucket = storage.bucket(bucketName);

/**
 * Upload a file to Google Cloud Storage
 * @param filename The name to save the file as
 * @param file The file buffer or stream to upload
 * @returns The public URL of the uploaded file
 */
export const uploadFile = async (
  filename: string, 
  file: Buffer | Readable
): Promise<string> => {
  try {
    const blob = bucket.file(filename);
    
    if (Buffer.isBuffer(file)) {
      await blob.save(file);
    } else {
      // If it's a stream
      return new Promise((resolve, reject) => {
        const blobStream = blob.createWriteStream({
          resumable: false,
        });

        blobStream.on('error', (err) => {
          reject(err);
        });

        blobStream.on('finish', () => {
          const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
          resolve(publicUrl);
        });

        file.pipe(blobStream);
      });
    }
    
    // Generate a public URL for direct access
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
    return publicUrl;
  } catch (error) {
    console.error('Error uploading file to GCS:', error);
    throw error;
  }
};

/**
 * Download a file from Google Cloud Storage
 * @param filename The name of the file to download
 * @returns The file buffer
 */
export const downloadFile = async (filename: string): Promise<Buffer> => {
  try {
    const [fileContents] = await bucket.file(filename).download();
    return fileContents;
  } catch (error) {
    console.error('Error downloading file from GCS:', error);
    throw error;
  }
};

/**
 * Delete a file from Google Cloud Storage
 * @param filename The name of the file to delete
 */
export const deleteFile = async (filename: string): Promise<void> => {
  try {
    await bucket.file(filename).delete();
    console.log(`File ${filename} deleted from ${bucketName}`);
  } catch (error) {
    console.error('Error deleting file from GCS:', error);
    throw error;
  }
};

/**
 * List files in a Google Cloud Storage bucket
 * @param prefix Optional prefix to filter files by
 * @returns Array of file names
 */
export const listFiles = async (prefix?: string): Promise<string[]> => {
  try {
    const options = prefix ? { prefix } : {};
    const [files] = await bucket.getFiles(options);
    return files.map((file) => file.name);
  } catch (error) {
    console.error('Error listing files from GCS:', error);
    throw error;
  }
}; 