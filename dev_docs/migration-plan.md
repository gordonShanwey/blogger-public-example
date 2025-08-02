# Migration Plan: Migrate to Pub/Sub Push Subscription

## Overview
A clear, step-by-step plan to move from a pull-based Pub/Sub listener to a push subscription (webhook) model on Cloud Run. This leverages Cloud Run's automatic scaling on HTTP traffic and removes the need for always-on background listeners, using secure service-to-service authentication.

## Migration Steps

### 1. Add a Push Endpoint in Express
- Create a new router file `src/routes/pubsubPush.ts`.
- Implement a `POST /pubsub/push` handler that:
  1. Validates the Pub/Sub envelope format.
  2. Decodes `message.data` from base64.
  3. Calls the existing `processMessage(rawData)` logic.
  4. Returns **204 No Content** on success (ACK), **5xx** on failure (NACK).

### 2. Integrate the Push Route into the App
- Import and register the new router in `src/index.ts`:
  ```ts
  import pubsubPush from './routes/pubsubPush';
  // …
  app.use(pubsubPush);
  ```
- Remove or comment out the `initPubSub()` and `stopPubSub()` calls for the pull logic.

### 3. Update IAM and Deploy (Secure)
1.  **Identify or Create a Service Account**: Ensure you have a service account dedicated for Pub/Sub push authentication (e.g., `pubsub-pusher@your-project.iam.gserviceaccount.com`).
2.  **Grant Invoker Role to Service Account**: Give this service account permission to invoke your Cloud Run service:
    ```bash
    # Replace with your actual service account email and region
    SERVICE_ACCOUNT_EMAIL="your-sa-email@your-project.iam.gserviceaccount.com"
    REGION="us-central1"

    gcloud run services add-iam-policy-binding blogger-processor \
      --member="serviceAccount:${SERVICE_ACCOUNT_EMAIL}" \
      --role=roles/run.invoker \
      --platform=managed --region=${REGION}
    ```
3.  **Build and Deploy**: Deploy the container image containing the code changes from steps 1 & 2:
    ```bash
    # Replace with your project ID, image name/tag, and region
    PROJECT_ID="your-project-id"
    IMAGE_NAME="gcr.io/${PROJECT_ID}/blogger-processor:latest" # Or specific tag
    REGION="us-central1"

    gcloud run deploy blogger-processor \
      --image=${IMAGE_NAME} \
      --region=${REGION} --platform=managed
    ```

### 4. Create and Configure the Push Subscription (Secure)
- Create the push subscription, specifying the service account for authentication:
  ```bash
  # Replace with your topic, service URL, service account email, and region
  TOPIC_NAME="your-topic-name"
  SERVICE_URL=$(gcloud run services describe blogger-processor --platform=managed --region=${REGION} --format='value(status.url)')
  PUSH_ENDPOINT="${SERVICE_URL}/pubsub/push"
  SERVICE_ACCOUNT_EMAIL="your-sa-email@your-project.iam.gserviceaccount.com"

  gcloud pubsub subscriptions create blogger-processor-push \
    --topic=${TOPIC_NAME} \
    --push-endpoint=${PUSH_ENDPOINT} \
    --ack-deadline=60 \
    --push-auth-service-account="${SERVICE_ACCOUNT_EMAIL}"
  ```

### 5. Validate and Test
- Publish test messages:
  ```bash
  gcloud pubsub topics publish ${TOPIC_NAME} --message='{"postId":"X","action":"created","data":{...}}'
  ```
- Check Cloud Run logs for immediate `/pubsub/push` invocations and successful processing (HTTP 204 responses in logs).
- Verify Firestore updates and absence of pending messages in the *new* push subscription"typescript": "^5.3.3".

### 6. Cleanup Legacy Pull Logic
- Once push is confirmed stable:
  - Remove `src/services/pubsub.ts` and its imports completely."typescript": "^5.3.3"
  - Update documentation to reflect the new architecture.

### 7. Documentation & Rollback Plan
- Update `README.md` with push-subscription setup instructions, including service account creation/permissions.
- **Rollback**: If issues arise, you can quickly revert by:
  1. Redeploying the previous container image revision.
  2. Re-enabling the pull logic in `src/index.ts`.
  3. Deleting the push subscription (`gcloud pubsub subscriptions delete blogger-processor-push`).

---
*Each step should be its own Git commit using Conventional Commit messages.* 