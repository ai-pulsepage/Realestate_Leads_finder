// Test audio pipeline debugging
const g711 = require('g711');

// Test with actual Twilio MULAW data (first few bytes from logs)
const testMulawData = Buffer.from('d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5d5', 'hex'); // Sample MULAW data

console.log('Testing MULAW decoding...');
console.log('Input MULAW buffer length:', testMulawData.length);

const pcm8k = g711.ulawToPCM(testMulawData);
console.log('Decoded PCM type:', pcm8k.constructor.name);
console.log('Decoded PCM length:', pcm8k.length);
console.log('First 10 PCM values:', Array.from(pcm8k.slice(0, 10)));
console.log('PCM value range - Min:', Math.min(...pcm8k), 'Max:', Math.max(...pcm8k));

// Test endianness
console.log('\nTesting endianness...');
const testValue = pcm8k[0];
const bufferFromArray = Buffer.from(pcm8k);
const bufferFromArrayBuffer = Buffer.from(pcm8k.buffer);

console.log('Direct value from Int16Array:', testValue);
console.log('Buffer.from(array)[0-1]:', bufferFromArray[0], bufferFromArray[1]);
console.log('Buffer.from(array.buffer)[0-1]:', bufferFromArrayBuffer[0], bufferFromArrayBuffer[1]);

// Test if values are reasonable (should be non-zero for voice)
const nonZeroCount = Array.from(pcm8k).filter(v => v !== 0).length;
console.log('Non-zero PCM values:', nonZeroCount, '/', pcm8k.length, `(${((nonZeroCount/pcm8k.length)*100).toFixed(1)}%)`);