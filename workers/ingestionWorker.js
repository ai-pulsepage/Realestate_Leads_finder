require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { pool } = require('../config/database');
const csv = require('csv-parser'); // We will assume it's there or install it, or use a simple fallback if needed.

async function ingestData() {
    console.log('🚀 Starting Data Ingestion...');

    try {
        // 1. Ingest Parcels (Properties)
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
            // Clean data
            const value = parseFloat(p.APPRAISED_VAL) || 0;
            const price = parseFloat(p.LAST_SALE_PRICE) || 0;
            const date = p.LAST_SALE_DATE ? new Date(p.LAST_SALE_DATE) : null;
            const sqft = parseInt(p.SQFT) || 0;
            const year = parseInt(p.YEAR_BUILT) || 0;

            await pool.query(
                `INSERT INTO properties_real (
           parcel_id, owner_name, address_street, address_city, address_zip,
           appraised_value, last_sale_date, last_sale_price, year_built, sqft
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (parcel_id) DO UPDATE SET
           owner_name = EXCLUDED.owner_name,
           appraised_value = EXCLUDED.appraised_value,
           last_sale_price = EXCLUDED.last_sale_price`,
                [
                    p.PARCEL_ID, p.OWNER_NAME, p.ADDRESS, p.CITY, p.ZIP,
                    value, date, price, year, sqft
                ]
            );
        }
        console.log('✅ Parcel Data Ingested.');

        // 2. Ingest Legal Status
        console.log('⚖️ Ingesting Legal Data...');
        const legalPath = path.join(__dirname, '../mock_data/legal_extract.csv');

        if (fs.existsSync(legalPath)) {
            const legalRecords = [];
            await new Promise((resolve, reject) => {
                fs.createReadStream(legalPath)
                    .pipe(csv())
                    .on('data', (data) => legalRecords.push(data))
                    .on('end', resolve)
                    .on('error', reject);
            });

            console.log(`Found ${legalRecords.length} legal records. Inserting...`);

            for (const l of legalRecords) {
                await pool.query(
                    `INSERT INTO property_legal_status (
             parcel_id, lis_pendens_filed, tax_lien_filed, foreclosure_status,
             divorce_filing, bankruptcy_filing
           ) VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (parcel_id) DO UPDATE SET
             lis_pendens_filed = EXCLUDED.lis_pendens_filed,
             tax_lien_filed = EXCLUDED.tax_lien_filed,
             foreclosure_status = EXCLUDED.foreclosure_status`,
                    [
                        l.PARCEL_ID,
                        l.LIS_PENDENS_FILED === 'TRUE',
                        l.TAX_LIEN_FILED === 'TRUE',
                        l.FORECLOSURE_STATUS,
                        l.DIVORCE_FILING === 'TRUE',
                        l.BANKRUPTCY_FILING === 'TRUE'
                    ]
                );
            }
            console.log('✅ Legal Data Ingested.');
        } else {
            console.log('⚠️ Legal CSV not found, skipping.');
        }

        console.log('🎉 Ingestion Complete!');
        process.exit(0);

    } catch (err) {
        console.error('❌ Ingestion Failed:', err);
        process.exit(1);
    }
}

ingestData();
