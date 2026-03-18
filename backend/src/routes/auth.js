const express = require('express');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const db = require('../db');

const router = express.Router();

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      email: user.email,
      username: user.username,
      account_type: user.account_type
    },
    process.env.JWT_SECRET || 'dev_secret',
    { expiresIn: '7d' }
  );
}

router.post('/register', (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).json({ message: 'username, email y password son obligatorios.' });
  }

  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (existing) {
    return res.status(409).json({ message: 'Este email ya está registrado.' });
  }

  const hashedPassword = bcrypt.hashSync(password, 10);
  const stmt = db.prepare(
    `INSERT INTO users (username, email, password_hash, account_type)
     VALUES (?, ?, ?, 'free')`
  );

  const result = stmt.run(username, email, hashedPassword);
  const user = db.prepare('SELECT id, username, email, account_type FROM users WHERE id = ?').get(result.lastInsertRowid);

  const token = createToken(user);
  return res.status(201).json({ token, user });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'email y password son obligatorios.' });
  }

  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !bcrypt.compareSync(password, user.password_hash)) {
    return res.status(401).json({ message: 'Credenciales inválidas.' });
  }

  const safeUser = {
    id: user.id,
    username: user.username,
    email: user.email,
    account_type: user.account_type
  };

  const token = createToken(safeUser);
  return res.json({ token, user: safeUser });
});

router.post('/forgot-password', (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res.status(400).json({ message: 'email es obligatorio.' });
  }

  const user = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
  if (!user) {
    return res.json({ message: 'Si el email existe, se enviará un enlace de recuperación.' });
  }

  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + 1000 * 60 * 30).toISOString();

  db.prepare(
    `INSERT INTO password_resets (user_id, token, expires_at)
     VALUES (?, ?, ?)`
  ).run(user.id, token, expiresAt);

  return res.json({
    message: 'Token de recuperación generado (modo demo).',
    resetToken: token
  });
});

router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'token y newPassword son obligatorios.' });
  }

  const record = db
    .prepare('SELECT * FROM password_resets WHERE token = ? AND used = 0')
    .get(token);

  if (!record) {
    return res.status(400).json({ message: 'Token inválido.' });
  }

  if (new Date(record.expires_at) < new Date()) {
    return res.status(400).json({ message: 'Token expirado.' });
  }

  const hashedPassword = bcrypt.hashSync(newPassword, 10);

  const updateUser = db.prepare('UPDATE users SET password_hash = ? WHERE id = ?');
  const markUsed = db.prepare('UPDATE password_resets SET used = 1 WHERE id = ?');

  const trx = db.transaction(() => {
    updateUser.run(hashedPassword, record.user_id);
    markUsed.run(record.id);
  });

  trx();

  return res.json({ message: 'Contraseña actualizada correctamente.' });
});

module.exports = router;
