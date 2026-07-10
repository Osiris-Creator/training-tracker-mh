const db = require('./database');

// Check if using PostgreSQL
const isPostgres = !!process.env.DATABASE_URL;

// Helper to convert SQLite placeholders (?) to PostgreSQL ($1, $2, ...)
function convertPlaceholders(sql) {
  if (!isPostgres) return sql;

  let index = 1;
  return sql.replace(/\?/g, () => `$${index++}`);
}

// Wrapper for db.all() - get multiple rows
function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (isPostgres) {
      const pgSql = convertPlaceholders(sql);
      db.query(pgSql, params)
        .then(result => resolve(result.rows))
        .catch(err => reject(err));
    } else {
      db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    }
  });
}

// Wrapper for db.get() - get single row
function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (isPostgres) {
      const pgSql = convertPlaceholders(sql);
      db.query(pgSql, params)
        .then(result => resolve(result.rows[0] || null))
        .catch(err => reject(err));
    } else {
      db.get(sql, params, (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    }
  });
}

// Wrapper for db.run() - insert/update/delete
function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    if (isPostgres) {
      const pgSql = convertPlaceholders(sql);
      // For INSERT with RETURNING id
      const finalSql = sql.includes('INSERT') && !sql.includes('RETURNING')
        ? pgSql + ' RETURNING id'
        : pgSql;

      db.query(finalSql, params)
        .then(result => {
          resolve({
            changes: result.rowCount,
            lastID: result.rows && result.rows[0] ? result.rows[0].id : null
          });
        })
        .catch(err => reject(err));
    } else {
      db.run(sql, params, function(err) {
        if (err) reject(err);
        else resolve({ changes: this.changes, lastID: this.lastID });
      });
    }
  });
}

module.exports = {
  dbAll,
  dbGet,
  dbRun,
  raw: db // For direct access if needed
};
