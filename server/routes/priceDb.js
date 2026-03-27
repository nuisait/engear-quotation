const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/price-db?page=1&limit=100&search=&cat_id=
router.get('/', async (req, res) => {
  try {
    const { search, cat_id, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(200, parseInt(limit) || 200);
    const offset = (pageNum - 1) * limitNum;

    const conditions = [];
    const params = [];

    if (search) { conditions.push(`name ILIKE $${params.length + 1}`); params.push(`%${search}%`); }
    if (cat_id) { conditions.push(`cat_id = $${params.length + 1}`); params.push(cat_id); }

    const where = conditions.length ? ' WHERE ' + conditions.join(' AND ') : '';
    const query = `SELECT * FROM price_db${where} ORDER BY cat_id, id LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNum, offset);

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/price-db
router.post('/', async (req, res) => {
  const { id, cat_id, name, unit, mat, lab } = req.body;
  if (!id) return res.status(400).json({ error: 'id ต้องระบุ' });
  if (!name || !name.trim()) return res.status(400).json({ error: 'ชื่อรายการต้องระบุ' });
  if (!cat_id) return res.status(400).json({ error: 'หมวดงานต้องระบุ' });
  try {
    await db.query(
      'INSERT INTO price_db (id, cat_id, name, unit, mat, lab) VALUES ($1, $2, $3, $4, $5, $6)',
      [id, cat_id, name.trim(), unit || 'ชุด', mat || 0, lab || 0]
    );
    res.status(201).json({ id, cat_id, name, unit, mat, lab });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/price-db/:id
router.put('/:id', async (req, res) => {
  const { cat_id, name, unit, mat, lab } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'ชื่อรายการต้องระบุ' });
  try {
    const { rows } = await db.query(
      'UPDATE price_db SET cat_id=$1, name=$2, unit=$3, mat=$4, lab=$5 WHERE id=$6 RETURNING *',
      [cat_id, name.trim(), unit || 'ชุด', mat || 0, lab || 0, req.params.id]
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
