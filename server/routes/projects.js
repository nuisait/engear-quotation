const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/projects
router.get('/', (req, res) => {
  const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
  res.json(projects);
});

// GET /api/projects/:id
router.get('/:id', (req, res) => {
  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
  if (!project) return res.status(404).json({ error: 'Not found' });
  res.json(project);
});

// POST /api/projects
router.post('/', (req, res) => {
  const { name, quo_no, client, company, phone, email, location } = req.body;
  if (!name) return res.status(400).json({ error: 'name is required' });

  const result = db.prepare(`
    INSERT INTO projects (name, quo_no, client, company, phone, email, location)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(name, quo_no, client, company, phone, email, location);

  const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(result.lastInsertRowid);
  res.status(201).json(project);
});

// PUT /api/projects/:id
router.put('/:id', (req, res) => {
  const { name, quo_no, client, company, phone, email, location } = req.body;
  const result = db.prepare(`
    UPDATE projects SET name=?, quo_no=?, client=?, company=?, phone=?, email=?, location=?
    WHERE id = ?
  `).run(name, quo_no, client, company, phone, email, location, req.params.id);

  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json(db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id));
});

// DELETE /api/projects/:id
router.delete('/:id', (req, res) => {
  const result = db.prepare('DELETE FROM projects WHERE id = ?').run(req.params.id);
  if (result.changes === 0) return res.status(404).json({ error: 'Not found' });
  res.json({ success: true });
});

module.exports = router;
