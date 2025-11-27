// Test Buffer.from behavior with Int16Array
console.log('Testing Buffer.from with Int16Array...');

// Create a test Int16Array with known values
const int16Array = new Int16Array([30000, -15000, 1000, -500]);
console.log('Original Int16Array:', int16Array);
console.log('Original values:', Array.from(int16Array));

// Wrong way (corrupts data)
const wrongBuffer = Buffer.from(int16Array);
console.log('\n❌ Buffer.from(int16Array) - WRONG:');
console.log('Buffer length:', wrongBuffer.length);
console.log('Buffer values:', Array.from(wrongBuffer));

// Correct way (preserves data)
const correctBuffer = Buffer.from(int16Array.buffer);
console.log('\n✅ Buffer.from(int16Array.buffer) - CORRECT:');
console.log('Buffer length:', correctBuffer.length);
console.log('Buffer values (as int16):', new Int16Array(correctBuffer.buffer));

// Test base64 encoding
const base64Wrong = wrongBuffer.toString('base64');
const base64Correct = correctBuffer.toString('base64');
console.log('\nBase64 comparison:');
console.log('Wrong base64 length:', base64Wrong.length);
console.log('Correct base64 length:', base64Correct.length);
console.log('Are they different?', base64Wrong !== base64Correct);