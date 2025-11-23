# Infrastructure Setup Documentation

## Working Database Connection Configuration

Document the final working DATABASE_URL pattern that resolved all connection issues:

```
Connection String Format:
postgresql://api_user:[URL_ENCODED_PASSWORD]@172.27.64.3:5432/real_estate_leads?sslmode=no-verify

Key learnings:
- Password must be URL-encoded (special characters: " / | @ ; + #)
- sslmode=no-verify required (database requires SSL but Cloud Run can't verify cert)
- Private IP 172.27.64.3 used via VPC connector

Secret Manager:
- Secret name: database-url
- Current version: 4 (enabled)
- All previous versions: disabled
```

## Cloud Run Deployment Configuration

Document the working deployment command:

```bash
# Deployment script location: ~/deploy-api.sh in Cloud Shell

# Critical deployment flags:
gcloud run deploy real-estate-leads-api \
  --region=us-east1 \
  --image=us-east1-docker.pkg.dev/real-estate-leads-478814/cloud-run-source-deploy/real-estate-leads-api:manual-8812bbd \
  --command=/cnb/process/web \
  --vpc-connector=real-estate-connector \
  --set-secrets=DATABASE_URL=database-url:latest,REDIS_URL=redis-url:latest,[all other secrets] \
  --allow-unauthenticated

Key points:
- Must use --command=/cnb/process/web to override buildpack default
- VPC connector required for private IP database access
- All secrets use :latest version
```

## Current Infrastructure State

```
Project: real-estate-leads-478814
Region: us-east1

Resources:
- Cloud Run Service: real-estate-leads-api (revision 00026-7wg - WORKING)
- Cloud SQL: real-estate-leads-db (PostgreSQL 15, private IP 172.27.64.3)
- Memorystore Redis: real-estate-redis (private IP 172.27.65.3)
- VPC Connector: real-estate-connector (10.8.0.0/28)
- Storage Bucket: real-estate-leads-uploads
- Secret Manager: 9 secrets configured

Database:
- Database name: real_estate_leads
- User: api_user
- Password: E5"j/Fq|@oqY;+#e (stored URL-encoded in Secret Manager)
- 16 tables created
- PostGIS extension enabled
```

## Bugs Fixed During Deployment

1. Circular dependency: stripe.js importing from server.js
   - Fixed: Changed to import from config/database.js
   - Commit: 8812bbd

2. Missing exports: config/database.js not exporting pool
   - Fixed: Added module.exports = { pool, checkDatabase }
   - Commit: 8812bbd

3. Buildpack entrypoint: Cloud Run overriding with 'node server.js'
   - Fixed: Deploy with --command=/cnb/process/web flag

4. DATABASE_URL encoding: Special characters in password not URL-encoded
   - Fixed: Secret Manager version 2 with encoded password

5. SSL verification: Database requires SSL but Node.js couldn't verify cert
   - Fixed: Changed sslmode from 'require' to 'no-verify' (version 4)

## Verified Working Endpoints

✅ GET / - Health check (returns "Real Estate Leads API")
✅ GET /api/properties?zip_code=33132 - Property search (returns test data from database)

Test property data confirmed:
- property_id: 1
- address: "1234 Biscayne Blvd, Miami, FL"
- zip_code: "33132"
- distressed_score: 75
- Database query successful via VPC connector

## GitHub Repository State

Repository: ai-pulsepage/Realestate_Leads_finder
Latest commit: 8812bbd (fixes database.js exports and stripe.js circular dependency)
Current branch: main

Files modified in working deployment:
- config/database.js
- routes/stripe.js
- server.js (detailed logging)