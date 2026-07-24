const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const multer = require('multer');
const QRCode = require('qrcode');
const { dbAll, dbGet, dbRun } = require('./db-helpers');
const { uploadFile, deleteFile } = require('./supabase-storage');

// Configure multer for memory storage (will upload to Supabase)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 } // 50MB limit
});

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
app.get('/api/training/trainer-topics/:trainerName', async (req, res) => {
  try {
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

    const rows = await dbAll(sql, [trainerName]);
    res.json({
      trainer: trainerName,
      topics: rows
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get session details with participants
app.get('/api/training/session/:sessionId', async (req, res) => {
  try {
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

    const trainer = await dbGet(trainerSql, [sessionId]);
    if (!trainer) {
      return res.status(404).json({ error: 'Session not found' });
    }

    const trainees = await dbAll(traineesSql, [sessionId]);

    res.json({
      session: trainer,
      trainees: trainees,
      total_participants: trainees.length
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Submit training record with file upload
app.post('/api/training', upload.single('attachment'), async (req, res) => {
  try {
    const { employee_id, role, training_date, training_topic, training_hours, trainer_name, notes, session_id } = req.body;

    if (!employee_id || !training_date || !training_topic || !training_hours) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Upload file to Supabase if provided
    let attachment_url = null;
    if (req.file) {
      attachment_url = await uploadFile(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
    }

    const sql = `
      INSERT INTO training_records (employee_id, role, training_date, training_topic, training_hours, trainer_name, notes, session_id, attachment_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;

    const result = await dbRun(sql, [String(employee_id), role || 'trainee', training_date, training_topic, training_hours, trainer_name, notes, session_id || null, attachment_url]);
    res.json({
      id: result.lastID,
      message: 'Training record created successfully',
      attachment_url
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all training records
app.get('/api/training', async (req, res) => {
  try {
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

    const rows = await dbAll(sql);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get training records by date range (for reports)
app.get('/api/training/report', async (req, res) => {
  try {
    const { start_date, end_date, department, role } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ error: 'start_date and end_date are required' });
    }

    let sql = `
      SELECT
        t.id,
        t.employee_id,
        e.employee_name,
        e.department,
        e.position,
        e.level,
        t.role,
        t.training_date,
        t.training_topic,
        t.training_hours,
        t.trainer_name,
        t.notes,
        t.created_at
      FROM training_records t
      JOIN employees e ON t.employee_id = e.employee_id
      WHERE t.training_date BETWEEN ? AND ?
    `;

    const params = [start_date, end_date];

    // Filter by department if provided
    if (department && department !== 'all') {
      sql += ' AND e.department = ?';
      params.push(department);
    }

    // Filter by role if provided
    if (role && role !== 'all') {
      sql += ' AND t.role = ?';
      params.push(role);
    }

    sql += ' ORDER BY t.training_date DESC, e.employee_name ASC';

    const rows = await dbAll(sql, params);

    // Calculate summary statistics
    const summary = {
      total_records: rows.length,
      total_hours: rows.reduce((sum, r) => sum + parseFloat(r.training_hours), 0),
      unique_employees: new Set(rows.map(r => r.employee_id)).size,
      by_department: {},
      by_role: {}
    };

    // Group by department
    rows.forEach(row => {
      if (!summary.by_department[row.department]) {
        summary.by_department[row.department] = {
          count: 0,
          hours: 0,
          employees: new Set()
        };
      }
      summary.by_department[row.department].count++;
      summary.by_department[row.department].hours += parseFloat(row.training_hours);
      summary.by_department[row.department].employees.add(row.employee_id);
    });

    // Convert Sets to counts
    Object.keys(summary.by_department).forEach(dept => {
      summary.by_department[dept].employees = summary.by_department[dept].employees.size;
    });

    // Group by role
    rows.forEach(row => {
      if (!summary.by_role[row.role]) {
        summary.by_role[row.role] = { count: 0, hours: 0 };
      }
      summary.by_role[row.role].count++;
      summary.by_role[row.role].hours += parseFloat(row.training_hours);
    });

    res.json({
      records: rows,
      summary: summary,
      filters: {
        start_date,
        end_date,
        department: department || 'all',
        role: role || 'all'
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get training records by employee
app.get('/api/training/employee/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const sql = `
      SELECT * FROM training_records
      WHERE employee_id = ?
      ORDER BY training_date DESC
    `;

    const rows = await dbAll(sql, [id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get dashboard statistics
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const results = {};

    // Total employees
    const totalEmp = await dbGet('SELECT COUNT(*) as count FROM employees');
    results.totalEmployees = totalEmp ? totalEmp.count : 0;

    // Total hours
    const totalHrs = await dbGet('SELECT COALESCE(SUM(training_hours), 0) as total FROM training_records');
    results.totalHours = totalHrs ? totalHrs.total : 0;

    // Total records
    const totalRec = await dbGet('SELECT COUNT(*) as count FROM training_records');
    results.totalRecords = totalRec ? totalRec.count : 0;

    // Average hours per employee
    const avgHrs = await dbGet(`
      SELECT COALESCE(AVG(total_hours), 0) as avg
      FROM (
        SELECT employee_id, SUM(training_hours) as total_hours
        FROM training_records
        GROUP BY employee_id
      )
    `);
    results.avgHoursPerEmployee = avgHrs ? avgHrs.avg : 0;

    // By department
    const byDept = await dbAll(`
      SELECT
        e.department,
        COUNT(DISTINCT t.employee_id) as employee_count,
        COALESCE(SUM(t.training_hours), 0) as total_hours
      FROM employees e
      LEFT JOIN training_records t ON e.employee_id = t.employee_id
      GROUP BY e.department
      ORDER BY total_hours DESC
    `);
    results.byDepartment = byDept || [];

    // Recent training
    const recent = await dbAll(`
      SELECT
        t.*,
        e.employee_name,
        e.department
      FROM training_records t
      JOIN employees e ON t.employee_id = e.employee_id
      ORDER BY t.created_at DESC
      LIMIT 10
    `);
    results.recentTraining = recent || [];

    // Training sessions
    const sessions = await dbAll(`
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
      GROUP BY trainer.id, trainer.training_topic, trainer.training_date, trainer.training_hours, trainer.created_at, trainer_emp.employee_name, trainer_emp.department
      ORDER BY trainer.training_date DESC, trainer.created_at DESC
      LIMIT 10
    `);
    results.trainingSessions = sessions || [];

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Search employee training hours
app.get('/api/training/search', async (req, res) => {
  try {
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

    const rows = await dbAll(sql, [`%${query}%`, `%${query}%`]);
    res.json({ results: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get top trainees (most training hours as trainee)
app.get('/api/training/leaderboard/trainees', async (req, res) => {
  try {
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

    const rows = await dbAll(sql, [limit]);
    res.json({ leaderboard: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get top trainers (most training hours as trainer)
app.get('/api/training/leaderboard/trainers', async (req, res) => {
  try {
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

    const rows = await dbAll(sql, [limit]);
    res.json({ leaderboard: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get top departments (most training hours)
app.get('/api/training/leaderboard/departments', async (req, res) => {
  try {
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

    const rows = await dbAll(sql, [limit]);
    res.json({ leaderboard: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Reset all training records
app.delete('/api/admin/reset-all-training', async (req, res) => {
  try {
    const { confirm } = req.body;

    if (confirm !== 'RESET_ALL_DATA') {
      return res.status(400).json({
        error: 'Confirmation required',
        message: 'Please send { confirm: "RESET_ALL_DATA" } to proceed'
      });
    }

    const result = await dbRun('DELETE FROM training_records');
    res.json({
      message: 'All training records deleted successfully',
      deleted_count: result.changes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Reset training records for specific employee
app.delete('/api/admin/reset-employee-training/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;

    const result = await dbRun('DELETE FROM training_records WHERE employee_id = ?', [employeeId]);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'No training records found for this employee' });
    }

    res.json({
      message: 'Employee training records deleted successfully',
      employee_id: employeeId,
      deleted_count: result.changes
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Admin: Get statistics before reset (preview)
app.get('/api/admin/reset-preview', async (req, res) => {
  try {
    const results = {};

    const totalRec = await dbGet('SELECT COUNT(*) as count FROM training_records');
    results.totalRecords = totalRec ? totalRec.count : 0;

    const totalEmpWithTraining = await dbGet('SELECT COUNT(DISTINCT employee_id) as count FROM training_records');
    results.totalEmployeesWithTraining = totalEmpWithTraining ? totalEmpWithTraining.count : 0;

    const totalHrs = await dbGet('SELECT COALESCE(SUM(training_hours), 0) as total FROM training_records');
    results.totalHours = totalHrs ? totalHrs.total : 0;

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
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

// No proxy endpoint needed - Supabase Storage serves files directly with inline disposition!

// TEMPORARY: Manual migration trigger endpoint
app.post('/api/admin/run-migration', async (req, res) => {
  const { runMigration } = require('./run-migration');
  const result = await runMigration();
  res.json(result);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
