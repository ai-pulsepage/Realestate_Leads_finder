// Test wave-resampler usage
const waveResampler = require('wave-resampler');
const g711 = require('g711');

// Test data
const testMulaw = Buffer.from('d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5', 'hex');
const pcm8k = g711.ulawToPCM(testMulaw);

console.log('Input PCM 8kHz:');
console.log('Type:', pcm8k.constructor.name);
console.log('Length:', pcm8k.length);
console.log('Sample values:', Array.from(pcm8k.slice(0, 5)));

try {
  // Test resampling 8kHz -> 16kHz
  const pcm16kFloat = waveResampler.resample(
    pcm8k,                     // Input: Int16Array (16 samples)
    8000,                      // From sample rate
    16000                      // To sample rate
  );

  console.log('\nResampled PCM 16kHz (Float64Array):');
  console.log('Type:', pcm16kFloat.constructor.name);
  console.log('Length:', pcm16kFloat.length);
  console.log('Sample values:', Array.from(pcm16kFloat.slice(0, 10)));

  // Convert Float64Array to 16-bit PCM Buffer (what Gemini expects)
  const pcm16kInt = new Int16Array(pcm16kFloat.length);
  for (let i = 0; i < pcm16kFloat.length; i++) {
    // Clamp to 16-bit range and convert to integer
    pcm16kInt[i] = Math.max(-32768, Math.min(32767, Math.round(pcm16kFloat[i])));
  }

  const pcm16kBuffer = Buffer.from(pcm16kInt.buffer);
  console.log('\nConverted to 16-bit PCM Buffer:');
  console.log('Buffer length:', pcm16kBuffer.length);
  console.log('First 20 bytes (as int16):', new Int16Array(pcm16kBuffer.buffer.slice(0, 40)));

} catch (error) {
  console.error('Resampling error:', error);
}