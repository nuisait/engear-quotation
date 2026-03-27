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
    const { rows } = await db.query(
      'SELECT * FROM users WHERE username = $1 OR email = $1', [username]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง' });
    if (user.status === 'pending') {
      return res.status(403).json({ error: 'บัญชีของคุณรอการอนุมัติจาก Admin' });
    }
    const token = jwt.sign(
      { id: user.id, username: user.username, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: user.id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: err.message || err.toString() });
  }
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  res.json(req.user);
});

// POST /api/auth/signup — anyone can sign up, first user = admin+active, rest = pending
router.post('/signup', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username และ password ต้องระบุ' });
  if (!email || !email.includes('@')) return res.status(400).json({ error: 'email ไม่ถูกต้อง' });
  if (password.length < 6) return res.status(400).json({ error: 'password ต้องมีอย่างน้อย 6 ตัวอักษร' });
  try {
    const { rows: [{ count }] } = await db.query('SELECT COUNT(*) FROM users');
    const isFirst = parseInt(count) === 0;
    const password_hash = await bcrypt.hash(password, 10);
    const role = isFirst ? 'admin' : 'readonly';
    const status = isFirst ? 'active' : 'pending';
    const { rows } = await db.query(
      'INSERT INTO users (username, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role, status',
      [username, email.toLowerCase(), password_hash, role, status]
    );
    if (isFirst) {
      const token = jwt.sign(
        { id: rows[0].id, username: rows[0].username, email: rows[0].email, role: rows[0].role },
        JWT_SECRET, { expiresIn: '7d' }
      );
      return res.status(201).json({ token, user: rows[0], message: 'ยินดีต้อนรับ! คุณเป็นผู้ดูแลระบบ (Admin)' });
    }
    res.status(201).json({ pending: true, message: 'สมัครสมาชิกเรียบร้อย — รอ Admin อนุมัติก่อน login ได้' });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'ชื่อผู้ใช้หรือ email นี้มีอยู่แล้ว' });
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register — admin adds user directly (active immediately)
router.post('/register', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'ต้องมีสิทธิ์ Admin' });
  const { username, email, password, role } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'username และ password ต้องระบุ' });
  if (password.length < 6) return res.status(400).json({ error: 'password ต้องมีอย่างน้อย 6 ตัวอักษร' });
  try {
    const password_hash = await bcrypt.hash(password, 10);
    const { rows } = await db.query(
      'INSERT INTO users (username, email, password_hash, role, status) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, email, role, status',
      [username, email || null, password_hash, role || 'readonly', 'active']
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
    const { rows } = await db.query(
      'SELECT id, username, email, role, status, created_at FROM users ORDER BY status DESC, id'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/users/:id — update role and/or status (admin only)
router.put('/users/:id', authMiddleware, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'ต้องมีสิทธิ์ Admin' });
  const { role, status } = req.body;
  const allowed_roles = ['admin', 'cfo', 'readonly'];
  const allowed_status = ['active', 'pending', 'disabled'];
  if (role && !allowed_roles.includes(role)) return res.status(400).json({ error: 'role ไม่ถูกต้อง' });
  if (status && !allowed_status.includes(status)) return res.status(400).json({ error: 'status ไม่ถูกต้อง' });
  try {
    const { rows } = await db.query(
      `UPDATE users SET
        role = COALESCE($1, role),
        status = COALESCE($2, status)
       WHERE id = $3 RETURNING id, username, email, role, status`,
      [role || null, status || null, req.params.id]
    );
    if (!rows[0]) return res.status(404).json({ error: 'Not found' });
    res.json(rows[0]);
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
