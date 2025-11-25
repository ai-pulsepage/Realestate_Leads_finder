# File Upload and Cloud Storage Integration

## Document Information
- **Version:** 1.0
- **Last Updated:** 2025-11-20
- **Status:** PRODUCTION READY
- **Dependencies:** 02_DATABASE_SCHEMA.md, 05_API_ENDPOINTS.md

---

## Table of Contents
1. [Cloud Storage Overview](#cloud-storage-overview)
2. [File Upload Requirements](#file-upload-requirements)
3. [Google Cloud Storage Configuration](#google-cloud-storage-configuration)
4. [Multer Middleware Setup](#multer-middleware-setup)
5. [License Verification Upload](#license-verification-upload)
6. [Portfolio Upload](#portfolio-upload)
7. [File Validation and Security](#file-validation-and-security)
8. [Signed URL Generation](#signed-url-generation)
9. [File Lifecycle Management](#file-lifecycle-management)
10. [Image Optimization](#image-optimization)

---

## Cloud Storage Overview

### Why Google Cloud Storage

**Decision Rationale:**
- **Integration:** Native integration with Cloud Run and other GCP services
- **Cost:** $0.020 per GB/month for Standard storage
- **Performance:** Low latency, high throughput
- **Security:** IAM-based access control, signed URLs for temporary access
- **Scalability:** No limits on file count or total storage
- **Versioning:** Built-in version control for files
- **Lifecycle Policies:** Automatic archiving/deletion of old files

**Cost Estimates:**
```
Storage: $0.020 per GB/month
Class A Operations (uploads): $0.05 per 10,000 operations
Class B Operations (downloads): $0.004 per 10,000 operations
Network Egress: $0.12 per GB (after 1GB free)

Estimated Usage (100 subscribers):
- License files: ~100 files x 2MB = 200MB
- Portfolio images: ~500 files x 5MB = 2.5GB
- Total storage: ~3GB = $0.06/month

Uploads per month: ~200 = $0.001
Downloads per month: ~1000 = $0.0004
Total: ~$0.07/month
```

---

### Bucket Architecture

**Bucket Structure:**
```
miami-dade-saas-uploads/
├── licenses/
│   └── {subscriber_id}/
│       ├── contractor_license_20251120.pdf
│       └── business_license_20251120.pdf
├── portfolios/
│   └── {subscriber_id}/
│       ├── project_001.jpg
│       ├── project_002.jpg
│       └── project_003.jpg
├── temp/
│   └── {upload_session_id}/
│       └── temp_file.jpg
└── archives/
    └── {year}/{month}/
        └── archived_files...
```

**Bucket Configuration:**
- **Name:** `miami-dade-saas-uploads`
- **Location:** `us-east1` (same region as Cloud Run)
- **Storage Class:** Standard
- **Public Access:** Disabled (all access via signed URLs)
- **Versioning:** Enabled (for audit trail)
- **Lifecycle Rules:**
  - Delete temp files older than 24 hours
  - Archive files to Coldline after 365 days
  - Delete archived files after 7 years

---

## File Upload Requirements

### Use Cases

**1. Contractor License Verification (Product A)**
- **Purpose:** Verify subscriber is licensed contractor
- **File Types:** PDF, JPG, PNG
- **Max Size:** 10MB per file
- **Required Fields:** License number, expiration date, state
- **Validation:** Manual admin review + automated OCR extraction

**2. Real Estate License Verification (Product B)**
- **Purpose:** Verify subscriber is licensed real estate professional
- **File Types:** PDF, JPG, PNG
- **Max Size:** 10MB per file
- **Required Fields:** License number, expiration date, brokerage

**3. Portfolio Upload (Product A - Optional)**
- **Purpose:** Showcase previous work to build credibility
- **File Types:** JPG, PNG, HEIC
- **Max Size:** 20MB per file
- **Max Count:** 20 images per subscriber
- **Validation:** Automatic image optimization, EXIF stripping

**4. Business Documentation (Both Products)**
- **Purpose:** Business license, insurance certificates, W-9
- **File Types:** PDF
- **Max Size:** 10MB per file

---

### File Type Whitelist

**Allowed MIME Types:**
```javascript
const ALLOWED_MIME_TYPES = {
  licenses: [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ],
  portfolios: [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/heic',
    'image/heif'
  ],
  documents: [
    'application/pdf'
  ]
};

const MAX_FILE_SIZES = {
  licenses: 10 * 1024 * 1024,    // 10MB
  portfolios: 20 * 1024 * 1024,  // 20MB
  documents: 10 * 1024 * 1024    // 10MB
};
```

---

## Google Cloud Storage Configuration

### SDK Setup

**Installation:**
```bash
npm install @google-cloud/storage multer multer-storage-gcs sharp
```

**Configuration:**
```javascript
// config/gcs.js
const { Storage } = require('@google-cloud/storage');

const storage = new Storage({
  projectId: process.env.GCP_PROJECT_ID,
  keyFilename: process.env.GCP_KEY_FILE  // Service account JSON
});

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || 'miami-dade-saas-uploads';
const bucket = storage.bucket(BUCKET_NAME);

module.exports = {
  storage,
  bucket,
  BUCKET_NAME
};
```

**Environment Variables:**
```bash
GCP_PROJECT_ID=your-project-id
GCP_KEY_FILE=/path/to/service-account-key.json
GCS_BUCKET_NAME=miami-dade-saas-uploads
GCS_SIGNED_URL_EXPIRY=3600  # 1 hour in seconds
```

---

### Service Account Permissions

**Required IAM Roles:**
- `roles/storage.objectCreator` - Upload files
- `roles/storage.objectViewer` - Read files
- `roles/storage.objectAdmin` - Delete/manage files

**Service Account Creation:**
```bash
# Create service account
gcloud iam service-accounts create miami-dade-saas-storage \
  --display-name="Miami-Dade SaaS Storage Service Account"

# Grant permissions
gcloud projects add-iam-policy-binding your-project-id \
  --member="serviceAccount:miami-dade-saas-storage@your-project-id.iam.gserviceaccount.com" \
  --role="roles/storage.objectAdmin"

# Generate key
gcloud iam service-accounts keys create service-account-key.json \
  --iam-account=miami-dade-saas-storage@your-project-id.iam.gserviceaccount.com
```

---

### Bucket Creation Script

```javascript
// scripts/create_gcs_bucket.js
const { storage, BUCKET_NAME } = require('../config/gcs');

async function create_bucket() {
  try {
    const [bucket] = await storage.createBucket(BUCKET_NAME, {
      location: 'us-east1',
      storageClass: 'STANDARD',
      versioning: {
        enabled: true
      },
      lifecycle: {
        rule: [
          {
            action: { type: 'Delete' },
            condition: {
              age: 1,
              matchesPrefix: ['temp/']
            }
          },
          {
            action: { 
              type: 'SetStorageClass',
              storageClass: 'COLDLINE'
            },
            condition: {
              age: 365,
              matchesPrefix: ['archives/']
            }
          },
          {
            action: { type: 'Delete' },
            condition: {
              age: 2555,  // ~7 years
              matchesPrefix: ['archives/']
            }
          }
        ]
      },
      iamConfiguration: {
        uniformBucketLevelAccess: {
          enabled: true
        }
      },
      cors: [
        {
          origin: [process.env.FRONTEND_URL],
          method: ['GET', 'POST', 'PUT', 'DELETE'],
          responseHeader: ['Content-Type'],
          maxAgeSeconds: 3600
        }
      ]
    });
    
    console.log(`Bucket ${bucket.name} created successfully`);
    
  } catch (error) {
    if (error.code === 409) {
      console.log(`Bucket ${BUCKET_NAME} already exists`);
    } else {
      throw error;
    }
  }
}

create_bucket();
```

---

## Multer Middleware Setup

### Basic Multer Configuration

**Multer:** Node.js middleware for handling multipart/form-data (file uploads)

**Configuration:**
```javascript
// middleware/upload.js
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

// Temporary local storage (files uploaded to /tmp before GCS)
const local_storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, '/tmp/uploads');
  },
  filename: (req, file, cb) => {
    const unique_suffix = crypto.randomBytes(16).toString('hex');
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${unique_suffix}${ext}`);
  }
});

// File filter function
function create_file_filter(allowed_types) {
  return (req, file, cb) => {
    if (allowed_types.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid file type. Allowed types: ${allowed_types.join(', ')}`), false);
    }
  };
}

// License upload middleware
const upload_license = multer({
  storage: local_storage,
  limits: {
    fileSize: 10 * 1024 * 1024,  // 10MB
    files: 1
  },
  fileFilter: create_file_filter([
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png'
  ])
});

// Portfolio upload middleware
const upload_portfolio = multer({
  storage: local_storage,
  limits: {
    fileSize: 20 * 1024 * 1024,  // 20MB
    files: 10  // Max 10 files per upload
  },
  fileFilter: create_file_filter([
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/heic',
    'image/heif'
  ])
});

module.exports = {
  upload_license,
  upload_portfolio
};
```

---

### Error Handling Middleware

```javascript
// middleware/upload_error_handler.js
function handle_upload_errors(err, req, res, next) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: 'File too large',
        max_size: '10MB',
        message: err.message
      });
    }
    
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        error: 'Too many files',
        max_files: 10,
        message: err.message
      });
    }
    
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        error: 'Unexpected field',
        message: 'Invalid form field name'
      });
    }
    
    return res.status(400).json({
      error: 'Upload error',
      message: err.message
    });
  }
  
  if (err) {
    return res.status(400).json({
      error: 'Upload failed',
      message: err.message
    });
  }
  
  next();
}

module.exports = handle_upload_errors;
```

---

## License Verification Upload

### Upload Endpoint

**Endpoint:** `POST /api/users/upload-license`

**Request:**
```
Content-Type: multipart/form-data

Fields:
- file: (binary file data)
- license_type: "contractor" | "real_estate"
- license_number: "CG123456"
- expiration_date: "2026-12-31"
- state: "FL"
```

**Response:**
```json
{
  "success": true,
  "file_id": "abc123",
  "file_url": "https://storage.googleapis.com/...",
  "status": "pending_verification",
  "message": "License uploaded. Verification in progress."
}
```

---

### Implementation

```javascript
// routes/user_uploads.js
const express = require('express');
const router = express.Router();
const { upload_license } = require('../middleware/upload');
const { authenticate_user } = require('../middleware/auth');
const handle_upload_errors = require('../middleware/upload_error_handler');
const { bucket } = require('../config/gcs');
const db = require('../config/database');
const fs = require('fs');
const path = require('path');

router.post(
  '/api/users/upload-license',
  authenticate_user,
  upload_license.single('file'),
  handle_upload_errors,
  async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }
      
      const {
        license_type,
        license_number,
        expiration_date,
        state
      } = req.body;
      
      // Validate required fields
      if (!license_type || !license_number || !expiration_date) {
        fs.unlinkSync(req.file.path);  // Cleanup temp file
        return res.status(400).json({
          error: 'Missing required fields',
          required: ['license_type', 'license_number', 'expiration_date']
        });
      }
      
      const subscriber_id = req.user.id;
      const timestamp = Date.now();
      const ext = path.extname(req.file.originalname);
      
      // Generate GCS path
      const gcs_path = `licenses/${subscriber_id}/${license_type}_${timestamp}${ext}`;
      
      // Upload to GCS
      await bucket.upload(req.file.path, {
        destination: gcs_path,
        metadata: {
          contentType: req.file.mimetype,
          metadata: {
            subscriberId: subscriber_id,
            licenseType: license_type,
            licenseNumber: license_number,
            expirationDate: expiration_date,
            uploadedAt: new Date().toISOString()
          }
        }
      });
      
      // Delete temp file
      fs.unlinkSync(req.file.path);
      
      // Insert into database
      const result = await db.query(`
        INSERT INTO license_documents (
          subscriber_id,
          license_type,
          license_number,
          expiration_date,
          state,
          file_path,
          file_name,
          file_size,
          mime_type,
          verification_status,
          uploaded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
        RETURNING id
      `, [
        subscriber_id,
        license_type,
        license_number,
        expiration_date,
        state || 'FL',
        gcs_path,
        req.file.originalname,
        req.file.size,
        req.file.mimetype,
        'pending'
      ]);
      
      const file_id = result.rows[0].id;
      
      // Generate signed URL for preview
      const file = bucket.file(gcs_path);
      const [signed_url] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 3600 * 1000  // 1 hour
      });
      
      // Notify admin of pending verification
      await notify_admin_of_license_upload(subscriber_id, file_id);
      
      res.json({
        success: true,
        file_id,
        file_url: signed_url,
        status: 'pending_verification',
        message: 'License uploaded successfully. Verification typically takes 1-2 business days.'
      });
      
    } catch (error) {
      console.error('License upload error:', error);
      
      // Cleanup temp file if exists
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      
      res.status(500).json({
        error: 'Upload failed',
        message: error.message
      });
    }
  }
);

async function notify_admin_of_license_upload(subscriber_id, file_id) {
  const { email_queue } = require('../queues');
  
  await email_queue.add(
    'admin_license_verification',
    {
      admin_email: process.env.ADMIN_EMAIL,
      subscriber_id,
      file_id,
      email_type: 'license_verification_pending'
    },
    { priority: 2 }
  );
}

module.exports = router;
```

---

### Admin Verification Endpoint

**Endpoint:** `POST /api/admin/verify-license`

**Request:**
```json
{
  "file_id": "abc123",
  "status": "approved",
  "notes": "License verified, expires 2026-12-31"
}
```

**Implementation:**
```javascript
router.post(
  '/api/admin/verify-license',
  authenticate_admin,
  async (req, res) => {
    const { file_id, status, notes } = req.body;
    
    if (!['approved', 'rejected'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    // Update license document
    await db.query(`
      UPDATE license_documents
      SET verification_status = $1,
          verification_notes = $2,
          verified_at = NOW(),
          verified_by = $3
      WHERE id = $4
    `, [status, notes, req.user.id, file_id]);
    
    // Update user account status
    const license = await db.query(
      'SELECT subscriber_id FROM license_documents WHERE id = $1',
      [file_id]
    );
    
    const subscriber_id = license.rows[0].subscriber_id;
    
    if (status === 'approved') {
      await db.query(
        'UPDATE users SET license_verified = true WHERE id = $1',
        [subscriber_id]
      );
    }
    
    // Notify subscriber
    await notify_subscriber_of_verification_result(subscriber_id, status, notes);
    
    res.json({
      success: true,
      message: `License ${status}`
    });
  }
);
```

---

## Portfolio Upload

### Upload Endpoint

**Endpoint:** `POST /api/users/upload-portfolio`

**Request:**
```
Content-Type: multipart/form-data

Fields:
- files[]: (multiple binary files)
- descriptions[]: ["Kitchen remodel", "Bathroom renovation", ...]
- project_dates[]: ["2024-06", "2024-09", ...]
```

**Response:**
```json
{
  "success": true,
  "uploaded_count": 3,
  "files": [
    {
      "id": "file1",
      "url": "https://storage.googleapis.com/...",
      "thumbnail_url": "https://storage.googleapis.com/..."
    }
  ]
}
```

---

### Implementation

```javascript
router.post(
  '/api/users/upload-portfolio',
  authenticate_user,
  upload_portfolio.array('files', 10),
  handle_upload_errors,
  async (req, res) => {
    try {
      if (!req.files || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }
      
      const subscriber_id = req.user.id;
      const descriptions = req.body.descriptions || [];
      const project_dates = req.body.project_dates || [];
      
      // Check portfolio limit (20 images max)
      const existing_count = await db.query(
        'SELECT COUNT(*) FROM portfolio_images WHERE subscriber_id = $1',
        [subscriber_id]
      );
      
      const current_count = parseInt(existing_count.rows[0].count);
      const max_allowed = 20;
      
      if (current_count + req.files.length > max_allowed) {
        // Cleanup temp files
        req.files.forEach(file => fs.unlinkSync(file.path));
        
        return res.status(400).json({
          error: 'Portfolio limit exceeded',
          max_images: max_allowed,
          current_count,
          attempted_upload: req.files.length
        });
      }
      
      const uploaded_files = [];
      
      for (let i = 0; i < req.files.length; i++) {
        const file = req.files[i];
        const description = descriptions[i] || null;
        const project_date = project_dates[i] || null;
        const timestamp = Date.now();
        const ext = path.extname(file.originalname);
        
        // Optimize image (resize, compress, strip EXIF)
        const optimized_path = await optimize_image(file.path);
        
        // Generate thumbnail
        const thumbnail_path = await generate_thumbnail(file.path);
        
        // Upload full image to GCS
        const gcs_path = `portfolios/${subscriber_id}/image_${timestamp}_${i}${ext}`;
        await bucket.upload(optimized_path, {
          destination: gcs_path,
          metadata: {
            contentType: file.mimetype,
            cacheControl: 'public, max-age=31536000'
          }
        });
        
        // Upload thumbnail to GCS
        const gcs_thumb_path = `portfolios/${subscriber_id}/thumb_${timestamp}_${i}${ext}`;
        await bucket.upload(thumbnail_path, {
          destination: gcs_thumb_path,
          metadata: {
            contentType: file.mimetype,
            cacheControl: 'public, max-age=31536000'
          }
        });
        
        // Insert into database
        const result = await db.query(`
          INSERT INTO portfolio_images (
            subscriber_id,
            file_path,
            thumbnail_path,
            file_name,
            file_size,
            description,
            project_date,
            uploaded_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
          RETURNING id
        `, [
          subscriber_id,
          gcs_path,
          gcs_thumb_path,
          file.originalname,
          file.size,
          description,
          project_date
        ]);
        
        const file_id = result.rows[0].id;
        
        // Generate signed URLs
        const [full_url] = await bucket.file(gcs_path).getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 86400000  // 24 hours
        });
        
        const [thumb_url] = await bucket.file(gcs_thumb_path).getSignedUrl({
          version: 'v4',
          action: 'read',
          expires: Date.now() + 86400000
        });
        
        uploaded_files.push({
          id: file_id,
          url: full_url,
          thumbnail_url: thumb_url,
          description
        });
        
        // Cleanup temp files
        fs.unlinkSync(file.path);
        fs.unlinkSync(optimized_path);
        fs.unlinkSync(thumbnail_path);
      }
      
      res.json({
        success: true,
        uploaded_count: uploaded_files.length,
        files: uploaded_files
      });
      
    } catch (error) {
      console.error('Portfolio upload error:', error);
      
      // Cleanup temp files
      if (req.files) {
        req.files.forEach(file => {
          if (fs.existsSync(file.path)) {
            fs.unlinkSync(file.path);
          }
        });
      }
      
      res.status(500).json({
        error: 'Upload failed',
        message: error.message
      });
    }
  }
);
```

---

## File Validation and Security

### MIME Type Validation

**Problem:** User-uploaded MIME types can be spoofed

**Solution:** Validate file content with magic bytes

```javascript
const fileType = require('file-type');

async function validate_file_type(file_path, allowed_types) {
  const type = await fileType.fromFile(file_path);
  
  if (!type) {
    throw new Error('Unable to determine file type');
  }
  
  if (!allowed_types.includes(type.mime)) {
    throw new Error(`Invalid file type: ${type.mime}. Allowed: ${allowed_types.join(', ')}`);
  }
  
  return type;
}

// Usage
const type = await validate_file_type(req.file.path, [
  'application/pdf',
  'image/jpeg',
  'image/png'
]);
```

---

### Virus Scanning

**Integration with ClamAV (optional for production):**

```javascript
const NodeClam = require('clamscan');

const clam_scanner = await new NodeClam().init({
  clamdscan: {
    host: process.env.CLAMAV_HOST || 'localhost',
    port: process.env.CLAMAV_PORT || 3310
  }
});

async function scan_file_for_viruses(file_path) {
  const { is_infected, viruses } = await clam_scanner.is_infected(file_path);
  
  if (is_infected) {
    throw new Error(`File infected with virus: ${viruses.join(', ')}`);
  }
  
  return true;
}
```

---

### Content Security Policy

**Prevent XSS via uploaded files:**

```javascript
// Set secure headers when serving file URLs
function get_secure_file_headers() {
  return {
    'Content-Security-Policy': "default-src 'none'; style-src 'unsafe-inline'; sandbox",
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Content-Disposition': 'attachment'  // Force download instead of display
  };
}
```

---

### File Size Validation

**Client-Side (Pre-Upload):**
```javascript
// Frontend validation
const MAX_SIZE = 10 * 1024 * 1024;  // 10MB

function validate_file_before_upload(file) {
  if (file.size > MAX_SIZE) {
    alert('File too large. Maximum size is 10MB.');
    return false;
  }
  return true;
}
```

**Server-Side (Multer + Manual Check):**
```javascript
// Multer limits
limits: {
  fileSize: 10 * 1024 * 1024
}

// Manual check after upload
if (req.file.size > 10 * 1024 * 1024) {
  fs.unlinkSync(req.file.path);
  return res.status(413).json({ error: 'File too large' });
}
```

---

## Signed URL Generation

### Why Signed URLs

**Purpose:** Provide temporary, secure access to private files without exposing GCS credentials

**Use Cases:**
- Preview license documents (1 hour expiry)
- Display portfolio images (24 hour expiry)
- Download call recordings (1 hour expiry)

---

### Generate Signed URL

```javascript
async function generate_signed_url(gcs_path, expiry_minutes = 60) {
  const file = bucket.file(gcs_path);
  
  const options = {
    version: 'v4',
    action: 'read',
    expires: Date.now() + expiry_minutes * 60 * 1000
  };
  
  const [signed_url] = await file.getSignedUrl(options);
  
  return signed_url;
}

// Usage
const license_url = await generate_signed_url(
  'licenses/123/contractor_license.pdf',
  60  // 1 hour
);

const portfolio_url = await generate_signed_url(
  'portfolios/123/project_001.jpg',
  1440  // 24 hours
);
```

---

### Signed URL API Endpoint

**Endpoint:** `GET /api/files/signed-url/:file_id`

**Purpose:** Generate fresh signed URL for existing file

**Implementation:**
```javascript
router.get('/api/files/signed-url/:file_id', authenticate_user, async (req, res) => {
  const { file_id } = req.params;
  const { type } = req.query;  // 'license' or 'portfolio'
  
  try {
    let file_record;
    
    if (type === 'license') {
      file_record = await db.query(
        'SELECT * FROM license_documents WHERE id = $1 AND subscriber_id = $2',
        [file_id, req.user.id]
      );
    } else if (type === 'portfolio') {
      file_record = await db.query(
        'SELECT * FROM portfolio_images WHERE id = $1 AND subscriber_id = $2',
        [file_id, req.user.id]
      );
    } else {
      return res.status(400).json({ error: 'Invalid file type' });
    }
    
    if (file_record.rows.length === 0) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const file = file_record.rows[0];
    const signed_url = await generate_signed_url(file.file_path, 60);
    
    res.json({
      url: signed_url,
      expires_at: new Date(Date.now() + 3600000).toISOString()
    });
    
  } catch (error) {
    console.error('Signed URL generation error:', error);
    res.status(500).json({ error: 'Failed to generate URL' });
  }
});
```

---

## File Lifecycle Management

### Automatic Cleanup

**Temp Files (24 hours):**
```javascript
// Lifecycle policy in bucket creation (see above)
// Automatically deletes files in temp/ older than 24 hours
```

**Archived Files (7 years):**
```javascript
// Lifecycle policy moves to Coldline after 1 year
// Deletes after 7 years (compliance requirement)
```

---

### Manual Deletion

**Delete Portfolio Image:**
```javascript
router.delete('/api/users/portfolio/:image_id', authenticate_user, async (req, res) => {
  const { image_id } = req.params;
  
  try {
    // Fetch image
    const image = await db.query(
      'SELECT * FROM portfolio_images WHERE id = $1 AND subscriber_id = $2',
      [image_id, req.user.id]
    );
    
    if (image.rows.length === 0) {
      return res.status(404).json({ error: 'Image not found' });
    }
    
    const file = image.rows[0];
    
    // Delete from GCS
    await bucket.file(file.file_path).delete();
    await bucket.file(file.thumbnail_path).delete();
    
    // Delete from database
    await db.query('DELETE FROM portfolio_images WHERE id = $1', [image_id]);
    
    res.json({
      success: true,
      message: 'Image deleted'
    });
    
  } catch (error) {
    console.error('Delete error:', error);
    res.status(500).json({ error: 'Failed to delete image' });
  }
});
```

---

## Image Optimization

### Resize and Compress with Sharp

**Purpose:** Reduce file size and standardize dimensions

```javascript
const sharp = require('sharp');

async function optimize_image(input_path) {
  const output_path = input_path.replace(/(\.\w+)$/, '_optimized$1');
  
  await sharp(input_path)
    .resize(1920, 1080, {
      fit: 'inside',
      withoutEnlargement: true
    })
    .jpeg({
      quality: 85,
      progressive: true
    })
    .toFile(output_path);
  
  return output_path;
}

async function generate_thumbnail(input_path) {
  const output_path = input_path.replace(/(\.\w+)$/, '_thumb$1');
  
  await sharp(input_path)
    .resize(400, 300, {
      fit: 'cover'
    })
    .jpeg({
      quality: 80
    })
    .toFile(output_path);
  
  return output_path;
}
```

---

### Strip EXIF Data

**Purpose:** Remove GPS coordinates, camera info, personal data from images

```javascript
async function strip_exif(input_path, output_path) {
  await sharp(input_path)
    .rotate()  // Auto-rotate based on EXIF, then remove EXIF
    .withMetadata({
      exif: {}  // Empty EXIF
    })
    .toFile(output_path);
}
```

---

## Related Documents
- **02_DATABASE_SCHEMA.md** - license_documents and portfolio_images tables
- **05_API_ENDPOINTS.md** - File upload API endpoints
- **06_BULLMQ_WORKERS.md** - Background workers for image processing

---

## Changelog

**Version 1.0 (2025-11-20)**
- Initial documentation
- Google Cloud Storage configuration
- Multer middleware setup
- License verification upload workflow
- Portfolio upload with image optimization
- File validation and security measures
- Signed URL generation
- File lifecycle management
- Image optimization with Sharp

---

**Document Status:** PRODUCTION READY  
**Next Review:** After Phase 1 GCS setup  
**Owner:** Gabe Sebastian (thedevingrey@gmail.com)
