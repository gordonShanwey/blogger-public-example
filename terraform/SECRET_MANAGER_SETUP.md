# Secret Manager Configuration

This document describes how to configure Secret Manager for the blogger application.

## Overview

The application uses Google Cloud Secret Manager to securely store sensitive configuration values like API keys. This is implemented in terraform for Infrastructure as Code management.

## Configuration

### 1. Required Variables

Add the following to your `terraform.tfvars` file:

```hcl
openai_api_key_value = "your-actual-openai-api-key"
```

### 2. Environment Variable Alternative

For enhanced security, you can provide the secret value via environment variable instead of storing it in terraform files:

```bash
export TF_VAR_openai_api_key_value="your-actual-openai-api-key"
terraform apply
```

### 3. Terraform Apply with Variable

You can also provide the value directly during terraform apply:

```bash
terraform apply -var="openai_api_key_value=your-actual-openai-api-key"
```

## Security Best Practices

### Production Deployment

For production environments, consider these security practices:

1. **Never commit secrets to version control**
   - Add `terraform.tfvars` to your `.gitignore`
   - Use environment variables or secure CI/CD variables

2. **Use lifecycle management**
   - The secret resource includes `lifecycle.ignore_changes = [secret_data]`
   - This prevents terraform from updating the secret value on subsequent applies
   - Update secrets manually via Google Cloud Console or gcloud CLI when needed

3. **Manual secret management after initial deployment**
   
   After the initial terraform deployment, you can update the secret value using:

   ```bash
   # Using gcloud CLI
   echo -n "new-api-key-value" | gcloud secrets versions add ${resource_prefix}-openai-api-key --data-file=-
   ```

   Or via the Google Cloud Console in the Secret Manager section.

## Resources Created

The terraform configuration creates:

- `google_secret_manager_secret.openai_api_key`: The secret resource
- `google_secret_manager_secret_version.openai_api_key_version`: Initial secret version
- IAM permissions for the Cloud Run service account to access the secret

## Application Integration

The Cloud Run service automatically receives the secret value as an environment variable:

- Environment variable: `OPENAI_API_KEY_SECRET`
- Source: Secret Manager secret `${resource_prefix}-openai-api-key`
- Version: `latest` (automatically uses the most recent version)

## Troubleshooting

### Common Issues

1. **Permission denied errors**
   - Ensure the Cloud Run service account has `roles/secretmanager.secretAccessor`
   - This is automatically configured in `terraform/iam.tf`

2. **Secret not found**
   - Verify the secret name matches the pattern: `${resource_prefix}-openai-api-key`
   - Check that terraform apply completed successfully

3. **Empty or invalid secret value**
   - Verify the `openai_api_key_value` variable is properly set
   - Check the secret content in Google Cloud Console

### Verification

To verify the secret is properly configured:

```bash
# List secrets
gcloud secrets list --filter="name:${resource_prefix}-openai-api-key"

# View secret metadata (not the actual value)
gcloud secrets describe ${resource_prefix}-openai-api-key
```