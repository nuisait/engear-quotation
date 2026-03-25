const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/price-db
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM price_db ORDER BY cat_id, id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/price-db
router.post('/', async (req, res) => {
  const { id, cat_id, name, unit, mat, lab } = req.body;
  try {
    await db.query(
      'INSERT INTO price_db (id, cat_id, name, unit, mat, lab) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, cat_id, name, unit, mat || 0, lab || 0]
    );
    res.status(201).json({ id, cat_id, name, unit, mat, lab });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/price-db/:id
router.put('/:id', async (req, res) => {
  const { cat_id, name, unit, mat, lab } = req.body;
  try {
    const { rows } = await db.query(
      'UPDATE price_db SET cat_id=$1, name=$2, unit=$3, mat=$4, lab=$5 WHERE id=$6 RETURNING *',
      [cat_id, name, unit, mat || 0, lab || 0, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/price-db/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM price_db WHERE id=$1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
