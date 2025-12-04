/**
 * Add mock distress data to properties for UI testing
 * This script adds realistic distress indicators to a subset of properties
 * until the real data scrapers are implemented
 */

require('dotenv').config({
  path: process.env.NODE_ENV === 'production' ? '.env.production' : '.env'
});

const { Pool } = require('pg');

// Use the same fallback connection as the main app
const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://api_user:E5"j/Fq|@oqY;+#e@127.0.0.1:5433/real_estate_leads',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function addMockDistressData() {
  try {
    console.log('🛠️ Adding mock distress data to properties...');

    // Get all properties
    const result = await pool.query('SELECT property_id, full_address FROM properties ORDER BY property_id');
    const properties = result.rows;

    if (properties.length === 0) {
      console.log('❌ No properties found in database');
      return;
    }

    console.log(`📊 Found ${properties.length} properties`);

    // Define distress scenarios
    const distressScenarios = [
      { type: 'foreclosure', count: Math.floor(properties.length * 0.05), flag: 'is_foreclosure' },
      { type: 'tax_lien', count: Math.floor(properties.length * 0.03), flag: 'has_tax_lien' },
      { type: 'code_violation', count: Math.floor(properties.length * 0.04), flag: 'has_code_violation' },
      { type: 'vacant', count: Math.floor(properties.length * 0.02), flag: 'is_vacant' },
      { type: 'probate', count: Math.floor(properties.length * 0.01), flag: 'is_probate' },
      { type: 'divorce', count: Math.floor(properties.length * 0.015), flag: 'is_divorce' },
      { type: 'heirship', count: Math.floor(properties.length * 0.008), flag: 'is_heirship' },
      { type: 'pre_foreclosure', count: Math.floor(properties.length * 0.03), flag: 'is_pre_foreclosure' }
    ];

    let totalUpdated = 0;

    // Apply each distress scenario
    for (const scenario of distressScenarios) {
      console.log(`🏠 Adding ${scenario.count} ${scenario.type} properties...`);

      // Get random properties that don't already have this distress flag
      const availableProperties = await pool.query(`
        SELECT property_id FROM properties
        WHERE ${scenario.flag} = false OR ${scenario.flag} IS NULL
        ORDER BY RANDOM()
        LIMIT $1
      `, [scenario.count]);

      if (availableProperties.rows.length === 0) {
        console.log(`   ⚠️ No available properties for ${scenario.type}`);
        continue;
      }

      // Update these properties
      const propertyIds = availableProperties.rows.map(row => row.property_id);
      await pool.query(`
        UPDATE properties
        SET ${scenario.flag} = true,
            distressed_score = COALESCE(distressed_score, 0) + $2,
            updated_at = NOW()
        WHERE property_id = ANY($1)
      `, [propertyIds, getDistressScore(scenario.type)]);

      console.log(`   ✅ Updated ${availableProperties.rows.length} properties with ${scenario.type}`);
      totalUpdated += availableProperties.rows.length;
    }

    // Add some properties with multiple distress indicators (compound distress)
    console.log('🔄 Adding compound distress scenarios...');
    const compoundCount = Math.floor(properties.length * 0.02); // 2% have multiple issues

    const compoundProperties = await pool.query(`
      SELECT property_id FROM properties
      WHERE distressed_score = 0 OR distressed_score IS NULL
      ORDER BY RANDOM()
      LIMIT $1
    `, [compoundCount]);

    for (const row of compoundProperties.rows) {
      // Randomly assign 2-3 distress flags
      const flags = ['is_foreclosure', 'has_tax_lien', 'has_code_violation', 'is_vacant'];
      const selectedFlags = flags.sort(() => 0.5 - Math.random()).slice(0, Math.floor(Math.random() * 2) + 2);

      let updateQuery = 'UPDATE properties SET ';
      const updateParts = [];
      let totalScore = 0;

      selectedFlags.forEach(flag => {
        updateParts.push(`${flag} = true`);
        totalScore += getDistressScore(flag.replace('is_', '').replace('has_', ''));
      });

      updateParts.push(`distressed_score = ${totalScore}`);
      updateParts.push('updated_at = NOW()');

      updateQuery += updateParts.join(', ') + ` WHERE property_id = '${row.property_id}'`;

      await pool.query(updateQuery);
    }

    console.log(`   ✅ Added compound distress to ${compoundProperties.rows.length} properties`);

    // Add some recent sale dates for provider leads testing
    console.log('🏡 Adding recent sale dates for provider leads...');
    const recentSaleCount = Math.floor(properties.length * 0.1); // 10% have recent sales

    const saleProperties = await pool.query(`
      SELECT property_id FROM properties
      ORDER BY RANDOM()
      LIMIT $1
    `, [recentSaleCount]);

    for (const row of saleProperties.rows) {
      // Random date within last 6 months
      const daysAgo = Math.floor(Math.random() * 180); // 0-180 days ago
      const saleDate = new Date();
      saleDate.setDate(saleDate.getDate() - daysAgo);

      // Random sale price between $200k-$800k
      const salePrice = Math.floor(Math.random() * 600000) + 200000;

      await pool.query(`
        UPDATE properties
        SET last_sale_date = $2,
            last_sale_price = $3,
            updated_at = NOW()
        WHERE property_id = $1
      `, [row.property_id, saleDate.toISOString().split('T')[0], salePrice]);
    }

    console.log(`   ✅ Added recent sales to ${saleProperties.rows.length} properties`);

    // Final summary
    const finalStats = await pool.query(`
      SELECT
        COUNT(*) as total_properties,
        COUNT(CASE WHEN distressed_score > 0 THEN 1 END) as distressed_properties,
        COUNT(CASE WHEN last_sale_date >= CURRENT_DATE - INTERVAL '6 months' THEN 1 END) as recent_sales,
        AVG(distressed_score) as avg_distress_score
      FROM properties
    `);

    console.log('\n📈 Final Statistics:');
    console.log(`   Total Properties: ${finalStats.rows[0].total_properties}`);
    console.log(`   Distressed Properties: ${finalStats.rows[0].distressed_properties}`);
    console.log(`   Recent Sales (6 months): ${finalStats.rows[0].recent_sales}`);
    console.log(`   Average Distress Score: ${Math.round(finalStats.rows[0].avg_distress_score * 100) / 100 || 0}`);

    console.log('\n✅ Mock distress data added successfully!');
    console.log('🎯 UI testing can now proceed with realistic data.');

  } catch (error) {
    console.error('❌ Error adding mock distress data:', error);
  } finally {
    await pool.end();
  }
}

function getDistressScore(type) {
  const scores = {
    'foreclosure': 80,
    'tax_lien': 60,
    'code_violation': 40,
    'vacant': 50,
    'probate': 30,
    'divorce': 25,
    'heirship': 35,
    'pre_foreclosure': 70
  };
  return scores[type] || 20;
}

// Run the script
if (require.main === module) {
  addMockDistressData();
}

module.exports = { addMockDistressData };