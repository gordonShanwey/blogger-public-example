# Data source to reference the existing default Firestore database in the project.
# This confirms Terraform is aware of Firestore for this project.
# It does not manage the database's creation or its top-level configuration
# (like initial location or mode selection), as that is assumed to be pre-existing.
#
# The Firestore API enablement is handled in apis.tf.
# IAM permissions for services to access this database will be handled in iam.tf.


# Creates a new, named Firestore database for this deployment.
# This allows for data isolation between different instances of the template.
resource "google_firestore_database" "named_db" {
  project    = var.gcp_project_id
  # The name is the Database ID.
  # Must be 4-63 characters, start/end with letter/number, contain lowercase letters, numbers, hyphens.
  name       = "${var.resource_prefix}-db"
  location_id = var.gcp_region # e.g., "us-central1" or a valid Firestore region
  type       = "FIRESTORE_NATIVE" # Or "DATASTORE_MODE"

  # Controls whether accidental deletion of this database is allowed.
  # For a template, allowing deletion might be useful for ephemeral environments.
  # For production, you might set this to "DELETE_PROTECTION_ENABLED".
  delete_protection_state = "DELETE_PROTECTION_DISABLED"

  # Deletion policy for the database.
  # "DELETE" means the database will be deleted when the Terraform resource is destroyed.
  # "ABANDON" means the database will be orphaned (left in place) when the resource is destroyed.
  # For a template creating a new DB per deployment, "DELETE" is often appropriate.
  deletion_policy = "DELETE"
}