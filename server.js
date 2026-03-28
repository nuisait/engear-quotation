require('dotenv').config();
const express = require('express');
const path = require('path');
const auth = require('./server/middleware/auth');
const app = express();

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Auth routes (no token required)
app.use('/api/auth', require('./server/routes/auth'));

// Protected API routes
app.use('/api/projects',                       auth, require('./server/routes/projects'));
app.use('/api/projects/:projectId/line-items', auth, require('./server/routes/lineItems'));
app.use('/api/projects/:projectId/extras',     auth, require('./server/routes/extras'));
app.use('/api/price-db',                       auth, require('./server/routes/priceDb'));
app.use('/api/categories',                     auth, require('./server/routes/categories'));
app.use('/api/revisions',                      auth, require('./server/routes/revisions'));
app.use('/api/migrate',                        auth, require('./server/routes/migrate'));
app.use('/api/email',                          auth, require('./server/routes/email'));
app.use('/api/customers',                      auth, require('./server/routes/customers'));

// Fallback: serve index.html
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  const dbInfo = process.env.DB_HOST ? `PostgreSQL (${process.env.DB_HOST})` : process.env.DATABASE_URL ? 'PostgreSQL (URL)' : 'No database configured!';
  console.log(`📦 Database: ${dbInfo}`);;
  console.log(`🔐 Auth: JWT (${process.env.JWT_SECRET ? 'custom secret' : 'default secret — set JWT_SECRET in production'})`);
});
