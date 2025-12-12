/**
 * MDPA (Miami-Dade Property Appraiser) CSV Parser Service
 * 
 * Parses MDPA parcel and legal CSV files and imports to properties_real table
 */

const fs = require('fs');
const readline = require('readline');
const path = require('path');

/**
 * Parse a CSV line, handling quoted fields
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    result.push(current.trim());

    return result;
}

/**
 * Map MDPA Parcel CSV columns to our database schema
 */
const PARCEL_COLUMN_MAP = {
    'FOLIO': 'parcel_id',
    'PTX_PRO_FOLIO': 'parcel_id',
    'OWNER1': 'owner_name',
    'OWNER1NAME': 'owner_name',
    'SITE_ADDR': 'address_street',
    'SITEADDRESS': 'address_street',
    'SITE_CITY': 'address_city',
    'SITECITY': 'address_city',
    'SITE_ZIP': 'zip_code',
    'SITEZIP': 'zip_code',
    'MAIL_ADDR': 'mailing_address',
    'MAILADDR': 'mailing_address',
    'PRPTYUSE': 'property_type',
    'PROPERTY_USE': 'property_type',
    'USE_CODE': 'property_type',
    'JUST_VAL': 'just_value',
    'JUSTVALUE': 'just_value',
    'ASS_VAL': 'assessed_value',
    'ASSVALUE': 'assessed_value',
    'BLDG_SQFT': 'building_sqft',
    'SQFT': 'building_sqft',
    'LOT_SIZE': 'lot_sqft',
    'LOTSQFT': 'lot_sqft',
    'YEAR_BUILT': 'year_built',
    'YRBUILT': 'year_built',
    'BEDROOMS': 'bedrooms',
    'BEDS': 'bedrooms',
    'BATHROOMS': 'bathrooms',
    'BATHS': 'bathrooms',
};

/**
 * Property use codes to readable types
 */
const PROPERTY_USE_CODES = {
    '01': 'Single Family',
    '02': 'Mobile Home',
    '03': 'Multi-Family 2-9',
    '04': 'Condo',
    '05': 'Co-op',
    '06': 'Retirement Home',
    '07': 'Miscellaneous Residential',
    '08': 'Multi-Family 10+',
    '10': 'Vacant Commercial',
    '11': 'Store',
    '12': 'Store & Multiple Use',
    '14': 'Supermarket',
    '17': 'Office',
    '18': 'Office & Multiple Use',
    '21': 'Restaurant',
    '27': 'Auto Sales',
    '33': 'Nightclub',
    '39': 'Hotel/Motel',
    '48': 'Warehouse',
    '71': 'Church',
    '83': 'Health Care',
};

/**
 * Process MDPA CSV file and extract property records
 */
async function processMDPAFile(filePath, options = {}) {
    const {
        onProgress = () => { },
        onRecord = () => { },
    } = options;

    const stats = {
        totalLines: 0,
        parsedRecords: 0,
        skippedRecords: 0,
        errors: 0,
    };

    const records = [];
    let headers = null;
    let columnMapping = {};

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    for await (const line of rl) {
        stats.totalLines++;

        if (!line.trim()) continue;

        try {
            const fields = parseCSVLine(line);

            // First line is headers
            if (!headers) {
                headers = fields.map(h => h.toUpperCase().replace(/\s+/g, '_'));

                // Build column mapping
                headers.forEach((header, index) => {
                    const dbField = PARCEL_COLUMN_MAP[header];
                    if (dbField) {
                        columnMapping[dbField] = index;
                    }
                });

                continue;
            }

            // Extract property record
            const record = {};

            for (const [dbField, colIndex] of Object.entries(columnMapping)) {
                let value = fields[colIndex]?.trim() || null;

                // Clean up values
                if (value === '' || value === '0' || value === 'NULL') {
                    value = null;
                }

                // Convert property use code to readable type
                if (dbField === 'property_type' && value) {
                    value = PROPERTY_USE_CODES[value] || value;
                }

                // Parse numeric values
                if (['just_value', 'assessed_value', 'building_sqft', 'lot_sqft', 'year_built', 'bedrooms', 'bathrooms'].includes(dbField)) {
                    value = value ? parseInt(value.replace(/[^0-9]/g, '')) : null;
                }

                record[dbField] = value;
            }

            // Skip records without parcel_id
            if (!record.parcel_id) {
                stats.skippedRecords++;
                continue;
            }

            // Clean folio number (remove dashes, quotes)
            record.parcel_id = String(record.parcel_id).replace(/["\s-]/g, '');

            records.push(record);
            stats.parsedRecords++;
            onRecord(record);

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
 * Import MDPA records into the database
 */
async function importMDPAToDatabase(pool, records, county = 'MiamiDade') {
    const stats = {
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
    };

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        for (const record of records) {
            try {
                await client.query(`
                    INSERT INTO properties_real (
                        parcel_id, owner_name, address_street, address_city, zip_code,
                        property_type, assessed_value, building_sqft, lot_sqft,
                        year_built, bedrooms, bathrooms, county
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
                    ON CONFLICT (parcel_id) DO UPDATE SET
                        owner_name = COALESCE(EXCLUDED.owner_name, properties_real.owner_name),
                        address_street = COALESCE(EXCLUDED.address_street, properties_real.address_street),
                        address_city = COALESCE(EXCLUDED.address_city, properties_real.address_city),
                        zip_code = COALESCE(EXCLUDED.zip_code, properties_real.zip_code),
                        property_type = COALESCE(EXCLUDED.property_type, properties_real.property_type),
                        assessed_value = COALESCE(EXCLUDED.assessed_value, properties_real.assessed_value),
                        building_sqft = COALESCE(EXCLUDED.building_sqft, properties_real.building_sqft),
                        lot_sqft = COALESCE(EXCLUDED.lot_sqft, properties_real.lot_sqft),
                        year_built = COALESCE(EXCLUDED.year_built, properties_real.year_built),
                        bedrooms = COALESCE(EXCLUDED.bedrooms, properties_real.bedrooms),
                        bathrooms = COALESCE(EXCLUDED.bathrooms, properties_real.bathrooms),
                        county = EXCLUDED.county,
                        updated_at = NOW()
                `, [
                    record.parcel_id,
                    record.owner_name,
                    record.address_street,
                    record.address_city,
                    record.zip_code,
                    record.property_type,
                    record.assessed_value,
                    record.building_sqft,
                    record.lot_sqft,
                    record.year_built,
                    record.bedrooms,
                    record.bathrooms,
                    county
                ]);

                stats.inserted++;
            } catch (err) {
                stats.errors++;
                if (stats.errors < 5) {
                    console.error(`Error importing parcel ${record.parcel_id}:`, err.message);
                }
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
 * Detect file type from content
 */
function detectFileType(filePath) {
    const content = fs.readFileSync(filePath, { encoding: 'utf8', flag: 'r' }).slice(0, 1000);

    if (content.includes('^')) {
        return 'official_records'; // Caret-delimited
    } else if (content.includes(',') && (content.includes('FOLIO') || content.includes('PARCEL') || content.includes('OWNER'))) {
        return 'mdpa_csv'; // Property Appraiser CSV
    } else if (content.includes(',')) {
        return 'csv'; // Generic CSV
    }

    return 'unknown';
}

module.exports = {
    parseCSVLine,
    PARCEL_COLUMN_MAP,
    PROPERTY_USE_CODES,
    processMDPAFile,
    importMDPAToDatabase,
    detectFileType,
};
