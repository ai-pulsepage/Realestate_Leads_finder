// Auth Middleware
// Validates Firebase JWT

const admin = require('firebase-admin');

admin.initializeApp({
  credential: admin.credential.cert(require('../firebase-key.json'))
});

const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token provided' });

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

module.exports = authMiddleware;