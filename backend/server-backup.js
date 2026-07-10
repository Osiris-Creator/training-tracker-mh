const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const QRCode = require('qrcode');
const { dbAll, dbGet, dbRun } = require('./db-helpers');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration for production
const allowedOrigins = [
  'http://localhost:3000',
  'https://training-tracker-mh.vercel.app',
  process.env.FRONTEND_URL || 'http://localhost:3000'
];

app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) === -1) {
      const msg = 'The CORS policy for this site does not allow access from the specified Origin.';
      return callback(new Error(msg), false);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(bodyParser.json());

// Get all employees
app.get('/api/employees', async (req, res) => {
  try {
    const rows = await dbAll('SELECT * FROM employees ORDER BY employee_name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get employee by ID
app.get('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const row = await dbGet('SELECT * FROM employees WHERE employee_id = ?', [id]);
    if (!row) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json(row);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add new employee
app.post('/api/employees', async (req, res) => {
  try {
    const { employee_id, employee_name, position, department, level, email, phone } = req.body;

    if (!employee_id || !employee_name) {
      return res.status(400).json({ error: 'Employee ID and name are required' });
    }

    const sql = `
      INSERT INTO employees (employee_id, employee_name, position, department, level, email, phone)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await dbRun(sql, [employee_id, employee_name, position, department, level, email, phone]);
    res.json({
      id: result.lastID,
      employee_id,
      message: 'Employee added successfully'
    });
  } catch (err) {
    if (err.message.includes('UNIQUE') || err.message.includes('duplicate')) {
      return res.status(400).json({ error: 'Employee ID already exists' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Update employee
app.put('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { employee_name, position, department, level, email, phone } = req.body;

    if (!employee_name) {
      return res.status(400).json({ error: 'Employee name is required' });
    }

    const sql = `
      UPDATE employees
      SET employee_name = ?, position = ?, department = ?, level = ?, email = ?, phone = ?
      WHERE employee_id = ?
    `;

    const result = await dbRun(sql, [employee_name, position, department, level, email, phone, id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({
      message: 'Employee updated successfully',
      changes: result.changes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete employee
app.delete('/api/employees/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First check if employee has training records
    const row = await dbGet('SELECT COUNT(*) as count FROM training_records WHERE employee_id = ?', [id]);

    if (row.count > 0) {
      return res.status(400).json({
        error: 'Cannot delete employee with existing training records. Please delete training records first.'
      });
    }

    // If no training records, proceed with deletion
    const result = await dbRun('DELETE FROM employees WHERE employee_id = ?', [id]);
    if (result.changes === 0) {
      return res.status(404).json({ error: 'Employee not found' });
    }
    res.json({
      message: 'Employee deleted successfully',
      changes: result.changes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get today's training sessions (for trainees to join)
app.get('/api/training/today-sessions', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    const sql = `
      SELECT
        tr.id,
        tr.employee_id,
        e.employee_name as trainer_name,
        tr.training_date,
        tr.training_topic,
        tr.training_hours,
        tr.notes,
        tr.created_at
      FROM training_records tr
      LEFT JOIN employees e ON tr.employee_id = e.employee_id
      WHERE tr.training_date = ? AND tr.role = 'trainer'
      ORDER BY tr.created_at DESC
    `;

    const rows = await dbAll(sql, [today]);

    // Filter sessions that are still active (not expired)
    const activeSessions = rows.filter(session => {
      const createdAt = new Date(session.created_at);
      const durationMs = session.training_hours * 60 * 60 * 1000;
      const expiresAt = new Date(createdAt.getTime() + durationMs);
      return now < expiresAt;
    });

    // Add time_remaining to each session
    const sessionsWithTimer = activeSessions.map(session => {
      const createdAt = new Date(session.created_at);
      const durationMs = session.training_hours * 60 * 60 * 1000;
      const expiresAt = new Date(createdAt.getTime() + durationMs);
      const timeRemainingMs = expiresAt - now;

      return {
        ...session,
        expires_at: expiresAt.toISOString(),
        time_remaining_minutes: Math.ceil(timeRemainingMs / 60000)
      };
    });

    res.json({
      date: today,
      sessions: sessionsWithTimer,
      current_time: now.toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get trainer's topics (topics that a specific trainer has taught)
app.get('/api/training/trainer-topics/:trainerName', (req, res) => {
  const { trainerName } = req.params;

  const sql = `
    SELECT DISTINCT
      training_topic,
      COUNT(*) as count,
      SUM(training_hours) as total_hours,
      MAX(training_date) as last_trained
    FROM training_records
    WHERE trainer_name = ? AND role = 'trainer'
    GROUP BY training_topic
    ORDER BY last_trained DESC, count DESC
  `;

  db.all(sql, [trainerName], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      trainer: trainerName,
      topics: rows
    });
  });
});

// Get session details with participants
app.get('/api/training/session/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  // Get trainer session
  const trainerSql = `
    SELECT
      tr.*,
      e.employee_name,
      e.department
    FROM training_records tr
    LEFT JOIN employees e ON tr.employee_id = e.employee_id
    WHERE tr.id = ? AND tr.role = 'trainer'
  `;

  // Get trainees in this session
  const traineesSql = `
    SELECT
      tr.id,
      tr.employee_id,
      e.employee_name,
      e.department,
      tr.training_hours,
      tr.created_at
    FROM training_records tr
    LEFT JOIN employees e ON tr.employee_id = e.employee_id
    WHERE tr.session_id = ? AND tr.role = 'trainee'
    ORDER BY tr.created_at ASC
  `;

  db.get(trainerSql, [sessionId], (err, trainer) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (!trainer) {
      return res.status(404).json({ error: 'Session not found' });
    }

    db.all(traineesSql, [sessionId], (err, trainees) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      res.json({
        session: trainer,
        trainees: trainees,
        total_participants: trainees.length
      });
    });
  });
});

// Submit training record
app.post('/api/training', (req, res) => {
  const { employee_id, role, training_date, training_topic, training_hours, trainer_name, notes, session_id } = req.body;

  if (!employee_id || !training_date || !training_topic || !training_hours) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const sql = `
    INSERT INTO training_records (employee_id, role, training_date, training_topic, training_hours, trainer_name, notes, session_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [String(employee_id), role || 'trainee', training_date, training_topic, training_hours, trainer_name, notes, session_id || null], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      id: this.lastID,
      message: 'Training record created successfully'
    });
  });
});

// Get all training records
app.get('/api/training', (req, res) => {
  const sql = `
    SELECT
      t.*,
      e.employee_name,
      e.department,
      e.position
    FROM training_records t
    JOIN employees e ON t.employee_id = e.employee_id
    ORDER BY t.training_date DESC, t.created_at DESC
  `;

  db.all(sql, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get training records by employee
app.get('/api/training/employee/:id', (req, res) => {
  const { id } = req.params;
  const sql = `
    SELECT * FROM training_records
    WHERE employee_id = ?
    ORDER BY training_date DESC
  `;

  db.all(sql, [id], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json(rows);
  });
});

// Get dashboard statistics
app.get('/api/dashboard/stats', (req, res) => {
  const queries = {
    totalEmployees: 'SELECT COUNT(*) as count FROM employees',
    totalHours: 'SELECT COALESCE(SUM(training_hours), 0) as total FROM training_records',
    totalRecords: 'SELECT COUNT(*) as count FROM training_records',
    avgHoursPerEmployee: `
      SELECT COALESCE(AVG(total_hours), 0) as avg
      FROM (
        SELECT employee_id, SUM(training_hours) as total_hours
        FROM training_records
        GROUP BY employee_id
      )
    `,
    byDepartment: `
      SELECT
        e.department,
        COUNT(DISTINCT t.employee_id) as employee_count,
        COALESCE(SUM(t.training_hours), 0) as total_hours
      FROM employees e
      LEFT JOIN training_records t ON e.employee_id = t.employee_id
      GROUP BY e.department
      ORDER BY total_hours DESC
    `,
    recentTraining: `
      SELECT
        t.*,
        e.employee_name,
        e.department
      FROM training_records t
      JOIN employees e ON t.employee_id = e.employee_id
      ORDER BY t.created_at DESC
      LIMIT 10
    `,
    trainingSessions: `
      SELECT
        trainer.id as session_id,
        trainer.training_topic,
        trainer.training_date,
        trainer.training_hours,
        trainer_emp.employee_name as trainer_name,
        trainer_emp.department as trainer_department,
        COUNT(trainee.id) as trainee_count
      FROM training_records trainer
      LEFT JOIN employees trainer_emp ON trainer.employee_id = trainer_emp.employee_id
      LEFT JOIN training_records trainee ON trainer.id = trainee.session_id AND trainee.role = 'trainee'
      WHERE trainer.role = 'trainer'
      GROUP BY trainer.id
      ORDER BY trainer.training_date DESC, trainer.created_at DESC
      LIMIT 10
    `
  };

  const results = {};
  let completed = 0;

  const checkComplete = () => {
    completed++;
    if (completed === Object.keys(queries).length) {
      res.json(results);
    }
  };

  db.get(queries.totalEmployees, (err, row) => {
    results.totalEmployees = row ? row.count : 0;
    checkComplete();
  });

  db.get(queries.totalHours, (err, row) => {
    results.totalHours = row ? row.total : 0;
    checkComplete();
  });

  db.get(queries.totalRecords, (err, row) => {
    results.totalRecords = row ? row.count : 0;
    checkComplete();
  });

  db.get(queries.avgHoursPerEmployee, (err, row) => {
    results.avgHoursPerEmployee = row ? row.avg : 0;
    checkComplete();
  });

  db.all(queries.byDepartment, (err, rows) => {
    results.byDepartment = rows || [];
    checkComplete();
  });

  db.all(queries.recentTraining, (err, rows) => {
    results.recentTraining = rows || [];
    checkComplete();
  });

  db.all(queries.trainingSessions, (err, rows) => {
    results.trainingSessions = rows || [];
    checkComplete();
  });
});

// Search employee training hours
app.get('/api/training/search', (req, res) => {
  const { query } = req.query;

  if (!query || query.trim() === '') {
    return res.status(400).json({ error: 'Search query is required' });
  }

  const sql = `
    SELECT
      e.employee_id,
      e.employee_name,
      e.department,
      e.position,
      COALESCE(SUM(CASE WHEN tr.role = 'trainee' THEN tr.training_hours ELSE 0 END), 0) as total_trainee_hours,
      COALESCE(SUM(CASE WHEN tr.role = 'trainer' THEN tr.training_hours ELSE 0 END), 0) as total_trainer_hours,
      COALESCE(COUNT(CASE WHEN tr.role = 'trainee' THEN 1 END), 0) as trainee_count,
      COALESCE(COUNT(CASE WHEN tr.role = 'trainer' THEN 1 END), 0) as trainer_count
    FROM employees e
    LEFT JOIN training_records tr ON e.employee_id = tr.employee_id
    WHERE e.employee_name LIKE ? OR e.employee_id LIKE ?
    GROUP BY e.employee_id
    ORDER BY (total_trainee_hours + total_trainer_hours) DESC
  `;

  db.all(sql, [`%${query}%`, `%${query}%`], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ results: rows });
  });
});

// Get top trainees (most training hours as trainee)
app.get('/api/training/leaderboard/trainees', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const sql = `
    SELECT
      e.employee_id,
      e.employee_name,
      e.department,
      e.position,
      SUM(tr.training_hours) as total_hours,
      COUNT(tr.id) as training_count
    FROM employees e
    INNER JOIN training_records tr ON e.employee_id = tr.employee_id
    WHERE tr.role = 'trainee'
    GROUP BY e.employee_id
    ORDER BY total_hours DESC
    LIMIT ?
  `;

  db.all(sql, [limit], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ leaderboard: rows });
  });
});

// Get top trainers (most training hours as trainer)
app.get('/api/training/leaderboard/trainers', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const sql = `
    SELECT
      e.employee_id,
      e.employee_name,
      e.department,
      e.position,
      SUM(tr.training_hours) as total_hours,
      COUNT(tr.id) as sessions_count,
      COUNT(DISTINCT tr2.id) as total_trainees
    FROM employees e
    INNER JOIN training_records tr ON e.employee_id = tr.employee_id
    LEFT JOIN training_records tr2 ON tr.id = tr2.session_id AND tr2.role = 'trainee'
    WHERE tr.role = 'trainer'
    GROUP BY e.employee_id
    ORDER BY total_hours DESC
    LIMIT ?
  `;

  db.all(sql, [limit], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ leaderboard: rows });
  });
});

// Get top departments (most training hours)
app.get('/api/training/leaderboard/departments', (req, res) => {
  const limit = parseInt(req.query.limit) || 10;

  const sql = `
    SELECT
      e.department,
      COUNT(DISTINCT e.employee_id) as employee_count,
      COUNT(tr.id) as total_sessions,
      SUM(tr.training_hours) as total_hours,
      AVG(tr.training_hours) as avg_hours_per_session
    FROM employees e
    INNER JOIN training_records tr ON e.employee_id = tr.employee_id
    WHERE e.department IS NOT NULL AND e.department != ''
    GROUP BY e.department
    ORDER BY total_hours DESC
    LIMIT ?
  `;

  db.all(sql, [limit], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ leaderboard: rows });
  });
});

// Admin: Reset all training records
app.delete('/api/admin/reset-all-training', (req, res) => {
  const { confirm } = req.body;

  if (confirm !== 'RESET_ALL_DATA') {
    return res.status(400).json({
      error: 'Confirmation required',
      message: 'Please send { confirm: "RESET_ALL_DATA" } to proceed'
    });
  }

  db.run('DELETE FROM training_records', function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({
      message: 'All training records deleted successfully',
      deleted_count: this.changes
    });
  });
});

// Admin: Reset training records for specific employee
app.delete('/api/admin/reset-employee-training/:employeeId', (req, res) => {
  const { employeeId } = req.params;

  db.run('DELETE FROM training_records WHERE employee_id = ?', [employeeId], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'No training records found for this employee' });
    }

    res.json({
      message: 'Employee training records deleted successfully',
      employee_id: employeeId,
      deleted_count: this.changes
    });
  });
});

// Admin: Get statistics before reset (preview)
app.get('/api/admin/reset-preview', (req, res) => {
  const queries = {
    totalRecords: 'SELECT COUNT(*) as count FROM training_records',
    totalEmployeesWithTraining: 'SELECT COUNT(DISTINCT employee_id) as count FROM training_records',
    totalHours: 'SELECT COALESCE(SUM(training_hours), 0) as total FROM training_records'
  };

  const results = {};
  let completed = 0;

  const checkComplete = () => {
    completed++;
    if (completed === Object.keys(queries).length) {
      res.json(results);
    }
  };

  db.get(queries.totalRecords, (err, row) => {
    results.totalRecords = row ? row.count : 0;
    checkComplete();
  });

  db.get(queries.totalEmployeesWithTraining, (err, row) => {
    results.totalEmployeesWithTraining = row ? row.count : 0;
    checkComplete();
  });

  db.get(queries.totalHours, (err, row) => {
    results.totalHours = row ? row.total : 0;
    checkComplete();
  });
});

// Generate QR code for form URL
app.get('/api/qrcode', async (req, res) => {
  try {
    const formUrl = req.query.url || `http://localhost:3000/form`;
    const qrCodeDataUrl = await QRCode.toDataURL(formUrl);
    res.json({ qrCode: qrCodeDataUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
