# BullMQ Workers and Job Queue Architecture

## Document Information
- **Version:** 1.0
- **Last Updated:** 2025-11-20
- **Status:** PRODUCTION READY
- **Dependencies:** 03_MIAMI_DADE_API.md, 02_DATABASE_SCHEMA.md, 04_TOKEN_SYSTEM.md

---

## Table of Contents
1. [BullMQ Architecture Overview](#bullmq-architecture-overview)
2. [Queue Definitions](#queue-definitions)
3. [Data Ingestion Workers](#data-ingestion-workers)
4. [Email Workflow Workers](#email-workflow-workers)
5. [Voice Assistant Workers](#voice-assistant-workers)
6. [SMS Notification Workers](#sms-notification-workers)
7. [Maintenance Workers](#maintenance-workers)
8. [Job Priority and Concurrency](#job-priority-and-concurrency)
9. [Error Handling and Dead Letter Queues](#error-handling-and-dead-letter-queues)
10. [Monitoring and Observability](#monitoring-and-observability)

---

## BullMQ Architecture Overview

### Why BullMQ Over Cron Jobs

**Decision Rationale:**
- **Dynamic Scheduling:** Subscriber-specific workflows (not fixed cron schedules)
- **Job Persistence:** Redis-backed, survives server restarts
- **Retry Logic:** Built-in exponential backoff and failure handling
- **Concurrency Control:** Process multiple jobs in parallel with rate limiting
- **Priority Queues:** Urgent jobs (subscriber queries) jump ahead of batch jobs
- **Observability:** Bull Board dashboard for real-time monitoring

**Use Cases:**
- Daily FTP file ingestion (scheduled)
- Subscriber-triggered property lookups (on-demand)
- Email workflows with delay/retry (dynamic)
- Voice assistant call queuing (rate-limited)
- Token expiration checks (periodic)

---

### Infrastructure Setup

**Redis Configuration:**
```javascript
// config/redis.js
const Redis = require('ioredis');

const redis_connection = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,  // Required for BullMQ
  enableReadyCheck: false
});

module.exports = redis_connection;
```

**Queue Initialization:**
```javascript
// queues/index.js
const { Queue } = require('bullmq');
const redis_connection = require('../config/redis');

// Data Ingestion Queues
const daily_ftp_queue = new Queue('daily-ftp-ingestion', { connection: redis_connection });
const weekly_ftp_queue = new Queue('weekly-ftp-ingestion', { connection: redis_connection });
const monthly_ftp_queue = new Queue('monthly-ftp-ingestion', { connection: redis_connection });
const api_query_queue = new Queue('api-property-lookup', { connection: redis_connection });

// Communication Queues
const email_queue = new Queue('email-workflows', { connection: redis_connection });
const voice_queue = new Queue('voice-assistant', { connection: redis_connection });
const sms_queue = new Queue('sms-notifications', { connection: redis_connection });

// Maintenance Queues
const lead_scoring_queue = new Queue('lead-scoring', { connection: redis_connection });
const data_cleanup_queue = new Queue('data-cleanup', { connection: redis_connection });

module.exports = {
  daily_ftp_queue,
  weekly_ftp_queue,
  monthly_ftp_queue,
  api_query_queue,
  email_queue,
  voice_queue,
  sms_queue,
  lead_scoring_queue,
  data_cleanup_queue
};
```

---

## Queue Definitions

### Queue Summary Table

| Queue Name | Purpose | Schedule | Priority | Concurrency | Retry Policy |
|---|---|---|---|---|---|
| `daily-ftp-ingestion` | Download daily FTP files | 6:00 AM EST daily | HIGH | 1 | 3 retries, 5 min delay |
| `weekly-ftp-ingestion` | Download weekly eviction/lien files | Mon 7:00 AM EST | MEDIUM | 1 | 3 retries, 10 min delay |
| `monthly-ftp-ingestion` | Download monthly probate files | 1st of month 8 AM | MEDIUM | 1 | 3 retries, 15 min delay |
| `api-property-lookup` | Real-time property queries | On-demand | URGENT | 10 | 3 retries, 2 sec delay |
| `email-workflows` | Send emails via SendGrid | On-demand | NORMAL | 50 | 5 retries, exponential |
| `voice-assistant` | Queue outbound calls | On-demand | HIGH | 5 | 3 retries, 30 sec delay |
| `sms-notifications` | Send SMS via Twilio | On-demand | NORMAL | 20 | 3 retries, 5 sec delay |
| `lead-scoring` | Recalculate lead scores | 2:00 AM EST daily | LOW | 5 | No retry (non-critical) |
| `data-cleanup` | Archive old logs | 3:00 AM EST daily | LOW | 1 | No retry |

---

## Data Ingestion Workers

### Worker 1: Daily FTP Ingestion

**File:** `workers/daily_ftp_ingestion_worker.js`

**Purpose:** Download and process daily FTP files from Miami-Dade (Cases.exp, Parties.exp, Dockets.exp)

**Schedule:** 6:00 AM EST every business day (Mon-Fri)

**Job Definition:**
```javascript
// Schedule daily job
const { CronJob } = require('cron');
const { daily_ftp_queue } = require('../queues');

const schedule_daily_ingestion = new CronJob(
  '0 6 * * 1-5',  // 6 AM Mon-Fri (EST - adjust for timezone)
  async () => {
    await daily_ftp_queue.add(
      'daily-ftp-download',
      {
        date: new Date().toISOString().split('T')[0],  // YYYY-MM-DD
        files: ['Cases.exp', 'Parties.exp', 'Dockets.exp', 'Docktext.exp']
      },
      {
        priority: 10,  // High priority
        attempts: 3,
        backoff: {
          type: 'fixed',
          delay: 300000  // 5 minutes
        }
      }
    );
  },
  null,
  true,
  'America/New_York'
);

schedule_daily_ingestion.start();
```

**Worker Implementation:**
```javascript
// workers/daily_ftp_ingestion_worker.js
const { Worker } = require('bullmq');
const redis_connection = require('../config/redis');
const ftp = require('basic-ftp');
const fs = require('fs');
const path = require('path');
const { parse_cases_file } = require('../parsers/cases_parser');
const { parse_parties_file } = require('../parsers/parties_parser');
const db = require('../config/database');

const daily_ftp_worker = new Worker(
  'daily-ftp-ingestion',
  async (job) => {
    const { date, files } = job.data;
    const temp_dir = `/tmp/miami_dade_daily/${date}`;
    
    job.updateProgress(0);
    
    try {
      // Step 1: Create temp directory
      if (!fs.existsSync(temp_dir)) {
        fs.mkdirSync(temp_dir, { recursive: true });
      }
      job.log(`Created temp directory: ${temp_dir}`);
      
      // Step 2: Connect to FTP server
      const ftp_client = new ftp.Client();
      ftp_client.ftp.verbose = true;
      
      await ftp_client.access({
        host: process.env.MIAMI_DADE_FTP_HOST,
        user: process.env.MIAMI_DADE_FTP_USER,
        password: process.env.MIAMI_DADE_FTP_PASSWORD,
        secure: false
      });
      
      job.updateProgress(10);
      job.log('Connected to FTP server');
      
      // Step 3: Download files
      const downloaded_files = [];
      for (let i = 0; i < files.length; i++) {
        const file_name = files[i];
        const local_path = path.join(temp_dir, file_name);
        
        job.log(`Downloading ${file_name}...`);
        await ftp_client.downloadTo(local_path, `/daily/${file_name}`);
        
        const file_size = fs.statSync(local_path).size;
        job.log(`Downloaded ${file_name} (${(file_size / 1024 / 1024).toFixed(2)} MB)`);
        
        downloaded_files.push({ name: file_name, path: local_path, size: file_size });
        
        job.updateProgress(10 + (i + 1) * 15);
      }
      
      ftp_client.close();
      job.updateProgress(50);
      
      // Step 4: Parse and stage data
      job.log('Parsing Cases.exp...');
      const cases_records = await parse_cases_file(path.join(temp_dir, 'Cases.exp'));
      job.log(`Parsed ${cases_records.length} case records`);
      
      job.log('Parsing Parties.exp...');
      const parties_records = await parse_parties_file(path.join(temp_dir, 'Parties.exp'));
      job.log(`Parsed ${parties_records.length} party records`);
      
      job.updateProgress(65);
      
      // Step 5: Truncate staging tables
      await db.query('TRUNCATE TABLE staging_official_records');
      await db.query('TRUNCATE TABLE staging_parties');
      job.log('Staging tables truncated');
      
      // Step 6: Bulk insert into staging
      job.log('Inserting into staging_official_records...');
      await bulk_insert_cases(cases_records);
      
      job.log('Inserting into staging_parties...');
      await bulk_insert_parties(parties_records);
      
      job.updateProgress(80);
      
      // Step 7: Transform and merge into production
      job.log('Transforming and merging into properties table...');
      const merge_result = await merge_staging_to_production();
      
      job.log(`Merged: ${merge_result.new_properties} new, ${merge_result.updated_properties} updated`);
      
      job.updateProgress(90);
      
      // Step 8: Generate new leads
      job.log('Generating leads from new properties...');
      const leads_result = await generate_leads_from_properties();
      
      job.log(`Generated: ${leads_result.new_homeowner_leads} Product A, ${leads_result.distressed_leads} Product B`);
      
      job.updateProgress(95);
      
      // Step 9: Archive files to Cloud Storage
      job.log('Archiving files to Cloud Storage...');
      await archive_to_cloud_storage(temp_dir, date);
      
      // Step 10: Cleanup temp directory
      fs.rmSync(temp_dir, { recursive: true, force: true });
      job.log('Temp directory cleaned up');
      
      job.updateProgress(100);
      
      // Step 11: Log ingestion summary
      await db.query(`
        INSERT INTO data_ingestion_logs (
          ingestion_type,
          ingestion_date,
          records_processed,
          new_properties,
          updated_properties,
          new_leads_generated,
          status,
          duration_seconds
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [
        'daily_ftp',
        date,
        cases_records.length,
        merge_result.new_properties,
        merge_result.updated_properties,
        leads_result.new_homeowner_leads + leads_result.distressed_leads,
        'success',
        Math.floor(job.finishedOn - job.processedOn) / 1000
      ]);
      
      return {
        success: true,
        date,
        files_downloaded: downloaded_files.length,
        records_processed: cases_records.length,
        new_properties: merge_result.new_properties,
        updated_properties: merge_result.updated_properties,
        leads_generated: leads_result.new_homeowner_leads + leads_result.distressed_leads
      };
      
    } catch (error) {
      job.log(`ERROR: ${error.message}`);
      
      // Log failure
      await db.query(`
        INSERT INTO data_ingestion_logs (
          ingestion_type,
          ingestion_date,
          status,
          error_message
        ) VALUES ($1, $2, $3, $4)
      `, ['daily_ftp', date, 'failed', error.message]);
      
      throw error;  // Will trigger retry
    }
  },
  {
    connection: redis_connection,
    concurrency: 1  // Only one daily ingestion at a time
  }
);

// Helper functions
async function bulk_insert_cases(records) {
  const batch_size = 1000;
  for (let i = 0; i < records.length; i += batch_size) {
    const batch = records.slice(i, i + batch_size);
    const values = batch.map(r => 
      `(${r.cfn_year}, ${r.cfn_seq}, '${r.case_type}', '${r.file_date}', '${r.folio_number}', '${r.property_address}')`
    ).join(',');
    
    await db.query(`
      INSERT INTO staging_official_records (cfn_year, cfn_seq, case_type, file_date, folio_number, property_address)
      VALUES ${values}
    `);
  }
}

async function bulk_insert_parties(records) {
  // Similar batch insert logic
}

async function merge_staging_to_production() {
  const result = await db.query(`
    INSERT INTO properties (
      folio_number,
      address,
      owner_name,
      last_sale_date,
      last_sale_price,
      property_type,
      data_source,
      last_updated
    )
    SELECT 
      s.folio_number,
      s.property_address,
      p.party_name,
      s.file_date,
      s.consideration_1,
      'single_family',
      'miami_dade_ftp',
      NOW()
    FROM staging_official_records s
    LEFT JOIN staging_parties p ON s.cfn_year = p.cfn_year AND s.cfn_seq = p.cfn_seq
    WHERE s.folio_number IS NOT NULL
    ON CONFLICT (folio_number) DO UPDATE SET
      owner_name = EXCLUDED.owner_name,
      last_sale_date = EXCLUDED.last_sale_date,
      last_updated = NOW()
    RETURNING (xmax = 0) AS inserted
  `);
  
  const new_count = result.rows.filter(r => r.inserted).length;
  const updated_count = result.rows.length - new_count;
  
  return {
    new_properties: new_count,
    updated_properties: updated_count
  };
}

async function generate_leads_from_properties() {
  // Product A: New homeowners (Warranty Deed in last 30 days)
  const new_homeowner_result = await db.query(`
    INSERT INTO leads (
      property_id,
      lead_type,
      lead_source,
      lead_date,
      contact_name,
      contact_address,
      lead_score,
      status
    )
    SELECT 
      p.id,
      'new_homeowner',
      'warranty_deed',
      p.last_sale_date,
      p.owner_name,
      p.address,
      85,
      'new'
    FROM properties p
    WHERE p.last_sale_date >= NOW() - INTERVAL '30 days'
      AND p.last_transaction_type = 'WD'
      AND NOT EXISTS (
        SELECT 1 FROM leads l WHERE l.property_id = p.id AND l.lead_type = 'new_homeowner'
      )
    RETURNING id
  `);
  
  // Product B: Distressed properties (Lis Pendens)
  const distressed_result = await db.query(`
    INSERT INTO leads (
      property_id,
      lead_type,
      lead_source,
      lead_date,
      contact_name,
      contact_address,
      lead_score,
      status
    )
    SELECT 
      p.id,
      'foreclosure',
      'lis_pendens',
      p.last_sale_date,
      p.owner_name,
      p.address,
      90,
      'new'
    FROM properties p
    WHERE p.last_transaction_type = 'LIS'
      AND NOT EXISTS (
        SELECT 1 FROM leads l WHERE l.property_id = p.id AND l.lead_type = 'foreclosure'
      )
    RETURNING id
  `);
  
  return {
    new_homeowner_leads: new_homeowner_result.rows.length,
    distressed_leads: distressed_result.rows.length
  };
}

async function archive_to_cloud_storage(local_dir, date) {
  const { Storage } = require('@google-cloud/storage');
  const storage = new Storage();
  const bucket = storage.bucket(process.env.GCS_BUCKET_NAME);
  
  const files = fs.readdirSync(local_dir);
  for (const file of files) {
    const local_path = path.join(local_dir, file);
    const gcs_path = `miami_dade_archives/daily/${date}/${file}`;
    
    await bucket.upload(local_path, {
      destination: gcs_path,
      metadata: {
        cacheControl: 'public, max-age=31536000'
      }
    });
  }
}

daily_ftp_worker.on('completed', (job, result) => {
  console.log(`✓ Daily FTP ingestion completed: ${result.records_processed} records processed`);
});

daily_ftp_worker.on('failed', (job, error) => {
  console.error(`✗ Daily FTP ingestion failed: ${error.message}`);
  // Send admin alert
  send_admin_alert({
    severity: 'critical',
    subject: 'Daily FTP Ingestion Failed',
    message: `Job ${job.id} failed: ${error.message}`,
    action_required: 'Check FTP credentials and server availability'
  });
});

module.exports = daily_ftp_worker;
```

---

### Worker 2: Weekly FTP Ingestion

**File:** `workers/weekly_ftp_ingestion_worker.js`

**Purpose:** Download weekly eviction and indebtedness files (distressed property indicators)

**Schedule:** Every Monday 7:00 AM EST

**Job Definition:**
```javascript
const schedule_weekly_ingestion = new CronJob(
  '0 7 * * 1',  // 7 AM every Monday
  async () => {
    await weekly_ftp_queue.add(
      'weekly-ftp-download',
      {
        date: new Date().toISOString().split('T')[0],
        files: ['Evictions.exp', 'Indebtedness.exp']
      },
      {
        priority: 5,
        attempts: 3,
        backoff: { type: 'fixed', delay: 600000 }  // 10 minutes
      }
    );
  },
  null,
  true,
  'America/New_York'
);
```

**Worker Implementation:**
```javascript
const weekly_ftp_worker = new Worker(
  'weekly-ftp-ingestion',
  async (job) => {
    const { date, files } = job.data;
    
    // Similar structure to daily worker
    // Key differences:
    // 1. Download from /weekly/ FTP directory
    // 2. Parse eviction records
    // 3. Match eviction addresses to property folios (geocoding)
    // 4. Insert into eviction_records and distressed_properties tables
    // 5. Generate Product B leads for subscribers
    
    // ... implementation details similar to daily worker
    
    return {
      success: true,
      eviction_records: 150,
      new_distressed_properties: 75,
      leads_generated: 75
    };
  },
  {
    connection: redis_connection,
    concurrency: 1
  }
);

module.exports = weekly_ftp_worker;
```

---

### Worker 3: Monthly FTP Ingestion

**File:** `workers/monthly_ftp_ingestion_worker.js`

**Purpose:** Download monthly probate and verdict files (high-priority estate sale leads)

**Schedule:** 1st of every month, 8:00 AM EST

**Job Definition:**
```javascript
const schedule_monthly_ingestion = new CronJob(
  '0 8 1 * *',  // 8 AM on 1st of month
  async () => {
    const last_month = new Date();
    last_month.setMonth(last_month.getMonth() - 1);
    const year_month = last_month.toISOString().slice(0, 7).replace('-', '');  // YYYYMM
    
    await monthly_ftp_queue.add(
      'monthly-ftp-download',
      {
        year_month,
        files: ['Probate.exp', 'Verdicts.exp']
      },
      {
        priority: 5,
        attempts: 3,
        backoff: { type: 'fixed', delay: 900000 }  // 15 minutes
      }
    );
  },
  null,
  true,
  'America/New_York'
);
```

**Worker Implementation:**
```javascript
const monthly_ftp_worker = new Worker(
  'monthly-ftp-ingestion',
  async (job) => {
    const { year_month, files } = job.data;
    
    // Download Probate.exp and Verdicts.exp
    // Parse probate cases
    // Match probate properties to folios
    // Insert into probate_cases table
    // Generate HIGH-PRIORITY Product B leads (probate = motivated sellers)
    // Alert Product B subscribers immediately (these are hot leads)
    
    return {
      success: true,
      probate_cases: 85,
      verdict_cases: 120,
      high_priority_leads: 85
    };
  },
  {
    connection: redis_connection,
    concurrency: 1
  }
);

module.exports = monthly_ftp_worker;
```

---

### Worker 4: Real-Time API Property Lookup

**File:** `workers/api_property_lookup_worker.js`

**Purpose:** Query Miami-Dade Official Records API for individual property lookups (subscriber-initiated)

**Trigger:** On-demand (when subscriber searches for specific property)

**Job Definition:**
```javascript
// In API endpoint: POST /api/properties/lookup
router.post('/properties/lookup', authenticate_user, async (req, res) => {
  const { folio_number, address } = req.body;
  const subscriber_id = req.user.id;
  
  // Check if property exists in database with recent data
  const existing_property = await db.query(
    'SELECT * FROM properties WHERE folio_number = $1 AND last_updated >= NOW() - INTERVAL \'30 days\'',
    [folio_number]
  );
  
  if (existing_property.rows.length > 0) {
    // Serve from database (no API call needed)
    return res.json({
      property: existing_property.rows[0],
      source: 'cached',
      age_days: Math.floor((Date.now() - existing_property.rows[0].last_updated) / (1000 * 60 * 60 * 24))
    });
  }
  
  // Queue API lookup job
  const job = await api_query_queue.add(
    'property-lookup',
    {
      folio_number,
      subscriber_id,
      triggered_at: new Date().toISOString()
    },
    {
      priority: 1,  // URGENT priority
      attempts: 3,
      backoff: { type: 'exponential', delay: 2000 }
    }
  );
  
  // Wait for job completion (with timeout)
  const result = await job.waitUntilFinished(queueEvents, 30000);  // 30 second timeout
  
  res.json(result);
});
```

**Worker Implementation:**
```javascript
const { query_official_records_with_retry } = require('../services/miami_dade_api');
const { transform_official_records_response } = require('../parsers/api_parser');

const api_lookup_worker = new Worker(
  'api-property-lookup',
  async (job) => {
    const { folio_number, subscriber_id } = job.data;
    
    job.log(`Querying Official Records API for folio: ${folio_number}`);
    
    // Step 1: Check daily spending cap
    await enforce_daily_cap();
    
    // Step 2: Query API
    const api_response = await query_official_records_with_retry({
      FOLIO_NUMBER: folio_number
    });
    
    job.log(`API returned ${api_response.OfficialRecords.length} records, consumed ${api_response.UnitsConsumed} units`);
    
    // Step 3: Transform response
    const transformed = transform_official_records_response(api_response);
    
    // Step 4: Upsert into database
    if (transformed.records.length > 0) {
      const primary_record = transformed.records[0];  // Most recent deed
      
      await db.query(`
        INSERT INTO properties (
          folio_number,
          address,
          owner_name,
          last_sale_date,
          last_sale_price,
          assessed_value,
          mortgage_balance,
          property_type,
          building_sqft,
          lot_size_acres,
          year_built,
          bedrooms,
          bathrooms,
          has_pool,
          is_waterfront,
          data_source,
          last_updated
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
        ON CONFLICT (folio_number) DO UPDATE SET
          owner_name = EXCLUDED.owner_name,
          last_sale_date = EXCLUDED.last_sale_date,
          last_sale_price = EXCLUDED.last_sale_price,
          assessed_value = EXCLUDED.assessed_value,
          mortgage_balance = EXCLUDED.mortgage_balance,
          last_updated = NOW()
      `, [
        primary_record.folio_number,
        primary_record.property_address,
        primary_record.grantor.primary_party,
        primary_record.recording_date,
        primary_record.sale_price,
        primary_record.assessed_value,
        primary_record.mortgage_amount,
        primary_record.property_type,
        primary_record.building_sqft,
        primary_record.lot_size,
        primary_record.year_built,
        primary_record.bedrooms,
        primary_record.bathrooms,
        primary_record.has_pool,
        primary_record.is_waterfront,
        'miami_dade_api'
      ]);
    }
    
    // Step 5: Log API usage
    await db.query(`
      INSERT INTO miami_dade_api_logs (
        query_type,
        query_params,
        units_consumed,
        remaining_balance,
        response_status,
        records_returned,
        triggered_by,
        subscriber_id
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `, [
      'FOLIO',
      JSON.stringify({ FOLIO_NUMBER: folio_number }),
      transformed.units_consumed,
      transformed.remaining_balance,
      transformed.records.length > 0 ? 'success' : 'no_data',
      transformed.records.length,
      'subscriber_query',
      subscriber_id
    ]);
    
    // Step 6: Check units balance
    await check_units_balance(transformed.remaining_balance);
    
    return {
      property: transformed.records[0] || null,
      total_records: transformed.records.length,
      units_consumed: transformed.units_consumed,
      remaining_balance: transformed.remaining_balance,
      source: 'api'
    };
  },
  {
    connection: redis_connection,
    concurrency: 10  // Allow 10 concurrent API queries
  }
);

async function enforce_daily_cap() {
  const DAILY_UNIT_CAP = 500;
  
  const result = await db.query(`
    SELECT COALESCE(SUM(units_consumed), 0) AS total
    FROM miami_dade_api_logs
    WHERE created_at::date = CURRENT_DATE
  `);
  
  if (result.rows[0].total >= DAILY_UNIT_CAP) {
    throw new Error('Daily unit cap reached. API queries disabled until tomorrow.');
  }
}

async function check_units_balance(remaining_balance) {
  if (remaining_balance < 500) {
    await send_admin_alert({
      severity: 'critical',
      subject: 'URGENT: Miami-Dade API Units Critical',
      message: `Remaining balance: ${remaining_balance} units. Service interruption imminent.`,
      action_required: 'IMMEDIATE RECHARGE REQUIRED'
    });
  } else if (remaining_balance < 1000) {
    await send_admin_alert({
      severity: 'warning',
      subject: 'Miami-Dade API Units Low',
      message: `Remaining balance: ${remaining_balance} units. Recharge recommended.`,
      action_required: 'Recharge units at Miami-Dade portal'
    });
  }
}

api_lookup_worker.on('completed', (job, result) => {
  console.log(`✓ API lookup completed: ${result.total_records} records, ${result.units_consumed} units`);
});

api_lookup_worker.on('failed', (job, error) => {
  console.error(`✗ API lookup failed: ${error.message}`);
});

module.exports = api_lookup_worker;
```

---

## Email Workflow Workers

### Worker 5: Email Workflows

**File:** `workers/email_workflow_worker.js`

**Purpose:** Send emails via SendGrid with dynamic templates and subscriber context

**Trigger:** On-demand (new lead generated, subscriber action, scheduled drip campaigns)

**Job Types:**
- `new_lead_alert` - Notify subscriber of new matching lead
- `welcome_email` - Onboarding email after signup
- `daily_digest` - Daily summary of new leads
- `weekly_report` - Weekly performance report
- `payment_receipt` - Invoice/receipt after token purchase
- `expiring_trial` - Trial expiration reminder

**Job Definition:**
```javascript
// Queue email job from lead generation
async function notify_subscriber_of_new_lead(subscriber_id, lead_id) {
  await email_queue.add(
    'new_lead_alert',
    {
      subscriber_id,
      lead_id,
      email_type: 'new_lead_alert'
    },
    {
      priority: 3,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 }
    }
  );
}
```

**Worker Implementation:**
```javascript
const { Worker } = require('bullmq');
const sgMail = require('@sendgrid/mail');
const redis_connection = require('../config/redis');
const db = require('../config/database');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const email_worker = new Worker(
  'email-workflows',
  async (job) => {
    const { subscriber_id, email_type } = job.data;
    
    // Fetch subscriber details
    const subscriber = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [subscriber_id]
    );
    
    if (subscriber.rows.length === 0) {
      throw new Error(`Subscriber ${subscriber_id} not found`);
    }
    
    const user = subscriber.rows[0];
    
    // Route to appropriate email handler
    let email_result;
    switch (email_type) {
      case 'new_lead_alert':
        email_result = await send_new_lead_alert(user, job.data);
        break;
      case 'welcome_email':
        email_result = await send_welcome_email(user);
        break;
      case 'daily_digest':
        email_result = await send_daily_digest(user);
        break;
      case 'weekly_report':
        email_result = await send_weekly_report(user);
        break;
      case 'payment_receipt':
        email_result = await send_payment_receipt(user, job.data);
        break;
      default:
        throw new Error(`Unknown email type: ${email_type}`);
    }
    
    // Log email sent
    await db.query(`
      INSERT INTO email_logs (
        user_id,
        email_type,
        sendgrid_message_id,
        recipient_email,
        status,
        sent_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      subscriber_id,
      email_type,
      email_result.messageId,
      user.email,
      'sent'
    ]);
    
    return { success: true, messageId: email_result.messageId };
  },
  {
    connection: redis_connection,
    concurrency: 50  // Send up to 50 emails concurrently
  }
);

async function send_new_lead_alert(user, job_data) {
  const { lead_id } = job_data;
  
  // Fetch lead details
  const lead = await db.query(`
    SELECT l.*, p.address, p.owner_name, p.assessed_value, p.mortgage_balance
    FROM leads l
    JOIN properties p ON l.property_id = p.id
    WHERE l.id = $1
  `, [lead_id]);
  
  if (lead.rows.length === 0) {
    throw new Error(`Lead ${lead_id} not found`);
  }
  
  const lead_data = lead.rows[0];
  const equity = lead_data.assessed_value - (lead_data.mortgage_balance || 0);
  
  const msg = {
    to: user.email,
    from: 'leads@miamidadesaas.com',
    templateId: 'd-12345abcde',  // SendGrid dynamic template ID
    dynamicTemplateData: {
      subscriber_name: user.first_name,
      lead_type: lead_data.lead_type,
      property_address: lead_data.address,
      owner_name: lead_data.owner_name,
      estimated_equity: equity.toLocaleString('en-US', { style: 'currency', currency: 'USD' }),
      lead_score: lead_data.lead_score,
      view_lead_url: `${process.env.FRONTEND_URL}/leads/${lead_id}`,
      unsubscribe_url: `${process.env.FRONTEND_URL}/settings/notifications`
    }
  };
  
  const response = await sgMail.send(msg);
  return { messageId: response[0].headers['x-message-id'] };
}

async function send_welcome_email(user) {
  const msg = {
    to: user.email,
    from: 'welcome@miamidadesaas.com',
    templateId: 'd-67890fghij',
    dynamicTemplateData: {
      first_name: user.first_name,
      account_type: user.subscription_type,
      token_balance: user.token_balance,
      setup_guide_url: `${process.env.FRONTEND_URL}/onboarding`,
      support_email: 'support@miamidadesaas.com'
    }
  };
  
  const response = await sgMail.send(msg);
  return { messageId: response[0].headers['x-message-id'] };
}

async function send_daily_digest(user) {
  // Query today's new leads matching subscriber criteria
  const todays_leads = await db.query(`
    SELECT l.*, p.address, p.owner_name
    FROM leads l
    JOIN properties p ON l.property_id = p.id
    JOIN subscriber_lead_criteria slc ON l.lead_type = ANY(slc.lead_types)
    WHERE slc.subscriber_id = $1
      AND l.created_at::date = CURRENT_DATE
      AND l.status = 'new'
    ORDER BY l.lead_score DESC
    LIMIT 20
  `, [user.id]);
  
  if (todays_leads.rows.length === 0) {
    // Skip email if no new leads (configurable per subscriber)
    return { skipped: true, reason: 'no_new_leads' };
  }
  
  const msg = {
    to: user.email,
    from: 'digest@miamidadesaas.com',
    templateId: 'd-abcde12345',
    dynamicTemplateData: {
      subscriber_name: user.first_name,
      date: new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
      total_leads: todays_leads.rows.length,
      leads: todays_leads.rows.map(l => ({
        address: l.address,
        owner: l.owner_name,
        type: l.lead_type,
        score: l.lead_score,
        url: `${process.env.FRONTEND_URL}/leads/${l.id}`
      })),
      dashboard_url: `${process.env.FRONTEND_URL}/dashboard`
    }
  };
  
  const response = await sgMail.send(msg);
  return { messageId: response[0].headers['x-message-id'] };
}

async function send_weekly_report(user) {
  // Implementation similar to daily digest, but weekly stats
}

async function send_payment_receipt(user, job_data) {
  const { stripe_charge_id, amount, tokens_purchased } = job_data;
  
  const msg = {
    to: user.email,
    from: 'billing@miamidadesaas.com',
    templateId: 'd-payment-receipt',
    dynamicTemplateData: {
      customer_name: `${user.first_name} ${user.last_name}`,
      charge_id: stripe_charge_id,
      amount_paid: (amount / 100).toFixed(2),
      tokens_purchased: tokens_purchased.toLocaleString(),
      new_balance: user.token_balance + tokens_purchased,
      invoice_url: `${process.env.FRONTEND_URL}/billing/invoices/${stripe_charge_id}`,
      support_email: 'billing@miamidadesaas.com'
    }
  };
  
  const response = await sgMail.send(msg);
  return { messageId: response[0].headers['x-message-id'] };
}

email_worker.on('completed', (job) => {
  console.log(`✓ Email sent: ${job.data.email_type} to subscriber ${job.data.subscriber_id}`);
});

email_worker.on('failed', (job, error) => {
  console.error(`✗ Email failed: ${job.data.email_type} - ${error.message}`);
});

module.exports = email_worker;
```

---

## Voice Assistant Workers

### Worker 6: Voice Assistant Call Queue

**File:** `workers/voice_assistant_worker.js`

**Purpose:** Queue and execute AI voice calls via Twilio (inbound routing and outbound campaigns)

**Trigger:** 
- Inbound: Twilio webhook when subscriber receives call
- Outbound: Subscriber-initiated or scheduled campaign

**Job Types:**
- `inbound_call` - Route incoming call to subscriber's AI assistant
- `outbound_call` - Initiate AI assistant call to lead
- `campaign_call` - Bulk campaign call (rate-limited)

**Job Definition:**
```javascript
// Queue outbound call to lead
async function call_lead_with_ai(subscriber_id, lead_id, script_id) {
  await voice_queue.add(
    'outbound_call',
    {
      subscriber_id,
      lead_id,
      script_id,
      scheduled_at: new Date().toISOString()
    },
    {
      priority: 2,
      attempts: 3,
      backoff: { type: 'fixed', delay: 30000 }  // 30 seconds
    }
  );
}
```

**Worker Implementation:**
```javascript
const { Worker } = require('bullmq');
const twilio = require('twilio');
const redis_connection = require('../config/redis');
const db = require('../config/database');

const twilio_client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

const voice_worker = new Worker(
  'voice-assistant',
  async (job) => {
    const { subscriber_id, lead_id, script_id } = job.data;
    
    // Fetch subscriber details
    const subscriber = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [subscriber_id]
    );
    
    const user = subscriber.rows[0];
    
    // Check token balance (3-min call = 20 tokens)
    const call_token_cost = 20;
    if (user.token_balance < call_token_cost) {
      throw new Error(`Insufficient tokens. Required: ${call_token_cost}, Available: ${user.token_balance}`);
    }
    
    // Fetch lead phone number
    const lead = await db.query(`
      SELECT l.*, p.owner_name, p.address
      FROM leads l
      JOIN properties p ON l.property_id = p.id
      WHERE l.id = $1
    `, [lead_id]);
    
    const lead_data = lead.rows[0];
    
    if (!lead_data.phone_number) {
      throw new Error(`Lead ${lead_id} has no phone number`);
    }
    
    // Fetch AI script
    const script = await db.query(
      'SELECT * FROM ai_scripts WHERE id = $1',
      [script_id]
    );
    
    const script_data = script.rows[0];
    
    // Deduct tokens upfront (reserve for call)
    await db.query(
      'UPDATE users SET token_balance = token_balance - $1 WHERE id = $2',
      [call_token_cost, subscriber_id]
    );
    
    // Initiate Twilio call
    job.log(`Initiating call to ${lead_data.phone_number}`);
    
    const call = await twilio_client.calls.create({
      from: user.twilio_phone_number,  // Subscriber's dedicated number
      to: lead_data.phone_number,
      url: `${process.env.API_URL}/twilio/voice/outbound?subscriber_id=${subscriber_id}&lead_id=${lead_id}&script_id=${script_id}`,
      statusCallback: `${process.env.API_URL}/twilio/voice/status`,
      statusCallbackEvent: ['initiated', 'ringing', 'answered', 'completed'],
      statusCallbackMethod: 'POST',
      machineDetection: 'DetectMessageEnd',  // Detect voicemail
      record: true,
      recordingStatusCallback: `${process.env.API_URL}/twilio/voice/recording`,
      timeout: 30  // Ring for 30 seconds
    });
    
    job.log(`Call initiated: ${call.sid}`);
    
    // Log call attempt
    await db.query(`
      INSERT INTO voice_call_logs (
        subscriber_id,
        lead_id,
        twilio_call_sid,
        direction,
        from_number,
        to_number,
        status,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
    `, [
      subscriber_id,
      lead_id,
      call.sid,
      'outbound',
      user.twilio_phone_number,
      lead_data.phone_number,
      'initiated'
    ]);
    
    // Log token usage
    await db.query(`
      INSERT INTO token_usage_logs (
        user_id,
        action_type,
        tokens_used,
        entity_id,
        entity_type,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      subscriber_id,
      'voice_call_outbound',
      call_token_cost,
      call.sid,
      'twilio_call'
    ]);
    
    return {
      success: true,
      call_sid: call.sid,
      status: call.status,
      tokens_charged: call_token_cost
    };
  },
  {
    connection: redis_connection,
    concurrency: 5  // Max 5 concurrent outbound calls
  }
);

voice_worker.on('completed', (job, result) => {
  console.log(`✓ Voice call initiated: ${result.call_sid}`);
});

voice_worker.on('failed', (job, error) => {
  console.error(`✗ Voice call failed: ${error.message}`);
  
  // Refund tokens if call never initiated
  if (error.message.includes('Insufficient tokens')) {
    // No refund needed (never deducted)
  } else {
    // Refund tokens
    db.query(
      'UPDATE users SET token_balance = token_balance + 20 WHERE id = $1',
      [job.data.subscriber_id]
    );
  }
});

module.exports = voice_worker;
```

---

## SMS Notification Workers

### Worker 7: SMS Notifications

**File:** `workers/sms_notification_worker.js`

**Purpose:** Send SMS notifications via Twilio (lead alerts, system notifications)

**Trigger:** On-demand (urgent lead alert, verification code, system notification)

**Job Definition:**
```javascript
async function send_urgent_lead_sms(subscriber_id, lead_id) {
  await sms_queue.add(
    'urgent_lead_alert',
    {
      subscriber_id,
      lead_id,
      sms_type: 'urgent_lead'
    },
    {
      priority: 2,
      attempts: 3,
      backoff: { type: 'fixed', delay: 5000 }
    }
  );
}
```

**Worker Implementation:**
```javascript
const sms_worker = new Worker(
  'sms-notifications',
  async (job) => {
    const { subscriber_id, sms_type } = job.data;
    
    const subscriber = await db.query(
      'SELECT * FROM users WHERE id = $1',
      [subscriber_id]
    );
    
    const user = subscriber.rows[0];
    
    // Check token balance (SMS = 10 tokens)
    const sms_token_cost = 10;
    if (user.token_balance < sms_token_cost) {
      throw new Error('Insufficient tokens for SMS');
    }
    
    let sms_body;
    switch (sms_type) {
      case 'urgent_lead':
        const lead = await db.query('SELECT * FROM leads WHERE id = $1', [job.data.lead_id]);
        sms_body = `🚨 URGENT LEAD: ${lead.rows[0].address} - Score ${lead.rows[0].lead_score}. View now: ${process.env.FRONTEND_URL}/leads/${job.data.lead_id}`;
        break;
      case 'verification':
        sms_body = `Your verification code is: ${job.data.code}. Valid for 10 minutes.`;
        break;
      default:
        throw new Error(`Unknown SMS type: ${sms_type}`);
    }
    
    // Deduct tokens
    await db.query(
      'UPDATE users SET token_balance = token_balance - $1 WHERE id = $2',
      [sms_token_cost, subscriber_id]
    );
    
    // Send SMS via Twilio
    const message = await twilio_client.messages.create({
      from: process.env.TWILIO_SMS_NUMBER,
      to: user.phone_number,
      body: sms_body
    });
    
    // Log SMS
    await db.query(`
      INSERT INTO sms_logs (
        user_id,
        sms_type,
        twilio_message_sid,
        recipient_phone,
        message_body,
        status,
        sent_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    `, [
      subscriber_id,
      sms_type,
      message.sid,
      user.phone_number,
      sms_body,
      message.status
    ]);
    
    // Log token usage
    await db.query(`
      INSERT INTO token_usage_logs (
        user_id,
        action_type,
        tokens_used,
        entity_id,
        entity_type,
        created_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      subscriber_id,
      'sms_notification',
      sms_token_cost,
      message.sid,
      'twilio_sms'
    ]);
    
    return {
      success: true,
      message_sid: message.sid,
      tokens_charged: sms_token_cost
    };
  },
  {
    connection: redis_connection,
    concurrency: 20
  }
);

module.exports = sms_worker;
```

---

## Maintenance Workers

### Worker 8: Lead Scoring Recalculation

**File:** `workers/lead_scoring_worker.js`

**Purpose:** Recalculate lead scores nightly based on updated property data and subscriber engagement

**Schedule:** 2:00 AM EST daily

**Implementation:**
```javascript
const schedule_lead_scoring = new CronJob(
  '0 2 * * *',  // 2 AM daily
  async () => {
    await lead_scoring_queue.add(
      'recalculate-scores',
      { date: new Date().toISOString().split('T')[0] },
      { priority: 1, attempts: 1 }
    );
  },
  null,
  true,
  'America/New_York'
);

const lead_scoring_worker = new Worker(
  'lead-scoring',
  async (job) => {
    // Recalculate lead scores based on:
    // - Days since lead created (freshness)
    // - Property equity
    // - Subscriber engagement history
    // - Lead type priority
    
    const result = await db.query(`
      UPDATE leads
      SET lead_score = calculate_lead_score(
        lead_type,
        lead_date,
        estimated_equity,
        engagement_count
      ),
      last_score_update = NOW()
      WHERE status IN ('new', 'contacted')
    `);
    
    return {
      success: true,
      leads_updated: result.rowCount
    };
  },
  {
    connection: redis_connection,
    concurrency: 5
  }
);
```

---

### Worker 9: Data Cleanup

**File:** `workers/data_cleanup_worker.js`

**Purpose:** Archive old logs and delete stale data

**Schedule:** 3:00 AM EST daily

**Implementation:**
```javascript
const schedule_cleanup = new CronJob(
  '0 3 * * *',  // 3 AM daily
  async () => {
    await data_cleanup_queue.add(
      'cleanup-logs',
      { retention_days: 90 },
      { priority: 1, attempts: 1 }
    );
  },
  null,
  true,
  'America/New_York'
);

const cleanup_worker = new Worker(
  'data-cleanup',
  async (job) => {
    const { retention_days } = job.data;
    
    // Delete old API logs
    const api_logs_deleted = await db.query(
      'DELETE FROM miami_dade_api_logs WHERE created_at < NOW() - INTERVAL \'$1 days\'',
      [retention_days]
    );
    
    // Archive old email logs to Cloud Storage
    const old_email_logs = await db.query(
      'SELECT * FROM email_logs WHERE sent_at < NOW() - INTERVAL \'$1 days\'',
      [retention_days]
    );
    // ... upload to GCS
    
    // Delete archived email logs
    await db.query(
      'DELETE FROM email_logs WHERE sent_at < NOW() - INTERVAL \'$1 days\'',
      [retention_days]
    );
    
    return {
      success: true,
      api_logs_deleted: api_logs_deleted.rowCount,
      email_logs_archived: old_email_logs.rows.length
    };
  },
  {
    connection: redis_connection,
    concurrency: 1
  }
);
```

---

## Job Priority and Concurrency

### Priority Levels

| Priority | Value | Use Cases |
|---|---|---|
| URGENT | 1 | Subscriber property lookups, payment processing |
| HIGH | 2 | Voice calls, urgent lead alerts, admin actions |
| NORMAL | 3 | Email notifications, SMS alerts |
| MEDIUM | 5 | Weekly data ingestion, lead scoring |
| LOW | 10 | Daily FTP ingestion (runs off-peak), cleanup |

### Concurrency Limits

**Per Worker:**
- `daily-ftp-ingestion`: 1 (sequential, no conflicts)
- `api-property-lookup`: 10 (API rate limit tolerance)
- `email-workflows`: 50 (SendGrid allows high throughput)
- `voice-assistant`: 5 (Twilio concurrent call limit)
- `sms-notifications`: 20 (Twilio SMS throughput)
- `lead-scoring`: 5 (database-intensive)

**Global Redis Connection Pool:**
- Max connections: 50
- Connection timeout: 30 seconds
- Retry strategy: Exponential backoff

---

## Error Handling and Dead Letter Queues

### Retry Policies

**Data Ingestion Jobs:**
- Attempts: 3
- Backoff: Fixed delay (5-15 minutes)
- On final failure: Alert admin, log to `failed_jobs` table

**API Query Jobs:**
- Attempts: 3
- Backoff: Exponential (2s, 4s, 8s)
- On final failure: Return error to subscriber, refund tokens

**Email Jobs:**
- Attempts: 5
- Backoff: Exponential (5s, 25s, 125s, etc.)
- On final failure: Log to `email_logs` with status='failed'

**Voice Jobs:**
- Attempts: 3
- Backoff: Fixed 30 seconds
- On final failure: Refund tokens, notify subscriber

---

### Dead Letter Queue

**Failed Job Storage:**
```javascript
// After max retries exceeded
queue.on('failed', async (job, error) => {
  await db.query(`
    INSERT INTO failed_jobs (
      queue_name,
      job_name,
      job_data,
      error_message,
      failed_at,
      retry_count
    ) VALUES ($1, $2, $3, $4, NOW(), $5)
  `, [
    job.queueName,
    job.name,
    JSON.stringify(job.data),
    error.message,
    job.attemptsMade
  ]);
  
  // Alert admin for critical jobs
  if (job.queueName === 'daily-ftp-ingestion') {
    await send_admin_alert({
      severity: 'critical',
      subject: 'Critical Job Failed',
      message: `${job.queueName}/${job.name} failed after ${job.attemptsMade} attempts`,
      error: error.message
    });
  }
});
```

---

## Monitoring and Observability

### Bull Board Dashboard

**Setup:**
```javascript
// server.js
const { createBullBoard } = require('@bull-board/api');
const { BullMQAdapter } = require('@bull-board/api/bullMQAdapter');
const { ExpressAdapter } = require('@bull-board/express');

const serverAdapter = new ExpressAdapter();
serverAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [
    new BullMQAdapter(daily_ftp_queue),
    new BullMQAdapter(api_query_queue),
    new BullMQAdapter(email_queue),
    new BullMQAdapter(voice_queue),
    new BullMQAdapter(sms_queue)
  ],
  serverAdapter
});

app.use('/admin/queues', authenticate_admin, serverAdapter.getRouter());
```

**Access:** `https://app.miamidadesaas.com/admin/queues`

---

### Metrics Collection

**Queue Health Metrics:**
```javascript
// Collect every 5 minutes
setInterval(async () => {
  const queues = [daily_ftp_queue, api_query_queue, email_queue, voice_queue, sms_queue];
  
  for (const queue of queues) {
    const counts = await queue.getJobCounts('waiting', 'active', 'completed', 'failed');
    
    await db.query(`
      INSERT INTO queue_metrics (
        queue_name,
        waiting_count,
        active_count,
        completed_count,
        failed_count,
        recorded_at
      ) VALUES ($1, $2, $3, $4, $5, NOW())
    `, [
      queue.name,
      counts.waiting,
      counts.active,
      counts.completed,
      counts.failed
    ]);
  }
}, 300000);  // 5 minutes
```

---

## Related Documents
- **03_MIAMI_DADE_API.md** - API integration details for data ingestion workers
- **02_DATABASE_SCHEMA.md** - Database tables referenced by all workers
- **04_TOKEN_SYSTEM.md** - Token deduction logic in communication workers
- **07_EMAIL_WORKFLOWS.md** - Detailed email template specifications
- **08_VOICE_ASSISTANT.md** - Twilio TwiML flow details

---

## Changelog

**Version 1.0 (2025-11-20)**
- Initial documentation
- Defined 9 core workers across 5 queue categories
- Documented job scheduling, priority, and concurrency
- Added error handling and dead letter queue patterns
- Integrated Bull Board for monitoring

---

**Document Status:** PRODUCTION READY  
**Next Review:** After Phase 1 implementation  
**Owner:** Gabe Sebastian (thedevingrey@gmail.com)