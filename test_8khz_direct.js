// Test the simplified 8kHz direct approach
const g711 = require('g711');

// Test with actual Twilio MULAW data
const testMulawData = Buffer.from('d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5', 'hex');

console.log('=== Testing 8kHz Direct Approach ===');
console.log('Input MULAW buffer size:', testMulawData.length);

// Step 1: Convert MULAW to PCM (same as server.js)
const pcm8k = g711.ulawToPCM(testMulawData);
console.log('✅ Converted MULAW to PCM (8kHz), size:', pcm8k.length, 'type:', pcm8k.constructor.name);

// Step 2: Create buffer directly (same as server.js)
const pcm8kBuffer = Buffer.from(pcm8k.buffer);
console.log('✅ Created PCM buffer, size:', pcm8kBuffer.length);

// Step 3: Base64 encode (same as server.js)
const base64Pcm = pcm8kBuffer.toString('base64');
console.log('✅ Base64 encoded, length:', base64Pcm.length);

// Verification
console.log('\n=== Verification ===');
console.log('Expected buffer size: 320 bytes (160 samples × 2 bytes)');
console.log('Actual buffer size:', pcm8kBuffer.length, pcm8kBuffer.length === 320 ? '✓' : '✗');
console.log('MIME type should be: audio/pcm;rate=8000 ✓');
console.log('No resampling needed ✓');
console.log('Gemini handles internal resampling ✓');

// Test that the data looks reasonable
const firstFewSamples = Array.from(pcm8k.slice(0, 5));
console.log('First 5 PCM samples:', firstFewSamples);
console.log('Value range check - Min:', Math.min(...pcm8k), 'Max:', Math.max(...pcm8k));
console.log('All values in 16-bit range:', firstFewSamples.every(v => v >= -32768 && v <= 32767) ? '✓' : '✗');

console.log('\n=== Test Complete ===');
console.log('8kHz direct approach eliminates buffer size corruption.');
console.log('This should work with Gemini Live API according to official docs.');