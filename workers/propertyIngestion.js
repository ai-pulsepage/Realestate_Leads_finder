const { Worker } = require('bullmq');
const path = require('path');
const { ingestParcelFile, ingestLegalFile } = require('../services/propertyAppraiserService');

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379
};

const worker = new Worker('property-ingestion', async job => {
    console.log(`Processing job ${job.id}: ${job.name}`);

    try {
        const { parcelFile, legalFile } = job.data;

        if (parcelFile) {
            await ingestParcelFile(parcelFile);
        }

        if (legalFile) {
            await ingestLegalFile(legalFile);
        }

        console.log(`Job ${job.id} completed successfully.`);
    } catch (err) {
        console.error(`Job ${job.id} failed:`, err);
        throw err;
    }
}, { connection });

console.log('Property Ingestion Worker started...');
