# MIAMI-DADE PROPERTY INTELLIGENCE SAAS
## EXECUTIVE SUMMARY

**Document Version:** 1.0  
**Last Updated:** November 14, 2025  
**Project Owner:** Gabriel Sebastian (Gabe Sebastian Enterprises)  
**Contact:** thedevingrey@gmail.com

---

## PLATFORM OVERVIEW

**Platform Name:** Miami-Dade Property Intelligence SaaS  
**Initial Market:** Miami-Dade County, Florida  
**Expansion Plan:** Broward County, Palm Beach County (Phase 2+)

### DUAL-PRODUCT STRATEGY

**Product A: Home Service Contractor Leads**
- Target Customers: HVAC, plumbing, landscaping, pool service, pest control, roofing contractors
- Value Proposition: New homeowner leads within 90-day "hot window"
- Pricing: $49/month (admin-adjustable)

**Product B: Real Estate Investment Leads**
- Target Customers: Real estate investors, wholesalers, fix-and-flip operators
- Value Proposition: Distressed properties, FSBO listings, foreclosures
- Pricing: $49/month (admin-adjustable)

**Product C: Full Access**
- Combined access to both Product A and Product B
- Pricing: $98/month (admin-adjustable)

---

## CORE DIFFERENTIATION

### VS COMPETITORS (ANGI, PROPSTREAM, HOMEADVISOR)

1. **EXCLUSIVE LEADS** - No lead sharing, unlimited access per subscription
2. **PROACTIVE TARGETING** - Identify new homeowners before they search for services
3. **90-DAY HOT WINDOW** - Target new homeowners when service needs are highest
4. **AI PERSONALIZATION** - Custom voice assistants, scripts, email workflows per subscriber
5. **INTEGRATED CRM** - Twenty CRM included (competitors charge separately)
6. **FLAT PRICING** - Predictable monthly cost vs $15-85 per lead elsewhere
7. **TOKEN SYSTEM** - Flexible monetization for AI services separate from subscription

---

## BUSINESS MODEL

### REVENUE STREAMS

**Primary Revenue:**
- Monthly subscriptions: $49-98/month per subscriber
- Annual subscriptions: 15% discount (admin-adjustable)

**Secondary Revenue:**
- Token purchases for AI services (voice calls, chat, email, SMS)
- CRM integration (premium add-on feature)

**Token Economics:**
- Base allocation: 10,000-15,000 tokens/month (included in subscription)
- Tokens do NOT expire (rollover monthly)
- Purchasable bundles: 10,000 tokens = $10 (admin-adjustable)
- Markup on AI costs: 500-2400% depending on service

---

## TECHNICAL ARCHITECTURE

### INFRASTRUCTURE
- **Cloud Provider:** Google Cloud Platform (100% hosted)
- **Compute:** Cloud Run (auto-scaling, serverless)
- **Database:** Cloud SQL (PostgreSQL 15)
- **Caching:** Cloud Memorystore (Redis)
- **Storage:** Cloud Storage (files, images, documents)
- **Authentication:** Firebase Auth (Google OAuth integration)
- **Payments:** Stripe (subscriptions + one-time token purchases)

### TECHNOLOGY STACK
- **Frontend:** Next.js, React, Tailwind CSS
- **Backend:** Node.js, Express
- **Database:** PostgreSQL with PostGIS (geospatial queries)
- **Job Queue:** BullMQ with Redis
- **CRM:** Twenty (self-hosted, Cloud Run deployment)
- **Email:** SendGrid (Twilio-owned, Google Cloud partner)
- **Voice/SMS:** Twilio
- **AI Services:**
  - Vertex AI (orchestration layer)
  - Gemini 2.5 Flash TTS (voice calls)
  - Together.ai (text chat)

### CODING CONVENTIONS
- **Backend:** snake_case (e.g., get_property_data)
- **Middleware:** camelCase (e.g., authMiddleware)
- **Frontend:** kebab-case (e.g., user-dashboard.vue)

---

## USER TYPES

### SUBSCRIBERS (PAID)
- Service contractors (HVAC, plumbing, landscaping, etc.)
- Real estate investors (wholesalers, fix-and-flip, agents)
- Pay monthly/yearly subscriptions
- Purchase tokens for AI services
- Access to leads, CRM, AI tools

### HOMEOWNERS (FREE)
- Search for service providers
- Post job requests for contractor bidding
- Leave reviews for contractors
- No subscription required

### ADMINISTRATORS
- Platform owners/staff
- Full control over pricing, tokens, verification
- Access to usage analytics, audit logs
- User support and refund management

---

## PHASED IMPLEMENTATION PLAN

### PHASE 1: FOUNDATION (Weeks 1-4)
- Database schema and migrations
- API integrations (Miami-Dade County)
- Authentication and user management
- Basic backend routes
- Token system implementation
- Admin panel backend

### PHASE 2: FRONTEND & ONBOARDING (Weeks 5-8)
- Next.js application setup
- User onboarding wizard
- Subscriber dashboard (search, filters, map)
- Admin dashboard UI
- Payment integration (Stripe)
- CRM deployment and integration

### PHASE 3: AI INTEGRATION (Weeks 9-12)
- Vertex AI setup
- AI chat assistant (Together.ai)
- AI voice assistant (Gemini TTS + Twilio)
- Email workflows (SendGrid + BullMQ)
- Event-driven automation (appointment booking, follow-ups)
- AI configuration UI for subscribers

### PHASE 4: TESTING & LAUNCH (Weeks 13-16)
- Unit testing (Jest, 80% coverage)
- Integration testing
- UI testing (Cypress)
- Load testing
- Security audit
- Staging environment deployment
- Production launch
- User onboarding and support documentation

### PHASE 5: EXPANSION (Post-Launch)
- FSBO scraping (Zillow, FSBO.com, Craigslist)
- Broward County API integration
- Palm Beach County API integration
- Additional features based on user feedback
- Mobile app (future consideration)

---

## KEY METRICS & SUCCESS CRITERIA

### BUSINESS METRICS
- Monthly Recurring Revenue (MRR) target: $15,000 by Month 6
- Subscriber count target: 130 users by Month 6 (50 Product A, 80 Product B)
- Token revenue target: 30% of total revenue
- Churn rate target: < 10% monthly
- Customer acquisition cost (CAC): < $150

### TECHNICAL METRICS
- API response time: < 500ms (95th percentile)
- System uptime: 99.9%
- Database query performance: < 100ms (average)
- Search results: < 2 seconds for complex filters
- Token deduction processing: < 50ms

### USER METRICS
- Onboarding completion rate: > 80%
- Daily active users: > 40%
- Average session duration: > 10 minutes
- Search-to-saved-lead conversion: > 20%
- AI voice call success rate: > 70%

---

## COMPLIANCE & LEGAL

### DATA PRIVACY
- CCPA compliance (California Consumer Privacy Act)
- US data privacy laws
- No GDPR required (US-only operation)

### DATA SOURCES
- Miami-Dade County public records (official API access)
- Property Appraiser public data
- Clerk of Courts public records
- FSBO listings (publicly available on websites)
- All data sources are public records - no privacy violations

### SECURITY
- Encryption at rest (database)
- Encryption in transit (TLS 1.3)
- API key encryption (Google Cloud KMS)
- Rate limiting (prevent abuse)
- Audit logging (all admin actions)
- SQL injection prevention (parameterized queries)
- XSS protection (input sanitization)

---

## RISKS & MITIGATION

### TECHNICAL RISKS
**Risk:** Miami-Dade API access delayed/denied  
**Mitigation:** Use placeholder data, manual CSV uploads, focus on frontend/backend development

**Risk:** Google Cloud costs exceed budget  
**Mitigation:** Start with minimal instance sizes, monitor usage daily, set budget alerts

**Risk:** AI costs unpredictable  
**Mitigation:** Token system allows dynamic pricing adjustments, admin controls for cost caps

### BUSINESS RISKS
**Risk:** Low subscriber adoption  
**Mitigation:** Free trial period, competitive pricing, strong value proposition vs Angi

**Risk:** High churn rate  
**Mitigation:** Exclusive leads, AI automation, integrated CRM reduce friction

**Risk:** Competitor response  
**Mitigation:** Focus on Miami-Dade specialization, AI personalization, flat pricing

### OPERATIONAL RISKS
**Risk:** Manual verification bottleneck  
**Mitigation:** Automated license verification (future), clear SLA for manual review

**Risk:** Support ticket volume  
**Mitigation:** Comprehensive onboarding, help documentation, AI chat support

---

## BUDGET & RESOURCES

### INFRASTRUCTURE COSTS (MONTHLY)
- Google Cloud Run (3 services): $30-40
- Cloud SQL (PostgreSQL): $15-25
- Cloud Memorystore (Redis): $15-25
- Cloud Storage: $1-5
- Firebase Auth: $0 (free tier)
- **Total:** ~$76/month

**Google Cloud Free Credits:** $300 (covers 4 months)

### THIRD-PARTY SERVICES (MONTHLY)
- Stripe: 2.9% + $0.30 per transaction
- SendGrid: $19.95 for 50K emails (or free tier: 100/day)
- Twilio: Pay-as-you-go (passed to users via tokens)
- Together.ai: Pay-as-you-go (passed to users via tokens)
- Vertex AI/Gemini: Pay-as-you-go (passed to users via tokens)

### DATA ACCESS COSTS (MONTHLY)
- Miami-Dade Records folder: $110/month
- Miami-Dade Recording Images: $420/month
- Miami-Dade Marriage records: $110/month
- **Total:** $640/month (one-time approval pending)

### DEVELOPMENT RESOURCES
- 1 Full-stack developer (primary)
- 1 Product owner/architect (you)
- External contractor support (as needed for Scrapy/Python)

---

## SUCCESS DEFINITION

**PHASE 1 SUCCESS:**
- Database schema deployed and seeded
- Miami-Dade API integration functional (or placeholder working)
- Authentication flow working
- Basic property search endpoint returns results
- Token system deducts correctly
- Admin panel can modify pricing

**PHASE 2 SUCCESS:**
- User can complete onboarding wizard
- User can search properties with filters
- User can save leads
- User can purchase subscription via Stripe
- Admin can verify/reject user licenses
- CRM shows synced contacts

**PHASE 3 SUCCESS:**
- AI chat responds to user questions with context
- AI voice call successfully books appointment
- Email workflow sends confirmation after appointment
- Subscriber can upload custom scripts for AI
- Token usage logs correctly track costs

**LAUNCH SUCCESS:**
- 10 beta users complete onboarding
- 5 beta users upgrade to paid subscription
- 0 critical bugs in production
- Average user satisfaction score > 4/5
- System handles 100 concurrent users without degradation

---

## APPENDICES

### DOCUMENT REFERENCES
- 02_DATABASE_SCHEMA.md - Complete PostgreSQL schema
- 03_API_SPECIFICATIONS.md - All API endpoints and contracts
- 04_MIAMI_DADE_API.md - County API integration details
- 05_TOKEN_SYSTEM.md - Token economics and implementation
- 06_AI_ARCHITECTURE.md - AI services and workflows
- 07_SUBSCRIBER_ONBOARDING.md - User flows and UI specs
- 08_ADMIN_BACKEND.md - Admin panel specifications
- 09_SECURITY_COMPLIANCE.md - Security measures and compliance
- 10_TESTING_STRATEGY.md - Testing frameworks and coverage goals

### CONTACT INFORMATION
- **Project Owner:** Gabriel Sebastian
- **Email:** thedevingrey@gmail.com
- **Company:** Gabe Sebastian Enterprises
- **Registered IP:** 10.56.251.3

### EXTERNAL ACCOUNTS
- **Miami-Dade API:** Auth Key 5A0C2347-6BF3-4229-ADD3-05CDD7B96320
- **GitHub Repository:** [TO BE PROVIDED]
- **Google Cloud Project:** [TO BE CREATED]
- **Stripe Account:** [TO BE CREATED]
- **Twilio Account:** [TO BE CREATED]
