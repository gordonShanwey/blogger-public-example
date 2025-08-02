# Configuration Placeholders

This document lists all the placeholders that need to be replaced with actual values when using this blogger template.

## Required Replacements

### 1. GCP Project Configuration

**Placeholder: `your-project-id`**
- **Files affected:**
  - `terraform/variables.tf` (default value)
  - `services/processor-service-py/src/config.py`
  - `run-destroy.sh`
  - `run-report.sh`
  - `services/processor-service/tf-runner-key.json`
  - `services/processor-service/creds/your-project-firebase-adminsdk.json`

**What to replace with:** Your actual GCP project ID

### 2. GCP Region Configuration

**Placeholder: `your-region`**
- **Files affected:**
  - `terraform/variables.tf` (default value)
  - `cloudbuild.yaml`
  - `cloudbuild-destroy.yaml`
  - `cloudbuild-tf-report.yaml`
  - `services/processor-service-py/src/config.py`

**What to replace with:** Your preferred GCP region (e.g., `us-central1`, `europe-west1`, etc.)

### 3. Resource Prefix Configuration

**Placeholder: `your-resource-prefix`**
- **Files affected:**
  - `terraform/variables.tf` (default value)
  - `cloudbuild.yaml`
  - `cloudbuild-destroy.yaml`
  - `cloudbuild-tf-report.yaml`
  - `services/processor-service-py/src/services/firestore.py`

**What to replace with:** A unique prefix for your resources (1-24 characters, lowercase letters, numbers, hyphens only)

### 4. Service Account Configurations

#### Cloud Build Service Account
**Placeholder: `your-cloud-build-sa`**
- **Files affected:**
  - `run-destroy.sh`
  - `run-report.sh`

**What to replace with:** The name of your Cloud Build service account

#### Service Account JSON Files
**Files that need actual service account keys:**
- `services/processor-service/tf-runner-key.json`
- `services/processor-service/creds/your-project-firebase-adminsdk.json`

**Placeholders in these files:**
- `your-private-key-id`
- `YOUR_PRIVATE_KEY_CONTENT_HERE`
- `your-client-id`

### 5. API Keys and Secrets

**Placeholder: `your-openai-api-key-secret-name`**
- **File:** `services/processor-service-py/src/config.py`
- **What to replace with:** The name of your OpenAI API key secret in Google Secret Manager

## Setup Instructions

1. **Clone this repository**
2. **Global find and replace:**
   - Replace `your-project-id` with your GCP project ID
   - Replace `your-region` with your preferred GCP region
   - Replace `your-resource-prefix` with your chosen resource prefix
   - Replace `your-cloud-build-sa` with your Cloud Build service account name
   - Replace `your-openai-api-key-secret-name` with your secret name

3. **Service Account Setup:**
   - Generate actual service account JSON keys
   - Replace the placeholder content in the JSON files
   - Update the filename `your-project-firebase-adminsdk.json` to match your actual service account

4. **Secret Manager:**
   - Create your OpenAI API key secret in Google Secret Manager
   - Update the secret name in the configuration

## Security Notes

⚠️ **Important:** The service account JSON files in this template contain placeholder values only. Before deploying:
- Generate real service account keys from your GCP project
- Never commit real service account keys to version control
- Consider using Workload Identity instead of service account keys for production deployments
- Ensure proper IAM permissions are configured for all service accounts

## Additional Configuration

You may also want to customize:
- Pub/Sub topic and subscription names in `services/processor-service-py/src/config.py`
- Firestore collection names
- AI model parameters and prompts
- Cloud Build trigger configurations