const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/projects?page=1&limit=50&search=
router.get('/', async (req, res) => {
  try {
    const { search, page, limit } = req.query;
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, parseInt(limit) || 50);
    const offset = (pageNum - 1) * limitNum;

    let query = 'SELECT * FROM projects';
    let countQuery = 'SELECT COUNT(*) FROM projects';
    const params = [];
    const countParams = [];

    if (search) {
      query += ' WHERE name ILIKE $1 OR client ILIKE $1 OR quo_no ILIKE $1';
      countQuery += ' WHERE name ILIKE $1 OR client ILIKE $1 OR quo_no ILIKE $1';
      params.push(`%${search}%`);
      countParams.push(`%${search}%`);
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
    params.push(limitNum, offset);

    const [{ rows }, { rows: [{ count }] }] = await Promise.all([
      db.query(query, params),
      db.query(countQuery, countParams)
    ]);

    res.json({ data: rows, total: parseInt(count), page: pageNum, limit: limitNum });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/projects/:id
router.get('/:id', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects
router.post('/', async (req, res) => {
  const { name, quo_no, client, company, phone, email, location } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'ชื่อโครงการต้องระบุ' });
  try {
    const { rows } = await db.query(
      `INSERT INTO projects (name, quo_no, client, company, phone, email, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [name.trim(), quo_no || null, client || null, company || null, phone || null, email || null, location || null]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/projects/:id
router.put('/:id', async (req, res) => {
  const { name, quo_no, client, company, phone, email, location } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: 'ชื่อโครงการต้องระบุ' });
  try {
    const { rows } = await db.query(
      `UPDATE projects SET name=$1, quo_no=$2, client=$3, company=$4, phone=$5, email=$6, location=$7
       WHERE id=$8 RETURNING *`,
      [name.trim(), quo_no || null, client || null, company || null, phone || null, email || null, location || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/projects/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM projects WHERE id=$1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/projects/:id/duplicate
router.post('/:id/duplicate', async (req, res) => {
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const { rows: [original] } = await client.query('SELECT * FROM projects WHERE id = $1', [req.params.id]);
    if (!original) { await client.query('ROLLBACK'); return res.status(404).json({ error: 'Not found' }); }

    const { rows: [newProj] } = await client.query(
      `INSERT INTO projects (name, quo_no, client, company, phone, email, location)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [`${original.name} (สำเนา)`, original.quo_no, original.client, original.company, original.phone, original.email, original.location]
    );

    const { rows: items } = await client.query('SELECT * FROM line_items WHERE project_id = $1', [req.params.id]);
    for (const item of items) {
      const newId = 'i' + Date.now() + Math.random().toString(36).slice(2, 6);
      await client.query(
        `INSERT INTO line_items (id, project_id, cat_id, "desc", qty, unit, mat, lab) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
        [newId, newProj.id, item.cat_id, item.desc, item.qty, item.unit, item.mat, item.lab]
      );
    }

    const { rows: [extras] } = await client.query('SELECT * FROM extras WHERE project_id = $1', [req.params.id]);
    if (extras) {
      await client.query(
        `INSERT INTO extras (project_id, travel, access_fee, ot_mul, ot_pct, overhead, vat) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
        [newProj.id, extras.travel, extras.access_fee, extras.ot_mul, extras.ot_pct, extras.overhead, extras.vat]
      );
    }

    await client.query('COMMIT');
    res.status(201).json(newProj);
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
});

module.exports = router;
