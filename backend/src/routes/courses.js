const express = require('express');
const db = require('../db');
const { optionalAuth } = require('../middleware/auth');

const router = express.Router();

function canAccessFullContent(user) {
  return user?.account_type === 'premium';
}

router.get('/', (req, res) => {
  const { search = '', opening = '', level = '', author = '' } = req.query;

  const query = `
    SELECT
      c.*,
      COUNT(l.id) AS total_lines,
      SUM(CASE WHEN l.is_free_preview = 1 THEN 1 ELSE 0 END) AS free_lines
    FROM courses c
    LEFT JOIN lines l ON l.course_id = c.id
    WHERE c.name LIKE ?
      AND c.opening_key LIKE ?
      AND c.level LIKE ?
      AND c.author LIKE ?
    GROUP BY c.id
    ORDER BY c.players_count DESC
  `;

  const courses = db.prepare(query).all(
    `%${search}%`,
    `%${opening}%`,
    `%${level}%`,
    `%${author}%`
  );

  return res.json(courses);
});

router.get('/:courseId', (req, res) => {
  const { courseId } = req.params;

  const course = db.prepare('SELECT * FROM courses WHERE id = ?').get(courseId);
  if (!course) {
    return res.status(404).json({ message: 'Curso no encontrado.' });
  }

  const stats = db
    .prepare(
      `SELECT
        COUNT(*) AS total_lines,
        SUM(CASE WHEN is_free_preview = 1 THEN 1 ELSE 0 END) AS free_lines
      FROM lines
      WHERE course_id = ?`
    )
    .get(courseId);

  return res.json({ ...course, ...stats });
});

router.get('/:courseId/lines', optionalAuth, (req, res) => {
  const { courseId } = req.params;
  const hasFullAccess = canAccessFullContent(req.user);

  const lineQuery = hasFullAccess
    ? `SELECT * FROM lines WHERE course_id = ? ORDER BY order_index ASC`
    : `SELECT * FROM lines WHERE course_id = ? AND is_free_preview = 1 ORDER BY order_index ASC`;

  const lines = db.prepare(lineQuery).all(courseId);
  return res.json({
    hasFullAccess,
    totalLoaded: lines.length,
    lines
  });
});

module.exports = router;
