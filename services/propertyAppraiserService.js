const fs = require('fs');
const readline = require('readline');
const { pool } = require('../config/database');

// Helper: Parse CSV Line (State Machine)
function parseCSVLine(str) {
    const arr = [];
    let quote = false;
    let col = '';
    for (let c = 0; c < str.length; c++) {
        let cc = str[c];
        if (cc === '"' || cc === "'") {
            quote = !quote;
            continue;
        }
        if (cc === ',' && !quote) {
            arr.push(col.trim());
            col = '';
            continue;
        }
        col += cc;
    }
    arr.push(col.trim());
    return arr;
}

// Helper: Get Value by Header Name
function getVal(row, headerMap, ...keys) {
    for (const key of keys) {
        if (headerMap.has(key)) {
            const val = row[headerMap.get(key)];
            return val ? val.replace(/^"|"$/g, '').trim() : null;
        }
    }
    return null;
}

async function ingestParcelFile(filePath) {
    console.log(`Starting Parcel Ingestion: ${filePath}`);
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let headerMap = null;
    let isHeaderFound = false;
    let count = 0;
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for await (const line of rl) {
            if (!line.trim()) continue;

            // Find Header
            if (!isHeaderFound) {
                if (line.includes('Folio') || line.includes('FOLIO')) {
                    const headers = parseCSVLine(line);
                    headerMap = new Map(headers.map((h, i) => [h.replace(/^"|"$/g, '').trim(), i]));
                    isHeaderFound = true;
                    console.log('Header found:', Array.from(headerMap.keys()));
                }
                continue;
            }

            const row = parseCSVLine(line);
            if (row.length < 2) continue;

            // Map Data
            const folio = getVal(row, headerMap, 'Folio', 'FOLIO', 'FolioNumber');
            if (!folio) continue;

            const address = getVal(row, headerMap, 'SiteAddress', 'SITE ADDRESS', 'PropertyAddress') || '[NO ADDRESS]';
            const city = getVal(row, headerMap, 'City', 'CITY') || 'Miami';
            const zip = getVal(row, headerMap, 'ZipCode', 'ZIP');
            const owner = getVal(row, headerMap, 'Owner1', 'OWNER NAME 1', 'Owner');
            const mailingAddr = getVal(row, headerMap, 'MailingAddress', 'MAILING ADDRESS');

            const assessedVal = parseFloat(getVal(row, headerMap, 'CurrentAssessedValue', 'ASSESSED VALUE')) || 0;
            const taxableVal = parseFloat(getVal(row, headerMap, 'CurrentCountyTaxableValue', 'TAXABLE VALUE')) || 0;
            const yearBuilt = parseInt(getVal(row, headerMap, 'YearBuilt', 'YEAR BUILT', 'ACTUAL YEAR BUILT')) || null;
            const sqFt = parseInt(getVal(row, headerMap, 'SqFtg', 'LIVING AREA', 'BuildingSqFt')) || 0;
            const lotSize = parseFloat(getVal(row, headerMap, 'Acres', 'LOT SIZE')) || 0;
            const beds = parseInt(getVal(row, headerMap, 'BEDROOMS', 'BedroomCount')) || 0;
            const baths = parseFloat(getVal(row, headerMap, 'BATHS', 'BathroomCount')) || 0;
            const propType = getVal(row, headerMap, 'PropertyUse', 'DOR CODE', 'UseCode');

            const query = `
                INSERT INTO properties (
                    folio_number, address, city, zip_code, owner_name, mailing_address,
                    assessed_value, taxable_value, year_built, building_sqft, lot_size_acres,
                    bedrooms, bathrooms, property_type, updated_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6,
                    $7, $8, $9, $10, $11,
                    $12, $13, $14, NOW()
                )
                ON CONFLICT (folio_number) DO UPDATE SET
                    owner_name = EXCLUDED.owner_name,
                    mailing_address = EXCLUDED.mailing_address,
                    assessed_value = EXCLUDED.assessed_value,
                    taxable_value = EXCLUDED.taxable_value,
                    year_built = EXCLUDED.year_built,
                    building_sqft = EXCLUDED.building_sqft,
                    lot_size_acres = EXCLUDED.lot_size_acres,
                    bedrooms = EXCLUDED.bedrooms,
                    bathrooms = EXCLUDED.bathrooms,
                    updated_at = NOW()
            `;

            await client.query(query, [
                folio, address, city, zip, owner, mailingAddr,
                assessedVal, taxableVal, yearBuilt, sqFt, lotSize,
                beds, baths, propType
            ]);

            count++;
            if (count % 1000 === 0) {
                await client.query('COMMIT');
                await client.query('BEGIN');
                console.log(`Processed ${count} parcel records...`);
            }
        }

        await client.query('COMMIT');
        console.log(`✅ Parcel Ingestion Complete. Total: ${count}`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Parcel Ingestion Failed:', err);
        throw err;
    } finally {
        client.release();
    }
}

async function ingestLegalFile(filePath) {
    console.log(`Starting Legal Ingestion: ${filePath}`);
    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({ input: fileStream, crlfDelay: Infinity });

    let headerMap = null;
    let isHeaderFound = false;
    let count = 0;

    // Buffer for legal descriptions: { folio: [line1, line2] }
    // Since file is sorted by folio, we can flush when folio changes
    let currentFolio = null;
    let currentLegalLines = [];

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        for await (const line of rl) {
            if (!line.trim()) continue;

            if (!isHeaderFound) {
                if (line.includes('Folio') || line.includes('FOLIO')) {
                    const headers = parseCSVLine(line);
                    headerMap = new Map(headers.map((h, i) => [h.replace(/^"|"$/g, '').trim(), i]));
                    isHeaderFound = true;
                }
                continue;
            }

            const row = parseCSVLine(line);
            if (row.length < 2) continue;

            const folio = getVal(row, headerMap, 'Folio', 'FOLIO');
            const descLine = getVal(row, headerMap, 'LegalDescription', 'LEGAL');

            if (!folio) continue;

            if (folio !== currentFolio) {
                if (currentFolio && currentLegalLines.length > 0) {
                    // Flush previous
                    const fullLegal = currentLegalLines.join(' ');
                    await client.query(
                        'UPDATE properties SET legal_description = $1, updated_at = NOW() WHERE folio_number = $2',
                        [fullLegal, currentFolio]
                    );
                    count++;
                    if (count % 1000 === 0) {
                        await client.query('COMMIT');
                        await client.query('BEGIN');
                        console.log(`Processed ${count} legal records...`);
                    }
                }
                currentFolio = folio;
                currentLegalLines = [];
            }
            if (descLine) currentLegalLines.push(descLine);
        }

        // Flush last
        if (currentFolio && currentLegalLines.length > 0) {
            const fullLegal = currentLegalLines.join(' ');
            await client.query(
                'UPDATE properties SET legal_description = $1, updated_at = NOW() WHERE folio_number = $2',
                [fullLegal, currentFolio]
            );
            count++;
        }

        await client.query('COMMIT');
        console.log(`✅ Legal Ingestion Complete. Total: ${count}`);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Legal Ingestion Failed:', err);
        throw err;
    } finally {
        client.release();
    }
}

module.exports = { ingestParcelFile, ingestLegalFile };
