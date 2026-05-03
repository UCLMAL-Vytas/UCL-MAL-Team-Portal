#!/bin/bash
# Sets up Workload Identity Federation so Vercel can authenticate as the Firebase SA
# Run: bash scripts/setup-vercel-wif.sh

PROJECT_ID="portal-uclmal"
PROJECT_NUMBER="928161396536"
SA_EMAIL="firebase-adminsdk-fbsvc@portal-uclmal.iam.gserviceaccount.com"
POOL_ID="vercel-pool"
PROVIDER_ID="vercel-provider"
TEAM_SLUG="uclmals-projects"

echo "Creating WIF pool..."
gcloud iam workload-identity-pools create "$POOL_ID" \
  --project="$PROJECT_ID" \
  --location="global" \
  --display-name="Vercel Deployments"

echo "Creating OIDC provider..."
gcloud iam workload-identity-pools providers create-oidc "$PROVIDER_ID" \
  --project="$PROJECT_ID" \
  --location="global" \
  --workload-identity-pool="$POOL_ID" \
  --display-name="Vercel OIDC" \
  --attribute-mapping="google.subject=assertion.sub,attribute.project=assertion.project_id" \
  --issuer-uri="https://oidc.vercel.com/$TEAM_SLUG"

echo "Granting SA access to Vercel WIF identities..."
gcloud iam service-accounts add-iam-policy-binding "$SA_EMAIL" \
  --project="$PROJECT_ID" \
  --role="roles/iam.workloadIdentityUser" \
  --member="principalSet://iam.googleapis.com/projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/*"

echo "Generating credential config..."
gcloud iam workload-identity-pools create-cred-config \
  "projects/$PROJECT_NUMBER/locations/global/workloadIdentityPools/$POOL_ID/providers/$PROVIDER_ID" \
  --service-account="$SA_EMAIL" \
  --credential-source-env-var="VERCEL_OIDC_TOKEN" \
  --credential-source-type="urn:ietf:params:oauth:token-type:id_token" \
  --output-file="scripts/vercel-wif-credential.json"

echo "Done. Now run:"
echo "  vercel env add GOOGLE_APPLICATION_CREDENTIALS production < scripts/vercel-wif-credential.json"
