const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/categories
router.get('/', (req, res) => {
  const cats = db.prepare('SELECT * FROM categories ORDER BY id').all();
  // Parse sub from JSON string back to array
  res.json(cats.map(c => ({ ...c, sub: JSON.parse(c.sub || '[]') })));
});

// POST /api/categories
router.post('/', (req, res) => {
  const { name, icon, sub } = req.body;
  const result = db.prepare(
    'INSERT INTO categories (name, icon, sub) VALUES (?, ?, ?)'
  ).run(name, icon || '', JSON.stringify(sub || []));

  res.status(201).json({ id: result.lastInsertRowid, name, icon, sub: sub || [] });
});

// PUT /api/categories/:id
router.put('/:id', (req, res) => {
  const { name, icon, sub } = req.body;
  const result = db.prepare(
    'UPDATE categories SET name=?, icon=?, sub=? WHERE id=?'
  ).run(name, icon || '', JSON.stringify(sub || []), req.params.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ id: Number(req.params.id), name, icon, sub: sub || [] });
});

// DELETE /api/categories/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM categories WHERE id=?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
