Phase 1: Contract Analysis (Code-level)
First, we'll compare the data structures defined in the code of both services.
Step 1.1: Input Contract (Pub/Sub Message)
Objective: Confirm the Python service correctly models the data sent by Pub/Sub.
Action: We will locate the TypeScript interface or type that defines the expected data within the Pub/Sub message. Then, we'll compare it field-by-field with our Pydantic model (PubSubMessage) in the Python service to ensure they match perfectly in terms of field names and data types.
Step 1.2: Output Contract (Firestore Document)
Objective: Confirm the Python service will create Firestore documents with the identical structure.
Action: We will find the part of the TypeScript code that saves the final document to Firestore. We'll analyze the object structure it saves and compare it with the dictionary that our Python's FirestoreService.save_blog_post method creates. We must check for parity in field names, data types, and any status flags (e.g., status: 'completed').
Phase 2: End-to-End Functional Test (Behavioral)
Next, we'll run both services with the same input and compare the actual results.
Step 2.1: Establish a "Golden Master"
Objective: Create a definitive reference output from the current TypeScript service.
Action: We will run the original TypeScript service locally (if possible) or trigger it in your dev environment with a specific test message. We will then save the resulting Firestore document. This document is our "golden master" – the ground truth we will test against.
Step 2.2: Run the Python Service
Objective: Generate an output from the new Python service using the identical input.
Action: We will use our dev-message.sh script, ensuring the hardcoded message is the exact same one used in Step 2.1. We'll send this to our local Python service.
Step 2.3: Compare the Outputs
Objective: Diff the "golden master" against the new Python output.
Action: We'll fetch the two Firestore documents and compare them.
Static Fields: Fields like status, sourceTitle, createdAt (ignoring small time differences), and language must match exactly.
Dynamic Fields: The AI-generated content (title, sections) will naturally be different. Here, we don't check for an exact match. Instead, we verify that the structure of the generated JSON is correct and matches our GeneratedBlogPost Pydantic schema.
Phase 3: Behavioral & Error Handling Parity
Finally, we need to ensure the service behaves the same way when things go wrong.
Step 3.1: Malformed Input Test
Objective: Ensure the Python service handles bad messages gracefully.
Action: We will send a malformed Pub/Sub message (e.g., missing a required field). We'll verify that the Python service logs the error correctly and returns the appropriate HTTP status code (e.g., 204 No Content or 400 Bad Request) to the Pub/Sub push invoker, just as the TypeScript service would, so the message is acknowledged and not redelivered.