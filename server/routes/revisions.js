const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/revisions?project_id=X
router.get('/', async (req, res) => {
  try {
    const { project_id } = req.query;
    const { rows } = project_id
      ? await db.query('SELECT * FROM revisions WHERE project_id=$1 ORDER BY date DESC', [project_id])
      : await db.query('SELECT * FROM revisions ORDER BY date DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/revisions
router.post('/', async (req, res) => {
  const { id, project_id, version, date, note, items, total } = req.body;
  try {
    await db.query(
      `INSERT INTO revisions (id, project_id, version, date, note, items, total)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, project_id, version, date, note, items || 0, total || 0]
    );
    res.status(201).json({ id, project_id, version, date, note, items, total });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/revisions/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM revisions WHERE id=$1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
