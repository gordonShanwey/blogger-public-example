import express, { Router, Request, Response } from 'express';
import { getProcessedMessage, processMessage, BlogPostData } from '../controllers/messageProcessor';
import { generateBlogPost } from '../services/blogGenerator';
import * as logger from '../services/logger';
import { 
  testFirestoreConnection, 
  getDocument, 
  saveDocument, 
  rawDocumentFetch,
  testAlternativeFirestoreInstance
} from '../services/firestore';

const router: Router = express.Router();

// Example route
router.get('/hello', (req: Request, res: Response) => {
  res.json({ message: 'Hello from GCP Express API!' });
});

// Get a processed message by ID
router.get('/messages/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    logger.info(`Retrieving message with ID: ${id}`);
    
    const message = await getProcessedMessage(id);
    
    if (!message) {
      logger.warn(`Message not found: ${id}`);
      return res.status(404).json({ message: 'Message not found' });
    }
    
    logger.info(`Successfully retrieved message: ${id}`);
    res.json(message);
  } catch (error: any) {
    logger.error('Error retrieving message:', error);
    res.status(500).json({ message: 'Error retrieving message' });
  }
});

// Test route for blog post generation
router.post('/generate-blog', async (req: Request, res: Response) => {
  try {
    const { title, content, postId, keywords, focus } = req.body;
    
    if (!title || !content || !postId) {
      logger.warn('Missing required fields in generate-blog request', req.body);
      return res.status(400).json({ 
        message: 'Missing required fields', 
        required: ['title', 'content', 'postId'] 
      });
    }
    
    logger.info(`Generating blog for post: ${postId}`, { title });
    
    // Prepare test data
    const testData: BlogPostData = {
      id: postId,
      title,
      content,
      keywords: keywords || [],
      focus: focus || ''
    };
    
    // Call the blog generation service
    const result = await generateBlogPost({
      postId,
      data: testData,
      additionalContext: 'This is a test blog post generation.'
    });
    
    logger.info(`Blog generation completed for post: ${postId}`, {
      status: result.status,
      generatedPostId: result.generatedPostId
    });
    
    res.status(200).json(result);
  } catch (error: any) {
    logger.error('Error generating blog post:', error);
    res.status(500).json({ 
      message: 'Error generating blog post', 
      error: error.message 
    });
  }
});

// Test route to simulate how Pub/Sub sends messages
router.post('/test-pubsub', async (req: Request, res: Response) => {
  try {
    // Get the raw blog post data from the request
    const { title, content, postId, keywords, focus } = req.body;
    
    if (!title || !content || !postId) {
      logger.warn('Missing required fields in test-pubsub request', req.body);
      return res.status(400).json({ 
        message: 'Missing required fields', 
        required: ['title', 'content', 'postId'] 
      });
    }
    
    logger.info(`Creating test Pub/Sub message for post: ${postId}`, { title });
    
    // Create a blog post message
    const blogPostMessage = {
      postId,
      action: 'created',
      timestamp: Date.now(),
      data: {
        id: postId,
        title,
        content,
        keywords: keywords || [],
        focus: focus || ''
      }
    };
    
    // Convert to JSON string
    const messageString = JSON.stringify(blogPostMessage);
    
    // Convert to base64 as Pub/Sub would do
    const base64Message = Buffer.from(messageString).toString('base64');
    
    // Create a mock Pub/Sub message format
    const pubSubMessage = {
      message: {
        data: base64Message,
        messageId: `test-${Date.now()}`,
        publishTime: new Date().toISOString()
      },
      subscription: 'test-subscription'
    };
    
    
    // Process the message as if it came from Pub/Sub
    const result = await processMessage(pubSubMessage.message);
    
    logger.info(`Successfully processed test Pub/Sub message: ${postId}`, { docId: result });
    
    res.status(200).json({
      message: 'Message processed successfully',
      docId: result,
      originalMessage: blogPostMessage
    });
  } catch (error: any) {
    logger.error('Error processing test Pub/Sub message:', error);
    res.status(500).json({ 
      message: 'Error processing message', 
      error: error.message 
    });
  }
});

// Test route for direct JSON message processing
router.post('/process-json', async (req: Request, res: Response) => {
  try {
    // Get the raw JSON data from the request body
    const rawJson = req.body;
    
    if (!rawJson) {
      logger.warn('Received empty request body');
      return res.status(400).json({ 
        message: 'Missing JSON body' 
      });
    }
    
    // Convert to string if it's an object
    const messageData = typeof rawJson === 'object' 
      ? JSON.stringify(rawJson) 
      : rawJson;
    
    logger.info('Processing raw JSON message', { 
      messageType: typeof rawJson,
      messageLength: typeof messageData === 'string' ? messageData.length : 0
    });
    
    // Process the message directly
    const result = await processMessage(messageData);
    
    logger.info('Successfully processed JSON message', { docId: result });
    
    res.status(200).json({
      message: 'Successfully processed JSON message',
      docId: result
    });
  } catch (error: any) {
    logger.error('Error processing JSON message:', error);
    res.status(500).json({ 
      message: 'Error processing JSON message', 
      error: error.message 
    });
  }
});

// Route to test Firestore connection
router.get('/test-firestore', async (req: Request, res: Response) => {
  try {
    logger.info('Received request to test Firestore connection');
    
    const result = await testFirestoreConnection();
    
    if (result.success) {
      logger.info('Firestore connection test successful');
      res.status(200).json({
        status: 'success',
        message: result.message,
        details: result.details
      });
    } else {
      logger.error('Firestore connection test failed:', result.message);
      res.status(500).json({
        status: 'error',
        message: result.message,
        details: result.details
      });
    }
  } catch (error: any) {
    logger.error('Error testing Firestore connection:', error);
    res.status(500).json({
      status: 'error',
      message: `Error testing Firestore connection: ${error.message}`
    });
  }
});

// Route to check Firestore configuration
router.get('/check-firestore-config', async (req: Request, res: Response) => {
  try {
    logger.info('Checking Firestore configuration');
    
    // Check for required environment variables
    const config = {
      projectId: process.env.GCP_PROJECT_ID || null,
      credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS || null,
      firestoreEmulator: process.env.FIRESTORE_EMULATOR_HOST || null,
      env: process.env.NODE_ENV || 'development'
    };
    
    // Check if credentials file exists
    let credentialsFileExists = false;
    let usingADC = true;
    
    if (config.credentials) {
      try {
        const fs = require('fs');
        credentialsFileExists = fs.existsSync(config.credentials);
        usingADC = !credentialsFileExists;
      } catch (error) {
        logger.error('Error checking credentials file:', error);
        credentialsFileExists = false;
        usingADC = true;
      }
    }
    
    // Check for Google Cloud SDK
    let gcloudSDKInstalled = false;
    try {
      const { execSync } = require('child_process');
      // Try to run gcloud --version
      const result = execSync('gcloud --version', { stdio: 'ignore' });
      gcloudSDKInstalled = true;
    } catch (error) {
      gcloudSDKInstalled = false;
    }
    
    // Check if running in a Google Cloud environment
    const possiblyRunningInGCP = process.env.KUBERNETES_SERVICE_HOST || // GKE
      process.env.FUNCTION_NAME || // Cloud Functions
      process.env.K_SERVICE; // Cloud Run
    
    // Create a sanitized response with information about the config
    const configCheck = {
      projectIdSet: !!config.projectId,
      credentialsPathSet: !!config.credentials,
      credentialsFileExists,
      usingFirestoreEmulator: !!config.firestoreEmulator,
      environment: config.env,
      usingADC,
      adcSources: {
        explicitCredentialsFile: credentialsFileExists,
        gcloudSDKInstalled,
        runningInGCP: !!possiblyRunningInGCP,
        gcloudDetails: gcloudSDKInstalled ? "Google Cloud SDK is installed and might provide credentials" : "Google Cloud SDK not found"
      },
      // Do not include actual credentials
      credentialsPath: config.credentials ? 
        `...${config.credentials.substring(Math.max(0, config.credentials.length - 20))}` : null,
    };
    
    // Check for ADC warnings
    const warnings = [];
    
    if (usingADC && !gcloudSDKInstalled && !possiblyRunningInGCP) {
      warnings.push("Using ADC but no credential sources detected. Authentication might fail.");
    }
    
    if (!config.projectId && !credentialsFileExists) {
      warnings.push("No project ID specified and no credentials file found. Default project might not be available.");
    }
    
    res.status(200).json({
      status: 'success',
      config: configCheck,
      warnings: warnings.length > 0 ? warnings : null,
      message: 'Firestore configuration check completed'
    });
  } catch (error: any) {
    logger.error('Error checking Firestore configuration:', error);
    res.status(500).json({
      status: 'error',
      message: `Error checking Firestore configuration: ${error.message}`
    });
  }
});

// Route to provide guidance on setting up ADC
router.get('/adc-help', async (req: Request, res: Response) => {
  try {
    logger.info('Received request for ADC help information');
    
    // Check if running in a Google Cloud environment
    const isGCPEnvironment = !!(
      process.env.KUBERNETES_SERVICE_HOST || // GKE
      process.env.FUNCTION_NAME || // Cloud Functions
      process.env.K_SERVICE // Cloud Run
    );
    
    // Check for Google Cloud SDK
    let gcloudInfo = null;
    try {
      const { execSync } = require('child_process');
      // Try to run gcloud info --format=json
      const gcloudResult = execSync('gcloud info --format=json', { encoding: 'utf8' });
      gcloudInfo = JSON.parse(gcloudResult);
    } catch (error) {
      logger.error('Error getting gcloud info:', error);
    }
    
    // Get currently active account if any
    let activeAccount = null;
    try {
      const { execSync } = require('child_process');
      activeAccount = execSync('gcloud config get-value account', { encoding: 'utf8' }).trim();
      if (activeAccount === '(unset)') {
        activeAccount = null;
      }
    } catch (error) {
      logger.error('Error getting active gcloud account:', error);
    }
    
    // Build the response
    const adcInfo = {
      currentEnvironment: {
        isGCPEnvironment,
        environmentType: process.env.KUBERNETES_SERVICE_HOST ? 'GKE' :
                         process.env.FUNCTION_NAME ? 'Cloud Functions' :
                         process.env.K_SERVICE ? 'Cloud Run' : 'Non-GCP environment',
        gcloudSDKInstalled: !!gcloudInfo,
        activeGcloudAccount: activeAccount
      },
      adcSetupInstructions: {
        localDevelopment: [
          "1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install",
          "2. Run 'gcloud auth application-default login' to set up ADC",
          "3. Verify with 'gcloud auth application-default print-access-token'",
          "4. ADC credentials are usually stored in ~/.config/gcloud/application_default_credentials.json"
        ],
        gcpEnvironment: [
          "In GCP environments (Cloud Run, Cloud Functions, GKE, etc.), ADC is automatically provided",
          "1. Ensure your service account has the necessary IAM permissions for Firestore",
          "2. No additional configuration is needed - credentials are automatically provided"
        ],
        explicitCredentials: [
          "If you prefer not to use ADC, you can set the GOOGLE_APPLICATION_CREDENTIALS environment variable:",
          "1. Create a service account key in the Google Cloud Console",
          "2. Download the key file as JSON",
          "3. Set GOOGLE_APPLICATION_CREDENTIALS=/path/to/your-key-file.json",
          "4. The application will use this file instead of ADC"
        ]
      },
      troubleshooting: [
        "1. Verify your account has permissions: 'gcloud projects get-iam-policy YOUR_PROJECT_ID'",
        "2. If using a service account, ensure it has the Firestore Admin or appropriate role",
        "3. Try 'gcloud auth application-default print-access-token' to verify ADC is working",
        "4. Check project ID: 'gcloud config get-value project'",
        "5. Set project ID explicitly in your code or via GCP_PROJECT_ID environment variable"
      ]
    };
    
    res.status(200).json({
      status: 'success',
      adcInfo,
      message: 'Application Default Credentials (ADC) help information'
    });
  } catch (error: any) {
    logger.error('Error generating ADC help information:', error);
    res.status(500).json({
      status: 'error',
      message: `Error generating ADC help information: ${error.message}`
    });
  }
});

// Route specifically for debugging Firestore document fetches
router.get('/debug-firestore-fetch/:id', async (req: Request, res: Response) => {
  try {
    logger.info('Received request to debug Firestore document fetch');
    
    const id = req.params.id;
    const collectionName = req.query.collection as string || 'debug_collection';
    
    // First, save a test document to ensure there's something to fetch
    if (req.query.create === 'true') {
      // Create a test document
      const testData = {
        id,
        created: new Date().toISOString(),
        test: true,
        debug: 'This is a test document for debugging'
      };
      
      logger.info(`Creating test document in collection ${collectionName} with ID: ${id}`);
      await saveDocument(collectionName, testData, id);
      logger.info(`Test document created successfully`);
    }
    
    // Capture call stack before the operation
    const stackBefore = new Error('Call stack before getDocument').stack;
    
    logger.info(`About to fetch document from collection ${collectionName} with ID: ${id}`);
    logger.info(`Call stack before fetch:`, stackBefore);
    
    // Perform the fetch with timing
    const startTime = Date.now();
    const result = await getDocument(collectionName, id);
    const endTime = Date.now();
    
    logger.info(`Document fetch completed in ${endTime - startTime}ms`);
    
    // Capture call stack after the operation
    const stackAfter = new Error('Call stack after getDocument').stack;
    logger.info(`Call stack after fetch:`, stackAfter);
    
    // Return detailed debugging information
    res.status(200).json({
      status: result ? 'success' : 'not_found',
      message: result ? 'Document retrieved successfully' : 'Document not found',
      timing: {
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        durationMs: endTime - startTime
      },
      callStackInfo: {
        before: stackBefore,
        after: stackAfter
      },
      document: result,
      requestDetails: {
        id,
        collectionName,
        created: req.query.create === 'true'
      }
    });
  } catch (error: any) {
    logger.error('Error in debug Firestore fetch:', error);
    
    // Extract and include as much error information as possible
    const errorInfo = {
      message: error.message,
      stack: error.stack,
      code: error.code,
      details: error.details,
      originalError: error.originalError ? {
        message: error.originalError.message,
        stack: error.originalError.stack,
        code: error.originalError.code
      } : undefined
    };
    
    res.status(500).json({
      status: 'error',
      message: `Error fetching document: ${error.message}`,
      errorDetails: errorInfo
    });
  }
});

// Route for raw Firestore document fetch - debug the exact point of failure
router.get('/raw-firestore-fetch/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const collectionName = req.query.collection as string || 'debug_collection';
    
    logger.info(`Executing raw document fetch for debugging breakpoint`);
    
    // Create a test document if requested
    if (req.query.create === 'true') {
      const testData = { 
        id, 
        test: true, 
        timestamp: new Date().toISOString() 
      };
      
      await saveDocument(collectionName, testData, id);
      logger.info(`Created test document for raw fetch debugging`);
    }
    
    // This is where you should set your breakpoint
    logger.info(`About to call rawDocumentFetch - SET BREAKPOINT HERE`);
    const result = await rawDocumentFetch(collectionName, id);
    logger.info(`Completed rawDocumentFetch call`, result);
    
    res.status(200).json({
      message: `Raw document fetch ${result.success ? 'succeeded' : 'failed'}`,
      result
    });
  } catch (error: any) {
    logger.error(`Error executing raw document fetch:`, error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: error.stack
    });
  }
});

// Route for testing alternative Firestore instance
router.get('/test-alternative-firestore/:id', async (req: Request, res: Response) => {
  try {
    const id = req.params.id;
    const collectionName = req.query.collection as string || 'debug_collection';
    
    logger.info(`Testing alternative Firestore instance`);
    
    // This call uses a completely fresh Firestore instance
    const result = await testAlternativeFirestoreInstance(collectionName, id);
    
    res.status(200).json({
      message: `Alternative Firestore instance test ${result.success ? 'succeeded' : 'failed'}`,
      result
    });
  } catch (error: any) {
    logger.error(`Error in alternative Firestore test:`, error);
    res.status(500).json({
      status: 'error',
      message: error.message,
      stack: error.stack
    });
  }
});

// Test route to simulate regenerate action for blog posts
router.post('/test-regenerate/:postId', async (req: Request, res: Response) => {
  try {
    const postId = req.params.postId;
    const { regenerationInstructions } = req.body;
    
    // First, check if the post exists
    const existingPost = await getProcessedMessage(postId);
    
    if (!existingPost) {
      return res.status(404).json({
        message: 'Post not found',
        postId
      });
    }
    
    logger.info(`Creating regenerate message for post: ${postId}`);
    
    // Create a blog post message with the regenerate action
    const blogPostMessage = {
      postId,
      action: 'regenerate',
      timestamp: Date.now(),
      data: {
        id: postId,
        title: existingPost.blogPost.title,
        content: existingPost.blogPost.content,
        keywords: existingPost.blogPost.keywords || [],
        focus: existingPost.blogPost.focus || '',
        regenerationInstructions: regenerationInstructions || ''
      }
    };
    
    // Convert to JSON string
    const messageString = JSON.stringify(blogPostMessage);
    
    // Convert to base64 as Pub/Sub would do
    const base64Message = Buffer.from(messageString).toString('base64');
    
    // Create a mock Pub/Sub message format
    const pubSubMessage = {
      message: {
        data: base64Message,
        messageId: `regenerate-${Date.now()}`,
        publishTime: new Date().toISOString()
      },
      subscription: 'test-subscription'
    };
    
    
    // Process the message as if it came from Pub/Sub
    const result = await processMessage(pubSubMessage.message);
    
    logger.info(`Successfully processed regenerate message for post: ${postId}`, { docId: result });
    
    res.status(200).json({
      message: 'Regenerate message processed successfully',
      docId: result,
      originalMessage: blogPostMessage
    });
  } catch (error: any) {
    logger.error('Error processing regenerate message:', error);
    res.status(500).json({ 
      message: 'Error processing regenerate message', 
      error: error.message 
    });
  }
});

// Add more routes here as needed

export default router; 