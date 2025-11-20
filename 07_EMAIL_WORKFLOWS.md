# Email Workflows and SendGrid Integration

## Document Information
- **Version:** 1.0
- **Last Updated:** 2025-11-20
- **Status:** PRODUCTION READY
- **Dependencies:** 06_BULLMQ_WORKERS.md, 02_DATABASE_SCHEMA.md, 04_TOKEN_SYSTEM.md

---

## Table of Contents
1. [SendGrid Integration Overview](#sendgrid-integration-overview)
2. [Email Template Specifications](#email-template-specifications)
3. [Workflow Triggers](#workflow-triggers)
4. [Dynamic Template Variables](#dynamic-template-variables)
5. [Email Personalization Engine](#email-personalization-engine)
6. [Drip Campaign Sequences](#drip-campaign-sequences)
7. [Unsubscribe Management](#unsubscribe-management)
8. [Webhook Handling](#webhook-handling)
9. [Email Analytics](#email-analytics)
10. [Testing and Quality Assurance](#testing-and-quality-assurance)

---

## SendGrid Integration Overview

### Why SendGrid

**Decision Rationale:**
- **Cost-Effective:** $19.95/mo for 50K emails (vs MailChimp $299/mo)
- **Transactional + Marketing:** Single platform for all email types
- **Dynamic Templates:** HTML templates with variable substitution
- **Webhook Events:** Track opens, clicks, bounces, unsubscribes
- **High Deliverability:** 95%+ inbox placement rate
- **API-First:** Programmatic control via REST API
- **Scalability:** Handles 100K+ emails/day on paid plans

**Account Setup:**
```
Plan: Essentials ($19.95/mo for 50K emails)
Estimated Usage: 5K-10K emails/month initially
Domain Authentication: miamidadesaas.com
Sender Email: leads@miamidadesaas.com
Reply-To: support@miamidadesaas.com
```

---

### SDK Configuration

**Installation:**
```bash
npm install @sendgrid/mail
```

**Configuration:**
```javascript
// config/sendgrid.js
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Default sender configuration
const DEFAULT_SENDER = {
  email: 'leads@miamidadesaas.com',
  name: 'Miami-Dade Property Leads'
};

const SENDER_EMAILS = {
  leads: 'leads@miamidadesaas.com',
  welcome: 'welcome@miamidadesaas.com',
  digest: 'digest@miamidadesaas.com',
  billing: 'billing@miamidadesaas.com',
  support: 'support@miamidadesaas.com',
  admin: 'admin@miamidadesaas.com'
};

module.exports = {
  sgMail,
  DEFAULT_SENDER,
  SENDER_EMAILS
};
```

**Environment Variables:**
```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_WEBHOOK_SECRET=your_webhook_verification_secret
SENDGRID_DOMAIN=miamidadesaas.com
```

---

## Email Template Specifications

### Template Architecture

**Template Storage:** SendGrid Dynamic Templates (cloud-hosted HTML)

**Template ID Naming Convention:**
```
d-[template_purpose]_[version]

Examples:
d-new_lead_alert_v1
d-welcome_email_v1
d-daily_digest_v1
d-payment_receipt_v1
```

**Template Categories:**
1. **Transactional** - Immediate action emails (receipts, confirmations)
2. **Notification** - Lead alerts, system notifications
3. **Digest** - Daily/weekly summary emails
4. **Marketing** - Onboarding sequences, feature announcements
5. **Administrative** - Account management, security alerts

---

### Template 1: New Lead Alert

**Template ID:** `d-new_lead_alert_v1`

**Purpose:** Notify subscriber immediately when new lead matches their criteria

**Trigger:** Lead generation worker creates matching lead

**Token Cost:** 1 token (email = $0.0001, markup to $0.001)

**Subject Line:**
```
🏠 New {{ lead_type }} Lead: {{ property_address }}
```

**HTML Structure:**
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Lead Alert</title>
  <style>
    body { font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 20px auto; background: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; padding: 30px 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 30px 20px; }
    .lead-card { background: #f9f9f9; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 4px; }
    .lead-score { display: inline-block; background: #667eea; color: white; padding: 5px 15px; border-radius: 20px; font-weight: bold; font-size: 14px; }
    .property-details { margin: 15px 0; }
    .property-details p { margin: 8px 0; color: #333; }
    .cta-button { display: block; background: #667eea; color: white; text-align: center; padding: 15px 30px; text-decoration: none; border-radius: 4px; margin: 20px 0; font-weight: bold; }
    .cta-button:hover { background: #5568d3; }
    .footer { background: #f4f4f4; padding: 20px; text-align: center; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🏠 New Lead Alert</h1>
      <p>A new {{ lead_type }} lead matches your criteria</p>
    </div>
    
    <div class="content">
      <p>Hi {{ subscriber_name }},</p>
      <p>Great news! We've found a new property lead that matches your search criteria:</p>
      
      <div class="lead-card">
        <div style="margin-bottom: 15px;">
          <span class="lead-score">Score: {{ lead_score }}/100</span>
          <span style="margin-left: 10px; color: #667eea; font-weight: bold;">{{ lead_type_display }}</span>
        </div>
        
        <div class="property-details">
          <p><strong>Address:</strong> {{ property_address }}</p>
          <p><strong>Owner:</strong> {{ owner_name }}</p>
          <p><strong>Estimated Equity:</strong> {{ estimated_equity }}</p>
          <p><strong>Property Type:</strong> {{ property_type }}</p>
          <p><strong>Building Size:</strong> {{ building_sqft }} sq ft</p>
          <p><strong>Lot Size:</strong> {{ lot_size_acres }} acres</p>
          <p><strong>Year Built:</strong> {{ year_built }}</p>
        </div>
        
        {{#if motivation_indicators}}
        <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #ddd;">
          <p style="margin: 5px 0; color: #d9534f;"><strong>🔥 Motivation Indicators:</strong></p>
          <ul style="margin: 10px 0; padding-left: 20px;">
            {{#each motivation_indicators}}
            <li>{{ this }}</li>
            {{/each}}
          </ul>
        </div>
        {{/if}}
      </div>
      
      <a href="{{ view_lead_url }}" class="cta-button">View Full Lead Details</a>
      
      <p style="font-size: 14px; color: #666; margin-top: 20px;">
        This lead was generated on {{ lead_date }} based on recent property records from Miami-Dade County.
      </p>
    </div>
    
    <div class="footer">
      <p>Miami-Dade Property Leads</p>
      <p>
        <a href="{{ dashboard_url }}" style="color: #667eea;">Dashboard</a> | 
        <a href="{{ settings_url }}" style="color: #667eea;">Notification Settings</a> | 
        <a href="{{ unsubscribe_url }}" style="color: #999;">Unsubscribe</a>
      </p>
      <p style="margin-top: 15px;">
        This email consumed 1 token. Current balance: {{ token_balance }} tokens.
      </p>
    </div>
  </div>
</body>
</html>
```

**Dynamic Template Data Structure:**
```javascript
{
  subscriber_name: "John",
  lead_type: "new_homeowner",
  lead_type_display: "New Homeowner",
  lead_score: 85,
  property_address: "123 Main St, Miami, FL 33134",
  owner_name: "Smith, John & Jane",
  estimated_equity: "$125,000",
  property_type: "Single Family",
  building_sqft: "2,150",
  lot_size_acres: "0.25",
  year_built: "1985",
  motivation_indicators: [
    "Recent purchase (30 days ago)",
    "First-time homeowner detected",
    "Move-in ready condition"
  ],
  lead_date: "November 20, 2025",
  view_lead_url: "https://app.miamidadesaas.com/leads/12345",
  dashboard_url: "https://app.miamidadesaas.com/dashboard",
  settings_url: "https://app.miamidadesaas.com/settings/notifications",
  unsubscribe_url: "https://app.miamidadesaas.com/unsubscribe?token=abc123",
  token_balance: "4,999"
}
```

---

### Template 2: Welcome Email

**Template ID:** `d-welcome_email_v1`

**Purpose:** Onboard new subscribers after signup and license verification

**Trigger:** User completes signup and email verification

**Token Cost:** FREE (welcome emails don't consume tokens)

**Subject Line:**
```
Welcome to Miami-Dade Property Leads, {{ first_name }}! 🎉
```

**Key Sections:**
1. Welcome message and account confirmation
2. Quick start guide (3 steps)
3. Account details (subscription type, token balance)
4. Feature highlights
5. Support contact information

**Dynamic Template Data:**
```javascript
{
  first_name: "John",
  account_type: "Product A - Contractor Leads",
  monthly_price: "$49",
  token_balance: "5,000",
  setup_guide_url: "https://app.miamidadesaas.com/onboarding",
  dashboard_url: "https://app.miamidadesaas.com/dashboard",
  knowledge_base_url: "https://help.miamidadesaas.com",
  support_email: "support@miamidadesaas.com",
  activation_date: "November 20, 2025"
}
```

---

### Template 3: Daily Digest

**Template ID:** `d-daily_digest_v1`

**Purpose:** Send daily summary of new leads matching subscriber criteria

**Trigger:** Scheduled daily at 8:00 AM EST (only if new leads exist)

**Token Cost:** 1 token per digest

**Subject Line:**
```
📊 Your Daily Lead Digest - {{ total_leads }} New Leads ({{ date }})
```

**Key Sections:**
1. Summary stats (total leads, avg score, lead type breakdown)
2. Top 5 leads (highest scores)
3. Lead list (up to 20 leads)
4. Quick action buttons
5. Performance trends

**Dynamic Template Data:**
```javascript
{
  subscriber_name: "John",
  date: "Wednesday, November 20, 2025",
  total_leads: 12,
  avg_score: 82,
  lead_type_breakdown: {
    new_homeowner: 8,
    foreclosure: 2,
    fsbo_candidate: 2
  },
  top_leads: [
    {
      address: "456 Oak Ave, Miami, FL",
      owner: "Johnson, Robert",
      type: "New Homeowner",
      score: 92,
      equity: "$180,000",
      url: "https://app.miamidadesaas.com/leads/12346"
    },
    // ... 4 more
  ],
  all_leads: [
    // ... up to 20 leads
  ],
  dashboard_url: "https://app.miamidadesaas.com/dashboard",
  leads_url: "https://app.miamidadesaas.com/leads",
  settings_url: "https://app.miamidadesaas.com/settings/notifications",
  unsubscribe_digest_url: "https://app.miamidadesaas.com/settings/notifications?disable=daily_digest"
}
```

**Skip Logic:**
```javascript
// Don't send digest if no new leads
if (todays_leads.length === 0 && subscriber.preferences.skip_empty_digests) {
  return { skipped: true, reason: 'no_new_leads' };
}
```

---

### Template 4: Weekly Report

**Template ID:** `d-weekly_report_v1`

**Purpose:** Weekly performance summary and insights

**Trigger:** Every Monday 9:00 AM EST

**Token Cost:** 1 token per report

**Subject Line:**
```
📈 Your Weekly Report - {{ week_start }} to {{ week_end }}
```

**Key Sections:**
1. Week overview (leads generated, contacted, converted)
2. Lead quality metrics (avg score, response rate)
3. Top performing lead types
4. Geographic distribution (heatmap of lead locations)
5. Recommendations for next week

**Dynamic Template Data:**
```javascript
{
  subscriber_name: "John",
  week_start: "November 13",
  week_end: "November 19, 2025",
  total_leads: 68,
  leads_contacted: 42,
  conversion_rate: "18%",
  avg_lead_score: 79,
  response_rate: "62%",
  top_lead_type: "New Homeowner",
  top_city: "Miami",
  recommendations: [
    "Focus on Coral Gables - highest conversion rate this week",
    "New homeowner leads had 25% higher response rate",
    "Consider increasing outreach in Kendall area"
  ],
  dashboard_url: "https://app.miamidadesaas.com/dashboard",
  analytics_url: "https://app.miamidadesaas.com/analytics"
}
```

---

### Template 5: Payment Receipt

**Template ID:** `d-payment_receipt_v1`

**Purpose:** Transaction confirmation for subscription and token purchases

**Trigger:** Successful Stripe charge

**Token Cost:** FREE (billing emails don't consume tokens)

**Subject Line:**
```
Receipt for Your Purchase - {{ amount_paid }} ({{ date }})
```

**Key Sections:**
1. Transaction details (amount, date, payment method)
2. Purchase breakdown (subscription vs tokens)
3. Updated account balance
4. Invoice download link
5. Billing support contact

**Dynamic Template Data:**
```javascript
{
  customer_name: "John Smith",
  charge_id: "ch_abc123xyz",
  amount_paid: "$49.00",
  payment_date: "November 20, 2025",
  payment_method: "Visa ending in 4242",
  purchase_type: "Subscription Renewal",
  subscription_plan: "Product A - Contractor Leads",
  billing_period: "December 20, 2025 - January 19, 2026",
  tokens_purchased: "10,000",
  previous_balance: "2,340",
  new_balance: "12,340",
  invoice_url: "https://app.miamidadesaas.com/billing/invoices/inv_abc123",
  invoice_pdf_url: "https://app.miamidadesaas.com/billing/invoices/inv_abc123.pdf",
  billing_portal_url: "https://billing.stripe.com/p/session/abc123",
  support_email: "billing@miamidadesaas.com"
}
```

---

### Template 6: Trial Expiration Warning

**Template ID:** `d-trial_expiring_v1`

**Purpose:** Remind free trial users of upcoming expiration

**Trigger:** 7 days, 3 days, 1 day before trial ends

**Token Cost:** FREE (system emails don't consume tokens)

**Subject Line:**
```
⏰ Your Trial Ends in {{ days_remaining }} Days
```

**Key Sections:**
1. Trial status and expiration date
2. Usage summary (leads viewed, tokens used)
3. Subscription options and pricing
4. Upgrade call-to-action
5. FAQ about subscription

**Dynamic Template Data:**
```javascript
{
  subscriber_name: "John",
  days_remaining: 3,
  trial_end_date: "November 23, 2025",
  leads_viewed: 47,
  tokens_used: "1,830",
  tokens_remaining: "3,170",
  subscription_options: [
    {
      name: "Product A - Contractor Leads",
      price: "$49/month",
      features: ["New homeowner leads", "5K tokens/month", "AI chat assistant"]
    },
    {
      name: "Product B - Investor Leads",
      price: "$49/month",
      features: ["Distressed properties", "5K tokens/month", "AI voice assistant"]
    }
  ],
  upgrade_url: "https://app.miamidadesaas.com/billing/subscribe",
  faq_url: "https://help.miamidadesaas.com/faq"
}
```

---

### Template 7: Low Token Balance Alert

**Template ID:** `d-low_tokens_v1`

**Purpose:** Alert subscriber when token balance falls below threshold

**Trigger:** Token balance < 500 (configurable per subscriber)

**Token Cost:** FREE (system alerts don't consume tokens)

**Subject Line:**
```
⚠️ Low Token Balance - {{ token_balance }} Tokens Remaining
```

**Key Sections:**
1. Current token balance
2. Recent usage breakdown
3. Token purchase options
4. Auto-recharge setup option
5. Usage optimization tips

**Dynamic Template Data:**
```javascript
{
  subscriber_name: "John",
  token_balance: "450",
  threshold: "500",
  tokens_used_today: "150",
  usage_breakdown: {
    voice_calls: "120 tokens (6 calls)",
    sms: "20 tokens (2 messages)",
    emails: "10 tokens (10 emails)"
  },
  purchase_options: [
    { amount: "10,000 tokens", price: "$50", url: "..." },
    { amount: "25,000 tokens", price: "$100", url: "..." },
    { amount: "50,000 tokens", price: "$175", url: "..." }
  ],
  auto_recharge_setup_url: "https://app.miamidadesaas.com/settings/auto-recharge",
  usage_tips: [
    "Use email alerts instead of SMS to save tokens",
    "Daily digests use 1 token vs 1 token per lead alert",
    "Voice calls are most efficient for high-value leads"
  ]
}
```

---

### Template 8: License Verification Required

**Template ID:** `d-license_verification_v1`

**Purpose:** Request contractor license verification (Product A subscribers)

**Trigger:** Signup without immediate license upload, or license expired

**Token Cost:** FREE (account management emails)

**Subject Line:**
```
Action Required: Verify Your Contractor License
```

**Key Sections:**
1. Verification requirement explanation
2. Upload instructions
3. Accepted document types
4. Processing timeline
5. Consequences of non-verification

**Dynamic Template Data:**
```javascript
{
  subscriber_name: "John",
  account_status: "Pending Verification",
  verification_deadline: "November 27, 2025",
  accepted_documents: [
    "State contractor license",
    "Business license",
    "Professional certification"
  ],
  upload_url: "https://app.miamidadesaas.com/settings/verification",
  support_email: "support@miamidadesaas.com"
}
```

---

## Workflow Triggers

### Event-Based Triggers

| Trigger Event | Email Template | Priority | Delay |
|---|---|---|---|
| New lead matches criteria | New Lead Alert | HIGH | Immediate |
| User signup complete | Welcome Email | NORMAL | Immediate |
| Successful payment | Payment Receipt | NORMAL | Immediate |
| Token balance < threshold | Low Token Alert | NORMAL | Immediate |
| License expires in 30 days | License Renewal | LOW | Scheduled |
| Trial expires in 7/3/1 days | Trial Expiring | NORMAL | Scheduled |
| Lead contacted (CRM update) | Follow-up Sequence | LOW | 2 days |
| No login for 14 days | Re-engagement | LOW | Scheduled |

---

### Time-Based Triggers (Cron)

**Daily Digest - 8:00 AM EST**
```javascript
const schedule_daily_digest = new CronJob(
  '0 8 * * *',  // 8 AM daily
  async () => {
    // Query all subscribers with daily_digest enabled
    const subscribers = await db.query(`
      SELECT id, email, first_name, token_balance
      FROM users
      WHERE subscription_status = 'active'
        AND email_preferences->>'daily_digest' = 'true'
    `);
    
    for (const subscriber of subscribers.rows) {
      // Queue digest job for each subscriber
      await email_queue.add(
        'daily_digest',
        {
          subscriber_id: subscriber.id,
          email_type: 'daily_digest'
        },
        {
          priority: 3,
          attempts: 5
        }
      );
    }
  },
  null,
  true,
  'America/New_York'
);
```

**Weekly Report - Monday 9:00 AM EST**
```javascript
const schedule_weekly_report = new CronJob(
  '0 9 * * 1',  // 9 AM every Monday
  async () => {
    const subscribers = await db.query(`
      SELECT id, email, first_name
      FROM users
      WHERE subscription_status = 'active'
        AND email_preferences->>'weekly_report' = 'true'
    `);
    
    for (const subscriber of subscribers.rows) {
      await email_queue.add(
        'weekly_report',
        {
          subscriber_id: subscriber.id,
          email_type: 'weekly_report',
          week_start: moment().subtract(7, 'days').format('YYYY-MM-DD'),
          week_end: moment().format('YYYY-MM-DD')
        },
        { priority: 3 }
      );
    }
  },
  null,
  true,
  'America/New_York'
);
```

---

### API-Triggered Workflows

**Lead Generation Trigger:**
```javascript
// After lead inserted into database
async function trigger_lead_alert(lead_id) {
  // Find matching subscribers
  const matching_subscribers = await db.query(`
    SELECT u.id, u.email, u.first_name, u.token_balance
    FROM users u
    JOIN subscriber_lead_criteria slc ON u.id = slc.subscriber_id
    JOIN leads l ON l.lead_type = ANY(slc.lead_types)
    WHERE l.id = $1
      AND u.subscription_status = 'active'
      AND u.token_balance >= 1
      AND u.email_preferences->>'lead_alerts' = 'true'
  `, [lead_id]);
  
  for (const subscriber of matching_subscribers.rows) {
    await email_queue.add(
      'new_lead_alert',
      {
        subscriber_id: subscriber.id,
        lead_id: lead_id,
        email_type: 'new_lead_alert'
      },
      {
        priority: 2,  // HIGH priority
        attempts: 5
      }
    );
  }
}
```

**Payment Success Trigger:**
```javascript
// Stripe webhook handler
router.post('/webhooks/stripe', async (req, res) => {
  const event = req.body;
  
  if (event.type === 'charge.succeeded') {
    const charge = event.data.object;
    
    // Queue receipt email
    await email_queue.add(
      'payment_receipt',
      {
        subscriber_id: charge.metadata.user_id,
        email_type: 'payment_receipt',
        stripe_charge_id: charge.id,
        amount: charge.amount,
        tokens_purchased: charge.metadata.tokens_purchased || 0
      },
      { priority: 3 }
    );
  }
  
  res.json({ received: true });
});
```

---

## Dynamic Template Variables

### Common Variables (All Templates)

```javascript
{
  // Subscriber info
  subscriber_name: "John",
  subscriber_email: "john@example.com",
  account_type: "Product A - Contractor Leads",
  token_balance: "4,999",
  
  // URLs
  dashboard_url: "https://app.miamidadesaas.com/dashboard",
  settings_url: "https://app.miamidadesaas.com/settings",
  unsubscribe_url: "https://app.miamidadesaas.com/unsubscribe?token=abc123",
  support_email: "support@miamidadesaas.com",
  
  // Branding
  company_name: "Miami-Dade Property Leads",
  company_logo_url: "https://app.miamidadesaas.com/logo.png",
  company_address: "Miami, FL 33130",
  
  // Date/Time
  current_date: "November 20, 2025",
  current_year: "2025"
}
```

---

### Lead-Specific Variables

```javascript
{
  // Lead identification
  lead_id: 12345,
  lead_type: "new_homeowner",
  lead_type_display: "New Homeowner",
  lead_source: "warranty_deed",
  lead_score: 85,
  lead_date: "November 20, 2025",
  
  // Property details
  property_address: "123 Main St, Miami, FL 33134",
  property_city: "Miami",
  property_zip: "33134",
  property_type: "Single Family",
  building_sqft: "2,150",
  lot_size_acres: "0.25",
  year_built: "1985",
  bedrooms: "3",
  bathrooms: "2",
  
  // Owner info
  owner_name: "Smith, John & Jane",
  owner_phone: "(305) 555-1234",  // If enriched
  
  // Financial data
  last_sale_price: "$450,000",
  assessed_value: "$475,000",
  mortgage_balance: "$350,000",
  estimated_equity: "$125,000",
  
  // Motivation indicators
  motivation_indicators: [
    "Recent purchase (30 days ago)",
    "First-time homeowner detected"
  ],
  
  // Actions
  view_lead_url: "https://app.miamidadesaas.com/leads/12345",
  call_lead_url: "https://app.miamidadesaas.com/leads/12345/call",
  add_to_crm_url: "https://app.miamidadesaas.com/leads/12345/add-to-crm"
}
```

---

### Conditional Variables (Handlebars Helpers)

**If/Else Logic:**
```handlebars
{{#if motivation_indicators}}
  <div class="alert alert-warning">
    <strong>High Motivation Detected:</strong>
    <ul>
      {{#each motivation_indicators}}
      <li>{{ this }}</li>
      {{/each}}
    </ul>
  </div>
{{else}}
  <p>No special motivation indicators detected.</p>
{{/if}}
```

**Conditional Formatting:**
```handlebars
{{#if lead_score >= 90}}
  <span class="badge badge-danger">🔥 HOT LEAD</span>
{{else if lead_score >= 75}}
  <span class="badge badge-warning">⚡ WARM LEAD</span>
{{else}}
  <span class="badge badge-secondary">Cold Lead</span>
{{/if}}
```

**Number Formatting:**
```javascript
// In template data preparation
const template_data = {
  estimated_equity: equity.toLocaleString('en-US', { 
    style: 'currency', 
    currency: 'USD',
    minimumFractionDigits: 0 
  }),
  building_sqft: sqft.toLocaleString('en-US')
};
```

---

## Email Personalization Engine

### Subscriber Preference System

**Database Schema (email_preferences JSONB column in users table):**
```json
{
  "lead_alerts": true,
  "daily_digest": true,
  "weekly_report": true,
  "marketing_emails": false,
  "skip_empty_digests": true,
  "digest_time": "08:00",
  "digest_timezone": "America/New_York",
  "lead_score_threshold": 75,
  "max_daily_emails": 10
}
```

**Preference API Endpoint:**
```javascript
router.put('/api/settings/email-preferences', authenticate_user, async (req, res) => {
  const { preferences } = req.body;
  
  await db.query(
    'UPDATE users SET email_preferences = $1 WHERE id = $2',
    [JSON.stringify(preferences), req.user.id]
  );
  
  res.json({ success: true });
});
```

---

### Personalization Rules

**1. Lead Score Filtering:**
```javascript
// Only send alerts for leads above threshold
if (lead.lead_score < subscriber.email_preferences.lead_score_threshold) {
  return { skipped: true, reason: 'below_score_threshold' };
}
```

**2. Daily Email Cap:**
```javascript
// Check how many emails sent today
const todays_emails = await db.query(`
  SELECT COUNT(*) FROM email_logs
  WHERE user_id = $1 AND sent_at::date = CURRENT_DATE
`, [subscriber_id]);

if (todays_emails.rows[0].count >= subscriber.email_preferences.max_daily_emails) {
  return { skipped: true, reason: 'daily_cap_reached' };
}
```

**3. Geographic Filtering:**
```javascript
// Subscriber only wants leads in specific cities
if (subscriber.lead_criteria.cities && subscriber.lead_criteria.cities.length > 0) {
  if (!subscriber.lead_criteria.cities.includes(property.city)) {
    return { skipped: true, reason: 'outside_geographic_criteria' };
  }
}
```

**4. Time-Based Sending:**
```javascript
// Respect subscriber's preferred digest time
const subscriber_timezone = subscriber.email_preferences.digest_timezone || 'America/New_York';
const preferred_hour = parseInt(subscriber.email_preferences.digest_time.split(':')[0]);

const send_at = moment.tz(subscriber_timezone).hour(preferred_hour).minute(0);

await email_queue.add(
  'daily_digest',
  { subscriber_id, email_type: 'daily_digest' },
  { 
    priority: 3,
    delay: send_at.diff(moment(), 'milliseconds')
  }
);
```

---

## Drip Campaign Sequences

### Onboarding Sequence (Days 1-14)

**Purpose:** Guide new subscribers through platform features

**Sequence:**

**Day 1 (Immediate):** Welcome Email
- Account confirmation
- Quick start guide
- Feature overview

**Day 2 (24 hours later):**
```javascript
await email_queue.add(
  'onboarding_day_2',
  {
    subscriber_id,
    email_type: 'onboarding_tips',
    sequence_day: 2
  },
  {
    priority: 3,
    delay: 86400000  // 24 hours in milliseconds
  }
);
```
- Template: How to set lead criteria
- Video tutorial: Customizing your dashboard
- CTA: Complete lead criteria setup

**Day 4 (3 days later):**
- Template: Understanding lead scores
- Best practices for contacting leads
- CTA: Make your first contact

**Day 7 (6 days later):**
- Template: Advanced features (AI assistant, CRM integration)
- Success stories from other subscribers
- CTA: Schedule demo call

**Day 14 (13 days later):**
- Template: Mid-trial check-in
- Usage summary
- Upgrade prompt (if on trial)

---

### Re-engagement Sequence (Inactive Subscribers)

**Trigger:** No login for 14 days

**Day 14:**
```javascript
await email_queue.add(
  'reengagement_1',
  {
    subscriber_id,
    email_type: 'we_miss_you',
    last_login: subscriber.last_login_at
  },
  { priority: 3 }
);
```
- Subject: "We Miss You! New Leads Waiting 👋"
- Summary of leads generated since last login
- Feature updates
- CTA: View new leads

**Day 21 (If still no login):**
- Subject: "Your Account Status"
- Reminder of subscription benefits
- Offer help/support
- CTA: Reactivate account

**Day 28 (Final attempt):**
- Subject: "Last Chance: {{ leads_count }} Leads Waiting"
- Urgent tone
- Limited-time discount offer
- CTA: Login or cancel

---

## Unsubscribe Management

### Unsubscribe Token Generation

```javascript
// Generate secure unsubscribe token
const crypto = require('crypto');

function generate_unsubscribe_token(user_id, email) {
  const payload = `${user_id}:${email}:${process.env.UNSUBSCRIBE_SECRET}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

// Include in all email templates
const unsubscribe_token = generate_unsubscribe_token(subscriber.id, subscriber.email);
const unsubscribe_url = `${process.env.FRONTEND_URL}/unsubscribe?token=${unsubscribe_token}&email=${encodeURIComponent(subscriber.email)}`;
```

---

### Unsubscribe Endpoint

```javascript
router.get('/unsubscribe', async (req, res) => {
  const { token, email } = req.query;
  
  // Find user by email
  const user = await db.query('SELECT * FROM users WHERE email = $1', [email]);
  
  if (user.rows.length === 0) {
    return res.status(404).send('User not found');
  }
  
  // Verify token
  const expected_token = generate_unsubscribe_token(user.rows[0].id, email);
  if (token !== expected_token) {
    return res.status(403).send('Invalid unsubscribe token');
  }
  
  // Show unsubscribe preferences page
  res.render('unsubscribe', {
    user: user.rows[0],
    preferences: user.rows[0].email_preferences
  });
});

router.post('/unsubscribe', async (req, res) => {
  const { token, email, preferences } = req.body;
  
  // Verify token (same as above)
  
  // Update preferences
  await db.query(
    'UPDATE users SET email_preferences = $1 WHERE email = $2',
    [JSON.stringify(preferences), email]
  );
  
  // Log unsubscribe
  await db.query(`
    INSERT INTO email_unsubscribe_logs (
      user_id,
      email,
      unsubscribe_type,
      unsubscribed_at
    ) VALUES ($1, $2, $3, NOW())
  `, [user.rows[0].id, email, 'partial']);
  
  res.render('unsubscribe_success');
});
```

---

### Unsubscribe Options

**Granular Control:**
- ☐ New lead alerts (individual emails per lead)
- ☑ Daily digest (summary of leads)
- ☑ Weekly report (performance summary)
- ☐ Marketing emails (feature announcements)
- ☐ Billing notifications (CANNOT unsubscribe - legal requirement)

**One-Click Unsubscribe (List-Unsubscribe Header):**
```javascript
const msg = {
  to: subscriber.email,
  from: 'leads@miamidadesaas.com',
  subject: 'New Lead Alert',
  templateId: 'd-new_lead_alert_v1',
  dynamicTemplateData: template_data,
  headers: {
    'List-Unsubscribe': `<${unsubscribe_url}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
  }
};
```

---

## Webhook Handling

### SendGrid Event Webhook

**Webhook URL:** `https://api.miamidadesaas.com/webhooks/sendgrid`

**Events Tracked:**
- `delivered` - Email successfully delivered
- `open` - Email opened by recipient
- `click` - Link clicked in email
- `bounce` - Email bounced (hard or soft)
- `dropped` - Email dropped (spam, invalid)
- `unsubscribe` - Recipient unsubscribed
- `spamreport` - Email marked as spam

**Webhook Handler:**
```javascript
router.post('/webhooks/sendgrid', async (req, res) => {
  const events = req.body;
  
  for (const event of events) {
    // Verify webhook signature (security)
    const is_valid = verify_sendgrid_signature(
      req.headers['x-twilio-email-event-webhook-signature'],
      req.headers['x-twilio-email-event-webhook-timestamp'],
      JSON.stringify(event)
    );
    
    if (!is_valid) {
      console.error('Invalid SendGrid webhook signature');
      continue;
    }
    
    // Process event
    await process_sendgrid_event(event);
  }
  
  res.status(200).send('OK');
});

async function process_sendgrid_event(event) {
  const { event: event_type, email, sg_message_id, timestamp } = event;
  
  // Update email log
  await db.query(`
    UPDATE email_logs
    SET status = $1, 
        last_event_at = to_timestamp($2)
    WHERE sendgrid_message_id = $3
  `, [event_type, timestamp, sg_message_id]);
  
  // Handle specific events
  switch (event_type) {
    case 'bounce':
      await handle_bounce(email, event);
      break;
    case 'spamreport':
      await handle_spam_report(email, event);
      break;
    case 'unsubscribe':
      await handle_unsubscribe(email, event);
      break;
    case 'open':
      await track_email_open(sg_message_id, timestamp);
      break;
    case 'click':
      await track_email_click(sg_message_id, event.url, timestamp);
      break;
  }
}

async function handle_bounce(email, event) {
  if (event.type === 'blocked' || event.reason.includes('invalid')) {
    // Hard bounce - disable email sending
    await db.query(`
      UPDATE users
      SET email_verified = false,
          email_bounce_reason = $1,
          email_disabled_at = NOW()
      WHERE email = $2
    `, [event.reason, email]);
    
    console.warn(`Email disabled due to hard bounce: ${email}`);
  }
}

async function handle_spam_report(email, event) {
  // Auto-unsubscribe from marketing emails
  await db.query(`
    UPDATE users
    SET email_preferences = jsonb_set(
      email_preferences,
      '{marketing_emails}',
      'false'
    )
    WHERE email = $1
  `, [email]);
  
  console.warn(`User marked email as spam: ${email}`);
}
```

---

## Email Analytics

### Key Metrics Dashboard

**Database Views:**
```sql
-- Email performance summary
CREATE VIEW email_performance_summary AS
SELECT 
  email_type,
  COUNT(*) AS total_sent,
  COUNT(*) FILTER (WHERE status = 'delivered') AS delivered,
  COUNT(*) FILTER (WHERE status = 'open') AS opened,
  COUNT(*) FILTER (WHERE status = 'click') AS clicked,
  COUNT(*) FILTER (WHERE status = 'bounce') AS bounced,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'delivered') / COUNT(*), 2) AS delivery_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'open') / COUNT(*) FILTER (WHERE status = 'delivered'), 2) AS open_rate,
  ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'click') / COUNT(*) FILTER (WHERE status = 'open'), 2) AS click_through_rate
FROM email_logs
WHERE sent_at >= NOW() - INTERVAL '30 days'
GROUP BY email_type;
```

**API Endpoint:**
```javascript
router.get('/api/admin/email-analytics', authenticate_admin, async (req, res) => {
  const summary = await db.query('SELECT * FROM email_performance_summary');
  
  res.json({
    summary: summary.rows,
    industry_benchmarks: {
      delivery_rate: 95,
      open_rate: 20,
      click_through_rate: 2.5
    }
  });
});
```

---

### A/B Testing Framework

**Subject Line Testing:**
```javascript
async function send_ab_test_email(subscriber_id, test_config) {
  // Randomly assign variant (50/50 split)
  const variant = Math.random() < 0.5 ? 'A' : 'B';
  
  const subject = variant === 'A' 
    ? test_config.subject_a 
    : test_config.subject_b;
  
  await email_queue.add(
    'ab_test_email',
    {
      subscriber_id,
      email_type: test_config.email_type,
      variant,
      subject
    }
  );
  
  // Log test assignment
  await db.query(`
    INSERT INTO ab_test_assignments (
      test_id,
      subscriber_id,
      variant,
      assigned_at
    ) VALUES ($1, $2, $3, NOW())
  `, [test_config.test_id, subscriber_id, variant]);
}

// Analyze test results after 7 days
async function analyze_ab_test(test_id) {
  const results = await db.query(`
    SELECT 
      a.variant,
      COUNT(*) AS sent,
      COUNT(*) FILTER (WHERE e.status = 'open') AS opens,
      COUNT(*) FILTER (WHERE e.status = 'click') AS clicks
    FROM ab_test_assignments a
    JOIN email_logs e ON e.user_id = a.subscriber_id
    WHERE a.test_id = $1
    GROUP BY a.variant
  `, [test_id]);
  
  // Calculate statistical significance
  const variant_a = results.rows.find(r => r.variant === 'A');
  const variant_b = results.rows.find(r => r.variant === 'B');
  
  const open_rate_a = variant_a.opens / variant_a.sent;
  const open_rate_b = variant_b.opens / variant_b.sent;
  
  const winner = open_rate_a > open_rate_b ? 'A' : 'B';
  
  return {
    variant_a: { ...variant_a, open_rate: open_rate_a },
    variant_b: { ...variant_b, open_rate: open_rate_b },
    winner,
    lift: Math.abs(open_rate_a - open_rate_b) / Math.min(open_rate_a, open_rate_b)
  };
}
```

---

## Testing and Quality Assurance

### Pre-Launch Checklist

**SendGrid Configuration:**
- [ ] Domain authentication (SPF, DKIM, DMARC)
- [ ] Sender email addresses verified
- [ ] API key generated with appropriate permissions
- [ ] Webhook endpoint configured and tested
- [ ] Suppression lists imported (bounced emails, unsubscribes)

**Template Testing:**
- [ ] All 8 templates created in SendGrid
- [ ] Dynamic variables tested with sample data
- [ ] Conditional logic verified (if/else statements)
- [ ] Mobile responsiveness tested (Gmail, Apple Mail, Outlook)
- [ ] Links tested (tracking enabled)
- [ ] Unsubscribe links functional

**Integration Testing:**
- [ ] BullMQ email worker tested end-to-end
- [ ] Token deduction logic verified
- [ ] Email logs properly recorded
- [ ] Webhook events properly handled
- [ ] Error handling tested (SendGrid API failures)

---

### Email Testing Tools

**SendGrid Test Mode:**
```javascript
// Use sandbox mode for testing (no actual emails sent)
if (process.env.NODE_ENV === 'development') {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
  sgMail.setSubstitutionWrappers('{{', '}}');
  
  // Override recipient to test email
  msg.to = process.env.TEST_EMAIL || 'test@example.com';
  msg.mailSettings = {
    sandboxMode: {
      enable: true
    }
  };
}
```

**Litmus Email Previews:**
- Test rendering across 100+ email clients
- Check spam score before sending
- Validate HTML/CSS compatibility

**Manual Testing Checklist:**
```javascript
// scripts/test_email_templates.js
const test_templates = [
  { template_id: 'd-new_lead_alert_v1', data: sample_lead_data },
  { template_id: 'd-welcome_email_v1', data: sample_welcome_data },
  { template_id: 'd-daily_digest_v1', data: sample_digest_data },
  // ... all templates
];

for (const template of test_templates) {
  await sgMail.send({
    to: 'test@miamidadesaas.com',
    from: 'test@miamidadesaas.com',
    templateId: template.template_id,
    dynamicTemplateData: template.data
  });
  
  console.log(`✓ Test email sent for ${template.template_id}`);
}
```

---

## Related Documents
- **06_BULLMQ_WORKERS.md** - Email worker implementation details
- **04_TOKEN_SYSTEM.md** - Token deduction for email sending
- **02_DATABASE_SCHEMA.md** - email_logs and email_preferences tables
- **05_API_ENDPOINTS.md** - Email preference API endpoints

---

## Changelog

**Version 1.0 (2025-11-20)**
- Initial documentation
- Defined 8 core email templates
- Documented workflow triggers (event-based and time-based)
- Added personalization engine with preference system
- Created drip campaign sequences
- Documented unsubscribe management
- Added webhook handling for SendGrid events
- Included email analytics and A/B testing framework

---

**Document Status:** PRODUCTION READY  
**Next Review:** After Phase 1 SendGrid setup  
**Owner:** Gabe Sebastian (thedevingrey@gmail.com)
