const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            console.error('❌ Auth Middleware: Verify Failed', err.message);
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        console.log('✅ Auth Middleware: Success', user);
        req.user = user;
        next();
    });
}

module.exports = { authenticateToken, JWT_SECRET };
