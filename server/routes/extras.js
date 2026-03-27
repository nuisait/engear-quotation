const express = require('express');
const router = express.Router({ mergeParams: true });
const db = require('../db');

// GET /api/projects/:projectId/extras
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM extras WHERE project_id=$1', [req.params.projectId]);
    res.json(rows[0] || { project_id: req.params.projectId, travel: 0, access_fee: 0, ot_mul: 1, ot_pct: 0, overhead: 10, vat: 7 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:projectId/extras  (upsert)
router.put('/', async (req, res) => {
  const { travel, access_fee, ot_mul, ot_pct, overhead, vat } = req.body;
  try {
    await db.query(
      `INSERT INTO extras (project_id, travel, access_fee, ot_mul, ot_pct, overhead, vat)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (project_id) DO UPDATE SET
         travel=EXCLUDED.travel, access_fee=EXCLUDED.access_fee,
         ot_mul=EXCLUDED.ot_mul, ot_pct=EXCLUDED.ot_pct,
         overhead=EXCLUDED.overhead, vat=EXCLUDED.vat`,
      [req.params.projectId, travel || 0, access_fee || 0, ot_mul || 1, ot_pct || 0, overhead ?? 10, vat ?? 7]
    );
    res.json({ project_id: req.params.projectId, travel, access_fee, ot_mul, ot_pct, overhead, vat });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
