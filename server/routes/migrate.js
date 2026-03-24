const express = require('express');
const router = express.Router();
const db = require('../db');

/**
 * POST /api/migrate
 * Body: localStorage data (S object from engear_v2)
 * Imports all data at once using a transaction
 */
router.post('/', (req, res) => {
  const { projects = [], categories = [], priceDB = [], lineItems = [], revisions = [], extras = {} } = req.body;

  const importAll = db.transaction(() => {
    // Categories
    const insertCat = db.prepare('INSERT OR REPLACE INTO categories (id, name, icon, sub) VALUES (?, ?, ?, ?)');
    for (const c of categories) {
      insertCat.run(c.id, c.name, c.icon || '', JSON.stringify(c.sub || []));
    }

    // Price DB
    const insertPrice = db.prepare('INSERT OR REPLACE INTO price_db (id, cat_id, name, unit, mat, lab) VALUES (?, ?, ?, ?, ?, ?)');
    for (const p of priceDB) {
      insertPrice.run(p.id, p.catId, p.name, p.unit, p.mat || 0, p.lab || 0);
    }

    // Projects
    const insertProject = db.prepare(`
      INSERT OR REPLACE INTO projects (id, name, quo_no, client, company, phone, email, location)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const p of projects) {
      insertProject.run(p.id, p.name, p.quoNo, p.client, p.company, p.phone, p.email, p.location);
    }

    // Line items (all projects)
    const insertItem = db.prepare(`
      INSERT OR REPLACE INTO line_items (id, project_id, cat_id, desc, qty, unit, mat, lab)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const item of lineItems) {
      insertItem.run(item.id, item.projectId, item.catId, item.desc, item.qty || 0, item.unit, item.mat || 0, item.lab || 0);
    }

    // Revisions
    const insertRev = db.prepare(`
      INSERT OR REPLACE INTO revisions (id, project_id, version, date, note, items, total)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    for (const r of revisions) {
      insertRev.run(r.id, r.projId, r.version, r.date, r.note, r.items || 0, r.total || 0);
    }

    // Extras (per project)
    const insertExtras = db.prepare(`
      INSERT OR REPLACE INTO extras (project_id, travel, access_fee, ot_mul, ot_pct, overhead, vat)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    // extras in localStorage is keyed by projectId
    for (const [projId, e] of Object.entries(extras)) {
      if (typeof e === 'object') {
        insertExtras.run(projId, e.travel || 0, e.access || 0, e.otMul || 1, e.otPct || 0, e.overhead ?? 10, e.vat ?? 7);
      }
    }
  });

  try {
    importAll();
    res.json({
      success: true,
      imported: { projects: projects.length, categories: categories.length, priceDB: priceDB.length, lineItems: lineItems.length, revisions: revisions.length }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
