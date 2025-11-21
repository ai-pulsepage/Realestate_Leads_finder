# Real Estate Leads SaaS Platform

## Overview
This repository contains the complete implementation of a SaaS platform targeting real estate investors and home service contractors in South Florida. The platform provides dual products: distressed properties for investors and new homeowner leads for contractors.

## Architecture
- **Backend**: Node.js with Express
- **Frontend**: Next.js
- **Database**: PostgreSQL with JSONB for scalability
- **Deployment**: Google Cloud Run
- **APIs**: Miami-Dade Property Appraiser, Clerk FTP, Google Calendar, Reviews, Twenty CRM, Together.ai

## Key Features
- AI chat/voice assistant
- CRM integration
- Token-based usage system
- Admin controls
- Google Cloud deployment

## Deployment Status
The current Cloud Run service configuration shows deployment failure. The container is not starting properly on port 8080.

### Current YAML Configuration
```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: real-estate-leads-api
  namespace: '775497803476'
  selfLink: /apis/serving.knative.dev/v1/namespaces/775497803476/services/real-estate-leads-api
  uid: b6c1eda2-296c-4bf9-a3be-f4ece1ce43c1
  resourceVersion: AAZEDQKk1OQ
  generation: 2
  creationTimestamp: '2025-11-20T21:01:58.918408Z'
  labels:
    gcb-trigger-id: e9b58cbb-1977-410c-81a6-deb5a8229a05
    managed-by: gcp-cloud-build-deploy-cloud-run
    gcb-trigger-region: global
    cloud.googleapis.com/location: us-central1
  annotations:
    serving.knative.dev/creator: thedevingrey@gmail.com
    serving.knative.dev/lastModifier: thedevingrey@gmail.com
    run.googleapis.com/client-name: cloud-console
    run.googleapis.com/operation-id: 0546b598-efc7-45d6-8abb-fa6cab641dea
    run.googleapis.com/ingress: all
    run.googleapis.com/ingress-status: all
    run.googleapis.com/maxScale: '3'
    run.googleapis.com/urls: '["https://real-estate-leads-api-775497803476.us-central1.run.app"]'
spec:
  template:
    metadata:
      labels:
        run.googleapis.com/startupProbeType: Default
      annotations:
        run.googleapis.com/execution-environment: gen1
        run.googleapis.com/client-name: cloud-console
        run.googleapis.com/startup-cpu-boost: 'true'
    spec:
      containerConcurrency: 80
      timeoutSeconds: 300
      serviceAccountName: 775497803476-compute@developer.gserviceaccount.com
      containers:
      - name: real-estate-leads
        image: gcr.io/cloudrun/placeholder
        command:
        - npm
        args:
        - run
        ports:
        - name: http1
          containerPort: 8080
        resources:
          limits:
            cpu: 1000m
            memory: 512Mi
        startupProbe:
          timeoutSeconds: 240
          periodSeconds: 240
          failureThreshold: 1
          tcpSocket:
            port: 8080
  traffic:
  - percent: 100
    latestRevision: true
status:
  observedGeneration: 2
  conditions:
  - type: Ready
    status: 'False'
    reason: HealthCheckContainerError
    message: "The user-provided container failed to start and listen on the port defined provided by the PORT=8080 environment variable within the allocated timeout. This can happen when the container port is misconfigured or if the timeout is too short. The health check timeout can be extended. Logs for this revision might contain more information.\n\nLogs URL: https://console.cloud.google.com/logs/viewer?project=real-estate-leads-478814&resource=cloud_run_revision/service_name/real-estate-leads-api/revision_name/real-estate-leads-api-00001-njx&advancedFilter=resource.type%3D%22cloud_run_revision%22%0Aresource.labels.service_name%3D%22real-estate-leads-api%22%0Aresource.labels.revision_name%3D%22real-estate-leads-api-00001-njx%22 \nFor more troubleshooting guidance, see https://cloud.google.com/run/docs/troubleshooting#container-failed-to-start"
    lastTransitionTime: '2025-11-20T21:02:09.834779Z'
  - type: ConfigurationsReady
    status: 'False'
    reason: HealthCheckContainerError
    message: "The user-provided container failed to start and listen on the port defined provided by the PORT=8080 environment variable within the allocated timeout. This can happen when the container port is misconfigured or if the timeout is too short. The health check timeout can be extended. Logs for this revision might contain more information.\n\nLogs URL: https://console.cloud.google.com/logs/viewer?project=real-estate-leads-478814&resource=cloud_run_revision/service_name/real-estate-leads-api/revision_name/real-estate-leads-api-00001-njx&advancedFilter=resource.type%3D%22cloud_run_revision%22%0Aresource.labels.service_name%3D%22real-estate-leads-api%22%0Aresource.labels.revision_name%3D%22real-estate-leads-api-00001-njx%22 \nFor more troubleshooting guidance, see https://cloud.google.com/run/docs/troubleshooting#container-failed-to-start"
    lastTransitionTime: '2025-11-20T21:02:02.604544Z'
  - type: RoutesReady
    status: 'False'
    reason: HealthCheckContainerError
    message: "The user-provided container failed to start and listen on the port defined provided by the PORT=8080 environment variable within the allocated timeout. This can happen when the container port is misconfigured or if the timeout is too short. The health check timeout can be extended. Logs for this revision might contain more information.\n\nLogs URL: https://console.cloud.google.com/logs/viewer?project=real-estate-leads-478814&resource=cloud_run_revision/service_name/real-estate-leads-api/revision_name/real-estate-leads-api-00001-njx&advancedFilter=resource.type%3D%22cloud_run_revision%22%0Aresource.labels.service_name%3D%22real-estate-leads-api%22%0Aresource.labels.revision_name%3D%22real-estate-leads-api-00001-njx%22 \nFor more troubleshooting guidance, see https://cloud.google.com/run/docs/troubleshooting#container-failed-to-start"
    lastTransitionTime: '2025-11-20T21:02:09.834779Z'
  latestCreatedRevisionName: real-estate-leads-api-00001-njx
```

## Issues to Resolve
- Container image is set to placeholder (`gcr.io/cloudrun/placeholder`)
- Application must listen on PORT environment variable (8080)
- Need proper Dockerfile for containerization
- Ensure all dependencies are installed and configured for production

## Next Steps
1. Create Dockerfile
2. Build and push container image to Google Container Registry
3. Update Cloud Run service with correct image
4. Verify application starts on correct port
5. Test deployment