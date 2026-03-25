const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');

// GET /api/projects/:projectId/line-items
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query(
      'SELECT * FROM line_items WHERE project_id = $1 ORDER BY id',
      [req.params.projectId]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:projectId/line-items
router.post('/', async (req, res) => {
  const { id, cat_id, desc, qty, unit, mat, lab } = req.body;
  try {
    await db.query(
      `INSERT INTO line_items (id, project_id, cat_id, "desc", qty, unit, mat, lab)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [id, req.params.projectId, cat_id, desc, qty || 0, unit, mat || 0, lab || 0]
    );
    res.status(201).json({ id, project_id: req.params.projectId, cat_id, desc, qty, unit, mat, lab });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:projectId/line-items/:id
router.put('/:id', async (req, res) => {
  const { cat_id, desc, qty, unit, mat, lab } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE line_items SET cat_id=$1, "desc"=$2, qty=$3, unit=$4, mat=$5, lab=$6
       WHERE id=$7 AND project_id=$8 RETURNING *`,
      [cat_id, desc, qty || 0, unit, mat || 0, lab || 0, req.params.id, req.params.projectId]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:projectId/line-items/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query(
      'DELETE FROM line_items WHERE id=$1 AND project_id=$2',
      [req.params.id, req.params.projectId]
    );
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
