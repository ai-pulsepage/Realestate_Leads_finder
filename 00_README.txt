MIAMI-DADE PROPERTY INTELLIGENCE SAAS - REQUIREMENTS PACKAGE
================================================================

PROJECT: Miami-Dade Property Intelligence SaaS Platform
OWNER: Gabriel Sebastian (Gabe Sebastian Enterprises)
EMAIL: thedevingrey@gmail.com
VERSION: 1.0
DATE: November 14, 2025

================================================================
DOCUMENT INDEX
================================================================

01_EXECUTIVE_SUMMARY.md
    - Platform overview
    - Business model
    - Core differentiation vs competitors
    - Revenue streams
    - Technical architecture
    - User types
    - Phased implementation plan
    - Key metrics and success criteria

02_DATABASE_SCHEMA.md
    - Complete PostgreSQL schema
    - All table definitions
    - Indexes and optimization
    - Seed data
    - Maintenance queries
    - Backup strategy

03_MIAMI_DADE_API.md
    - API authentication credentials
    - Endpoint specifications
    - Data processing pipeline
    - Error handling
    - Rate limiting
    - Scheduled updates
    - Testing strategy

04_TOKEN_SYSTEM.md
    - Token economics
    - Pricing by action
    - Technical implementation
    - Purchase flow (Stripe)
    - Admin controls
    - Reporting and analytics
    - Auto-recharge feature

================================================================
NEXT DOCUMENTS TO CREATE
================================================================

05_AI_ARCHITECTURE.md
    - Vertex AI setup
    - Gemini TTS integration
    - Together.ai chat
    - Event-driven workflows
    - Voice assistant configuration

06_SUBSCRIBER_ONBOARDING.md
    - User registration flow
    - Profile setup wizard
    - License verification
    - Portfolio upload
    - Subscription selection

07_ADMIN_BACKEND.md
    - Admin dashboard
    - Pricing controls
    - Token management
    - User verification
    - Usage analytics
    - Audit logs

08_FRONTEND_SPECIFICATIONS.md
    - Component structure
    - Search and filters
    - Map integration
    - Dashboard layouts
    - Responsive design

09_SECURITY_COMPLIANCE.md
    - Authentication (Firebase)
    - Authorization patterns
    - Data encryption
    - Rate limiting
    - SQL injection prevention
    - CCPA compliance

10_TESTING_STRATEGY.md
    - Unit testing (Jest)
    - Integration testing
    - UI testing (Cypress)
    - Coverage goals
    - CI/CD pipeline

================================================================
CURRENT GAPS IDENTIFIED
================================================================

CRITICAL (BLOCKING)
- Miami-Dade Property Appraiser API endpoint (pending approval)
- Broward County API access (form submission pending)
- Palm Beach County API access (form submission pending)
- GitHub repository setup
- Google Cloud Project creation
- Stripe account creation
- Twilio account creation

MEDIUM PRIORITY
- FSBO scraping implementation (deferred to Phase 2+)
- License verification automation (manual process for MVP)
- Google Calendar OAuth integration details
- SendGrid account setup
- Together.ai API key

LOW PRIORITY
- Homeowner job bidding feature (Phase 3+)
- Mobile app considerations (future)
- Multi-county expansion details (post-MVP)

================================================================
CODING CONVENTIONS
================================================================

BACKEND (snake_case):
    - Function names: get_property_data()
    - Variable names: user_id, property_list
    - File names: miami_dade_api.js

MIDDLEWARE (camelCase):
    - Function names: authMiddleware()
    - Variable names: userId, tokenBalance
    - File names: tokenMiddleware.js

FRONTEND (kebab-case):
    - Component names: user-dashboard.vue
    - CSS classes: filter-panel
    - File names: property-search.js

================================================================
ENVIRONMENT VARIABLES REQUIRED
================================================================

# Database
DB_HOST=
DB_USER=
DB_PASSWORD=
DB_NAME=real_estate_services_saas_db

# Redis
REDIS_HOST=

# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_PRIVATE_KEY=
FIREBASE_CLIENT_EMAIL=

# Miami-Dade APIs
MIAMI_DADE_AUTH_KEY=5A0C2347-6BF3-4229-ADD3-05CDD7B96320
MIAMI_DADE_BASE_URL=https://www.miamidade.gov/api

# Third-Party Services
TOGETHER_AI_API_KEY=
GEMINI_API_KEY=
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
SENDGRID_API_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
BATCHDATA_API_KEY=

# App Config
NODE_ENV=development
PORT=8080
FRONTEND_URL=
MIAMI_DADE_PLACEHOLDER_MODE=true

================================================================
PHASE 1 DELIVERABLES (WEEKS 1-4)
================================================================

DATABASE
    - PostgreSQL instance created on Google Cloud SQL
    - All tables created and seeded
    - Indexes optimized
    - Migrations configured

BACKEND API
    - Express server deployed to Cloud Run
    - Authentication middleware (Firebase)
    - Token middleware (deduction logic)
    - Miami-Dade API service (with placeholders)
    - Property search endpoint
    - Lead management endpoints
    - Admin endpoints (pricing, tokens)

INFRASTRUCTURE
    - Redis cache configured
    - BullMQ queues initialized
    - Logging configured (Winston + Google Cloud)
    - Health check endpoint
    - Rate limiting middleware

TESTING
    - Jest configured
    - Sample unit tests written
    - Integration test framework setup
    - Code coverage reporting

================================================================
SUCCESS CRITERIA - PHASE 1
================================================================

- Database schema deployed and accessible
- Property search returns results (real or placeholder)
- User can authenticate via Firebase
- Token system deducts correctly on actions
- Admin can modify pricing via API
- All endpoints return proper error messages
- Logging captures all API calls
- Health check returns 200 OK
- Unit test coverage > 50%

================================================================
CONTACT INFORMATION
================================================================

Project Owner: Gabriel Sebastian
Email: thedevingrey@gmail.com
Company: Gabe Sebastian Enterprises
Miami-Dade Registered IP: 10.56.251.3
Miami-Dade Auth Key: 5A0C2347-6BF3-4229-ADD3-05CDD7B96320

================================================================
DOCUMENT USAGE NOTES
================================================================

- All documents are plain text Markdown format
- No emojis used (ANSI-compliant)
- Code blocks use standard SQL/JavaScript syntax
- Tables formatted for readability
- All URLs are placeholders until approval
- Placeholder mode enabled for development without API access

================================================================
VERSION HISTORY
================================================================

Version 1.0 - November 14, 2025
    - Initial requirements package
    - Executive summary
    - Database schema
    - Miami-Dade API specifications
    - Token system documentation
    - Gaps identified and documented
    - Phase 1 scope defined

================================================================
END OF README
================================================================
