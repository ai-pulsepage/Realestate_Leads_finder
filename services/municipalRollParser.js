/**
 * Municipal Roll Parser Service
 * 
 * Parses Miami-Dade County Property Appraiser Municipal Roll files (CSV format)
 * This file contains ALL properties with addresses, owner info, values, and last 3 sales
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

/**
 * Column mapping for Municipal Roll CSV
 * Based on actual file header (64 columns total)
 */
const MUNROLL_COLUMNS = {
    FOLIO: 0,
    PROPERTY_ADDRESS: 1,
    SITE_CITY: 2,
    SITE_ZIP: 3,
    ROLL_YEAR: 4,
    LAND_VALUE: 5,
    BUILDING_VALUE: 6,
    TOTAL_VALUE: 7,
    ASSESSED_VALUE: 8,
    WVDB_EXEMPT: 9,
    HEX_EXEMPT: 10,
    GPAR_EXEMPT: 11,
    COUNTY_2ND_HEX: 12,
    COUNTY_SENIOR: 13,
    COUNTY_LONGTERM_SENIOR: 14,
    COUNTY_OTHER_EXEMPT: 15,
    COUNTY_TAXABLE: 16,
    CITY_2ND_HEX: 17,
    CITY_SENIOR: 18,
    CITY_LONGTERM_SENIOR: 19,
    CITY_OTHER_EXEMPT: 20,
    CITY_TAXABLE: 21,
    MILL_CODE: 22,
    LAND_USE: 23,
    ZONING: 24,
    OWNER1: 25,
    OWNER2: 26,
    MAILING_ADDRESS: 27,
    MAILING_CITY: 28,
    MAILING_STATE: 29,
    MAILING_ZIP: 30,
    MAILING_COUNTRY: 31,
    LEGAL1: 32,
    LEGAL2: 33,
    LEGAL3: 34,
    LEGAL4: 35,
    LEGAL5: 36,
    LEGAL6: 37,
    ADJUSTED_SQFT: 38,
    LOT_SIZE: 39,
    BEDROOMS: 40,
    BATHS: 41,
    STORIES: 42,
    UNITS: 43,
    YEAR_BUILT: 44,
    EFFECTIVE_YEAR_BUILT: 45,
    SALE_TYPE_1: 46,
    SALE_QUAL_1: 47,
    SALE_DATE_1: 48,       // Most recent sale
    SALE_AMT_1: 49,
    SALE_TYPE_2: 50,
    SALE_QUAL_2: 51,
    SALE_DATE_2: 52,
    SALE_AMT_2: 53,
    SALE_TYPE_3: 54,
    SALE_QUAL_3: 55,
    SALE_DATE_3: 56,
    SALE_AMT_3: 57,
    XF1: 58,
    XF2: 59,
    XF3: 60,
    LIVING_SQFT: 61,
    ACTUAL_SQFT: 62,
    CRA: 63
};

// Property type mapping based on DOR codes
const PROPERTY_USE_CODES = {
    '0000': 'Vacant',
    '0001': 'Single Family',
    '0002': 'Mobile Home',
    '0004': 'Condominium',
    '0005': 'Co-op',
    '0006': 'Multifamily 2-9',
    '0007': 'Multifamily 10+',
    '0008': 'Multifamily 100+',
    '0010': 'Vacant Commercial',
    '0011': 'Store',
    '0012': 'Mixed Use',
    '0014': 'Supermarket',
    '0017': 'Office',
    '0018': 'Professional',
    '0020': 'Airport',
    '0023': 'Financial',
    '0027': 'Auto Sales',
    '0039': 'Hotel',
    '0048': 'Warehouse',
};

/**
 * Parse CSV line handling quoted fields
 */
function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
        const char = line[i];

        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i++;
            } else {
                inQuotes = !inQuotes;
            }
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
 * Parse sale date from various formats (MMDDYYYY, MM/DD/YYYY, etc.)
 */
function parseSaleDate(value) {
    if (!value || value === '0' || value === '') return null;

    const str = String(value).replace(/[\/\-]/g, '').trim();
    if (str.length < 8) return null;

    // Try YYYYMMDD first (standard format)
    let year, month, day;
    if (str.length === 8 && str.startsWith('20') || str.startsWith('19')) {
        year = str.slice(0, 4);
        month = str.slice(4, 6);
        day = str.slice(6, 8);
    } else {
        // Try MMDDYYYY
        month = str.slice(0, 2);
        day = str.slice(2, 4);
        year = str.slice(4, 8);
    }

    // Validate
    if (parseInt(year) < 1900 || parseInt(year) > 2100) return null;
    if (parseInt(month) < 1 || parseInt(month) > 12) return null;
    if (parseInt(day) < 1 || parseInt(day) > 31) return null;

    return `${year}-${month}-${day}`;
}

/**
 * Parse price value
 */
function parsePrice(value) {
    if (!value || value === '0' || value === '') return null;
    const num = parseFloat(String(value).replace(/[,$]/g, ''));
    return isNaN(num) || num <= 0 ? null : num;
}

/**
 * Parse a Municipal Roll CSV record
 */
function parseRecord(fields) {
    if (fields.length < 40) return null;

    const folio = String(fields[MUNROLL_COLUMNS.FOLIO] || '').replace(/["\s]/g, '');
    if (!folio || folio.length < 10) return null;

    // Build address
    const streetAddress = (fields[MUNROLL_COLUMNS.PROPERTY_ADDRESS] || '').trim();
    const city = (fields[MUNROLL_COLUMNS.SITE_CITY] || '').trim();
    const zip = (fields[MUNROLL_COLUMNS.SITE_ZIP] || '').trim().split('-')[0];

    // Get property type from land use code
    const landUseCode = (fields[MUNROLL_COLUMNS.LAND_USE] || '').trim().slice(0, 4);
    const propertyType = PROPERTY_USE_CODES[landUseCode] || 'Other';

    return {
        parcelId: folio,
        addressStreet: streetAddress,
        addressCity: city,
        addressZip: zip,
        addressState: 'FL',
        owner1: (fields[MUNROLL_COLUMNS.OWNER1] || '').trim(),
        owner2: (fields[MUNROLL_COLUMNS.OWNER2] || '').trim(),
        mailingAddress: (fields[MUNROLL_COLUMNS.MAILING_ADDRESS] || '').trim(),
        mailingCity: (fields[MUNROLL_COLUMNS.MAILING_CITY] || '').trim(),
        mailingState: (fields[MUNROLL_COLUMNS.MAILING_STATE] || '').trim(),
        mailingZip: (fields[MUNROLL_COLUMNS.MAILING_ZIP] || '').trim(),
        propertyType: propertyType,
        landUseCode: landUseCode,
        zoning: (fields[MUNROLL_COLUMNS.ZONING] || '').trim(),
        sqft: parseInt(fields[MUNROLL_COLUMNS.ADJUSTED_SQFT]) || null,
        lotSize: parseInt(fields[MUNROLL_COLUMNS.LOT_SIZE]) || null,
        bedrooms: parseInt(fields[MUNROLL_COLUMNS.BEDROOMS]) || null,
        baths: parseFloat(fields[MUNROLL_COLUMNS.BATHS]) || null,
        stories: parseInt(fields[MUNROLL_COLUMNS.STORIES]) || null,
        units: parseInt(fields[MUNROLL_COLUMNS.UNITS]) || null,
        yearBuilt: parseInt(fields[MUNROLL_COLUMNS.YEAR_BUILT]) || null,
        landValue: parsePrice(fields[MUNROLL_COLUMNS.LAND_VALUE]),
        buildingValue: parsePrice(fields[MUNROLL_COLUMNS.BUILDING_VALUE]),
        totalValue: parsePrice(fields[MUNROLL_COLUMNS.TOTAL_VALUE]),
        assessedValue: parsePrice(fields[MUNROLL_COLUMNS.ASSESSED_VALUE]),
        // Most recent sale
        lastSaleDate: parseSaleDate(fields[MUNROLL_COLUMNS.SALE_DATE_1]),
        lastSalePrice: parsePrice(fields[MUNROLL_COLUMNS.SALE_AMT_1]),
        lastSaleType: (fields[MUNROLL_COLUMNS.SALE_TYPE_1] || '').trim(),
        // Previous sales for reference
        sale2Date: parseSaleDate(fields[MUNROLL_COLUMNS.SALE_DATE_2]),
        sale2Price: parsePrice(fields[MUNROLL_COLUMNS.SALE_AMT_2]),
        sale3Date: parseSaleDate(fields[MUNROLL_COLUMNS.SALE_DATE_3]),
        sale3Price: parsePrice(fields[MUNROLL_COLUMNS.SALE_AMT_3]),
    };
}

/**
 * Process a Municipal Roll CSV file
 */
async function processMunicipalRollFile(filePath, options = {}) {
    const {
        onProgress = () => { },
        skipHeaderRows = 4,   // Skip disclaimer/header rows
    } = options;

    const stats = {
        totalLines: 0,
        parsedRecords: 0,
        withSaleDate: 0,
        skippedRecords: 0,
        errors: 0,
    };

    const records = [];

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let lineNum = 0;

    for await (const line of rl) {
        lineNum++;
        stats.totalLines++;

        // Skip header/disclaimer rows
        if (lineNum <= skipHeaderRows) continue;

        // Skip empty lines
        if (!line.trim()) continue;

        // Skip footer row
        if (line.startsWith('F ') || line.startsWith('F,')) continue;

        try {
            const fields = parseCSVLine(line);
            const record = parseRecord(fields);

            if (!record) {
                stats.skippedRecords++;
                continue;
            }

            stats.parsedRecords++;
            if (record.lastSaleDate) {
                stats.withSaleDate++;
            }

            records.push(record);

            // Progress update every 50k lines
            if (stats.totalLines % 50000 === 0) {
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
 * Import Municipal Roll records to database
 */
async function importMunicipalRollToDatabase(pool, records, county = 'MiamiDade') {
    const stats = {
        inserted: 0,
        updated: 0,
        skipped: 0,
        errors: 0,
    };

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Process in batches
        const BATCH_SIZE = 500;

        for (let i = 0; i < records.length; i += BATCH_SIZE) {
            const batch = records.slice(i, i + BATCH_SIZE);

            for (const record of batch) {
                try {
                    await client.query(`
                        INSERT INTO properties_real (
                            parcel_id,
                            address_street,
                            address_city,
                            address_zip,
                            address_state,
                            owner_name,
                            owner_name_2,
                            mailing_address,
                            mailing_city,
                            mailing_state,
                            mailing_zip,
                            property_type,
                            zoning,
                            sqft,
                            lot_size,
                            bedrooms,
                            baths,
                            stories,
                            units,
                            year_built,
                            land_value,
                            building_value,
                            appraised_value,
                            last_sale_date,
                            last_sale_price,
                            sale_2_date,
                            sale_2_price,
                            sale_3_date,
                            sale_3_price,
                            county,
                            updated_at
                        ) VALUES (
                            $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
                            $11, $12, $13, $14, $15, $16, $17, $18, $19, $20,
                            $21, $22, $23, $24, $25, $26, $27, $28, $29, $30, NOW()
                        )
                        ON CONFLICT (parcel_id) DO UPDATE SET
                            address_street = COALESCE(EXCLUDED.address_street, properties_real.address_street),
                            address_city = COALESCE(EXCLUDED.address_city, properties_real.address_city),
                            address_zip = COALESCE(EXCLUDED.address_zip, properties_real.address_zip),
                            owner_name = COALESCE(EXCLUDED.owner_name, properties_real.owner_name),
                            owner_name_2 = COALESCE(EXCLUDED.owner_name_2, properties_real.owner_name_2),
                            mailing_address = COALESCE(EXCLUDED.mailing_address, properties_real.mailing_address),
                            mailing_city = COALESCE(EXCLUDED.mailing_city, properties_real.mailing_city),
                            mailing_state = COALESCE(EXCLUDED.mailing_state, properties_real.mailing_state),
                            mailing_zip = COALESCE(EXCLUDED.mailing_zip, properties_real.mailing_zip),
                            property_type = COALESCE(EXCLUDED.property_type, properties_real.property_type),
                            zoning = COALESCE(EXCLUDED.zoning, properties_real.zoning),
                            sqft = COALESCE(EXCLUDED.sqft, properties_real.sqft),
                            lot_size = COALESCE(EXCLUDED.lot_size, properties_real.lot_size),
                            bedrooms = COALESCE(EXCLUDED.bedrooms, properties_real.bedrooms),
                            baths = COALESCE(EXCLUDED.baths, properties_real.baths),
                            stories = COALESCE(EXCLUDED.stories, properties_real.stories),
                            units = COALESCE(EXCLUDED.units, properties_real.units),
                            year_built = COALESCE(EXCLUDED.year_built, properties_real.year_built),
                            land_value = COALESCE(EXCLUDED.land_value, properties_real.land_value),
                            building_value = COALESCE(EXCLUDED.building_value, properties_real.building_value),
                            appraised_value = COALESCE(EXCLUDED.appraised_value, properties_real.appraised_value),
                            last_sale_date = COALESCE(EXCLUDED.last_sale_date, properties_real.last_sale_date),
                            last_sale_price = COALESCE(EXCLUDED.last_sale_price, properties_real.last_sale_price),
                            sale_2_date = COALESCE(EXCLUDED.sale_2_date, properties_real.sale_2_date),
                            sale_2_price = COALESCE(EXCLUDED.sale_2_price, properties_real.sale_2_price),
                            sale_3_date = COALESCE(EXCLUDED.sale_3_date, properties_real.sale_3_date),
                            sale_3_price = COALESCE(EXCLUDED.sale_3_price, properties_real.sale_3_price),
                            updated_at = NOW()
                    `, [
                        record.parcelId,
                        record.addressStreet,
                        record.addressCity,
                        record.addressZip,
                        record.addressState,
                        record.owner1,
                        record.owner2,
                        record.mailingAddress,
                        record.mailingCity,
                        record.mailingState,
                        record.mailingZip,
                        record.propertyType,
                        record.zoning,
                        record.sqft,
                        record.lotSize,
                        record.bedrooms,
                        record.baths,
                        record.stories,
                        record.units,
                        record.yearBuilt,
                        record.landValue,
                        record.buildingValue,
                        record.assessedValue,
                        record.lastSaleDate,
                        record.lastSalePrice,
                        record.sale2Date,
                        record.sale2Price,
                        record.sale3Date,
                        record.sale3Price,
                        county
                    ]);

                    stats.inserted++;

                } catch (err) {
                    stats.errors++;
                    if (stats.errors < 10) {
                        console.error(`Error importing folio ${record.parcelId}:`, err.message);
                    }
                }
            }

            // Commit each batch to avoid memory issues
            if (i > 0 && i % 5000 === 0) {
                await client.query('COMMIT');
                await client.query('BEGIN');
                console.log(`   Processed ${i} / ${records.length} records...`);
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
 * Detect if a file is Municipal Roll format
 */
function detectMunicipalRollFile(filePath) {
    return new Promise((resolve) => {
        const stream = fs.createReadStream(filePath, { start: 0, end: 500 });
        let data = '';

        stream.on('data', chunk => { data += chunk.toString(); });
        stream.on('end', () => {
            // Check for Municipal Roll indicators
            const isMunRoll = data.includes('Municipal Extract') ||
                data.includes('Roll year') ||
                (data.includes('FOLIO') && data.includes('SALE_DATE'));
            resolve(isMunRoll ? 'municipal_roll' : 'unknown');
        });
        stream.on('error', () => resolve('unknown'));
    });
}

module.exports = {
    MUNROLL_COLUMNS,
    PROPERTY_USE_CODES,
    parseCSVLine,
    parseSaleDate,
    parseRecord,
    processMunicipalRollFile,
    importMunicipalRollToDatabase,
    detectMunicipalRollFile,
};
