const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');

// GET /api/projects/:projectId/extras
router.get('/', (req, res) => {
  const row = db.prepare('SELECT * FROM extras WHERE project_id=?').get(req.params.projectId);
  res.json(row || { project_id: req.params.projectId, travel: 0, access_fee: 0, ot_mul: 1, ot_pct: 0, overhead: 10, vat: 7 });
});

// PUT /api/projects/:projectId/extras  (upsert)
router.put('/', (req, res) => {
  const { travel, access_fee, ot_mul, ot_pct, overhead, vat } = req.body;
  db.prepare(`
    INSERT INTO extras (project_id, travel, access_fee, ot_mul, ot_pct, overhead, vat)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(project_id) DO UPDATE SET
      travel=excluded.travel, access_fee=excluded.access_fee,
      ot_mul=excluded.ot_mul, ot_pct=excluded.ot_pct,
      overhead=excluded.overhead, vat=excluded.vat
  `).run(req.params.projectId, travel || 0, access_fee || 0, ot_mul || 1, ot_pct || 0, overhead ?? 10, vat ?? 7);

  res.json({ project_id: req.params.projectId, travel, access_fee, ot_mul, ot_pct, overhead, vat });
});

module.exports = router;
