const fs = require('fs');
const path = require('path');
const db = require('./db');

const seedPath = path.join(__dirname, '..', 'sql', 'seed.sql');

try {
  const seedSql = fs.readFileSync(seedPath, 'utf8');
  db.exec(seedSql);
  console.log('Seed ejecutada correctamente.');
} catch (error) {
  console.error('Error ejecutando seed:', error.message);
  process.exit(1);
}
