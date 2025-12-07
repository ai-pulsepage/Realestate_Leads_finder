require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');
const csv = require('csv-parser'); // We will assume it's there or install it, or use a simple fallback if needed.

async function ingestData() {
    console.log('🚀 Starting Data Ingestion...');

    try {
        // 2. Ingest Parcels (Properties)
        console.log('📦 Ingesting Parcel Data...');
        const parcelPath = path.join(__dirname, '../mock_data/parcel_extract.csv');

        if (!fs.existsSync(parcelPath)) {
            console.error('❌ Parcel CSV not found:', parcelPath);
            return;
        }

        const parcels = [];
        await new Promise((resolve, reject) => {
            fs.createReadStream(parcelPath)
                .pipe(csv())
                .on('data', (data) => parcels.push(data))
                .on('end', resolve)
                .on('error', reject);
        });

        console.log(`Found ${parcels.length} parcels. Inserting...`);

        for (const p of parcels) {
            // Check for valid Folio
            if (!p.Folio) {
                console.warn('⚠️ Skipping row with missing Folio');
                continue;
            }

            // Map CSV columns to DB fields
            const parcelId = p.Folio;
            const ownerName = p['OWNER NAME 1'] || 'Unknown Owner';
            const address = p['Site Address'] || `${p['Site StreetNumber'] || ''} ${p['Site StreetPrefix'] || ''} ${p['Site StreetName'] || ''} ${p['Site StreetSuffix'] || ''}`.trim();
            const city = p['Site City'] || p['Mailing City'];
            const zip = p['Site Zip'] || p['Mailing Zip'];

            // Numeric conversions
            const value = parseFloat(p.CurrentTotalValue) || 0;
            const price = 0; // Not available in this CSV extract
            const date = null; // Not available in this CSV extract
            const sqft = parseInt(p.SqFtg) || 0;
            const year = parseInt(p.YearBuilt) || 0;

            await pool.query(
                `INSERT INTO properties_real (
           parcel_id, owner_name, address_street, address_city, address_zip,
           appraised_value, last_sale_date, last_sale_price, year_built, sqft
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (parcel_id) DO UPDATE SET
           owner_name = EXCLUDED.owner_name,
           appraised_value = EXCLUDED.appraised_value,
           address_street = EXCLUDED.address_street,
           updated_at = NOW()`,
                [
                    parcelId, ownerName, address, city, zip,
                    value, date, price, year, sqft
                ]
            );
        }
        console.log('✅ Parcel Data Ingested.');

        // 3. Ingest Legal Status (Temporarily Skipped - Schema Mismatch)
        // The mock_data/legal_extract.csv contains Legal Descriptions (Lot/Block),
        // not Distress Status (Lis Pendens, etc).
        // For now, we only log this.
        console.log('⚠️ Skipping Legal Data Ingestion (CSV contains descriptions, not status signals).');

        /*
        // Original logic kept for reference once correct CSV is available
        const legalPath = path.join(__dirname, '../mock_data/legal_extract.csv');
        if (fs.existsSync(legalPath)) {
             // ... implementation ...
        }
        */

        console.log('🎉 Ingestion Complete!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Ingestion Failed:', err);
        process.exit(1);
    }
}

ingestData();
