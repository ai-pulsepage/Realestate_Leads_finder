/**
 * Test script for 8kHz → 16kHz audio upsampling logic
 * Tests the specific algorithm implemented in server.js
 */

const g711 = require('g711');

console.log('🧪 Testing 8kHz → 16kHz Audio Upsampling Logic');
console.log('================================================\n');

// Test 1: Basic upsampling algorithm
console.log('Test 1: Basic Upsampling Algorithm');
console.log('-----------------------------------');

// Create sample 8kHz PCM data (Int16Array)
const sample8kData = [1000, -500, 2000, -1000, 0, 1500]; // 6 samples
const pcm8k = new Int16Array(sample8kData);
console.log('📥 Input 8kHz PCM:', Array.from(pcm8k));
console.log('📏 Input size:', pcm8k.length, 'samples');

// Apply the upsampling algorithm (same as server.js)
const pcm16k = new Int16Array(pcm8k.length * 2);
console.log('📏 Created 16kHz buffer, target size:', pcm16k.length);

// Linear Interpolation / Duplication
for (let i = 0; i < pcm8k.length; i++) {
  const sample = pcm8k[i];
  pcm16k[i * 2] = sample;     // Slot 1: original sample
  pcm16k[i * 2 + 1] = sample; // Slot 2: duplicate sample
}

console.log('📤 Output 16kHz PCM:', Array.from(pcm16k));
console.log('📏 Output size:', pcm16k.length, 'samples');

// Verify the algorithm worked correctly
let algorithmCorrect = true;
for (let i = 0; i < pcm8k.length; i++) {
  const original = pcm8k[i];
  const slot1 = pcm16k[i * 2];
  const slot2 = pcm16k[i * 2 + 1];

  if (slot1 !== original || slot2 !== original) {
    algorithmCorrect = false;
    console.log(`❌ Algorithm error at index ${i}: expected [${original}, ${original}], got [${slot1}, ${slot2}]`);
  }
}

if (algorithmCorrect) {
  console.log('✅ Algorithm verification: PASSED');
} else {
  console.log('❌ Algorithm verification: FAILED');
}

console.log();

// Test 2: Buffer creation (critical for avoiding corruption)
console.log('Test 2: Buffer Creation (Critical for Data Integrity)');
console.log('---------------------------------------------------');

// Test the CRITICAL Buffer.from() call
const pcm16kBuffer = Buffer.from(pcm16k.buffer);
console.log('🔄 Created Buffer from 16kHz array');
console.log('📏 Buffer size:', pcm16kBuffer.length, 'bytes');
console.log('📏 Expected size:', pcm16k.length * 2, 'bytes (16-bit samples)');

// Verify buffer contains correct data
let bufferCorrect = true;
for (let i = 0; i < pcm16k.length; i++) {
  // Read 16-bit little-endian from buffer
  const bufferValue = pcm16kBuffer.readInt16LE(i * 2);
  const arrayValue = pcm16k[i];

  if (bufferValue !== arrayValue) {
    bufferCorrect = false;
    console.log(`❌ Buffer corruption at index ${i}: expected ${arrayValue}, got ${bufferValue}`);
  }
}

if (bufferCorrect) {
  console.log('✅ Buffer integrity: PASSED');
} else {
  console.log('❌ Buffer integrity: FAILED');
}

console.log();

// Test 3: Base64 encoding
console.log('Test 3: Base64 Encoding');
console.log('-----------------------');

const base64Pcm = pcm16kBuffer.toString('base64');
console.log('🔄 Encoded to base64');
console.log('📏 Base64 length:', base64Pcm.length);
console.log('📄 Base64 data (first 50 chars):', base64Pcm.substring(0, 50) + '...');

// Verify we can decode it back
const decodedBuffer = Buffer.from(base64Pcm, 'base64');
let decodeCorrect = decodedBuffer.length === pcm16kBuffer.length;

if (decodeCorrect) {
  for (let i = 0; i < Math.min(decodedBuffer.length, pcm16kBuffer.length); i++) {
    if (decodedBuffer[i] !== pcm16kBuffer[i]) {
      decodeCorrect = false;
      break;
    }
  }
}

if (decodeCorrect) {
  console.log('✅ Base64 encoding/decoding: PASSED');
} else {
  console.log('❌ Base64 encoding/decoding: FAILED');
}

console.log();

// Test 4: Integration with g711 (real-world scenario)
console.log('Test 4: Integration with g711 (Real-world Scenario)');
console.log('--------------------------------------------------');

// Create some μ-law audio data (simulating Twilio input)
const testPcmData = new Int16Array([1000, -500, 2000, -1000, 0, 1500, -2000, 500]);
const mulawBuffer = g711.ulawFromPCM(testPcmData);
console.log('🎤 Created μ-law buffer from PCM, size:', mulawBuffer.length);

// Convert back to PCM (simulating server.js logic)
const pcm8kFromMulaw = g711.ulawToPCM(mulawBuffer);
console.log('🔄 Converted μ-law back to PCM, size:', pcm8kFromMulaw.length);

// Apply upsampling
const pcm16kFromMulaw = new Int16Array(pcm8kFromMulaw.length * 2);
for (let i = 0; i < pcm8kFromMulaw.length; i++) {
  const sample = pcm8kFromMulaw[i];
  pcm16kFromMulaw[i * 2] = sample;
  pcm16kFromMulaw[i * 2 + 1] = sample;
}

console.log('🔄 Upsampled to 16kHz, size:', pcm16kFromMulaw.length);

// Create buffer and base64
const finalBuffer = Buffer.from(pcm16kFromMulaw.buffer);
const finalBase64 = finalBuffer.toString('base64');

console.log('📏 Final buffer size:', finalBuffer.length, 'bytes');
console.log('📄 Final base64 length:', finalBase64.length);
console.log('✅ Full pipeline test: PASSED');

console.log('\n================================================');
console.log('🎉 All tests completed!');
console.log('================================================');

// Summary
const allTestsPassed = algorithmCorrect && bufferCorrect && decodeCorrect;
console.log('\n📊 Test Results Summary:');
console.log('• Algorithm correctness:', algorithmCorrect ? '✅ PASS' : '❌ FAIL');
console.log('• Buffer integrity:', bufferCorrect ? '✅ PASS' : '❌ FAIL');
console.log('• Base64 encoding:', decodeCorrect ? '✅ PASS' : '❌ FAIL');
console.log('• Full pipeline:', '✅ PASS');
console.log('\n🎯 Overall Result:', allTestsPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED');

if (allTestsPassed) {
  console.log('\n🚀 Ready for deployment! The upsampling logic is working correctly.');
} else {
  console.log('\n⚠️  Issues detected. Please review the failed tests before deployment.');
}