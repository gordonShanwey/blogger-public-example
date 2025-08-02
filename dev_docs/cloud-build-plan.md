# Cloud Build CI/CD Pipeline Plan (Revised)

This plan describes a robust, step-by-step CI/CD pipeline for your project, ensuring all dependencies are handled in the correct order and that both backend (GCP) and frontend (Vercel) are deployed reliably.

---

## Phase 1: Prerequisites & Source Integration

**Objective:** Prepare your GCP project and connect your source repository.

- Enable required GCP APIs (Cloud Build, Artifact Registry, Cloud Run, Pub/Sub, Firestore, Secret Manager, etc.).
- Connect your Git repository (e.g., GitHub) to Cloud Build via the GCP console.
- Familiarize yourself with the Cloud Build service account and its permissions.

---

## Phase 2: Infrastructure Bootstrap (Terraform Infra-Only Apply)

**Objective:** Create all static infrastructure that does **not** depend on application artifacts.

- Run Terraform with the `-target` flag to create:
    - Artifact Registry repository
    - Service accounts
    - IAM bindings
    - Pub/Sub topics
    - GCS buckets
    - Firestore database
- **Cloud Build step example:**
    ```yaml
    - name: 'hashicorp/terraform:1.7.0'
      entrypoint: 'sh'
      args:
      - '-c'
      - |
        cd terraform
        terraform init
        terraform apply -target=google_artifact_registry_repository.docker_images \
                        -target=google_service_account.cloud_run_runtime_sa \
                        -target=google_service_account.pubsub_invoker_sa \
                        -target=google_service_account.function_sa \
                        -target=google_storage_bucket.function_source \
                        -target=google_firestore_database.named_db \
                        -target=google_pubsub_topic.primary_topic \
                        -target=google_pubsub_subscription.primary_subscription \
                        -target=google_project_iam_member.* \
                        -auto-approve
    ```

---

## Phase 3: Build and Push Application Artifacts

**Objective:** Build and upload all application artifacts now that the infra exists.

### Step 1: Build and Push Docker Image
- Build the Docker image for `processor-service`.
- Push it to the Artifact Registry repository created in Phase 2.
    ```yaml
    - name: 'gcr.io/cloud-builders/docker'
      args:
      - 'build'
      - '--platform=linux/amd64'
      - '-t'
      - '${_GCP_REGION}-docker.pkg.dev/${PROJECT_ID}/${_ARTIFACT_REGISTRY_REPO_NAME}/processor-service:$COMMIT_SHA'
      - '-t'
      - '${_GCP_REGION}-docker.pkg.dev/${PROJECT_ID}/${_ARTIFACT_REGISTRY_REPO_NAME}/processor-service:latest'
      - './services/processor-service'
    - name: 'gcr.io/cloud-builders/docker'
      args:
      - 'push'
      - '${_GCP_REGION}-docker.pkg.dev/${PROJECT_ID}/${_ARTIFACT_REGISTRY_REPO_NAME}/processor-service:$COMMIT_SHA'
    - name: 'gcr.io/cloud-builders/docker'
      args:
      - 'push'
      - '${_GCP_REGION}-docker.pkg.dev/${PROJECT_ID}/${_ARTIFACT_REGISTRY_REPO_NAME}/processor-service:latest'
    ```

### Step 2: Package and Upload Cloud Function ZIP
- Install dependencies and zip the Cloud Function.
- Upload the ZIP to the GCS bucket created in Phase 2.
    ```yaml
    - name: 'node:18'
      entrypoint: 'npm'
      args: ['install', '--production']
      dir: 'functions/addFormPayloadEvent'
    - name: 'gcr.io/cloud-builders/gsutil'
      entrypoint: 'bash'
      args:
      - '-c'
      - |
        cd functions/addFormPayloadEvent && \
        zip -r addFormPayloadEvent.zip . -x "*.git*" "*node_modules/.cache*"
    - name: 'gcr.io/cloud-builders/gsutil'
      args:
      - 'cp'
      - 'functions/addFormPayloadEvent/addFormPayloadEvent.zip'
      - 'gs://${_FUNCTIONS_SOURCE_BUCKET_NAME}/addFormPayloadEvent.zip'
    ```

---

## Phase 4: Application Deploy (Full Terraform Apply)

**Objective:** Deploy resources that depend on the application artifacts.

- Run a full `terraform apply` to create/update:
    - Cloud Run service (references the Docker image)
    - Cloud Function (references the ZIP in GCS)
- **Cloud Build step example:**
    ```yaml
    - name: 'hashicorp/terraform:1.7.0'
      entrypoint: 'sh'
      args:
      - '-c'
      - |
        cd terraform
        terraform apply -auto-approve
    ```

---

## Phase 5: Advanced Trigger Configuration and Best Practices

**Objective:** Refine the pipeline for automation, environments, and security.

- **Automated Triggers:** Set up triggers for pushes to main, PRs, etc.
- **Environment-Specific Configs:** Use different `cloudbuild-<env>.yaml` files or branch-based triggers.
- **Best Practices:**
    - Pin builder versions.
    - Use `$COMMIT_SHA` for image tags.
    - Optimize build steps.
    - Minimize Cloud Build SA permissions.
    - Store secrets in Secret Manager.
    - Set up notifications for build status.

---

## Phase 6: Integrating Frontend Deployment (Next.js on Vercel)

**Objective:** Ensure the frontend is deployed and configured with backend URLs.

- **Vercel Git Integration:** Connect your repo to Vercel for auto-deploys on push.
- **Environment Variables:** Manually (or eventually automatically) update Vercel env vars (e.g., `NEXT_PUBLIC_FUNCTION_URL`) after backend deploys.
- **(Optional) Automate with Vercel CLI:** Use Cloud Build to update Vercel env vars and trigger redeploys if desired.

---

## Summary Table

| Phase         | What's created/updated?                                 |
|---------------|--------------------------------------------------------|
| 1             | Prereqs: APIs, repo, permissions                       |
| 2             | Infra: registry, buckets, SAs, IAM, topics, Firestore  |
| 3             | Artifacts: Docker image, function ZIP                  |
| 4             | App: Cloud Run, Cloud Function (now artifacts exist)   |
| 5             | Triggers, environments, best practices                 |
| 6             | Frontend: Vercel deploy, env var sync                  |

---

**This plan ensures all dependencies are handled in the correct order, and both backend and frontend are deployed reliably.** 