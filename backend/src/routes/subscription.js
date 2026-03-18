const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');

const router = express.Router();

router.post('/upgrade', authenticateToken, (req, res) => {
  db.prepare(
    `UPDATE users
     SET account_type = 'premium',
         premium_until = datetime('now', '+30 days'),
         updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(req.user.id);

  const user = db
    .prepare('SELECT id, username, email, account_type, premium_until FROM users WHERE id = ?')
    .get(req.user.id);

  return res.json({ message: 'Suscripción premium activada por 30 días (demo).', user });
});

router.post('/downgrade', authenticateToken, (req, res) => {
  db.prepare(
    `UPDATE users
     SET account_type = 'free', premium_until = NULL, updated_at = CURRENT_TIMESTAMP
     WHERE id = ?`
  ).run(req.user.id);

  return res.json({ message: 'Cuenta regresada a plan free.' });
});

module.exports = router;
