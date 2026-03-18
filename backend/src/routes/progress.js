const express = require('express');
const db = require('../db');
const { authenticateToken } = require('../middleware/auth');
const { calculateNextReview } = require('../services/spacedRepetition');

const router = express.Router();

function isPremium(userId) {
  const user = db.prepare('SELECT account_type FROM users WHERE id = ?').get(userId);
  return user?.account_type === 'premium';
}

router.get('/active-courses', authenticateToken, (req, res) => {
  const premium = isPremium(req.user.id);

  const query = premium
    ? `
      SELECT c.id, c.name, c.level, c.opening_key, COUNT(DISTINCT up.id) AS practiced_lines
      FROM courses c
      LEFT JOIN lines l ON l.course_id = c.id
      LEFT JOIN user_progress up ON up.line_id = l.id AND up.user_id = ?
      GROUP BY c.id
      HAVING practiced_lines > 0
      ORDER BY practiced_lines DESC
    `
    : `
      SELECT c.id, c.name, c.level, c.opening_key, COUNT(DISTINCT up.id) AS practiced_lines
      FROM courses c
      LEFT JOIN lines l ON l.course_id = c.id AND l.is_free_preview = 1
      LEFT JOIN user_progress up ON up.line_id = l.id AND up.user_id = ?
      GROUP BY c.id
      HAVING practiced_lines > 0
      ORDER BY practiced_lines DESC
    `;

  const data = db.prepare(query).all(req.user.id);
  return res.json(data);
});

router.get('/due-lines', authenticateToken, (req, res) => {
  const premium = isPremium(req.user.id);

  const query = premium
    ? `
      SELECT
        l.id AS line_id,
        l.name AS line_name,
        l.moves,
        l.side_to_train,
        c.id AS course_id,
        c.name AS course_name,
        up.due_date,
        up.interval_days,
        up.repetitions,
        up.ease_factor
      FROM lines l
      JOIN courses c ON c.id = l.course_id
      LEFT JOIN user_progress up ON up.line_id = l.id AND up.user_id = ?
      WHERE up.due_date IS NULL OR datetime(up.due_date) <= datetime('now')
      ORDER BY datetime(COALESCE(up.due_date, '1970-01-01')) ASC
      LIMIT 20
    `
    : `
      SELECT
        l.id AS line_id,
        l.name AS line_name,
        l.moves,
        l.side_to_train,
        c.id AS course_id,
        c.name AS course_name,
        up.due_date,
        up.interval_days,
        up.repetitions,
        up.ease_factor
      FROM lines l
      JOIN courses c ON c.id = l.course_id
      LEFT JOIN user_progress up ON up.line_id = l.id AND up.user_id = ?
      WHERE l.is_free_preview = 1
        AND (up.due_date IS NULL OR datetime(up.due_date) <= datetime('now'))
      ORDER BY datetime(COALESCE(up.due_date, '1970-01-01')) ASC
      LIMIT 20
    `;

  const dueLines = db.prepare(query).all(req.user.id);
  return res.json(dueLines);
});

router.post('/review', authenticateToken, (req, res) => {
  const { lineId, quality = 4 } = req.body;

  if (!lineId) {
    return res.status(400).json({ message: 'lineId es obligatorio.' });
  }

  const premium = isPremium(req.user.id);
  const line = db.prepare('SELECT * FROM lines WHERE id = ?').get(lineId);

  if (!line) {
    return res.status(404).json({ message: 'Línea no encontrada.' });
  }

  if (!premium && line.is_free_preview !== 1) {
    return res.status(403).json({ message: 'Contenido premium bloqueado.' });
  }

  const currentProgress = db
    .prepare('SELECT * FROM user_progress WHERE user_id = ? AND line_id = ?')
    .get(req.user.id, lineId);

  const next = calculateNextReview(currentProgress, quality);

  if (currentProgress) {
    db.prepare(
      `UPDATE user_progress
       SET repetitions = ?, ease_factor = ?, interval_days = ?, due_date = ?,
           last_quality = ?, completed_count = completed_count + 1, updated_at = CURRENT_TIMESTAMP
       WHERE id = ?`
    ).run(
      next.repetitions,
      next.ease_factor,
      next.interval_days,
      next.due_date,
      next.last_quality,
      currentProgress.id
    );
  } else {
    db.prepare(
      `INSERT INTO user_progress
       (user_id, line_id, repetitions, ease_factor, interval_days, due_date, last_quality, completed_count)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`
    ).run(
      req.user.id,
      lineId,
      next.repetitions,
      next.ease_factor,
      next.interval_days,
      next.due_date,
      next.last_quality
    );
  }

  return res.json({ message: 'Progreso actualizado.', nextReview: next });
});

router.get('/recommendations', authenticateToken, (req, res) => {
  const recommendations = db
    .prepare(
      `
      SELECT c.*
      FROM courses c
      WHERE c.opening_key IN (
        SELECT DISTINCT c2.opening_key
        FROM user_progress up
        JOIN lines l2 ON l2.id = up.line_id
        JOIN courses c2 ON c2.id = l2.course_id
        WHERE up.user_id = ?
      )
      AND c.id NOT IN (
        SELECT DISTINCT l3.course_id
        FROM user_progress up3
        JOIN lines l3 ON l3.id = up3.line_id
        WHERE up3.user_id = ?
      )
      ORDER BY c.players_count DESC
      LIMIT 5
      `
    )
    .all(req.user.id, req.user.id);

  if (recommendations.length > 0) {
    return res.json(recommendations);
  }

  const fallback = db
    .prepare('SELECT * FROM courses ORDER BY players_count DESC LIMIT 5')
    .all();

  return res.json(fallback);
});

module.exports = router;
