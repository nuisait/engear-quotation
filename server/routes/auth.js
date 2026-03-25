const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authMiddleware = require('../middleware/auth');

const JWT_SECRET = process.env.JWT_SECRET || 'engear-jwt-secret-change-in-production';

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username และ password ต้องระบุ' });
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

// POST /api/auth/register (first user = admin, rest = requires admin token)
router.post('/register', async (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username และ password ต้องระบุ' });
  if (password.length < 6) return res.status(400).json({ error: 'password ต้องมีอย่างน้อย 6 ตัวอักษร' });
  try {
    const { rows: [{ count }] } = await db.query('SELECT COUNT(*) FROM users');
    const isFirst = parseInt(count) === 0;
    if (!isFirst) {
      // Require admin auth for subsequent registrations
      const auth = req.headers.authorization;
      if (!auth) return res.status(403).json({ error: 'ต้องมีสิทธิ์ Admin เพื่อเพิ่มผู้ใช้' });
      try {
        const decoded = jwt.verify(auth.slice(7), JWT_SECRET);
        if (decoded.role !== 'admin') return res.status(403).json({ error: 'ต้องมีสิทธิ์ Admin' });
      } catch {
        return res.status(403).json({ error: 'Token ไม่ถูกต้อง' });
      }
    }
    const password_hash = await bcrypt.hash(password, 10);
    const userRole = isFirst ? 'admin' : (role || 'viewer');
    const { rows } = await db.query(
      'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3) RETURNING id, username, role',
      [username, password_hash, userRole]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'ชื่อผู้ใช้นี้มีอยู่แล้ว' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/password
router.put('/password', authMiddleware, async (req, res) => {
  const { current_password, new_password } = req.body;
  if (!current_password || !new_password) return res.status(400).json({ error: 'ต้องระบุรหัสผ่านเก่าและใหม่' });
  if (new_password.length < 6) return res.status(400).json({ error: 'รหัสผ่านใหม่ต้องมีอย่างน้อย 6 ตัวอักษร' });
  try {
    const { rows } = await db.query('SELECT * FROM users WHERE id = $1', [req.user.id]);
    const valid = await bcrypt.compare(current_password, rows[0].password_hash);
    if (!valid) return res.status(401).json({ error: 'รหัสผ่านเดิมไม่ถูกต้อง' });
    const password_hash = await bcrypt.hash(new_password, 10);
    await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [password_hash, req.user.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/users (admin only)
router.get('/users', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'ต้องมีสิทธิ์ Admin' });
  try {
    const { rows } = await db.query('SELECT id, username, role, created_at FROM users ORDER BY id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/users/:id (admin only)
router.delete('/users/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'ต้องมีสิทธิ์ Admin' });
  if (req.user.id === parseInt(req.params.id)) return res.status(400).json({ error: 'ไม่สามารถลบตัวเองได้' });
  try {
    const { rowCount } = await db.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (rowCount === 0) return res.status(404).json({ error: 'Not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
