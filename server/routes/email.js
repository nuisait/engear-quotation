const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');

// POST /api/email/send
router.post('/send', async (req, res) => {
  const { to, subject, html, text } = req.body;
  if (!to || !subject) return res.status(400).json({ error: 'ต้องระบุ to และ subject' });

  if (!process.env.SMTP_HOST || !process.env.SMTP_USER) {
    return res.status(503).json({ error: 'ยังไม่ได้ตั้งค่า SMTP — กรุณาเพิ่ม SMTP_HOST, SMTP_USER, SMTP_PASS ใน environment variables' });
  }

  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
    });

    await transporter.sendMail({
      from: process.env.SMTP_FROM || `ENGEAR <${process.env.SMTP_USER}>`,
      to,
      subject,
      text: text || '',
      html: html || ''
    });

    res.json({ success: true, message: `ส่ง email ไปยัง ${to} เรียบร้อย` });
  } catch (err) {
    res.status(500).json({ error: 'ส่ง email ล้มเหลว: ' + err.message });
  }
});

module.exports = router;
