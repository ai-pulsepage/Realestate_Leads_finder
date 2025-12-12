/**
 * Admin Data Import Routes
 * 
 * Endpoints for uploading and processing Official Records files
 * Files stored on VM at /var/data/imports/{county}/{type}/
 */

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const {
    extractZipFile,
    processOfficialRecordsFile,
    importRecordsToDatabase,
    importDistressRecords,
    cleanupExtractedFiles,
} = require('../services/officialRecordsParser');

// Base directory for data storage (outside the code build)
const DATA_DIR = process.env.DATA_DIR || '/var/data/imports';

// Ensure base directories exist
function ensureDataDirs() {
    const counties = ['MiamiDade', 'Broward', 'PalmBeach'];
    const types = ['Records', 'PropertyAppraiser'];

    counties.forEach(county => {
        types.forEach(type => {
            const dir = path.join(DATA_DIR, county, type);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        });
    });
}

// Initialize directories
try {
    ensureDataDirs();
    console.log(`✓ Data directories initialized at ${DATA_DIR}`);
} catch (err) {
    console.warn(`⚠️ Could not create data directories: ${err.message}`);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const county = req.body.county || 'MiamiDade';
        const dataType = req.body.dataType || 'records';
        const typeDir = dataType === 'property_appraiser' ? 'PropertyAppraiser' : 'Records';
        const uploadDir = path.join(DATA_DIR, county, typeDir, 'uploads');

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const fileId = uuidv4();
        const ext = path.extname(file.originalname).toLowerCase();
        cb(null, `${fileId}${ext}`);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 500 * 1024 * 1024 }, // 500MB max
    fileFilter: (req, file, cb) => {
        const ext = path.extname(file.originalname).toLowerCase();
        if (['.zip', '.exp', '.xls', '.csv', '.txt'].includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Only .zip, .exp, .xls, .csv, .txt files are allowed'));
        }
    }
});

/**
 * GET /api/admin/data/files
 * List uploaded data files
 */
router.get('/files', async (req, res) => {
    try {
        const { county, status } = req.query;

        let query = `
            SELECT f.*, j.status as last_job_status, j.records_imported, j.completed_at as last_import_at
            FROM data_import_files f
            LEFT JOIN LATERAL (
                SELECT * FROM data_import_jobs
                WHERE file_id = f.file_id
                ORDER BY started_at DESC
                LIMIT 1
            ) j ON true
            WHERE 1=1
        `;
        const params = [];

        if (county) {
            params.push(county);
            query += ` AND f.county = $${params.length}`;
        }

        if (status) {
            params.push(status);
            query += ` AND f.status = $${params.length}`;
        }

        query += ` ORDER BY f.uploaded_at DESC LIMIT 100`;

        const result = await req.pool.query(query, params);

        res.json({
            success: true,
            files: result.rows,
            dataDir: DATA_DIR
        });
    } catch (err) {
        console.error('Error listing files:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/admin/data/upload
 * Upload a data file to VM storage
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file provided' });
        }

        const { county = 'MiamiDade', dataType = 'records', fileSubtype } = req.body;
        const originalFilename = req.file.originalname;
        const fileId = path.basename(req.file.filename, path.extname(req.file.filename));

        // Determine file subtype from filename if not provided
        let detectedSubtype = fileSubtype;
        if (!detectedSubtype) {
            if (originalFilename.includes('dly_') || originalFilename.includes('daily')) {
                detectedSubtype = 'daily';
            } else if (originalFilename.includes('monthly') || originalFilename.includes('rec_monthly')) {
                detectedSubtype = 'monthly';
            }
        }

        // Record in database
        const result = await req.pool.query(`
            INSERT INTO data_import_files (
                file_id, filename, original_filename, county, data_type, 
                file_subtype, gcs_path, file_size_bytes, uploaded_by, status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'pending')
            RETURNING *
        `, [
            fileId,
            req.file.filename,
            originalFilename,
            county,
            dataType,
            detectedSubtype,
            req.file.path, // Local path instead of GCS
            req.file.size,
            req.user?.userId
        ]);

        res.json({
            success: true,
            message: 'File uploaded successfully',
            file: result.rows[0],
            storedAt: req.file.path
        });

    } catch (err) {
        console.error('Upload error:', err);

        // Clean up uploaded file on error
        if (req.file && fs.existsSync(req.file.path)) {
            fs.unlinkSync(req.file.path);
        }

        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/admin/data/import/:fileId
 * Start import job for a file
 */
router.post('/import/:fileId', async (req, res) => {
    const { fileId } = req.params;

    try {
        // Get file info
        const fileResult = await req.pool.query(
            'SELECT * FROM data_import_files WHERE file_id = $1',
            [fileId]
        );

        if (fileResult.rows.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }

        const file = fileResult.rows[0];

        // Check if file exists on disk
        if (!fs.existsSync(file.gcs_path)) {
            return res.status(404).json({ error: 'File not found on disk: ' + file.gcs_path });
        }

        // Check if already processing
        if (file.status === 'processing') {
            return res.status(400).json({ error: 'File is already being processed' });
        }

        // Create job record
        const jobResult = await req.pool.query(`
            INSERT INTO data_import_jobs (file_id, status)
            VALUES ($1, 'running')
            RETURNING *
        `, [fileId]);

        const job = jobResult.rows[0];

        // Update file status
        await req.pool.query(
            'UPDATE data_import_files SET status = $1 WHERE file_id = $2',
            ['processing', fileId]
        );

        // Start async processing
        processImportJob(req.pool, file, job).catch(err => {
            console.error('Import job error:', err);
        });

        res.json({
            success: true,
            message: 'Import job started',
            job: job
        });

    } catch (err) {
        console.error('Import start error:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/admin/data/import/status/:jobId
 * Get import job status
 */
router.get('/import/status/:jobId', async (req, res) => {
    try {
        const result = await req.pool.query(
            'SELECT * FROM data_import_jobs WHERE job_id = $1',
            [req.params.jobId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Job not found' });
        }

        res.json({
            success: true,
            job: result.rows[0]
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/admin/data/import/history
 * Get import history
 */
router.get('/import/history', async (req, res) => {
    try {
        const result = await req.pool.query(`
            SELECT j.*, f.original_filename, f.county, f.data_type
            FROM data_import_jobs j
            JOIN data_import_files f ON j.file_id = f.file_id
            ORDER BY j.started_at DESC
            LIMIT 50
        `);

        res.json({
            success: true,
            jobs: result.rows
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * GET /api/admin/data/counties
 * Get list of configured counties
 */
router.get('/counties', async (req, res) => {
    const counties = [
        { id: 'MiamiDade', name: 'Miami-Dade County', enabled: true },
        { id: 'Broward', name: 'Broward County', enabled: false },
        { id: 'PalmBeach', name: 'Palm Beach County', enabled: false },
    ];

    res.json({ success: true, counties, dataDir: DATA_DIR });
});

/**
 * GET /api/admin/data/storage
 * Get storage info
 */
router.get('/storage', async (req, res) => {
    try {
        const stats = { totalFiles: 0, totalSize: 0, byCounty: {} };

        const counties = ['MiamiDade', 'Broward', 'PalmBeach'];
        for (const county of counties) {
            const countyDir = path.join(DATA_DIR, county);
            if (fs.existsSync(countyDir)) {
                const files = getAllFiles(countyDir);
                stats.byCounty[county] = {
                    files: files.length,
                    size: files.reduce((sum, f) => sum + f.size, 0)
                };
                stats.totalFiles += files.length;
                stats.totalSize += stats.byCounty[county].size;
            }
        }

        res.json({ success: true, storage: stats, dataDir: DATA_DIR });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

function getAllFiles(dirPath, files = []) {
    const items = fs.readdirSync(dirPath);
    for (const item of items) {
        const fullPath = path.join(dirPath, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            getAllFiles(fullPath, files);
        } else {
            files.push({ path: fullPath, size: stat.size });
        }
    }
    return files;
}

/**
 * Background job: Process import file
 */
async function processImportJob(pool, file, job) {
    const startTime = Date.now();
    let extractDir = null;

    const updateJob = async (updates) => {
        const setClauses = Object.entries(updates)
            .map(([key, _], i) => `${key} = $${i + 2}`)
            .join(', ');

        await pool.query(
            `UPDATE data_import_jobs SET ${setClauses} WHERE job_id = $1`,
            [job.job_id, ...Object.values(updates)]
        );
    };

    try {
        let filePath = file.gcs_path; // Now it's just a local path
        let expFiles = [filePath];

        // Extract if zip file
        if (path.extname(filePath).toLowerCase() === '.zip') {
            const extracted = await extractZipFile(filePath);
            extractDir = extracted.extractDir;
            expFiles = extracted.expFiles;

            if (expFiles.length === 0) {
                throw new Error('No valid data files found in zip');
            }
        }

        let totalStats = {
            processed: 0,
            imported: 0,
            updated: 0,
            skipped: 0,
            errors: 0,
        };

        // Process each file
        for (const expFile of expFiles) {
            console.log(`📂 Processing: ${expFile}`);

            const { records, stats } = await processOfficialRecordsFile(expFile, {
                filterDeeds: true,
                includeDistress: true,
                onProgress: async (s) => {
                    await updateJob({
                        records_processed: totalStats.processed + s.parsedRecords,
                    });
                }
            });

            totalStats.processed += stats.parsedRecords;

            // Import deed records
            const deedRecords = records.filter(r => r.isDeed);
            if (deedRecords.length > 0) {
                const importStats = await importRecordsToDatabase(pool, deedRecords, file.county);
                totalStats.imported += importStats.inserted;
                totalStats.updated += importStats.updated;
                totalStats.errors += importStats.errors;
            }

            // Import distress records
            const distressRecords = records.filter(r => r.isDistress);
            if (distressRecords.length > 0) {
                const distressStats = await importDistressRecords(pool, distressRecords, file.county);
                totalStats.updated += distressStats.updated;
            }
        }

        // Update job as completed
        await updateJob({
            status: 'completed',
            completed_at: new Date().toISOString(),
            records_processed: totalStats.processed,
            records_imported: totalStats.imported,
            records_updated: totalStats.updated,
            records_skipped: totalStats.skipped,
            records_failed: totalStats.errors,
        });

        // Update file status
        await pool.query(
            'UPDATE data_import_files SET status = $1 WHERE file_id = $2',
            ['completed', file.file_id]
        );

        console.log(`✅ Import complete in ${(Date.now() - startTime) / 1000}s`);
        console.log(`   Processed: ${totalStats.processed}, Imported: ${totalStats.imported}, Updated: ${totalStats.updated}`);

    } catch (err) {
        console.error('Import job failed:', err);

        await updateJob({
            status: 'failed',
            completed_at: new Date().toISOString(),
            error_message: err.message,
        });

        await pool.query(
            'UPDATE data_import_files SET status = $1, error_message = $2 WHERE file_id = $3',
            ['failed', err.message, file.file_id]
        );
    } finally {
        // Cleanup extracted files
        if (extractDir) {
            cleanupExtractedFiles(extractDir);
        }
    }
}

module.exports = router;
