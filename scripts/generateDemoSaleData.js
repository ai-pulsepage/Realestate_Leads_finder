/**
 * Generate Demo Sale Data
 * 
 * This script populates the properties_real table with synthetic sale dates
 * for MVP demo purposes when actual Official Records data is not yet available.
 * 
 * Usage: node scripts/generateDemoSaleData.js [--count=100] [--days=90]
 */

const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Parse command line arguments
const args = process.argv.slice(2);
const getArg = (name, defaultValue) => {
    const arg = args.find(a => a.startsWith(`--${name}=`));
    return arg ? arg.split('=')[1] : defaultValue;
};

const COUNT = parseInt(getArg('count', '100'));
const DAYS_BACK = parseInt(getArg('days', '90'));
const COUNTY = getArg('county', 'MiamiDade');

/**
 * Generate a random date within the last N days
 */
function randomDateInLastNDays(n) {
    const now = new Date();
    const daysAgo = Math.floor(Math.random() * n);
    const date = new Date(now);
    date.setDate(date.getDate() - daysAgo);
    return date.toISOString().split('T')[0];
}

/**
 * Generate a random sale price based on property type
 */
function randomSalePrice(propertyType) {
    const basePrices = {
        'Single Family': { min: 200000, max: 1500000 },
        'Condo': { min: 100000, max: 800000 },
        'Townhouse': { min: 180000, max: 600000 },
        'Multi-Family': { min: 400000, max: 2500000 },
        'Commercial': { min: 500000, max: 5000000 },
        'default': { min: 150000, max: 750000 }
    };

    const range = basePrices[propertyType] || basePrices['default'];
    return Math.floor(Math.random() * (range.max - range.min) + range.min);
}

async function generateDemoSaleData() {
    console.log(`\n🎲 Generating Demo Sale Data for ${COUNTY}`);
    console.log(`   Properties to update: ${COUNT}`);
    console.log(`   Date range: Last ${DAYS_BACK} days\n`);

    const client = await pool.connect();

    try {
        // Get properties without sale dates
        const propertiesResult = await client.query(`
            SELECT parcel_id, property_type, address_street
            FROM properties_real
            WHERE (county IS NULL OR county = $1)
              AND (last_sale_date IS NULL OR last_sale_date < NOW() - INTERVAL '5 years')
            ORDER BY RANDOM()
            LIMIT $2
        `, [COUNTY, COUNT]);

        console.log(`📋 Found ${propertiesResult.rows.length} properties to update\n`);

        if (propertiesResult.rows.length === 0) {
            console.log('⚠️ No properties found. Make sure MDPA data has been imported first.');
            return;
        }

        let updated = 0;
        const stats = {
            thisWeek: 0,
            thisMonth: 0,
            older: 0,
        };

        await client.query('BEGIN');

        for (const property of propertiesResult.rows) {
            const saleDate = randomDateInLastNDays(DAYS_BACK);
            const salePrice = randomSalePrice(property.property_type);

            await client.query(`
                UPDATE properties_real
                SET last_sale_date = $1,
                    last_sale_price = $2,
                    county = $3,
                    updated_at = NOW()
                WHERE parcel_id = $4
            `, [saleDate, salePrice, COUNTY, property.parcel_id]);

            updated++;

            // Track stats
            const daysSinceSale = Math.floor((new Date() - new Date(saleDate)) / (1000 * 60 * 60 * 24));
            if (daysSinceSale <= 7) stats.thisWeek++;
            else if (daysSinceSale <= 30) stats.thisMonth++;
            else stats.older++;

            // Progress update
            if (updated % 50 === 0) {
                console.log(`   Updated ${updated}/${propertiesResult.rows.length}...`);
            }
        }

        await client.query('COMMIT');

        console.log(`\n✅ Demo Data Generation Complete!`);
        console.log(`   Total updated: ${updated}`);
        console.log(`   Sales this week: ${stats.thisWeek}`);
        console.log(`   Sales this month: ${stats.thisMonth}`);
        console.log(`   Older sales: ${stats.older}`);

        // Verify results
        const verification = await client.query(`
            SELECT COUNT(*) as total,
                   COUNT(CASE WHEN last_sale_date >= NOW() - INTERVAL '7 days' THEN 1 END) as week,
                   COUNT(CASE WHEN last_sale_date >= NOW() - INTERVAL '30 days' THEN 1 END) as month
            FROM properties_real
            WHERE county = $1 AND last_sale_date IS NOT NULL
        `, [COUNTY]);

        console.log(`\n📊 Database Verification:`);
        console.log(`   Total with sale dates: ${verification.rows[0].total}`);
        console.log(`   Sold in last 7 days: ${verification.rows[0].week}`);
        console.log(`   Sold in last 30 days: ${verification.rows[0].month}`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('❌ Error generating demo data:', err);
        throw err;
    } finally {
        client.release();
        await pool.end();
    }
}

// Run the script
generateDemoSaleData()
    .then(() => {
        console.log('\n✨ Done!\n');
        process.exit(0);
    })
    .catch((err) => {
        console.error('\n💥 Failed:', err.message);
        process.exit(1);
    });
