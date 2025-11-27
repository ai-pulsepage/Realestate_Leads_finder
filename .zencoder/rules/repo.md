---
description: Repository Information Overview
alwaysApply: true
---

# Real Estate Leads Finder API

## Summary
A Node.js SaaS platform for real estate lead generation with integrated voice AI capabilities using Twilio and Google Gemini Live API. Features property search, user management, Stripe payments, and real-time voice conversations.

## Structure
- **api/**: External service integrations (Google Calendar, Reviews, Property APIs)
- **routes/**: Express.js API endpoints for all features
- **services/**: Core business logic including Gemini AI integration
- **config/**: Database and application configuration
- **middleware/**: Authentication and token validation
- **migrations/**: PostgreSQL database schema updates
- **scraping/**: Python-based property data scraping
- **utils/**: Voice customization utilities
- **workers/**: Background job processing
- **tests/**: Jest test suites
- **documentation_dev/**: Voice AI troubleshooting and implementation guides

## Language & Runtime
**Language**: JavaScript (Node.js)
**Version**: Node.js >=18.0.0
**Build System**: npm scripts
**Package Manager**: npm

## Dependencies
**Main Dependencies**:
- `@google/genai`: ^1.30.0 - Google Gemini Live API
- `express`: ^4.18.2 - Web framework
- `twilio`: ^5.10.6 - Voice communication
- `pg`: ^8.11.3 - PostgreSQL client
- `stripe`: ^14.0.0 - Payment processing
- `ws`: ^8.18.3 - WebSocket support
- `g711`: ^1.0.1 - Audio codec conversion
- `wave-resampler`: ^1.0.0 - Audio resampling

**Development Dependencies**:
- `jest`: ^29.7.0 - Testing framework

## Build & Installation
```bash
npm install
npm run migrate  # Run database migrations
npm start        # Production server
npm run dev      # Development server
```

## Docker
**Dockerfile**: Multi-stage Node.js 18-slim container
**Image**: gcr.io/$PROJECT_ID/realestate_leads_finder:latest
**Configuration**: Non-root user, production dependencies only
**Deployment**: Google Cloud Run with VPC connector

## Main Files & Resources
**Entry Point**: server.js (18.31 KB)
**Key Routes**:
- voice-ai.js (36.85 KB) - Voice AI WebSocket handling
- properties.js - Property search and management
- users.js - User authentication and profiles
- stripe.js - Payment processing

**Database**: PostgreSQL with connection pooling
**WebSocket**: Real-time voice communication via Twilio

## Testing
**Framework**: Jest
**Test Location**: tests/ directory
**Naming Convention**: *.test.js
**Configuration**: package.json scripts
**Run Command**:
```bash
npm test
npm run test-db  # Database connection tests
```

## Voice AI Implementation (Current State)
**Current Architecture**: Twilio WebSocket → Express.js → Google Gemini Live API
**Audio Pipeline**: MULAW (8kHz) → PCM (8kHz) → Gemini → PCM (24kHz) → MULAW (8kHz) → Twilio
**Key Features**:
- Real-time voice conversations
- 8kHz direct audio transmission (no upsampling)
- PostgreSQL call logging
- Session management with cleanup

**Recent Fixes**:
- Resolved buffer size corruption (1280 bytes → 320 bytes)
- Implemented official Gemini 8kHz support
- Removed complex resampling logic
- Fixed audio format compatibility

## Deployment & Infrastructure
**Platform**: Google Cloud Run
**Database**: Cloud SQL PostgreSQL
**Secrets**: Google Cloud Secret Manager
**Build**: Cloud Build with automated deployment
**Networking**: VPC connector for private database access

## API Endpoints
- `/api/properties` - Property search and listings
- `/api/users` - User management
- `/api/stripe` - Payment processing
- `/api/voice-ai` - Voice AI WebSocket endpoint
- `/api/appointments` - Scheduling system
- `/api/admin` - Administrative functions

## External Integrations
- **Twilio**: Voice communication and WebRTC
- **Google Gemini**: Live AI conversation
- **Stripe**: Payment processing
- **Google Calendar**: Appointment scheduling
- **Property APIs**: Miami-Dade, Property Appraiser data
- **Clerk**: Authentication service