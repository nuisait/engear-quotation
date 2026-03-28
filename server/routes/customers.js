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
      billing_address TEXT DEFAULT '',
      work_address TEXT DEFAULT '',
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
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
  const { type, first_name, last_name, company, contact_name, phone1, phone2, billing_address, work_address } = req.body;
  try {
    const { rows } = await db.query(
      `INSERT INTO customers (type,first_name,last_name,company,contact_name,phone1,phone2,billing_address,work_address)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [type||'individual', first_name||'', last_name||'', company||'', contact_name||'', phone1||'', phone2||'', billing_address||'', work_address||'']
    );
    res.status(201).json(rows[0]);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// PUT /api/customers/:id
router.put('/:id', async (req, res) => {
  const { type, first_name, last_name, company, contact_name, phone1, phone2, billing_address, work_address } = req.body;
  try {
    const { rows } = await db.query(
      `UPDATE customers SET type=$1,first_name=$2,last_name=$3,company=$4,contact_name=$5,
       phone1=$6,phone2=$7,billing_address=$8,work_address=$9 WHERE id=$10 RETURNING *`,
      [type, first_name||'', last_name||'', company||'', contact_name||'', phone1||'', phone2||'', billing_address||'', work_address||'', req.params.id]
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
