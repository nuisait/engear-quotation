const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');

// GET /api/projects/:projectId/line-items
router.get('/', (req, res) => {
  const items = db.prepare(
    'SELECT * FROM line_items WHERE project_id = ? ORDER BY rowid'
  ).all(req.params.projectId);
  res.json(items);
});

// POST /api/projects/:projectId/line-items
router.post('/', (req, res) => {
  const { id, cat_id, desc, qty, unit, mat, lab } = req.body;
  db.prepare(`
    INSERT INTO line_items (id, project_id, cat_id, desc, qty, unit, mat, lab)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.params.projectId, cat_id, desc, qty || 0, unit, mat || 0, lab || 0);

  res.status(201).json({ id, project_id: req.params.projectId, cat_id, desc, qty, unit, mat, lab });
});

// PUT /api/line-items/:id
router.put('/:id', (req, res) => {
  const { cat_id, desc, qty, unit, mat, lab } = req.body;
  const result = db.prepare(`
    UPDATE line_items SET cat_id=?, desc=?, qty=?, unit=?, mat=?, lab=?
    WHERE id = ? AND project_id = ?
  `).run(cat_id, desc, qty || 0, unit, mat || 0, lab || 0, req.params.id, req.params.projectId);

  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json(db.prepare('SELECT * FROM line_items WHERE id = ?').get(req.params.id));
});

// DELETE /api/line-items/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare(
    'DELETE FROM line_items WHERE id = ? AND project_id = ?'
  ).run(req.params.id, req.params.projectId);

  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
