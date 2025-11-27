require('dotenv').config({ override: true });
console.log('DATABASE_URL loaded:', !!process.env.DATABASE_URL);
console.log('DATABASE_URL value:', process.env.DATABASE_URL);
console.log('Length:', process.env.DATABASE_URL?.length);

// Try to parse the URL
try {
  const url = require('url');
  const parsed = url.parse(process.env.DATABASE_URL);
  console.log('URL parsed successfully');
  console.log('Host:', parsed.host);
  console.log('Path:', parsed.path);
  console.log('Auth:', parsed.auth);
} catch (error) {
  console.error('URL parsing failed:', error.message);
}