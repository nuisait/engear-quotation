const express = require('express');
const path = require('path');
const app = express();

app.use(express.json());

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api/projects',              require('./server/routes/projects'));
app.use('/api/projects/:projectId/line-items', require('./server/routes/lineItems'));
app.use('/api/projects/:projectId/extras',     require('./server/routes/extras'));
app.use('/api/price-db',              require('./server/routes/priceDb'));
app.use('/api/categories',            require('./server/routes/categories'));
app.use('/api/revisions',             require('./server/routes/revisions'));
app.use('/api/migrate',               require('./server/routes/migrate'));

// Fallback: serve index.html for all other routes
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
  console.log(`📦 Database: data.sqlite`);
});
