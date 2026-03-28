const express = require('express');
const router = express.Router();
const db = require('../db');

async function ensureTable(){
  await db.query(`
    CREATE TABLE IF NOT EXISTS customers (
      id SERIAL PRIMARY KEY,
      type TEXT DEFAULT 'individual',
      first_name TEXT DEFAULT '',
      last_name TEXT DEFAULT '',
      company TEXT DEFAULT '',
      contact_name TEXT DEFAULT '',
      phone1 TEXT DEFAULT '',
      phone2 TEXT DEFAULT '',
      email TEXT DEFAULT '',
      billing_address TEXT DEFAULT '',
      work_address TEXT DEFAULT '',
      remark TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
  // Add columns for existing tables (idempotent)
  await db.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS email TEXT DEFAULT ''`);
  await db.query(`ALTER TABLE customers ADD COLUMN IF NOT EXISTS remark TEXT DEFAULT ''`);
}
ensureTable().catch(e => console.error('customers table error:', e.message));

// GET /api/customers
router.get('/', async (req, res) => {
  try {
    const { rows } = await db.query('SELECT * FROM customers ORDER BY id');
    res.json(rows);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// POST /api/customers
router.post('/', async (req, res) => {
  const { type, first_name, last_name, company, contact_name, phone1, phone2, email, billing_address, work_address, remark } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO customers (type,first_name,last_name,company,contact_name,phone1,phone2,email,billing_address,work_address,remark)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) RETURNING *`,
      [type||'individual', first_name||'', last_name||'', company||'', contact_name||'', phone1||'', phone2||'', email||'', billing_address||'', work_address||'', remark||'']
    );
    res.status(201).json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
  const { type, first_name, last_name, company, contact_name, phone1, phone2, email, billing_address, work_address, remark } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE customers SET type=$1,first_name=$2,last_name=$3,company=$4,contact_name=$5,
       phone1=$6,phone2=$7,email=$8,billing_address=$9,work_address=$10,remark=$11 WHERE id=$12 RETURNING *`,
      [type, first_name||'', last_name||'', company||'', contact_name||'', phone1||'', phone2||'', email||'', billing_address||'', work_address||'', remark||'', req.params.id]
    );
    if(!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// DELETE /api/customers/:id
router.delete('/:id', async (req, res) => {
  try {
    const { rowCount } = await db.query('DELETE FROM customers WHERE id=$1', [req.params.id]);
    if(rowCount===0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

module.exports = router;
