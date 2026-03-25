const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/categories
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM categories ORDER BY id');
    res.json(rows.map(c => ({ ...c, sub: JSON.parse(c.sub || '[]') })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/categories
router.post('/', async (req, res) => {
  const { name, icon, sub } = req.body;
  try {
    const { rows } = await db.query(
      'INSERT INTO categories (name, icon, sub) VALUES ($1, $2, $3) RETURNING *',
      [name, icon || '', JSON.stringify(sub || [])]
    );
    res.status(201).json({ ...rows[0], sub: sub || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/categories/:id
router.put('/:id', async (req, res) => {
  const { name, icon, sub } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE categories SET name=$1, icon=$2, sub=$3 WHERE id=$4 RETURNING *',
      [name, icon || '', JSON.stringify(sub || []), req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json({ ...rows[0], sub: sub || [] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/categories/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM categories WHERE id=$1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
