const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/price-db
router.get('/', (req, res) => {
  const items = db.prepare('SELECT * FROM price_db ORDER BY cat_id, rowid').all();
  res.json(items);
});

// POST /api/price-db
router.post('/', (req, res) => {
  const { id, cat_id, name, unit, mat, lab } = req.body;
  db.prepare(`
    INSERT INTO price_db (id, cat_id, name, unit, mat, lab) VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, cat_id, name, unit, mat || 0, lab || 0);
  res.status(201).json({ id, cat_id, name, unit, mat, lab });
});

// PUT /api/price-db/:id
router.put('/:id', (req, res) => {
  const { cat_id, name, unit, mat, lab } = req.body;
  const result = db.prepare(
    'UPDATE price_db SET cat_id=?, name=?, unit=?, mat=?, lab=? WHERE id=?'
  ).run(cat_id, name, unit, mat || 0, lab || 0, req.params.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json(db.prepare('SELECT * FROM price_db WHERE id=?').get(req.params.id));
});

// DELETE /api/price-db/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM price_db WHERE id=?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
