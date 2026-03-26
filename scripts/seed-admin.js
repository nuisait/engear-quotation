/**
 * Seed script: สร้าง Admin user ครั้งแรก
 * Usage: node scripts/seed-admin.js
 */
require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase')
    ? { rejectUnauthorized: false } : false
});

async function seedAdmin() {
  const username = 'noonui';
  const email = 'nui.sait@gmail.com';
  const password = 'Engear@2025';
  const role = 'admin';
  const status = 'active';

  try {
    // Check if user already exists
    const { rows } = await pool.query('SELECT id FROM users WHERE username = $1 OR email = $2', [username, email]);
    if (rows.length > 0) {
      console.log(`✓ User "${username}" มีอยู่แล้ว (id: ${rows[0].id})`);
      await pool.end();
      return;
    }

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id',
      [username, email, hash, role, status]
    );

    console.log('✓ สร้าง Admin user สำเร็จ!');
    console.log(`  Username : ${username}`);
    console.log(`  Email    : ${email}`);
    console.log(`  Password : ${password}`);
    console.log(`  Role     : ${role}`);
    console.log(`  ID       : ${result.rows[0].id}`);
    console.log('');
    console.log('⚠️  กรุณาเปลี่ยน password หลัง login ครั้งแรก');
  } catch (err) {
    console.error('✗ Error:', err.message);
  } finally {
    await pool.end();
  }
}

seedAdmin();
