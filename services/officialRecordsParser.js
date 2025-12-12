/**
 * Official Records Parser Service
 * 
 * Parses Miami-Dade County Official Records files (caret-delimited .exp format)
 * Extracts deed/sale records and updates properties_real table
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { createGunzip } = require('zlib');
const unzipper = require('unzipper');

// Document types that represent property sales/transfers
const DEED_DOCUMENT_TYPES = [
    'WD',     // Warranty Deed
    'QCD',    // Quit Claim Deed
    'TD',     // Trustee's Deed
    'CD',     // Corporate Deed
    'PRD',    // Personal Representative's Deed
    'SPD',    // Special Purpose Deed
    'GD',     // Gift Deed
    'LD',     // Life Estate Deed
    'DEED',   // Generic Deed
];

// Distress indicator document types
const DISTRESS_DOCUMENT_TYPES = [
    'LP',     // Lis Pendens (Pre-foreclosure)
    'NDS',    // Notice of Default
    'LIEN',   // Lien
    'TAXL',   // Tax Lien
    'JUD',    // Judgment
    'FORE',   // Foreclosure
];

/**
 * Field positions in the caret-delimited record
 * Based on Miami-Dade Official Records structure
 */
const FIELD_POSITIONS = {
    CFN_YEAR: 0,
    CFN_SEQ: 1,
    GROUP_ID: 2,
    RECORDING_DATE: 3,
    RECORDING_TIME: 4,
    RECORDING_BOOK: 5,
    RECORDING_PAGE: 6,
    BOOK_TYPE: 7,
    DOCUMENT_PAGES: 8,
    APPEND_PAGES: 9,
    DOCUMENT_TYPE: 10,
    DOCUMENT_TYPE_DESC: 11,
    DOCUMENT_DATE: 12,
    FIRST_PARTY: 13,
    FIRST_PARTY_CODE: 14,
    CROSS_PARTY_NAME: 15,
    ORIGINAL_CFN_YEAR: 16,
    ORIGINAL_CFN_SEQ: 17,
    ORIGINAL_RECORDING_BOOK: 18,
    ORIGINAL_RECORDING_PAGE: 19,
    ORIGINAL_MISC_REF: 20,
    SUBDIVISION_NAME: 21,
    FOLIO_NUMBER: 22,
    LEGAL_DESCRIPTION: 23,
    SECTION: 24,
    TOWNSHIP: 25,
    RANGE: 26,
    PLAT_BOOK: 27,
    PLAT_PAGE: 28,
    BLOCK: 29,
    CASE_NUMBER: 30,
    CONSIDERATION_1: 31,
    CONSIDERATION_2: 32,
    DEED_DOC_TAX: 33,
    SINGLE_FAMILY: 34,
    SURTAX: 35,
    INTANGIBLE: 36,
    DOC_STAMPS: 37,
    KEY: 38,
    TRANSACTION_TYPE: 39,
    PARTY_SEQUENCE: 40,
    MODIFIED_DATE: 41
};

/**
 * Parse recording date from NUMBER(8) format (YYYYMMDD)
 */
function parseRecordingDate(value) {
    if (!value || value === '0') return null;
    const str = String(value).padStart(8, '0');
    const year = str.slice(0, 4);
    const month = str.slice(4, 6);
    const day = str.slice(6, 8);

    // Validate date components
    if (parseInt(year) < 1900 || parseInt(year) > 2100) return null;
    if (parseInt(month) < 1 || parseInt(month) > 12) return null;
    if (parseInt(day) < 1 || parseInt(day) > 31) return null;

    return `${year}-${month}-${day}`;
}

/**
 * Parse folio number - clean and format consistently
 */
function parseFolioNumber(value) {
    if (!value) return null;
    // Remove quotes, dashes, spaces and format as consistent string
    return String(value)
        .replace(/["\s-]/g, '')
        .trim() || null;
}

/**
 * Parse consideration/price from NUMBER(16.2) format
 */
function parseConsideration(value) {
    if (!value || value === '0' || value === '0.00') return null;
    const num = parseFloat(value);
    return isNaN(num) || num <= 0 ? null : num;
}

/**
 * Parse a single caret-delimited line
 */
function parseLine(line) {
    const fields = line.split('^');

    if (fields.length < 32) {
        return null; // Invalid record
    }

    const docType = (fields[FIELD_POSITIONS.DOCUMENT_TYPE] || '').trim().toUpperCase();
    const folioNumber = parseFolioNumber(fields[FIELD_POSITIONS.FOLIO_NUMBER]);

    // Skip records without folio number (can't link to property)
    if (!folioNumber) {
        return null;
    }

    return {
        cfnYear: parseInt(fields[FIELD_POSITIONS.CFN_YEAR]) || null,
        cfnSeq: parseInt(fields[FIELD_POSITIONS.CFN_SEQ]) || null,
        recordingDate: parseRecordingDate(fields[FIELD_POSITIONS.RECORDING_DATE]),
        documentType: docType,
        documentTypeDesc: (fields[FIELD_POSITIONS.DOCUMENT_TYPE_DESC] || '').trim(),
        folioNumber: folioNumber,
        firstParty: (fields[FIELD_POSITIONS.FIRST_PARTY] || '').trim(),
        firstPartyCode: (fields[FIELD_POSITIONS.FIRST_PARTY_CODE] || '').trim(),
        crossPartyName: (fields[FIELD_POSITIONS.CROSS_PARTY_NAME] || '').trim(),
        subdivisionName: (fields[FIELD_POSITIONS.SUBDIVISION_NAME] || '').trim(),
        legalDescription: (fields[FIELD_POSITIONS.LEGAL_DESCRIPTION] || '').trim(),
        consideration: parseConsideration(fields[FIELD_POSITIONS.CONSIDERATION_1]),
        consideration2: parseConsideration(fields[FIELD_POSITIONS.CONSIDERATION_2]),
        caseNumber: (fields[FIELD_POSITIONS.CASE_NUMBER] || '').trim(),
        transactionType: (fields[FIELD_POSITIONS.TRANSACTION_TYPE] || '').trim(),
        key: (fields[FIELD_POSITIONS.KEY] || '').trim(),
        isDeed: DEED_DOCUMENT_TYPES.includes(docType),
        isDistress: DISTRESS_DOCUMENT_TYPES.includes(docType),
    };
}

/**
 * Extract zip file to temporary directory and return list of .exp files
 */
async function extractZipFile(zipPath) {
    const extractDir = path.join(path.dirname(zipPath), 'extracted_' + Date.now());

    if (!fs.existsSync(extractDir)) {
        fs.mkdirSync(extractDir, { recursive: true });
    }

    const expFiles = [];

    await new Promise((resolve, reject) => {
        fs.createReadStream(zipPath)
            .pipe(unzipper.Parse())
            .on('entry', async (entry) => {
                const fileName = entry.path;
                const ext = path.extname(fileName).toLowerCase();

                if (ext === '.exp' || ext === '.xls' || ext === '.txt' || ext === '.csv') {
                    const filePath = path.join(extractDir, path.basename(fileName));
                    entry.pipe(fs.createWriteStream(filePath));
                    expFiles.push(filePath);
                } else {
                    entry.autodrain();
                }
            })
            .on('close', resolve)
            .on('error', reject);
    });

    // Wait a bit for files to finish writing
    await new Promise(resolve => setTimeout(resolve, 500));

    return { extractDir, expFiles };
}

/**
 * Process an Official Records file and return parsed records
 */
async function processOfficialRecordsFile(filePath, options = {}) {
    const {
        onProgress = () => { },
        onRecord = () => { },
        filterDeeds = true,
        includeDistress = true,
    } = options;

    const stats = {
        totalLines: 0,
        parsedRecords: 0,
        deedRecords: 0,
        distressRecords: 0,
        skippedRecords: 0,
        errors: 0,
    };

    const records = [];

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        stats.totalLines++;

        // Skip empty lines
        if (!line.trim()) continue;

        try {
            const record = parseLine(line);

            if (!record) {
                stats.skippedRecords++;
                continue;
            }

            stats.parsedRecords++;

            if (record.isDeed) {
                stats.deedRecords++;
                if (filterDeeds) {
                    records.push(record);
                    onRecord(record);
                }
            } else if (record.isDistress) {
                stats.distressRecords++;
                if (includeDistress) {
                    records.push(record);
                    onRecord(record);
                }
            } else if (!filterDeeds) {
                records.push(record);
                onRecord(record);
            } else {
                stats.skippedRecords++;
            }

            // Progress update every 10k lines
            if (stats.totalLines % 10000 === 0) {
                onProgress(stats);
            }

        } catch (err) {
            stats.errors++;
        }
    }

    onProgress(stats);

    return { records, stats };
}

/**
 * Import records into the database
 */
async function importRecordsToDatabase(pool, records, county = 'MiamiDade') {
    const stats = {
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
    };

    // Group records by folio number - take the most recent sale for each property
    const recordsByFolio = {};
    for (const record of records) {
        if (!record.isDeed) continue;

        const folio = record.folioNumber;
        if (!recordsByFolio[folio] ||
            (record.recordingDate && record.recordingDate > recordsByFolio[folio].recordingDate)) {
            recordsByFolio[folio] = record;
        }
    }

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const folio of Object.keys(recordsByFolio)) {
            const record = recordsByFolio[folio];

            try {
                // Check if property exists
                const existing = await client.query(
                    'SELECT property_id FROM properties_real WHERE parcel_id = $1',
                    [folio]
                );

                if (existing.rows.length > 0) {
                    // Update existing property with sale info
                    await client.query(`
                        UPDATE properties_real
                        SET last_sale_date = COALESCE($2, last_sale_date),
                            last_sale_price = COALESCE($3, last_sale_price),
                            updated_at = NOW()
                        WHERE parcel_id = $1
                    `, [folio, record.recordingDate, record.consideration]);

                    stats.updated++;
                } else {
                    // Insert new property with minimal info (will be enriched by MDPA import)
                    await client.query(`
                        INSERT INTO properties_real (
                            parcel_id, owner_name, last_sale_date, last_sale_price, county
                        ) VALUES ($1, $2, $3, $4, $5)
                        ON CONFLICT (parcel_id) DO UPDATE SET
                            last_sale_date = COALESCE(EXCLUDED.last_sale_date, properties_real.last_sale_date),
                            last_sale_price = COALESCE(EXCLUDED.last_sale_price, properties_real.last_sale_price),
                            updated_at = NOW()
                    `, [
                        folio,
                        record.firstParty || record.crossPartyName,
                        record.recordingDate,
                        record.consideration,
                        county
                    ]);

                    stats.inserted++;
                }
            } catch (err) {
                stats.errors++;
                console.error(`Error importing folio ${folio}:`, err.message);
            }
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

    return stats;
}

/**
 * Import distress indicators into property_legal_status table
 */
async function importDistressRecords(pool, records, county = 'MiamiDade') {
    const stats = { updated: 0, errors: 0 };

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const record of records) {
            if (!record.isDistress || !record.folioNumber) continue;

            try {
                // Determine which flag to set
                const updates = {};
                if (record.documentType === 'LP') updates.lis_pendens_filed = true;
                if (['LIEN', 'TAXL'].includes(record.documentType)) updates.tax_lien_filed = true;
                if (['FORE', 'NDS'].includes(record.documentType)) updates.foreclosure_status = 'pre_foreclosure';

                if (Object.keys(updates).length === 0) continue;

                // Insert or update legal status
                await client.query(`
                    INSERT INTO property_legal_status (parcel_id, ${Object.keys(updates).join(', ')})
                    VALUES ($1, ${Object.values(updates).map((_, i) => `$${i + 2}`).join(', ')})
                    ON CONFLICT (parcel_id) DO UPDATE SET
                        ${Object.keys(updates).map(k => `${k} = EXCLUDED.${k}`).join(', ')},
                        last_updated = NOW()
                `, [record.folioNumber, ...Object.values(updates)]);

                stats.updated++;
            } catch (err) {
                stats.errors++;
            }
        }

        await client.query('COMMIT');
    } catch (err) {
        await client.query('ROLLBACK');
        throw err;
    } finally {
        client.release();
    }

    return stats;
}

/**
 * Cleanup extracted files
 */
function cleanupExtractedFiles(extractDir) {
    try {
        if (fs.existsSync(extractDir)) {
            fs.rmSync(extractDir, { recursive: true, force: true });
        }
    } catch (err) {
        console.error('Error cleaning up extracted files:', err);
    }
}

module.exports = {
    DEED_DOCUMENT_TYPES,
    DISTRESS_DOCUMENT_TYPES,
    FIELD_POSITIONS,
    parseRecordingDate,
    parseFolioNumber,
    parseConsideration,
    parseLine,
    extractZipFile,
    processOfficialRecordsFile,
    importRecordsToDatabase,
    importDistressRecords,
    cleanupExtractedFiles,
};
