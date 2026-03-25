const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * POST /api/migrate
 * Body: localStorage data (S object from engear_v2)
 * Imports all data at once using a transaction
 */
router.post('/', async (req, res) => {
  const { projects = [], categories = [], priceDB = [], lineItems = [], revisions = [], extras = {} } = req.body;
  const client = await db.connect();

  try {
    await client.query('BEGIN');

    // Categories
    for (const c of categories) {
      await client.query(
        `INSERT INTO categories (id, name, icon, sub) VALUES ($1, $2, $3, $4)
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, icon=EXCLUDED.icon, sub=EXCLUDED.sub`,
        [c.id, c.name, c.icon || '', JSON.stringify(c.sub || [])]
      );
    }

    // Price DB
    for (const p of priceDB) {
      await client.query(
        `INSERT INTO price_db (id, cat_id, name, unit, mat, lab) VALUES ($1, $2, $3, $4, $5, $6)
         ON CONFLICT (id) DO UPDATE SET cat_id=EXCLUDED.cat_id, name=EXCLUDED.name, unit=EXCLUDED.unit, mat=EXCLUDED.mat, lab=EXCLUDED.lab`,
        [p.id, p.catId, p.name, p.unit, p.mat || 0, p.lab || 0]
      );
    }

    // Projects
    for (const p of projects) {
      await client.query(
        `INSERT INTO projects (id, name, quo_no, client, company, phone, email, location) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET name=EXCLUDED.name, quo_no=EXCLUDED.quo_no, client=EXCLUDED.client,
           company=EXCLUDED.company, phone=EXCLUDED.phone, email=EXCLUDED.email, location=EXCLUDED.location`,
        [p.id, p.name, p.quoNo, p.client, p.company, p.phone, p.email, p.location]
      );
    }

    // Line items
    for (const item of lineItems) {
      await client.query(
        `INSERT INTO line_items (id, project_id, cat_id, "desc", qty, unit, mat, lab) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         ON CONFLICT (id) DO UPDATE SET cat_id=EXCLUDED.cat_id, "desc"=EXCLUDED."desc",
           qty=EXCLUDED.qty, unit=EXCLUDED.unit, mat=EXCLUDED.mat, lab=EXCLUDED.lab`,
        [item.id, item.projectId, item.catId, item.desc, item.qty || 0, item.unit, item.mat || 0, item.lab || 0]
      );
    }

    // Revisions
    for (const r of revisions) {
      await client.query(
        `INSERT INTO revisions (id, project_id, version, date, note, items, total) VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (id) DO UPDATE SET project_id=EXCLUDED.project_id, version=EXCLUDED.version,
           date=EXCLUDED.date, note=EXCLUDED.note, items=EXCLUDED.items, total=EXCLUDED.total`,
        [r.id, r.projId, r.version, r.date, r.note, r.items || 0, r.total || 0]
      );
    }

    // Extras
    for (const [projId, e] of Object.entries(extras)) {
      if (typeof e === 'object') {
        await client.query(
          `INSERT INTO extras (project_id, travel, access_fee, ot_mul, ot_pct, overhead, vat) VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (project_id) DO UPDATE SET travel=EXCLUDED.travel, access_fee=EXCLUDED.access_fee,
             ot_mul=EXCLUDED.ot_mul, ot_pct=EXCLUDED.ot_pct, overhead=EXCLUDED.overhead, vat=EXCLUDED.vat`,
          [projId, e.travel || 0, e.access || 0, e.otMul || 1, e.otPct || 0, e.overhead ?? 10, e.vat ?? 7]
        );
      }
    }

    await client.query('COMMIT');
    res.json({
      success: true,
      imported: { projects: projects.length, categories: categories.length, priceDB: priceDB.length, lineItems: lineItems.length, revisions: revisions.length }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
