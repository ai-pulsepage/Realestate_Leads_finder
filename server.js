// Backend Server - Node.js/Express
// Main entry point

const express = require('express');
const { Pool } = require('pg');
const propertiesRoutes = require('./routes/properties');
const usersRoutes = require('./routes/users');
const stripeRoutes = require('./routes/stripe');
const profilesRoutes = require('./routes/profiles');
const aiRoutes = require('./routes/ai');
const adminRoutes = require('./routes/admin');

const app = express();
app.use(express.json());

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.use('/api/properties', propertiesRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/stripe', stripeRoutes);
app.use('/api/profiles', profilesRoutes);
app.use('/api/ai', aiRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = { pool };