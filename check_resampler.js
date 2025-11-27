// Check wave-resampler API
const wr = require('wave-resampler');

console.log('wave-resampler type:', typeof wr);
console.log('wave-resampler keys:', Object.keys(wr));
console.log('wave-resampler methods:', Object.getOwnPropertyNames(wr));

// Check if it's a function
if (typeof wr === 'function') {
  console.log('It is a function, trying to call it...');
  try {
    const result = wr([1, 2, 3], 8000, 16000);
    console.log('Function call result:', result);
  } catch (e) {
    console.error('Function call error:', e.message);
  }
}