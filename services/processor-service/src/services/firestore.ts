import { Firestore, CollectionReference } from '@google-cloud/firestore';
import type { DocumentData } from '@google-cloud/firestore';
import dotenv from 'dotenv';
import * as logger from './logger';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config();

// Initialize Firestore
let firestore: Firestore;

/**
 * Check if service account file exists and is readable
 */
const checkServiceAccountFile = (): { exists: boolean; path: string | null; error?: string } => {
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  
  if (!serviceAccountPath) {
    return { exists: false, path: null, error: "GOOGLE_APPLICATION_CREDENTIALS not set" };
  }
  
  try {
    // Check if file exists and is readable
    if (fs.existsSync(serviceAccountPath)) {
      // Optionally validate the file content
      try {
        const content = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
        if (content.type !== 'service_account') {
          return { 
            exists: true, 
            path: serviceAccountPath, 
            error: "File exists but doesn't appear to be a valid service account key file" 
          };
        }
        // Service account file is valid
        return { exists: true, path: serviceAccountPath };
      } catch (parseError) {
        return { 
          exists: true, 
          path: serviceAccountPath, 
          error: `File exists but contains invalid JSON: ${parseError instanceof Error ? parseError.message : String(parseError)}` 
        };
      }
    } else {
      return { 
        exists: false, 
        path: serviceAccountPath, 
        error: `Service account file does not exist at path: ${serviceAccountPath}` 
      };
    }
  } catch (error) {
    return { 
      exists: false, 
      path: serviceAccountPath, 
      error: `Error checking service account file: ${error instanceof Error ? error.message : String(error)}` 
    };
  }
};

try {
  // Check if we're using emulator
  const useEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
  
  if (useEmulator) {
    logger.info(`Using Firestore emulator at: ${process.env.FIRESTORE_EMULATOR_HOST}`);
  }
  
  // Check service account configuration
  const serviceAccountCheck = checkServiceAccountFile();
  if (serviceAccountCheck.exists) {
    logger.info(`Using service account from: ${serviceAccountCheck.path}`);
    if (serviceAccountCheck.error) {
      logger.warn(serviceAccountCheck.error);
    }
  } else {
    if (serviceAccountCheck.error) {
      logger.warn(serviceAccountCheck.error);
    }
    logger.warn('No valid service account file found, Firestore operations may fail');
  }
  
  // Initialize Firestore client with explicit options
  const options: any = {};
  
  // Add project ID if specified
  if (process.env.GCP_PROJECT_ID) {
    options.projectId = process.env.GCP_PROJECT_ID;
    logger.info(`Using project ID from environment: ${options.projectId}`);
  }
  
  // Add credentials path if specified and file exists
  if (serviceAccountCheck.exists) {
    options.keyFilename = serviceAccountCheck.path;
    logger.info(`Using keyFilename: ${options.keyFilename}`);
  }
  
  // Add database ID if specified
  if (process.env.DB_NAME) {
    options.databaseId = process.env.DB_NAME;
    logger.info(`Using database ID from environment: ${options.databaseId}`);
  }
  
  // Log initialization
  logger.info('Initializing Firestore client with options:', {
    ...options,
    // Don't log the actual credentials file path in production
    keyFilename: options.keyFilename ? '[CONFIGURED]' : '[NOT CONFIGURED]'
  });
  
  // Create the Firestore instance
  firestore = new Firestore(options);
  logger.info('Firestore client initialized successfully');
} catch (error) {
  logger.error('Error initializing Firestore client:', error);
  
  // Create a detailed error message
  const errorMessage = `Failed to initialize Firestore: ${error instanceof Error ? error.message : String(error)}`;
  
  // Add environment details to the error for debugging
  const envInfo = {
    GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS || 'not set',
    GCP_PROJECT_ID: process.env.GCP_PROJECT_ID || 'not set',
    FIRESTORE_EMULATOR_HOST: process.env.FIRESTORE_EMULATOR_HOST || 'not set',
    NODE_ENV: process.env.NODE_ENV || 'not set'
  };
  
  logger.error('Environment details:', envInfo);
  
  throw new Error(errorMessage);
}

/**
 * Get a reference to a Firestore collection
 * @param collectionName The name of the collection
 * @returns A reference to the collection
 */
export const getCollection = (collectionName: string): CollectionReference<DocumentData> => {
  try {
    return firestore.collection(collectionName);
  } catch (error) {
    logger.error(`Error getting collection ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Save a document to Firestore
 * @param collectionName The collection to save to
 * @param data The data to save
 * @param id Optional document ID
 * @returns The ID of the saved document
 */
export const saveDocument = async <T extends DocumentData>(
  collectionName: string, 
  data: T, 
  id?: string
): Promise<string> => {
  try {
    logger.info(`Saving document to collection: ${collectionName}${id ? ` with ID: ${id}` : ''}`);
    const collection = getCollection(collectionName);
    
    if (id) {
      await collection.doc(id).set(data, { merge: true });
      logger.info(`Successfully saved document with ID: ${id} to collection: ${collectionName}`);
      return id;
    } else {
      const docRef = await collection.add(data);
      logger.info(`Successfully added document with auto-generated ID: ${docRef.id} to collection: ${collectionName}`);
      return docRef.id;
    }
  } catch (error) {
    logger.error(`Error saving document to ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Get a document from Firestore
 * @param collectionName The collection to get from
 * @param id The document ID
 * @returns The document data
 */
export const getDocument = async <T>(
  collectionName: string, 
  id: string
): Promise<T | null> => {
  try {
    logger.info(`Getting document with ID: ${id} from collection: ${collectionName}`);
    
    // Get a reference to the document
    const docRef = getCollection(collectionName).doc(id);
    
    // Try to get the document with explicit error tracing
    try {
      
      // Capture the current stack trace before the async call
      const stackTraceBeforeGet = new Error('Trace before docRef.get()').stack;
      
      // Create a Promise that wraps docRef.get() with timeouts and additional error handling
      const docPromise = docRef.get();
      
      // Add timeout for debugging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Timeout waiting for docRef.get() after 10 seconds for ID: ${id}`));
        }, 10000); // 10 second timeout
      });
      
      // Race the document fetch against the timeout
      const doc = await Promise.race([docPromise, timeoutPromise]) as FirebaseFirestore.DocumentSnapshot<DocumentData>;
      
      
      // Check if the document exists
      if (!doc.exists) {
        logger.warn(`Document with ID: ${id} does not exist in collection: ${collectionName}`);
        return null;
      }
      
      // Document exists, get the data
      const data = doc.data() as T;
      return data;
    } catch (getError) {
      // Log detailed information about the error
      logger.error(`Error getting document data for ID: ${id} from collection: ${collectionName}:`, getError);
      
      // Capture more details about the error
      const errorDetails = {
        errorType: getError instanceof Error ? getError.constructor.name : typeof getError,
        errorMessage: getError instanceof Error ? getError.message : String(getError),
        errorStack: getError instanceof Error ? getError.stack : 'No stack trace available',
        firebaseErrorCode: (getError as any)?.code,
        contextInfo: {
          collectionName,
          documentId: id,
          timestamp: new Date().toISOString()
        }
      };
      
      logger.error('Detailed error information for debugging:', errorDetails);
      
      // Create a custom error with more context
      const enhancedError = new Error(`Firestore document fetch failed: ${getError instanceof Error ? getError.message : String(getError)}`);
      (enhancedError as any).originalError = getError;
      (enhancedError as any).details = errorDetails;
      
      throw enhancedError;
    }
  } catch (error) {
    logger.error(`Error in getDocument for ID: ${id} from collection: ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Update a document in Firestore
 * @param collectionName The collection to update in
 * @param id The document ID
 * @param data The data to update
 */
export const updateDocument = async <T extends DocumentData>(
  collectionName: string,
  id: string,
  data: Partial<T>
): Promise<void> => {
  try {
    logger.info(`Updating document with ID: ${id} in collection: ${collectionName}`);
    await getCollection(collectionName).doc(id).update(data);
    logger.info(`Successfully updated document with ID: ${id} in collection: ${collectionName}`);
  } catch (error) {
    logger.error(`Error updating document in ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Delete a document from Firestore
 * @param collectionName The collection to delete from
 * @param id The document ID
 */
export const deleteDocument = async (
  collectionName: string,
  id: string
): Promise<void> => {
  try {
    logger.info(`Deleting document with ID: ${id} from collection: ${collectionName}`);
    await getCollection(collectionName).doc(id).delete();
    logger.info(`Successfully deleted document with ID: ${id} from collection: ${collectionName}`);
  } catch (error) {
    logger.error(`Error deleting document from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Query documents from Firestore
 * @param collectionName The collection to query
 * @param field The field to filter on
 * @param operator The comparison operator
 * @param value The value to compare against
 * @returns An array of documents
 */
export const queryDocuments = async <T>(
  collectionName: string,
  field: string,
  operator: FirebaseFirestore.WhereFilterOp,
  value: any
): Promise<T[]> => {
  try {
    logger.info(`Querying documents in collection: ${collectionName} where ${field} ${operator} ${value}`);
    const querySnapshot = await getCollection(collectionName)
      .where(field, operator, value)
      .get();
    
    logger.info(`Query returned ${querySnapshot.docs.length} documents from collection: ${collectionName}`);
    return querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as unknown as T));
  } catch (error) {
    logger.error(`Error querying documents from ${collectionName}:`, error);
    throw error;
  }
};

/**
 * Test the Firestore connection by performing a simple operation
 * @returns Detailed information about the Firestore connection
 */
export const testFirestoreConnection = async (): Promise<{ 
  success: boolean; 
  message: string;
  details?: any;
}> => {
  try {
    logger.info('Testing Firestore connection...');
    
    // Get Firestore settings
    let projectId = "unknown";
    try {
      // @ts-ignore - The _projectId property exists but is not in the type definition
      projectId = firestore._projectId || 
                  process.env.GCP_PROJECT_ID || 
                  "unknown";
    } catch (e) {
      logger.error('Could not get project ID from Firestore instance:', e);
    }
    
    // Create a test collection name with timestamp to avoid conflicts
    const testCollectionName = `firestore_test_${Date.now()}`;
    
    // Try to create a simple document
    const testData = { 
      test: true, 
      timestamp: new Date().toISOString() 
    };
    
    // Start time for performance measurement
    const startTime = Date.now();
    
    // Add the test document
    const testDocRef = await firestore.collection(testCollectionName).add(testData);
    const createTime = Date.now();
    
    
    // Try to read the document
    const docSnapshot = await testDocRef.get();
    const readTime = Date.now();
    
    if (!docSnapshot.exists) {
      logger.error('Test document was not found immediately after creation');
      return { 
        success: false, 
        message: 'Test document was not found immediately after creation. Firestore may have consistency issues.',
        details: {
          projectId,
          testDocId: testDocRef.id,
          createLatency: `${createTime - startTime}ms`,
          document: "Not found"
        }
      };
    }
    
    // Clean up - delete the test document
    await testDocRef.delete();
    const deleteTime = Date.now();
    
    logger.info('Firestore connection test completed successfully');
    
    // Check service account details
    const serviceAccountCheck = checkServiceAccountFile();
    const serviceAccountInfo = {
      configured: serviceAccountCheck.exists,
      path: serviceAccountCheck.path ? `...${serviceAccountCheck.path.substring(Math.max(0, serviceAccountCheck.path.length - 20))}` : null,
      error: serviceAccountCheck.error || null
    };
    
    return { 
      success: true, 
      message: 'Firestore connection is working properly',
      details: {
        projectId,
        testDocId: testDocRef.id,
        serviceAccountInfo,
        testDocument: docSnapshot.data(),
        performance: {
          createLatency: `${createTime - startTime}ms`,
          readLatency: `${readTime - createTime}ms`,
          deleteLatency: `${deleteTime - readTime}ms`,
          totalTime: `${deleteTime - startTime}ms`
        }
      }
    };
  } catch (error) {
    logger.error('Error testing Firestore connection:', error);
    
    // Try to get more information about the error
    const errorDetails = {
      type: error instanceof Error ? error.constructor.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      errorCode: (error as any)?.code || 'unknown',
      errorDetails: (error as any)?.details || undefined,
    };
    
    const serviceAccountCheck = checkServiceAccountFile();
    
    return { 
      success: false, 
      message: `Firestore connection test failed: ${error instanceof Error ? error.message : String(error)}`,
      details: {
        errorInfo: errorDetails,
        projectId: process.env.GCP_PROJECT_ID || "unset",
        serviceAccountInfo: {
          configured: serviceAccountCheck.exists,
          path: serviceAccountCheck.path ? `...${serviceAccountCheck.path.substring(Math.max(0, serviceAccountCheck.path.length - 20))}` : null,
          error: serviceAccountCheck.error || null
        }
      }
    };
  }
};

/**
 * Raw document fetch function that directly calls docRef.get() with minimal wrapping
 * Intended for debugging the exact point of failure
 * 
 * @param collectionName Collection to fetch from
 * @param id Document ID
 * @returns The raw document snapshot
 */
export const rawDocumentFetch = async (
  collectionName: string,
  id: string
): Promise<any> => {
  logger.info(`RAW FETCH: Starting raw document fetch for ID: ${id} from collection: ${collectionName}`);
  
  try {
    // Get the document reference
    const docRef = firestore.collection(collectionName).doc(id);
    const result = await docRef.get();
    
    return {
      success: true,
      exists: result.exists,
      data: result.exists ? result.data() : null,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    logger.error(`RAW FETCH: Error in raw document fetch:`, error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      errorObject: error,
      timestamp: new Date().toISOString()
    };
  }
};

/**
 * Test function that creates a completely new Firestore instance
 * and tries to fetch a document - useful for debugging initialization issues
 */
export const testAlternativeFirestoreInstance = async (
  collectionName: string,
  id: string
): Promise<any> => {
  try {
    logger.info(`Creating a fresh Firestore instance for debugging`);
    
    // Check service account configuration
    const serviceAccountCheck = checkServiceAccountFile();
    if (serviceAccountCheck.exists) {
      logger.info(`Alternative instance using service account from: ${serviceAccountCheck.path}`);
    } else {
      logger.warn(`Alternative instance: ${serviceAccountCheck.error || 'No service account file configured'}`);
    }
    
    // Create a completely new Firestore instance with explicit settings
    const options: any = {
      projectId: process.env.GCP_PROJECT_ID || undefined,
    };
    
    // Add credentials path if specified and file exists
    if (serviceAccountCheck.exists) {
      options.keyFilename = serviceAccountCheck.path;
    }
    
    logger.info(`Initializing alternative Firestore instance with options:`, {
      ...options,
      keyFilename: options.keyFilename ? '[CONFIGURED]' : '[NOT CONFIGURED]'
    });
    
    // Create the instance
    const alternativeFirestore = new Firestore(options);
    
    // Attempt to fetch a document
    const docRef = alternativeFirestore.collection(collectionName).doc(id);
    
    const doc = await docRef.get();
    
    // Return result
    return {
      success: true,
      exists: doc.exists,
      data: doc.exists ? doc.data() : null,
      instanceDetails: {
        projectId: options.projectId || 'unknown',
        serviceAccount: serviceAccountCheck.exists ? 'configured' : 'not configured',
        options: {
          ...options,
          keyFilename: options.keyFilename ? '[CONFIGURED]' : '[NOT CONFIGURED]'
        }
      }
    };
  } catch (error) {
    logger.error(`Error with alternative Firestore instance:`, error);
    
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      errorType: error instanceof Error ? error.constructor.name : typeof error,
      errorStack: error instanceof Error ? error.stack : 'No stack available'
    };
  } finally {
    // Clean up any resources if needed
    logger.info(`Alternative Firestore instance test completed`);
    }
}; 