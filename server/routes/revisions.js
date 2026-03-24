const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/revisions?project_id=X
router.get('/', (req, res) => {
  const { project_id } = req.query;
  const revisions = project_id
    ? db.prepare('SELECT * FROM revisions WHERE project_id=? ORDER BY date DESC').all(project_id)
    : db.prepare('SELECT * FROM revisions ORDER BY date DESC').all();
  res.json(revisions);
});

// POST /api/revisions
router.post('/', (req, res) => {
  const { id, project_id, version, date, note, items, total } = req.body;
  db.prepare(`
    INSERT INTO revisions (id, project_id, version, date, note, items, total)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, project_id, version, date, note, items || 0, total || 0);
  res.status(201).json({ id, project_id, version, date, note, items, total });
});

// DELETE /api/revisions/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM revisions WHERE id=?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
