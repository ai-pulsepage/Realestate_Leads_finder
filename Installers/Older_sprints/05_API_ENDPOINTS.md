# API ENDPOINT SPECIFICATIONS
## REST API REFERENCE

**Document Version:** 1.0  
**Base URL:** https://api.yourplatform.com  
**Authentication:** Firebase JWT Bearer token

---

## AUTHENTICATION

### POST /auth/register
**Description:** Register new user account  
**Authentication:** None required  
**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "securepassword123",
  "user_type": "subscriber"
}
```

**Response 201:**
```json
{
  "user_id": "uuid",
  "email": "user@example.com",
  "user_type": "subscriber",
  "firebase_uid": "firebase_uid_string"
}
```

**Errors:**
- 400: Email already exists
- 400: Invalid email format
- 400: Password too weak

---

### POST /auth/login
**Description:** Login with Firebase (handled client-side)  
**Note:** Uses Firebase SDK on frontend, returns JWT token

---

## PROPERTIES

### POST /properties/search
**Description:** Search properties with filters  
**Authentication:** Required  
**Rate Limit:** 100 requests per minute  
**Request Body:**
```json
{
  "zip_codes": ["33101", "33102"],
  "radius_miles": 15,
  "center_lat": 25.7617,
  "center_lng": -80.1918,
  "min_distressed_score": 50,
  "max_distressed_score": 100,
  "min_new_homeowner_score": 70,
  "property_type": "single_family",
  "has_pool": true,
  "min_bedrooms": 3,
  "max_bedrooms": 5,
  "min_sqft": 1500,
  "max_sqft": 3000,
  "is_fsbo": false,
  "limit": 100,
  "offset": 0
}
```

**Response 200:**
```json
{
  "properties": [
    {
      "property_id": "uuid",
      "full_address": "123 Main St, Miami, FL 33101",
      "zip_code": "33101",
      "property_type": "single_family",
      "bedrooms": 3,
      "bathrooms": 2.0,
      "square_feet": 1800,
      "pool": true,
      "distressed_score": 75,
      "new_homeowner_score": 90,
      "days_since_sale": 15,
      "assessed_value": 350000,
      "estimated_equity": 100000,
      "owner_name": "John Doe",
      "out_of_state_owner": false,
      "intent_breakdown": {
        "tax_lien": 30,
        "foreclosure": 45
      }
    }
  ],
  "count": 1,
  "total_available": 150,
  "limit": 100,
  "offset": 0
}
```

**Errors:**
- 401: Unauthorized (invalid token)
- 400: Invalid filter parameters
- 403: Subscription tier does not allow this search type

---

### GET /properties/:property_id
**Description:** Get detailed property information  
**Authentication:** Required  
**URL Parameters:**
- property_id (UUID)

**Response 200:**
```json
{
  "property_id": "uuid",
  "folio_number": "01-3117-001-0010",
  "full_address": "123 Main St, Miami, FL 33101",
  "street_address": "123 Main St",
  "city": "Miami",
  "state": "FL",
  "zip_code": "33101",
  "county": "Miami-Dade",
  "property_type": "single_family",
  "bedrooms": 3,
  "bathrooms": 2.0,
  "square_feet": 1800,
  "lot_size_sqft": 7500,
  "year_built": 1995,
  "pool": true,
  "stories": 1,
  "owner_name": "John Doe",
  "owner_first_name": "John",
  "owner_last_name": "Doe",
  "owner_type": "individual",
  "mailing_address": "123 Main St, Miami, FL 33101",
  "out_of_state_owner": false,
  "assessed_value": 350000,
  "market_value": 450000,
  "last_sale_price": 425000,
  "last_sale_date": "2024-03-15",
  "estimated_equity": 100000,
  "mortgage_balance": 350000,
  "distressed_score": 75,
  "intent_breakdown": {
    "tax_lien": 30,
    "foreclosure": 45
  },
  "has_tax_lien": true,
  "is_foreclosure": true,
  "is_new_homeowner": true,
  "sale_date": "2024-11-01",
  "days_since_sale": 15,
  "new_homeowner_score": 90,
  "phone_number": null,
  "email": null,
  "enriched_at": null,
  "source": "miami_dade_api",
  "last_updated": "2025-11-14T10:30:00Z",
  "fsbo_data": null
}
```

**Errors:**
- 404: Property not found
- 401: Unauthorized

---

### POST /properties/:property_id/enrich
**Description:** Enrich property with contact data (costs tokens)  
**Authentication:** Required  
**Token Cost:** 50 tokens  
**URL Parameters:**
- property_id (UUID)

**Response 200:**
```json
{
  "property_id": "uuid",
  "phone_number": "+1-305-555-1234",
  "email": "owner@example.com",
  "enriched_at": "2025-11-14T10:35:00Z",
  "tokens_used": 50,
  "cost": 0.05
}
```

**Errors:**
- 402: Insufficient tokens
- 404: Property not found
- 503: Enrichment service unavailable

---

## LEADS

### POST /leads/save
**Description:** Save property as lead  
**Authentication:** Required  
**Request Body:**
```json
{
  "property_id": "uuid",
  "notes": "High potential foreclosure"
}
```

**Response 201:**
```json
{
  "lead_id": "uuid",
  "property_id": "uuid",
  "user_id": "uuid",
  "lead_score": 75,
  "status": "new",
  "notes": "High potential foreclosure",
  "created_at": "2025-11-14T10:40:00Z"
}
```

---

### GET /leads
**Description:** Get user's saved leads  
**Authentication:** Required  
**Query Parameters:**
- status (optional): "new", "contacted", "qualified", "disqualified", "closed"
- limit (default: 50)
- offset (default: 0)

**Response 200:**
```json
{
  "leads": [
    {
      "lead_id": "uuid",
      "property_id": "uuid",
      "property_address": "123 Main St, Miami, FL 33101",
      "lead_score": 75,
      "status": "new",
      "notes": "High potential foreclosure",
      "contact_attempts": 0,
      "last_contact_date": null,
      "created_at": "2025-11-14T10:40:00Z"
    }
  ],
  "count": 1,
  "limit": 50,
  "offset": 0
}
```

---

### PUT /leads/:lead_id
**Description:** Update lead status and notes  
**Authentication:** Required  
**Request Body:**
```json
{
  "status": "contacted",
  "notes": "Left voicemail, will follow up tomorrow"
}
```

**Response 200:**
```json
{
  "lead_id": "uuid",
  "status": "contacted",
  "notes": "Left voicemail, will follow up tomorrow",
  "updated_at": "2025-11-14T11:00:00Z"
}
```

---

### DELETE /leads/:lead_id
**Description:** Delete saved lead  
**Authentication:** Required  
**Response 204:** No content

---

### POST /leads/export
**Description:** Export leads to CSV  
**Authentication:** Required  
**Request Body:**
```json
{
  "lead_ids": ["uuid1", "uuid2"],
  "format": "csv"
}
```

**Response 200:**
```json
{
  "download_url": "https://storage.googleapis.com/bucket/exports/leads_20251114.csv",
  "expires_at": "2025-11-14T12:00:00Z"
}
```

---

## SAVED SEARCHES

### POST /searches/save
**Description:** Save search criteria with optional alerts  
**Authentication:** Required  
**Request Body:**
```json
{
  "search_name": "Foreclosures in Kendall",
  "search_criteria": {
    "zip_codes": ["33156", "33157"],
    "min_distressed_score": 70,
    "is_foreclosure": true
  },
  "alert_frequency": "daily"
}
```

**Response 201:**
```json
{
  "search_id": "uuid",
  "search_name": "Foreclosures in Kendall",
  "search_criteria": {},
  "alert_frequency": "daily",
  "created_at": "2025-11-14T11:10:00Z"
}
```

---

### GET /searches
**Description:** Get user's saved searches  
**Authentication:** Required  
**Response 200:**
```json
{
  "searches": [
    {
      "search_id": "uuid",
      "search_name": "Foreclosures in Kendall",
      "search_criteria": {},
      "alert_frequency": "daily",
      "last_run_at": "2025-11-14T10:00:00Z",
      "created_at": "2025-11-14T11:10:00Z"
    }
  ]
}
```

---

## TOKENS

### GET /tokens/balance
**Description:** Get user's token balance and usage  
**Authentication:** Required  
**Response 200:**
```json
{
  "token_balance": 8500,
  "tokens_used_today": 150,
  "tokens_used_30_days": 2340,
  "token_preferences": {
    "daily_limit": null,
    "auto_recharge": false,
    "recharge_threshold": 0,
    "recharge_amount": 0
  }
}
```

---

### GET /tokens/bundles
**Description:** Get available token bundles for purchase  
**Authentication:** Required  
**Response 200:**
```json
{
  "bundles": [
    {
      "bundle_id": "uuid",
      "bundle_name": "10000 Credits",
      "token_amount": 10000,
      "price": 10.00,
      "price_per_token": 0.001
    }
  ]
}
```

---

### POST /tokens/purchase
**Description:** Initiate token purchase via Stripe  
**Authentication:** Required  
**Request Body:**
```json
{
  "bundle_id": "uuid"
}
```

**Response 200:**
```json
{
  "client_secret": "stripe_payment_intent_secret",
  "bundle": {
    "name": "10000 Credits",
    "tokens": 10000,
    "price": 10.00
  }
}
```

---

### GET /tokens/usage-history
**Description:** Get token usage history  
**Authentication:** Required  
**Query Parameters:**
- limit (default: 100)

**Response 200:**
```json
{
  "history": [
    {
      "action_type": "ai_voice_call_3min",
      "tokens_used": 20,
      "actual_cost": 0.0018,
      "timestamp": "2025-11-14T10:30:00Z"
    }
  ]
}
```

---

## AI SERVICES

### POST /ai/chat
**Description:** Send message to AI assistant  
**Authentication:** Required  
**Token Cost:** 5 tokens per 1K response tokens  
**Request Body:**
```json
{
  "message": "Find me foreclosures under 300k in Kendall with high equity"
}
```

**Response 200:**
```json
{
  "message": "I found 12 properties matching your criteria...",
  "tokens_used": 5,
  "suggested_searches": [
    {
      "search_criteria": {
        "zip_codes": ["33156", "33157"],
        "max_sale_price": 300000,
        "is_foreclosure": true
      }
    }
  ]
}
```

**Errors:**
- 402: Insufficient tokens
- 429: Daily token limit reached

---

### POST /ai/voice/call-lead
**Description:** Make AI voice call to lead  
**Authentication:** Required  
**Token Cost:** 20 tokens (3-min call)  
**Request Body:**
```json
{
  "lead_id": "uuid",
  "script_id": "uuid",
  "schedule_time": null
}
```

**Response 202:**
```json
{
  "call_id": "uuid",
  "status": "queued",
  "estimated_start": "2025-11-14T11:20:00Z",
  "tokens_reserved": 20
}
```

**Errors:**
- 402: Insufficient tokens
- 404: Lead or script not found
- 400: Invalid phone number

---

### GET /ai/voice/call/:call_id
**Description:** Get voice call status and transcript  
**Authentication:** Required  
**Response 200:**
```json
{
  "call_id": "uuid",
  "lead_id": "uuid",
  "call_type": "outbound",
  "script_used": "uuid",
  "phone_number": "+1-305-555-1234",
  "call_transcript": "Full transcript of conversation...",
  "call_outcome": "interested",
  "duration_seconds": 185,
  "tokens_used": 20,
  "cost": 0.0018,
  "created_at": "2025-11-14T11:20:00Z"
}
```

---

## SUBSCRIBER PROFILE

### GET /profile
**Description:** Get subscriber profile  
**Authentication:** Required  
**Response 200:**
```json
{
  "profile_id": "uuid",
  "user_id": "uuid",
  "business_name": "ABC HVAC Services",
  "business_type": "hvac",
  "service_area": {
    "zip_codes": ["33101", "33102"]
  },
  "services_offered": ["hvac_repair", "ac_installation"],
  "verified": true,
  "license_number": "CAC123456",
  "business_phone": "+1-305-555-5555",
  "business_email": "contact@abchvac.com",
  "website_url": "https://abchvac.com",
  "portfolio_images": [
    {
      "filename": "job1.jpg",
      "url": "https://storage.googleapis.com/..."
    }
  ]
}
```

---

### PUT /profile
**Description:** Update subscriber profile  
**Authentication:** Required  
**Request Body:**
```json
{
  "business_name": "ABC HVAC Services",
  "business_phone": "+1-305-555-5555",
  "services_offered": ["hvac_repair", "ac_installation", "emergency_service"]
}
```

**Response 200:**
```json
{
  "profile_id": "uuid",
  "updated_at": "2025-11-14T11:30:00Z"
}
```

---

### POST /profile/upload-document
**Description:** Upload license/insurance document  
**Authentication:** Required  
**Content-Type:** multipart/form-data  
**Request Body:**
- file (binary)
- document_type ("license", "insurance", "bond")

**Response 200:**
```json
{
  "document_id": "uuid",
  "filename": "license.pdf",
  "url": "https://storage.googleapis.com/...",
  "document_type": "license",
  "uploaded_at": "2025-11-14T11:35:00Z",
  "verification_status": "pending"
}
```

---

### POST /profile/upload-portfolio-image
**Description:** Upload job portfolio image  
**Authentication:** Required  
**Content-Type:** multipart/form-data  
**Request Body:**
- file (binary)
- description (optional)

**Response 200:**
```json
{
  "image_id": "uuid",
  "filename": "job1.jpg",
  "url": "https://storage.googleapis.com/...",
  "uploaded_at": "2025-11-14T11:40:00Z"
}
```

---

## SUBSCRIPTIONS

### GET /subscriptions/plans
**Description:** Get available subscription plans  
**Authentication:** None  
**Response 200:**
```json
{
  "plans": [
    {
      "plan_id": "uuid",
      "plan_name": "contractor",
      "monthly_price": 49.00,
      "yearly_price": 490.00,
      "base_tokens_monthly": 10000,
      "features": {
        "new_homeowner_leads": true,
        "distressed_leads": false,
        "ai_chat": true,
        "ai_voice": false
      }
    }
  ]
}
```

---

### POST /subscriptions/subscribe
**Description:** Subscribe to plan via Stripe  
**Authentication:** Required  
**Request Body:**
```json
{
  "plan_id": "uuid",
  "billing_cycle": "monthly",
  "payment_method_id": "stripe_payment_method_id"
}
```

**Response 200:**
```json
{
  "subscription_id": "stripe_subscription_id",
  "status": "active",
  "current_period_end": "2025-12-14T11:45:00Z",
  "tokens_granted": 10000
}
```

---

### GET /subscriptions/current
**Description:** Get current subscription details  
**Authentication:** Required  
**Response 200:**
```json
{
  "subscription_id": "stripe_sub_id",
  "plan_name": "contractor",
  "status": "active",
  "current_period_start": "2025-11-14T11:45:00Z",
  "current_period_end": "2025-12-14T11:45:00Z",
  "cancel_at_period_end": false
}
```

---

### POST /subscriptions/cancel
**Description:** Cancel subscription  
**Authentication:** Required  
**Response 200:**
```json
{
  "subscription_id": "stripe_sub_id",
  "status": "active",
  "cancel_at_period_end": true,
  "cancels_at": "2025-12-14T11:45:00Z"
}
```

---

## ADMIN ENDPOINTS

### GET /admin/users
**Description:** List all users with filters  
**Authentication:** Admin only  
**Query Parameters:**
- user_type (optional)
- subscription_status (optional)
- verified (optional)
- limit (default: 50)
- offset (default: 0)

**Response 200:**
```json
{
  "users": [
    {
      "user_id": "uuid",
      "email": "user@example.com",
      "user_type": "subscriber",
      "subscription_tier": "contractor",
      "subscription_status": "active",
      "token_balance": 8500,
      "created_at": "2025-10-01T00:00:00Z",
      "last_login": "2025-11-14T10:00:00Z"
    }
  ],
  "total": 150,
  "limit": 50,
  "offset": 0
}
```

---

### PUT /admin/users/:user_id/verify
**Description:** Verify user license  
**Authentication:** Admin only  
**Request Body:**
```json
{
  "verified": true,
  "verification_notes": "License verified via FL DBPR website"
}
```

**Response 200:**
```json
{
  "user_id": "uuid",
  "verified": true,
  "verified_at": "2025-11-14T12:00:00Z"
}
```

---

### POST /admin/tokens/grant
**Description:** Grant tokens to user  
**Authentication:** Admin only  
**Request Body:**
```json
{
  "user_id": "uuid",
  "tokens": 1000,
  "reason": "Refund for billing error"
}
```

**Response 200:**
```json
{
  "transaction_id": "uuid",
  "user_id": "uuid",
  "tokens_granted": 1000,
  "new_balance": 9500
}
```

---

### PUT /admin/pricing/subscriptions
**Description:** Update subscription plan pricing  
**Authentication:** Admin only  
**Request Body:**
```json
{
  "plan_id": "uuid",
  "monthly_price": 59.00,
  "yearly_price": 590.00,
  "base_tokens_monthly": 12000
}
```

**Response 200:**
```json
{
  "plan_id": "uuid",
  "updated_at": "2025-11-14T12:05:00Z"
}
```

---

### PUT /admin/pricing/tokens
**Description:** Update token costs  
**Authentication:** Admin only  
**Request Body:**
```json
{
  "action_type": "ai_voice_call_3min",
  "tokens_required": 25,
  "actual_cost_usd": 0.002
}
```

**Response 200:**
```json
{
  "action_type": "ai_voice_call_3min",
  "tokens_required": 25,
  "updated_at": "2025-11-14T12:10:00Z"
}
```

---

### GET /admin/analytics/tokens
**Description:** Get token usage analytics  
**Authentication:** Admin only  
**Query Parameters:**
- start_date (optional)
- end_date (optional)

**Response 200:**
```json
{
  "overview": {
    "total_tokens_consumed": 1234567,
    "total_tokens_purchased": 1500000,
    "net_pool_balance": 265433,
    "revenue_subscriptions": 12450.00,
    "revenue_tokens": 8920.00,
    "actual_ai_costs": 1234.56,
    "gross_margin_percent": 86.2
  },
  "breakdown_by_action": [
    {
      "action_type": "ai_voice_call_3min",
      "usage_count": 45123,
      "total_tokens": 902460,
      "total_cost": 81.22,
      "revenue": 902.46
    }
  ]
}
```

---

## HEALTH & MONITORING

### GET /health
**Description:** Health check endpoint  
**Authentication:** None  
**Response 200:**
```json
{
  "status": "healthy",
  "timestamp": "2025-11-14T12:15:00Z",
  "services": {
    "database": "healthy",
    "redis": "healthy",
    "miami_dade_api": "healthy"
  }
}
```

**Response 503:**
```json
{
  "status": "degraded",
  "timestamp": "2025-11-14T12:15:00Z",
  "services": {
    "database": "healthy",
    "redis": "unhealthy",
    "miami_dade_api": "healthy"
  }
}
```

---

## ERROR RESPONSE FORMAT

All errors follow consistent format:

```json
{
  "error": "Human-readable error message",
  "code": "MACHINE_READABLE_CODE",
  "details": {
    "field": "specific_field_name",
    "constraint": "validation_rule_violated"
  }
}
```

**Common HTTP Status Codes:**
- 200: Success
- 201: Created
- 204: No Content
- 400: Bad Request (validation error)
- 401: Unauthorized (missing/invalid token)
- 402: Payment Required (insufficient tokens)
- 403: Forbidden (subscription tier restriction)
- 404: Not Found
- 429: Too Many Requests (rate limit)
- 500: Internal Server Error
- 503: Service Unavailable

---

## RATE LIMITS

**Default Limits (per user):**
- Property search: 100 requests/minute
- Lead operations: 200 requests/minute
- AI chat: 30 requests/minute
- AI voice calls: 10 requests/minute
- Admin endpoints: 300 requests/minute

**Headers:**
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1699977600
```

---

## PAGINATION

All list endpoints support pagination:

**Query Parameters:**
- limit (default: 50, max: 500)
- offset (default: 0)

**Response includes:**
```json
{
  "items": [],
  "total": 1500,
  "limit": 50,
  "offset": 0,
  "has_more": true
}
```

---

## WEBHOOKS

### Stripe Payment Success
**URL:** POST /webhooks/stripe  
**Handled events:**
- payment_intent.succeeded
- customer.subscription.created
- customer.subscription.updated
- customer.subscription.deleted

### Twilio Call Status
**URL:** POST /webhooks/twilio/status  
**Handled events:**
- call-completed
- call-failed

---

## API VERSIONING

Current version: v1  
Base URL includes version: https://api.yourplatform.com/v1

Future versions will maintain backward compatibility or provide migration path.
