
const g711 = require('g711');
const buffer = Buffer.from([0xff, 0xff]);
try {
    const result = g711.ulawToPCM(buffer);
    console.log('Is Int16Array:', result instanceof Int16Array);
    console.log('Is Uint8Array:', result instanceof Uint8Array);
    console.log('Constructor:', result.constructor.name);
    console.log('Length:', result.length);
    console.log('Value:', result[0]);
} catch (e) {
    console.error('Error:', e.message);
}
