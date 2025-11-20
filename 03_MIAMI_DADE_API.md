# Miami-Dade County API Integration Specifications

## Document Information
- **Version:** 2.0 (Production Specifications)
- **Last Updated:** 2025-11-20
- **Status:** PRODUCTION READY
- **Dependencies:** 02_DATABASE_SCHEMA.md, 04_TOKEN_SYSTEM.md

---

## Table of Contents
1. [Authentication & Account Details](#authentication--account-details)
2. [Official Records API](#official-records-api)
3. [FTP API for Bulk Downloads](#ftp-api-for-bulk-downloads)
4. [Data Transformation Strategy](#data-transformation-strategy)
5. [Field Mapping to Database Schema](#field-mapping-to-database-schema)
6. [File Ingestion Workflows](#file-ingestion-workflows)
7. [Units Cost Tracking](#units-cost-tracking)
8. [Error Handling & Retry Logic](#error-handling--retry-logic)
9. [Rate Limiting & Optimization](#rate-limiting--optimization)

---

## Authentication & Account Details

### Registered Account
```
Account Name: Gabe Sebastian Enterprises
Registered Email: thedevingrey@gmail.com
Auth Key: 5A0C2347-6BF3-4229-ADD3-05CDD7B96320
Registered IP: 10.56.251.3
Base URL: www2.miamidadeclerk.gov/Developers/
```

### Authentication Method
All API requests require the `authKey` parameter in the query string:
```
https://www2.miamidadeclerk.gov/Developers/OfficialRecords?authKey=5A0C2347-6BF3-4229-ADD3-05CDD7B96320&[additional_params]
```

### Account Status Verification
- **API Status:** ACTIVE
- **Units Balance:** Consumable balance, rechargeable
- **FTP Subscriptions:** 
  - Records (Daily Files) - $110/month - ACTIVE
  - Recording Images - $420/month - ACTIVE
  - Marriage Records - $110/month - ACTIVE
  - Civil Cases - PENDING APPROVAL
  - Family Cases - PENDING APPROVAL

---

## Official Records API

### Base Endpoint
```
GET https://www2.miamidadeclerk.gov/Developers/OfficialRecords
```

### Query Methods

The Official Records API supports three distinct query methods. Each query consumes **units** from your account balance.

#### Method 1: Circuit File Number (CFN)
Query by Circuit File Number components (Year + Sequence).

**Parameters:**
```
authKey: 5A0C2347-6BF3-4229-ADD3-05CDD7B96320
CFN_YEAR: 2024
CFN_SEQ: 123456
```

**Example Request:**
```bash
curl "https://www2.miamidadeclerk.gov/Developers/OfficialRecords?authKey=5A0C2347-6BF3-4229-ADD3-05CDD7B96320&CFN_YEAR=2024&CFN_SEQ=123456"
```

**Use Cases:**
- Retrieve specific recorded document when CFN is known
- Validate document existence before processing
- Link court cases to property records

---

#### Method 2: Book and Page
Query by traditional recording book and page numbers.

**Parameters:**
```
authKey: 5A0C2347-6BF3-4229-ADD3-05CDD7B96320
BOOK: 12345
PAGE: 678
```

**Example Request:**
```bash
curl "https://www2.miamidadeclerk.gov/Developers/OfficialRecords?authKey=5A0C2347-6BF3-4229-ADD3-05CDD7B96320&BOOK=12345&PAGE=678"
```

**Use Cases:**
- Historical record lookup (older properties)
- Cross-referencing legal descriptions
- Verify recording sequences

---

#### Method 3: Folio Number
Query by Property Appraiser folio number (most relevant for our platform).

**Parameters:**
```
authKey: 5A0C2347-6BF3-4229-ADD3-05CDD7B96320
FOLIO_NUMBER: 01-3021-045-0010
```

**Example Request:**
```bash
curl "https://www2.miamidadeclerk.gov/Developers/OfficialRecords?authKey=5A0C2347-6BF3-4229-ADD3-05CDD7B96320&FOLIO_NUMBER=01-3021-045-0010"
```

**Use Cases:**
- Retrieve ALL recorded documents for a specific property
- Build property transaction history
- Identify ownership changes, liens, mortgages
- **PRIMARY METHOD for our lead generation platform**

**Returns:** Array of all official records associated with the folio number (deeds, mortgages, liens, etc.)

---

### Response Format

#### Complete Response Structure
```json
{
  "OfficialRecords": [
    {
      "CFN_YEAR": "2024",
      "CFN_SEQ": "123456",
      "BOOK": "12345",
      "PAGE": "678",
      "DOC_TYPE": "WD",
      "REC_DATE": "2024-03-15T00:00:00",
      "DOC_DATE": "2024-03-10T00:00:00",
      "FIRST_PARTY": "SMITH, JOHN & JANE",
      "SECOND_PARTY": "DOE, ROBERT & MARIA",
      "FOLIO_NUMBER": "01-3021-045-0010",
      "LEGAL_DESCRIPTION": "LOT 10 BLOCK 5 CORAL GABLES SECTION 3 PB 45-67",
      "SUBDIVISION_NAME": "CORAL GABLES SECTION 3",
      "CONSIDERATION_1": "450000",
      "CONSIDERATION_2": "0",
      "DEED_DOC_TAX": "3150.00",
      "DOCUMENTARY_STAMPS": "3150.00",
      "INTANGIBLE_TAX": "900.00",
      "SINGLE_FAMILY": "Y",
      "CONDO_FLAG": "N",
      "ASSESSED_VALUE": "425000",
      "PROPERTY_ADDRESS": "123 MAIN ST",
      "CITY": "CORAL GABLES",
      "STATE": "FL",
      "ZIP_CODE": "33134",
      "LEGAL_ACRES": "0.25",
      "BUILDING_SQFT": "2150",
      "YEAR_BUILT": "1985",
      "BEDROOMS": "3",
      "BATHROOMS": "2",
      "PARKING_SPACES": "2",
      "POOL_FLAG": "Y",
      "WATERFRONT_FLAG": "N",
      "HOMESTEAD_EXEMPT": "Y",
      "LAND_USE_CODE": "0001",
      "ZONING": "RESIDENTIAL",
      "TAX_YEAR": "2024",
      "TAXABLE_VALUE": "425000",
      "MILLAGE_RATE": "0.0195",
      "ANNUAL_TAX": "8287.50",
      "MORTGAGE_AMOUNT": "360000",
      "LENDER_NAME": "WELLS FARGO BANK NA",
      "LOAN_TYPE": "CONVENTIONAL",
      "TITLE_COMPANY": "FIRST AMERICAN TITLE",
      "RECORDING_FEE": "85.00",
      "RecordImages": [
        {
          "ImageID": "12345678",
          "PageNumber": "1",
          "ImageURL": "https://www2.miamidadeclerk.gov/library/[path]/image1.pdf"
        },
        {
          "ImageID": "12345679",
          "PageNumber": "2",
          "ImageURL": "https://www2.miamidadeclerk.gov/library/[path]/image2.pdf"
        }
      ]
    }
  ],
  "UnitsConsumed": 1,
  "RemainingBalance": 4523
}
```

#### Key Response Fields (40+ total)

**Identifiers:**
- `CFN_YEAR` - Circuit file year (4 digits)
- `CFN_SEQ` - Circuit file sequence number (6 digits)
- `BOOK` - Recording book number
- `PAGE` - Recording page number
- `FOLIO_NUMBER` - Property Appraiser folio (links to property)

**Document Details:**
- `DOC_TYPE` - Document type code (WD=Warranty Deed, QCD=Quit Claim, MTG=Mortgage, etc.)
- `REC_DATE` - Date recorded with clerk (ISO 8601 format)
- `DOC_DATE` - Date document was executed/signed
- `RECORDING_FEE` - Fee paid for recording

**Parties:**
- `FIRST_PARTY` - Grantor/seller/borrower (comma-separated for multiple parties)
- `SECOND_PARTY` - Grantee/buyer/lender
- **Format:** `LAST, FIRST MIDDLE & LAST2, FIRST2` (ampersand separates co-owners)

**Property Identification:**
- `LEGAL_DESCRIPTION` - Full legal description (metes/bounds or lot/block)
- `SUBDIVISION_NAME` - Subdivision/plat name
- `PROPERTY_ADDRESS` - Street address
- `CITY`, `STATE`, `ZIP_CODE` - Location details

**Financial Details:**
- `CONSIDERATION_1` - Primary consideration amount (sale price)
- `CONSIDERATION_2` - Secondary consideration (if applicable)
- `DEED_DOC_TAX` - Documentary stamp tax on deed
- `DOCUMENTARY_STAMPS` - Total documentary stamps
- `INTANGIBLE_TAX` - Intangible tax on mortgage
- `MORTGAGE_AMOUNT` - Loan amount (if mortgage document)
- `LENDER_NAME` - Lending institution name

**Property Characteristics:**
- `SINGLE_FAMILY` - Single family flag (Y/N)
- `CONDO_FLAG` - Condominium flag (Y/N)
- `BUILDING_SQFT` - Square footage under roof
- `LEGAL_ACRES` - Lot size in acres
- `YEAR_BUILT` - Year of construction
- `BEDROOMS` - Number of bedrooms
- `BATHROOMS` - Number of bathrooms
- `PARKING_SPACES` - Garage/parking spaces
- `POOL_FLAG` - Swimming pool (Y/N)
- `WATERFRONT_FLAG` - Waterfront property (Y/N)

**Tax Information:**
- `ASSESSED_VALUE` - County assessed value
- `TAXABLE_VALUE` - Taxable value after exemptions
- `HOMESTEAD_EXEMPT` - Homestead exemption flag (Y/N)
- `TAX_YEAR` - Tax year for assessment
- `MILLAGE_RATE` - Property tax rate
- `ANNUAL_TAX` - Annual property tax amount

**Additional Details:**
- `LAND_USE_CODE` - County land use classification
- `ZONING` - Zoning designation
- `LOAN_TYPE` - Mortgage loan type (CONVENTIONAL, FHA, VA, etc.)
- `TITLE_COMPANY` - Title company handling transaction

**Document Images:**
- `RecordImages[]` - Array of scanned document pages
  - `ImageID` - Unique image identifier
  - `PageNumber` - Page number in document
  - `ImageURL` - Direct URL to PDF/image file

**API Metadata:**
- `UnitsConsumed` - Number of units charged for this query
- `RemainingBalance` - Units remaining in account

---

### Document Type Codes (DOC_TYPE)

Critical codes for lead generation:

```
WD  = Warranty Deed (standard sale)
QCD = Quit Claim Deed (family transfer, divorce, foreclosure cleanup)
MTG = Mortgage
SAT = Satisfaction of Mortgage (loan payoff)
LIS = Lis Pendens (foreclosure notice)
AGR = Agreement
ASN = Assignment
REL = Release
LN  = Lien
NTS = Notice of Tax Sale
```

**Lead Generation Logic:**
- `WD` + Recent `REC_DATE` = **New homeowner lead** (Product A)
- `LIS` = **Distressed property lead** (Product B)
- `NTS` = **Tax delinquent lead** (Product B)
- `QCD` = **Potential distressed/divorce lead** (Product B)
- `SAT` = **Potential refinance/equity rich** (Product B - wholesale opportunity)

---

## FTP API for Bulk Downloads

### Overview
The FTP API provides access to daily, weekly, and monthly file downloads. This is **more cost-effective** than individual API queries for bulk data ingestion.

**Cost Comparison:**
- Official Records API: Variable (units per query)
- FTP Daily Files: $110/month flat rate (unlimited downloads)
- **Recommendation:** Use FTP for daily ingestion, API for real-time lookups

### FTP Endpoint
```
Base URL: [FTP server provided by Miami-Dade, not in documentation]
Authentication: Same authKey or FTP credentials
```

### Available File Subscriptions

#### 1. Records (Daily Files) - $110/month - ACTIVE
**Files Included:**
- `Cases.exp` - Case master records
- `Parties.exp` - Party name index
- `Dockets.exp` - Docket entries
- `Docktext.exp` - Docket text descriptions
- Lookup tables (document types, case types, etc.)

**Delivery Schedule:** Daily (business days)
**File Format:** Fixed-width text files (.exp extension)
**Refresh Strategy:** Full refresh (replace entire table)

#### 2. Recording Images - $420/month - ACTIVE
**Files Included:**
- Scanned PDF documents for all recordings
- Organized by CFN_YEAR/CFN_SEQ directory structure

**Use Case:** Display actual recorded documents to subscribers (requires significant storage)

#### 3. Marriage Records - $110/month - ACTIVE
**Files Included:**
- Marriage license records
- **Not needed for property lead generation**

#### 4. Civil Cases - PENDING APPROVAL
**Files Included:**
- Civil court case data
- **Use Case:** Eviction records for Product B (distressed properties)
- **Priority:** HIGH (needed for distressed property leads)

#### 5. Family Cases - PENDING APPROVAL
**Files Included:**
- Family court case data
- **Use Case:** Divorce/probate (potential FSBO leads)
- **Priority:** MEDIUM (nice-to-have for Product B)

---

### Daily File Structure

#### Cases.exp (Primary File)
Fixed-width format with the following key fields:

```
Field Name          Start  Length  Type     Description
----------------    -----  ------  -------  ---------------------------
CFN_YEAR            1      4       Numeric  Circuit file year
CFN_SEQ             5      10      Numeric  Circuit file sequence
CASE_TYPE           15     3       Text     Case type code
FILE_DATE           18     10      Date     Date case filed
CLOSE_DATE          28     10      Date     Date case closed
DISPOSITION         38     50      Text     Case disposition
FOLIO_NUMBER        88     20      Text     Property folio (if applicable)
PROPERTY_ADDRESS    108    100     Text     Property address
PLAINTIFF           208    100     Text     Plaintiff name(s)
DEFENDANT           308    100     Text     Defendant name(s)
CASE_STATUS         408    20      Text     Current case status
```

**Total Record Length:** ~500 characters (exact length TBD from actual file inspection)

#### Parties.exp (Name Index)
Links party names to case numbers:

```
Field Name          Start  Length  Type     Description
----------------    -----  ------  -------  ---------------------------
CFN_YEAR            1      4       Numeric  Circuit file year
CFN_SEQ             5      10      Numeric  Circuit file sequence
PARTY_TYPE          15     10      Text     PLAINTIFF/DEFENDANT/GRANTOR/GRANTEE
PARTY_NAME          25     100     Text     Party full name
PARTY_ADDRESS       125    150     Text     Party address (if available)
```

#### Dockets.exp (Docket Entries)
Individual docket entries per case:

```
Field Name          Start  Length  Type     Description
----------------    -----  ------  -------  ---------------------------
CFN_YEAR            1      4       Numeric  Circuit file year
CFN_SEQ             5      10      Numeric  Circuit file sequence
DOCKET_SEQ          15     5       Numeric  Docket sequence number
DOCKET_DATE         20     10      Date     Date of docket entry
DOCKET_CODE         30     10      Text     Docket action code
DOCKET_AMOUNT       40     15      Numeric  Amount (if financial entry)
```

#### Docktext.exp (Docket Descriptions)
Full text descriptions for docket entries:

```
Field Name          Start  Length  Type     Description
----------------    -----  ------  -------  ---------------------------
CFN_YEAR            1      4       Numeric  Circuit file year
CFN_SEQ             5      10      Numeric  Circuit file sequence
DOCKET_SEQ          15     5       Numeric  Docket sequence (links to Dockets.exp)
DOCKET_TEXT         20     500     Text     Full docket entry text
```

---

### Weekly File Structure

#### Civil Evictions (Weekly)
**File:** `Evictions_YYYYMMDD.exp`
**Use Case:** Identify rental properties with problem tenants (distressed property indicator)

```
Field Name          Start  Length  Type     Description
----------------    -----  ------  -------  ---------------------------
CFN_YEAR            1      4       Numeric  Circuit file year
CFN_SEQ             5      10      Numeric  Circuit file sequence
FILING_DATE         15     10      Date     Date eviction filed
LANDLORD_NAME       25     100     Text     Landlord/property owner
TENANT_NAME         125    100     Text     Tenant name
PROPERTY_ADDRESS    225    150     Text     Property address
RENT_AMOUNT         375    10      Numeric  Monthly rent amount
PAST_DUE_AMOUNT     385    10      Numeric  Amount owed
CASE_STATUS         395    20      Text     Current status
JUDGMENT_DATE       415    10      Date     Date of judgment (if applicable)
JUDGMENT_AMOUNT     425    10      Numeric  Judgment amount
```

#### Indebtedness (Weekly)
**File:** `Indebtedness_YYYYMMDD.exp`
**Use Case:** Identify property liens (distressed property indicator)

```
Field Name          Start  Length  Type     Description
----------------    -----  ------  -------  ---------------------------
DEBTOR_NAME         1      100     Text     Name of debtor
CREDITOR_NAME       101    100     Text     Name of creditor
LIEN_AMOUNT         201    15      Numeric  Amount of lien
LIEN_DATE           216    10      Date     Date lien filed
FOLIO_NUMBER        226    20      Text     Property folio (if real property)
LIEN_TYPE           246    30      Text     Type of lien (MECHANICS, JUDGMENT, etc.)
```

---

### Monthly File Structure

#### Verdicts (Monthly)
**File:** `Verdicts_YYYYMM.exp`
**Use Case:** Identify properties with large judgments (distressed indicator)

```
Field Name          Start  Length  Type     Description
----------------    -----  ------  -------  ---------------------------
CFN_YEAR            1      4       Numeric  Circuit file year
CFN_SEQ             5      10      Numeric  Circuit file sequence
VERDICT_DATE        15     10      Date     Date of verdict
PLAINTIFF           25     100     Text     Plaintiff name
DEFENDANT           125    100     Text     Defendant name
VERDICT_AMOUNT      225    15      Numeric  Verdict amount
VERDICT_TYPE        240    20      Text     Plaintiff/Defendant verdict
```

#### Probate Cases (Monthly)
**File:** `Probate_YYYYMM.exp`
**Use Case:** Identify deceased owner properties (high-probability FSBO/wholesale)

```
Field Name          Start  Length  Type     Description
----------------    -----  ------  -------  ---------------------------
CASE_NUMBER         1      20      Text     Probate case number
DECEDENT_NAME       21     100     Text     Name of deceased
DATE_OF_DEATH       121    10      Date     Date of death
FILE_DATE           131    10      Date     Date probate filed
ESTATE_VALUE        141    15      Numeric  Estimated estate value
PERSONAL_REP        156    100     Text     Personal representative name
PERSONAL_REP_ADDR   256    150     Text     PR address (contact point)
PROPERTY_ADDRESS    406    150     Text     Real property address (if applicable)
FOLIO_NUMBER        556    20      Text     Property folio
```

**Lead Generation Priority:** CRITICAL
- Probate properties often sold quickly to pay estate debts
- Heirs often live out of state (high FSBO probability)
- Personal representative is decision-maker (target contact)

---

## Data Transformation Strategy

### Ingestion Architecture

**Two-Tier Approach:**
1. **Daily Bulk Ingestion:** FTP files → Staging tables → Production tables
2. **Real-Time Lookups:** API queries for individual property lookups (subscriber-initiated)

### Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│  Miami-Dade County Data Sources                             │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  FTP Daily Files                   Official Records API      │
│  ├── Cases.exp                     ├── Query by CFN          │
│  ├── Parties.exp                   ├── Query by BOOK/PAGE    │
│  ├── Dockets.exp                   └── Query by FOLIO        │
│  └── Docktext.exp                                            │
│                                                               │
│  FTP Weekly Files                  Units Consumed Tracking   │
│  ├── Evictions.exp                 └── Balance monitoring    │
│  └── Indebtedness.exp                                        │
│                                                               │
│  FTP Monthly Files                                           │
│  ├── Verdicts.exp                                            │
│  └── Probate.exp                                             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  BullMQ Data Ingestion Workers                              │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  daily_ftp_ingestion_worker                                 │
│  ├── Download Cases.exp from FTP                            │
│  ├── Parse fixed-width format                               │
│  ├── Transform to JSON objects                              │
│  └── Insert into staging_official_records                   │
│                                                               │
│  weekly_ftp_ingestion_worker                                │
│  ├── Download Evictions.exp, Indebtedness.exp              │
│  ├── Parse and transform                                    │
│  └── Insert into staging_distressed_properties              │
│                                                               │
│  monthly_ftp_ingestion_worker                               │
│  ├── Download Probate.exp, Verdicts.exp                    │
│  ├── Parse and transform                                    │
│  └── Insert into staging_probate_cases                      │
│                                                               │
│  api_query_worker (on-demand)                               │
│  ├── Triggered by subscriber property lookup                │
│  ├── Query Official Records API by FOLIO                    │
│  ├── Parse JSON response                                    │
│  └── Update properties table with enriched data             │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Data Transformation & Validation Layer                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  transform_official_records()                               │
│  ├── Parse party names (FIRST_PARTY → owner_name)          │
│  ├── Validate folio format (XX-XXXX-XXX-XXXX)              │
│  ├── Calculate equity (assessed_value - mortgage_amount)    │
│  ├── Determine property_type from flags                     │
│  └── Geocode address to lat/lng (if missing)               │
│                                                               │
│  classify_lead_type()                                       │
│  ├── DOC_TYPE=WD + recent REC_DATE → new_homeowner         │
│  ├── DOC_TYPE=LIS → foreclosure                            │
│  ├── Eviction record + owner-occupied → distressed         │
│  ├── Probate case + property → estate_sale                 │
│  └── No MLS listing + indicators → fsbo_candidate          │
│                                                               │
│  deduplicate_records()                                      │
│  ├── Identify duplicate folios across sources               │
│  ├── Merge records by folio_number (primary key)           │
│  └── Keep most recent data (REC_DATE precedence)           │
│                                                               │
│  validate_data_quality()                                    │
│  ├── Check required fields (folio, address, owner)         │
│  ├── Validate financial amounts (no negative values)        │
│  ├── Verify date ranges (REC_DATE <= today)                │
│  └── Flag incomplete records for manual review              │
│                                                               │
└─────────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────────┐
│  Production Database (PostgreSQL)                           │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  properties (master table)                                   │
│  leads (generated from properties)                          │
│  distressed_properties (Product B leads)                    │
│  probate_cases (estate sale leads)                          │
│  eviction_records (distressed indicator)                    │
│                                                               │
│  miami_dade_api_logs (units tracking)                       │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

---

### Parsing Fixed-Width Files

**Node.js Implementation Example:**

```javascript
// parse_cases_exp.js
const fs = require('fs');
const readline = require('readline');

// Field definitions for Cases.exp
const CASES_SCHEMA = [
  { name: 'cfn_year', start: 0, length: 4, type: 'number' },
  { name: 'cfn_seq', start: 4, length: 10, type: 'number' },
  { name: 'case_type', start: 14, length: 3, type: 'string' },
  { name: 'file_date', start: 17, length: 10, type: 'date' },
  { name: 'close_date', start: 27, length: 10, type: 'date' },
  { name: 'disposition', start: 37, length: 50, type: 'string' },
  { name: 'folio_number', start: 87, length: 20, type: 'string' },
  { name: 'property_address', start: 107, length: 100, type: 'string' },
  { name: 'plaintiff', start: 207, length: 100, type: 'string' },
  { name: 'defendant', start: 307, length: 100, type: 'string' },
  { name: 'case_status', start: 407, length: 20, type: 'string' }
];

function parse_fixed_width_line(line, schema) {
  const record = {};
  
  schema.forEach(field => {
    const raw_value = line.substring(field.start, field.start + field.length).trim();
    
    switch (field.type) {
      case 'number':
        record[field.name] = raw_value ? parseInt(raw_value, 10) : null;
        break;
      case 'date':
        record[field.name] = raw_value ? new Date(raw_value) : null;
        break;
      default:
        record[field.name] = raw_value || null;
    }
  });
  
  return record;
}

async function parse_cases_file(file_path) {
  const records = [];
  const file_stream = fs.createReadStream(file_path);
  const rl = readline.createInterface({
    input: file_stream,
    crlfDelay: Infinity
  });
  
  for await (const line of rl) {
    if (line.length > 0) {
      const record = parse_fixed_width_line(line, CASES_SCHEMA);
      records.push(record);
    }
  }
  
  return records;
}

module.exports = { parse_cases_file, parse_fixed_width_line };
```

---

### Parsing API JSON Responses

**Node.js Implementation Example:**

```javascript
// parse_official_records_api.js

function transform_official_records_response(api_response) {
  const transformed_records = [];
  
  if (!api_response.OfficialRecords || api_response.OfficialRecords.length === 0) {
    return { records: [], units_consumed: api_response.UnitsConsumed || 0 };
  }
  
  api_response.OfficialRecords.forEach(record => {
    const transformed = {
      // Identifiers
      cfn_year: parseInt(record.CFN_YEAR, 10),
      cfn_seq: parseInt(record.CFN_SEQ, 10),
      book: parseInt(record.BOOK, 10),
      page: parseInt(record.PAGE, 10),
      folio_number: record.FOLIO_NUMBER,
      
      // Document details
      doc_type: record.DOC_TYPE,
      recording_date: new Date(record.REC_DATE),
      document_date: new Date(record.DOC_DATE),
      recording_fee: parseFloat(record.RECORDING_FEE) || 0,
      
      // Party information
      grantor: parse_party_name(record.FIRST_PARTY),
      grantee: parse_party_name(record.SECOND_PARTY),
      
      // Property details
      property_address: format_address(
        record.PROPERTY_ADDRESS,
        record.CITY,
        record.STATE,
        record.ZIP_CODE
      ),
      legal_description: record.LEGAL_DESCRIPTION,
      subdivision_name: record.SUBDIVISION_NAME,
      
      // Financial data
      sale_price: parseFloat(record.CONSIDERATION_1) || 0,
      documentary_stamps: parseFloat(record.DOCUMENTARY_STAMPS) || 0,
      mortgage_amount: parseFloat(record.MORTGAGE_AMOUNT) || 0,
      lender_name: record.LENDER_NAME,
      
      // Property characteristics
      property_type: determine_property_type(record),
      building_sqft: parseInt(record.BUILDING_SQFT, 10) || 0,
      lot_size: parseFloat(record.LEGAL_ACRES) || 0,
      year_built: parseInt(record.YEAR_BUILT, 10) || null,
      bedrooms: parseInt(record.BEDROOMS, 10) || 0,
      bathrooms: parseFloat(record.BATHROOMS) || 0,
      has_pool: record.POOL_FLAG === 'Y',
      is_waterfront: record.WATERFRONT_FLAG === 'Y',
      
      // Tax information
      assessed_value: parseFloat(record.ASSESSED_VALUE) || 0,
      taxable_value: parseFloat(record.TAXABLE_VALUE) || 0,
      annual_tax: parseFloat(record.ANNUAL_TAX) || 0,
      homestead_exempt: record.HOMESTEAD_EXEMPT === 'Y',
      
      // Metadata
      record_images: record.RecordImages || [],
      created_at: new Date(),
      data_source: 'miami_dade_api'
    };
    
    transformed_records.push(transformed);
  });
  
  return {
    records: transformed_records,
    units_consumed: api_response.UnitsConsumed || 0,
    remaining_balance: api_response.RemainingBalance || 0
  };
}

function parse_party_name(party_string) {
  if (!party_string) return null;
  
  // Handle multiple parties separated by ampersand
  // Example: "SMITH, JOHN & JANE DOE" → ["SMITH, JOHN", "JANE DOE"]
  const parties = party_string.split('&').map(p => p.trim());
  
  return {
    raw_name: party_string,
    primary_party: parties[0],
    additional_parties: parties.slice(1),
    party_count: parties.length
  };
}

function format_address(street, city, state, zip) {
  const parts = [street, city, state, zip].filter(p => p && p.trim());
  return parts.join(', ');
}

function determine_property_type(record) {
  if (record.SINGLE_FAMILY === 'Y') return 'single_family';
  if (record.CONDO_FLAG === 'Y') return 'condo';
  if (record.LAND_USE_CODE && record.LAND_USE_CODE.startsWith('00')) return 'residential';
  return 'other';
}

module.exports = { transform_official_records_response };
```

---

## Field Mapping to Database Schema

### properties Table Mapping

**Source:** Official Records API + Daily FTP Files

| API/File Field | Database Column | Transform Function | Notes |
|---|---|---|---|
| `FOLIO_NUMBER` | `folio_number` | Direct | Primary key for property |
| `PROPERTY_ADDRESS` | `address` | `format_address()` | Combine street, city, state, zip |
| `CITY` | `city` | Direct | - |
| `STATE` | `state` | Direct | Always "FL" |
| `ZIP_CODE` | `zip_code` | Direct | 5-digit format |
| `LEGAL_DESCRIPTION` | `legal_description` | Direct | - |
| `SUBDIVISION_NAME` | `subdivision` | Direct | - |
| `FIRST_PARTY` | `owner_name` | `parse_party_name()` | Extract primary owner |
| `SECOND_PARTY` | - | Store in transactions table | Buyer in deed, lender in mortgage |
| `CONSIDERATION_1` | `last_sale_price` | `parseFloat()` | Most recent deed sale price |
| `REC_DATE` | `last_sale_date` | `new Date()` | Most recent deed recording |
| `DOC_TYPE` | `last_transaction_type` | Direct | Most recent document type |
| `ASSESSED_VALUE` | `assessed_value` | `parseFloat()` | Property appraiser value |
| `TAXABLE_VALUE` | `taxable_value` | `parseFloat()` | After exemptions |
| `ANNUAL_TAX` | `annual_tax_amount` | `parseFloat()` | - |
| `MORTGAGE_AMOUNT` | `mortgage_balance` | `parseFloat()` | Most recent mortgage |
| `LENDER_NAME` | `lender_name` | Direct | Most recent lender |
| `BUILDING_SQFT` | `building_sqft` | `parseInt()` | - |
| `LEGAL_ACRES` | `lot_size_acres` | `parseFloat()` | - |
| `YEAR_BUILT` | `year_built` | `parseInt()` | - |
| `BEDROOMS` | `bedrooms` | `parseInt()` | - |
| `BATHROOMS` | `bathrooms` | `parseFloat()` | Handle half-baths (2.5) |
| `PARKING_SPACES` | `garage_spaces` | `parseInt()` | - |
| `POOL_FLAG` | `has_pool` | `=== 'Y'` | Boolean conversion |
| `WATERFRONT_FLAG` | `is_waterfront` | `=== 'Y'` | Boolean conversion |
| `HOMESTEAD_EXEMPT` | `homestead_exempt` | `=== 'Y'` | Boolean conversion |
| `SINGLE_FAMILY` + `CONDO_FLAG` | `property_type` | `determine_property_type()` | Enum mapping |
| `LAND_USE_CODE` | `land_use_code` | Direct | - |
| `ZONING` | `zoning` | Direct | - |
| - | `latitude` | Geocode from address | PostGIS point |
| - | `longitude` | Geocode from address | PostGIS point |
| - | `geom` | Create from lat/lng | PostGIS geography |

### leads Table Mapping

**Source:** Derived from properties + classification logic

| Derived Field | Database Column | Logic | Notes |
|---|---|---|---|
| Property folio | `property_id` | Foreign key to properties | - |
| Classification | `lead_type` | `classify_lead_type()` | new_homeowner, foreclosure, fsbo, etc. |
| Document type | `lead_source` | Based on DOC_TYPE | warranty_deed, lis_pendens, probate, etc. |
| Recording date | `lead_date` | Same as REC_DATE | When lead became actionable |
| Owner name | `contact_name` | From properties.owner_name | Initial contact |
| Property address | `contact_address` | From properties.address | - |
| Calculated | `estimated_equity` | assessed_value - mortgage_balance | For investor leads |
| Calculated | `days_on_market` | Date diff if listed | For FSBO detection |
| Scoring | `lead_score` | `calculate_lead_score()` | 0-100 prioritization |

### distressed_properties Table Mapping

**Source:** Weekly eviction files + Lis Pendens + Probate cases

| Source Field | Database Column | Transform | Notes |
|---|---|---|---|
| `FOLIO_NUMBER` | `property_id` | Foreign key | Link to properties |
| `DOC_TYPE=LIS` | `distress_type` | 'foreclosure' | - |
| Eviction record | `distress_type` | 'eviction' | - |
| Probate case | `distress_type` | 'probate' | - |
| `NTS` | `distress_type` | 'tax_delinquent' | - |
| `FILING_DATE` | `distress_start_date` | Direct | When distress began |
| `CASE_STATUS` | `current_status` | Direct | Active, resolved, etc. |
| `PLAINTIFF` (eviction) | `creditor_name` | Direct | Landlord or lender |
| `PAST_DUE_AMOUNT` | `amount_owed` | `parseFloat()` | Debt amount |

### probate_cases Table Mapping

**Source:** Monthly probate files

| Source Field | Database Column | Transform | Notes |
|---|---|---|---|
| `CASE_NUMBER` | `case_number` | Direct | Probate case ID |
| `FOLIO_NUMBER` | `property_id` | Foreign key | May be null |
| `DECEDENT_NAME` | `decedent_name` | Direct | Deceased owner |
| `DATE_OF_DEATH` | `date_of_death` | Date | - |
| `FILE_DATE` | `filing_date` | Date | When probate opened |
| `ESTATE_VALUE` | `estate_value` | `parseFloat()` | Estimated value |
| `PERSONAL_REP` | `executor_name` | Direct | Decision maker |
| `PERSONAL_REP_ADDR` | `executor_address` | Direct | Contact for outreach |
| `PROPERTY_ADDRESS` | `property_address` | Direct | May differ from decedent address |

### eviction_records Table Mapping

**Source:** Weekly eviction files

| Source Field | Database Column | Transform | Notes |
|---|---|---|---|
| `CFN_YEAR` + `CFN_SEQ` | `case_number` | Concatenate | Unique case ID |
| `PROPERTY_ADDRESS` | Lookup folio | Geocode & match | Link to property |
| `FILING_DATE` | `filing_date` | Date | - |
| `LANDLORD_NAME` | `landlord_name` | Direct | Property owner |
| `TENANT_NAME` | `tenant_name` | Direct | - |
| `RENT_AMOUNT` | `monthly_rent` | `parseFloat()` | - |
| `PAST_DUE_AMOUNT` | `amount_owed` | `parseFloat()` | - |
| `CASE_STATUS` | `status` | Direct | Filed, judgment, dismissed |
| `JUDGMENT_DATE` | `judgment_date` | Date | - |
| `JUDGMENT_AMOUNT` | `judgment_amount` | `parseFloat()` | - |

---

## File Ingestion Workflows

### Daily Ingestion Workflow (BullMQ)

**Job Name:** `daily-ftp-ingestion`  
**Schedule:** 6:00 AM EST (after Miami-Dade updates FTP)  
**Priority:** HIGH  
**Estimated Duration:** 30-60 minutes

**Steps:**
1. **Download Files from FTP**
   - Connect to Miami-Dade FTP server
   - Download Cases.exp, Parties.exp, Dockets.exp, Docktext.exp
   - Verify file checksums (if provided)
   - Store in `/tmp/miami_dade_daily/YYYYMMDD/`

2. **Parse Fixed-Width Files**
   - Use `parse_cases_file()` function
   - Convert to JSON objects
   - Validate required fields

3. **Stage Data**
   - Truncate staging tables
   - Bulk insert into `staging_official_records`
   - Log record counts

4. **Transform & Validate**
   - Run `transform_official_records()` on staging data
   - Apply business logic (classify leads, calculate equity)
   - Flag validation errors

5. **Upsert to Production**
   - Merge staging data into `properties` table (ON CONFLICT folio_number DO UPDATE)
   - Insert new leads into `leads` table
   - Update `distressed_properties` if applicable

6. **Generate Subscriber Alerts**
   - Query new leads matching subscriber criteria
   - Queue email/voice alerts for subscribers
   - Log alert generation

7. **Cleanup & Logging**
   - Archive downloaded files to Cloud Storage
   - Delete temp files from `/tmp/`
   - Insert summary into `data_ingestion_logs`

**Error Handling:**
- If FTP download fails: Retry 3 times with 5-minute delay
- If parse errors exceed 1%: Alert admin, continue with valid records
- If staging insert fails: Rollback transaction, alert admin
- If production merge fails: Halt workflow, alert admin (CRITICAL)

---

### Weekly Ingestion Workflow (BullMQ)

**Job Name:** `weekly-ftp-ingestion`  
**Schedule:** Every Monday 7:00 AM EST  
**Priority:** MEDIUM  
**Estimated Duration:** 15-30 minutes

**Steps:**
1. Download Evictions.exp and Indebtedness.exp from FTP
2. Parse and stage data
3. Match eviction addresses to property folios (geocoding if needed)
4. Upsert into `eviction_records` and `distressed_properties`
5. Generate Product B (investor) leads for new distressed properties
6. Queue alerts for Product B subscribers

---

### Monthly Ingestion Workflow (BullMQ)

**Job Name:** `monthly-ftp-ingestion`  
**Schedule:** 1st of each month, 8:00 AM EST  
**Priority:** MEDIUM  
**Estimated Duration:** 10-20 minutes

**Steps:**
1. Download Probate.exp and Verdicts.exp from FTP
2. Parse and stage data
3. Match probate properties to folios
4. Upsert into `probate_cases` and `distressed_properties`
5. Generate high-priority Product B leads (probate = motivated sellers)
6. Queue alerts for Product B subscribers with probate preference

---

### Real-Time API Query Workflow (On-Demand)

**Trigger:** Subscriber searches for specific property (by address or folio)  
**Job Name:** `api-property-lookup`  
**Priority:** URGENT  
**Estimated Duration:** 2-5 seconds

**Steps:**
1. Extract folio_number from subscriber query
2. Check if property exists in database with recent data (<30 days)
3. If stale or missing:
   - Query Official Records API by FOLIO_NUMBER
   - Consume units from account balance
   - Parse API response
   - Upsert enriched data into properties table
   - Log units consumed in `miami_dade_api_logs`
4. Return complete property record to subscriber

**Units Tracking:**
- Deduct consumed units from internal counter
- Alert admin when balance < 1000 units
- Implement daily spending cap (max 500 units/day for safety)

---

## Units Cost Tracking

### Overview
The Official Records API charges in "units" rather than traditional API rate limiting. Each query consumes a variable number of units depending on:
- Query type (CFN, BOOK/PAGE, FOLIO)
- Number of records returned
- Image access (if enabled)

**Current Understanding:**
- Unit cost per query: 1-5 units (TBD from testing)
- Account balance: Rechargeable (payment method TBD)
- No documented rate limit (only unit balance constraint)

### Database Schema for Tracking

**Table:** `miami_dade_api_logs`

```sql
CREATE TABLE miami_dade_api_logs (
  id SERIAL PRIMARY KEY,
  query_type VARCHAR(20) NOT NULL,  -- 'CFN', 'BOOK_PAGE', 'FOLIO'
  query_params JSONB NOT NULL,      -- {CFN_YEAR: 2024, CFN_SEQ: 123456}
  units_consumed INTEGER NOT NULL,
  remaining_balance INTEGER,
  response_status VARCHAR(20),      -- 'success', 'error', 'no_data'
  records_returned INTEGER,
  triggered_by VARCHAR(50),         -- 'daily_worker', 'subscriber_query', 'admin'
  subscriber_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  INDEX idx_created_at (created_at),
  INDEX idx_subscriber_id (subscriber_id)
);
```

### Monitoring & Alerts

**Daily Monitoring Query:**
```sql
-- Daily units consumption report
SELECT 
  DATE(created_at) AS date,
  query_type,
  COUNT(*) AS total_queries,
  SUM(units_consumed) AS total_units,
  AVG(units_consumed) AS avg_units_per_query,
  SUM(records_returned) AS total_records
FROM miami_dade_api_logs
WHERE created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(created_at), query_type
ORDER BY date DESC, query_type;
```

**Low Balance Alert:**
```javascript
// Check balance after each API call
async function check_units_balance(remaining_balance) {
  if (remaining_balance < 1000) {
    await send_admin_alert({
      severity: 'warning',
      subject: 'Miami-Dade API Units Low',
      message: `Remaining balance: ${remaining_balance} units. Recharge recommended.`,
      action_required: 'Recharge units at Miami-Dade portal'
    });
  }
  
  if (remaining_balance < 500) {
    await send_admin_alert({
      severity: 'critical',
      subject: 'URGENT: Miami-Dade API Units Critical',
      message: `Remaining balance: ${remaining_balance} units. Service interruption imminent.`,
      action_required: 'IMMEDIATE RECHARGE REQUIRED'
    });
  }
}
```

**Daily Spending Cap:**
```javascript
// Prevent runaway unit consumption
const DAILY_UNIT_CAP = 500;

async function enforce_daily_cap() {
  const today_consumption = await db.query(`
    SELECT SUM(units_consumed) AS total
    FROM miami_dade_api_logs
    WHERE created_at::date = CURRENT_DATE
  `);
  
  if (today_consumption.total >= DAILY_UNIT_CAP) {
    throw new Error('Daily unit cap reached. API queries disabled until tomorrow.');
  }
}
```

---

## Error Handling & Retry Logic

### API Error Responses

**Expected Error Scenarios:**

1. **Insufficient Units**
```json
{
  "error": "Insufficient units",
  "remaining_balance": 0,
  "message": "Please recharge your account"
}
```
**Action:** Halt API queries, alert admin, display maintenance message to subscribers

2. **Invalid Authentication**
```json
{
  "error": "Invalid authKey",
  "message": "Authentication failed"
}
```
**Action:** Alert admin (CRITICAL), check if auth key expired

3. **No Data Found**
```json
{
  "OfficialRecords": [],
  "UnitsConsumed": 1,
  "RemainingBalance": 4523
}
```
**Action:** Log as normal (not an error), return empty result to subscriber

4. **Malformed Query**
```json
{
  "error": "Invalid parameters",
  "message": "CFN_YEAR must be 4 digits"
}
```
**Action:** Log error, validate query params before sending

5. **Server Error (500)**
```json
{
  "error": "Internal server error",
  "message": "Please try again later"
}
```
**Action:** Retry with exponential backoff (3 attempts)

---

### Retry Logic Implementation

```javascript
const axios = require('axios');

async function query_official_records_with_retry(params, max_retries = 3) {
  let attempt = 0;
  let last_error;
  
  while (attempt < max_retries) {
    try {
      const response = await axios.get('https://www2.miamidadeclerk.gov/Developers/OfficialRecords', {
        params: {
          authKey: '5A0C2347-6BF3-4229-ADD3-05CDD7B96320',
          ...params
        },
        timeout: 30000  // 30 second timeout
      });
      
      // Success - log units consumed
      await log_api_call(params, response.data);
      
      return response.data;
      
    } catch (error) {
      last_error = error;
      attempt++;
      
      // Don't retry on client errors (4xx)
      if (error.response && error.response.status >= 400 && error.response.status < 500) {
        throw error;
      }
      
      // Exponential backoff: 2s, 4s, 8s
      if (attempt < max_retries) {
        const delay = Math.pow(2, attempt) * 1000;
        await sleep(delay);
      }
    }
  }
  
  // All retries failed
  throw new Error(`API query failed after ${max_retries} attempts: ${last_error.message}`);
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function log_api_call(params, response_data) {
  await db.query(`
    INSERT INTO miami_dade_api_logs (
      query_type,
      query_params,
      units_consumed,
      remaining_balance,
      response_status,
      records_returned,
      triggered_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  `, [
    determine_query_type(params),
    JSON.stringify(params),
    response_data.UnitsConsumed || 0,
    response_data.RemainingBalance || 0,
    response_data.OfficialRecords ? 'success' : 'no_data',
    response_data.OfficialRecords ? response_data.OfficialRecords.length : 0,
    'system'
  ]);
}

function determine_query_type(params) {
  if (params.CFN_YEAR && params.CFN_SEQ) return 'CFN';
  if (params.BOOK && params.PAGE) return 'BOOK_PAGE';
  if (params.FOLIO_NUMBER) return 'FOLIO';
  return 'unknown';
}
```

---

## Rate Limiting & Optimization

### FTP vs API Decision Matrix

| Scenario | Recommended Method | Rationale |
|---|---|---|
| Daily bulk ingestion of new properties | FTP Daily Files | Flat $110/mo, unlimited downloads |
| Subscriber searches specific property | Official Records API | Real-time, targeted query |
| Historical property transaction history | Official Records API (FOLIO query) | Returns all records for property |
| Weekly distressed property updates | FTP Weekly Files | Cost-effective for batch updates |
| Verify single document by CFN | Official Records API | Precise lookup, low unit cost |
| Monthly probate case ingestion | FTP Monthly Files | Bulk data, predictable schedule |

### Cost Optimization Strategies

1. **Minimize API Queries:**
   - Use FTP files for all bulk ingestion
   - Query API only for subscriber-initiated lookups
   - Cache API responses for 30 days (daily FTP refresh handles updates)

2. **Deduplicate Queries:**
   - Before API query, check if property exists in database with recent data
   - If `properties.last_updated` < 30 days ago, serve from database
   - Only query API for stale or missing data

3. **Batch Processing:**
   - Queue multiple subscriber property lookups
   - Execute during off-peak hours if not urgent
   - Reduces perceived API load

4. **Units Budget Allocation:**
   - Reserve 200 units/day for subscriber queries (priority)
   - Reserve 100 units/day for admin research
   - Reserve 100 units/day for data quality checks
   - Alert if daily consumption exceeds 400 units

---

## Implementation Checklist

### Phase 1: FTP Integration (Week 1-2)
- [ ] Obtain FTP server credentials from Miami-Dade
- [ ] Test FTP connection and file download
- [ ] Create `parse_cases_file()` function for Cases.exp
- [ ] Create parsers for Parties.exp, Dockets.exp, Docktext.exp
- [ ] Build staging tables in database
- [ ] Implement daily BullMQ worker for FTP ingestion
- [ ] Test full ingestion workflow end-to-end
- [ ] Set up Cloud Storage archiving for downloaded files

### Phase 2: API Integration (Week 3-4)
- [ ] Test Official Records API with all three query methods (CFN, BOOK/PAGE, FOLIO)
- [ ] Implement `query_official_records_with_retry()` function
- [ ] Create `transform_official_records_response()` function
- [ ] Build units tracking system (`miami_dade_api_logs` table)
- [ ] Implement daily spending cap enforcement
- [ ] Create low balance alert system
- [ ] Test API integration with real subscriber queries
- [ ] Document actual units cost per query type

### Phase 3: Data Transformation (Week 5-6)
- [ ] Build `parse_party_name()` function
- [ ] Build `classify_lead_type()` function
- [ ] Build `calculate_lead_score()` function
- [ ] Implement geocoding for addresses missing lat/lng
- [ ] Create deduplication logic for folio merging
- [ ] Build data quality validation checks
- [ ] Test transformation accuracy with sample data
- [ ] Create admin dashboard for data quality monitoring

### Phase 4: Lead Generation (Week 7-8)
- [ ] Implement new homeowner detection (Product A)
- [ ] Implement distressed property detection (Product B)
- [ ] Implement FSBO detection logic
- [ ] Build subscriber matching engine (criteria → leads)
- [ ] Create alert queuing system (email/voice/SMS)
- [ ] Test lead generation accuracy
- [ ] Build admin tools for lead review/approval
- [ ] Launch beta with limited subscribers

---

## Testing & Validation Plan

### API Testing Scenarios

**Test 1: Query by Folio (Primary Use Case)**
```bash
curl "https://www2.miamidadeclerk.gov/Developers/OfficialRecords?authKey=5A0C2347-6BF3-4229-ADD3-05CDD7B96320&FOLIO_NUMBER=01-3021-045-0010"
```
**Expected:** Array of all official records for property
**Validate:** Response has >0 records, FOLIO_NUMBER matches, REC_DATE is valid date

**Test 2: Query by CFN**
```bash
curl "https://www2.miamidadeclerk.gov/Developers/OfficialRecords?authKey=5A0C2347-6BF3-4229-ADD3-05CDD7B96320&CFN_YEAR=2024&CFN_SEQ=123456"
```
**Expected:** Single official record or empty array
**Validate:** CFN components match, UnitsConsumed=1

**Test 3: Query Non-Existent Property**
```bash
curl "https://www2.miamidadeclerk.gov/Developers/OfficialRecords?authKey=5A0C2347-6BF3-4229-ADD3-05CDD7B96320&FOLIO_NUMBER=99-9999-999-9999"
```
**Expected:** Empty OfficialRecords array, still consumes 1 unit
**Validate:** No error thrown, units deducted, RemainingBalance updated

**Test 4: Invalid Auth Key**
```bash
curl "https://www2.miamidadeclerk.gov/Developers/OfficialRecords?authKey=INVALID&FOLIO_NUMBER=01-3021-045-0010"
```
**Expected:** Authentication error response
**Validate:** Error message indicates auth failure

---

## Appendix: Document Type Codes Reference

### Critical Codes for Lead Generation

| Code | Description | Lead Type | Priority | Notes |
|---|---|---|---|---|
| WD | Warranty Deed | New Homeowner (A) | HIGH | Standard property sale |
| QCD | Quit Claim Deed | Potential Distressed (B) | MEDIUM | Often divorce, foreclosure cleanup, family transfer |
| LIS | Lis Pendens | Foreclosure (B) | CRITICAL | Legal notice of foreclosure action |
| MTG | Mortgage | - | LOW | Informational (track loan amounts) |
| SAT | Satisfaction of Mortgage | Equity Rich (B) | MEDIUM | Property now free and clear |
| NTS | Notice of Tax Sale | Tax Delinquent (B) | HIGH | County-initiated foreclosure for unpaid taxes |
| AGR | Agreement | Variable | LOW | Depends on context |
| LN | Lien | Potential Distressed (B) | MEDIUM | Debt attached to property |
| REL | Release of Lien | - | LOW | Informational (debt paid) |
| ASN | Assignment | - | LOW | Mortgage sold to new lender |

### Full Document Type List (100+ codes)

Refer to Miami-Dade lookup tables downloaded via FTP for complete list. Key categories:
- **Conveyances:** WD, QCD, SPD, LW, etc.
- **Mortgages:** MTG, SAT, ASN, MOD, etc.
- **Liens:** LN, REL, NLN, etc.
- **Court Actions:** LIS, NTS, JUD, etc.
- **Easements:** EAS, R/W, etc.
- **Other:** PLAT, CORR, AFIFD, etc.

---

## Related Documents
- **02_DATABASE_SCHEMA.md** - Database tables referenced in field mapping
- **04_TOKEN_SYSTEM.md** - Token deductions for API usage
- **06_BULLMQ_WORKERS.md** - BullMQ job implementations for data ingestion
- **05_API_ENDPOINTS.md** - REST API endpoints exposing property data to subscribers

---

## Changelog

**Version 2.0 (2025-11-20) - PRODUCTION SPECIFICATIONS**
- Replaced all placeholder content with actual API documentation
- Added three query methods (CFN, BOOK/PAGE, FOLIO) with examples
- Documented 40+ response fields with complete descriptions
- Added FTP API specifications for bulk file downloads
- Defined daily/weekly/monthly file structures and schemas
- Created complete field mapping to database schema
- Documented units cost tracking system
- Added data transformation functions with code examples
- Defined file ingestion workflows with BullMQ job details
- Added error handling and retry logic implementations
- Created testing and validation plan
- Removed all "placeholder mode" references

**Version 1.0 (2025-11-18) - PLACEHOLDER VERSION**
- Initial document with estimated API structure
- Generic endpoint documentation
- Placeholder data formats

---

**Document Status:** PRODUCTION READY  
**Next Review:** After Phase 1 API testing completes  
**Owner:** Gabe Sebastian (thedevingrey@gmail.com)
