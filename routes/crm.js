const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const { pool } = require('../config/database'); // Assuming standard DB config

// Configure Multer for temporary file storage
const upload = multer({ dest: 'uploads/' });

/**
 * POST /api/crm/import
 * Import contacts from CSV
 */
router.post('/import', upload.single('file'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }

    const contacts = [];
    const userId = req.user?.user_id; // Assume auth middleware populates this

    // If no user is authenticated (dev mode?), fallback or error. 
    // For now we will assume authentication is active or we might need a fallback for testing.
    // if (!userId) return res.status(401).json({ error: 'Unauthorized' });

    try {
        fs.createReadStream(req.file.path)
            .pipe(csv())
            .on('data', (row) => {
                // Map CSV specific headers if they vary, otherwise assume loose matching
                // We expect: Name, Email, Phone, Address, City, State, Zip

                // Normalizing keys to lower case for easier matching could be an enhancement, 
                // but direct matching is safer for now based on our guide.
                contacts.push({
                    name: row.Name || row.name,
                    email: row.Email || row.email,
                    phone: row.Phone || row.phone,
                    address: row.Address || row.address,
                    city: row.City || row.city,
                    state: row.State || row.state,
                    zip: row.Zip || row.zip
                });
            })
            .on('end', async () => {
                // Bulk Insert Logic
                // Note: Doing one by one for simplicity/safety, could optimize with unnest for bulk later.
                let successCount = 0;
                let failureCount = 0;

                const client = await pool.connect();
                try {
                    await client.query('BEGIN');

                    for (const contact of contacts) {
                        try {
                            if (!contact.email && !contact.phone) continue; // Skip empty rows

                            await client.query(
                                `INSERT INTO crm.contacts 
                                (user_id, name, email, phone, address, city, state, zip, source, status)
                                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
                                ON CONFLICT DO NOTHING`, // Prevent duplicate errors if email unique constraint exists (it doesn't yet on this table, but good practice)
                                [
                                    userId, // Ensure we have a user_id. If header missing, might fail constraint.
                                    contact.name,
                                    contact.email,
                                    contact.phone,
                                    contact.address,
                                    contact.city,
                                    contact.state,
                                    contact.zip,
                                    'imported_csv',
                                    'new'
                                ]
                            );
                            successCount++;
                        } catch (err) {
                            console.error('Row import error:', err);
                            failureCount++;
                        }
                    }

                    await client.query('COMMIT');

                    // Cleanup file
                    fs.unlinkSync(req.file.path);

                    res.json({
                        message: 'Import processed',
                        imported: successCount,
                        failed: failureCount
                    });

                } catch (dbErr) {
                    await client.query('ROLLBACK');
                    console.error('Import cleanup error:', dbErr);
                    res.status(500).json({ error: 'Database transaction failed' });
                } finally {
                    client.release();
                }
            });

    } catch (err) {
        console.error('File processing error:', err);
        res.status(500).json({ error: 'File processing failed' });
    }
});

module.exports = router;
