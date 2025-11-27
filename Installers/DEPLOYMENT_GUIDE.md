# 🚀 Deployment Guide: Real Estate Leads API & Email Worker

## Overview
This system consists of two main components that need to run in production:
1.  **The API Server** (`server.js`): Handles HTTP requests, Voice AI, and Admin UI.
2.  **The Email Worker** (`workers/email-sender.js`): Processes queued email campaigns in the background.

## ⚠️ Critical: Running the Worker on Cloud Run
Cloud Run services scale to zero when not used. A standard `setInterval` script will **stop running** if no web requests are coming in.

**Recommended Strategy:**
We will expose an endpoint in the API that runs one "tick" of the worker, and use **Cloud Scheduler** to hit it every minute. This is the "Serverless" way.

### Step 1: Add the Worker Endpoint
We need to slightly modify `server.js` or create a new route to trigger the worker logic on demand.

### Step 2: Deployment Commands

#### 1. Deploy the API
```bash
gcloud run deploy real-estate-leads-api \
  --source . \
  --platform managed \
  --region us-east1 \
  --allow-unauthenticated \
  --set-env-vars NODE_ENV=production
```

#### 2. Set up the Cloud Scheduler (The "Heartbeat")
This ensures your emails get sent even if no one is on the site.

```bash
gcloud scheduler jobs create http email-worker-tick \
  --schedule="* * * * *" \
  --uri="https://<YOUR-CLOUD-RUN-URL>/api/admin/run-worker" \
  --http-method=POST \
  --oidc-service-account-email=<YOUR-SERVICE-ACCOUNT-EMAIL>
```

---

## Alternative: Dedicated Worker Service
If you prefer a dedicated "always-on" worker (more expensive, ~$15/mo), you can deploy the worker as a separate service with `min-instances=1`.

```bash
gcloud run deploy email-worker \
  --source . \
  --command "node workers/email-sender.js" \
  --min-instances 1 \
  --no-cpu-throttling
```

## Environment Variables Checklist
Ensure these are set in your Cloud Run revision:
*   `DATABASE_URL`: (Your Cloud SQL connection)
*   `GEMINI_API_KEY`: (For AI features)
*   `SENDGRID_API_KEY`: (For emails)
*   `TWILIO_ACCOUNT_SID`: (For voice)
*   `TWILIO_AUTH_TOKEN`: (For voice)
*   `TWILIO_PHONE_NUMBER`: (For voice)
