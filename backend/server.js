/**
 * Express API backend — replaces Supabase for the KauFeedback app.
 * Runs on port 4000 (configurable via API_PORT in .env).
 *
 * Routes:
 *   POST /api/auth/login         — admin login → JWT
 *   GET  /api/auth/me            — verify JWT → admin info
 *   POST /api/auth/logout        — (client-side only; just a 200 ack)
 *
 *   GET  /api/departments        — list active departments
 *   POST /api/departments        — [admin] add department
 *
 *   GET  /api/services           — list active services
 *   POST /api/services           — [admin] add service
 *
 *   GET  /api/locations          — list active locations
 *
 *   POST /api/feedback           — submit feedback (public)
 *   GET  /api/feedback           — [admin] list all entries (paginated)
 *   GET  /api/feedback/stats     — [admin] dashboard stats
 */

import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { pool } from './db.js';

dotenv.config();

const app  = express();
const PORT = process.env.API_PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ─── Auth helpers ──────────────────────────────────────────────────────────────

function signToken(admin) {
  return jwt.sign({ id: admin.id, email: admin.email }, JWT_SECRET, { expiresIn: '8h' });
}

function requireAuth(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth || !auth.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    req.admin = jwt.verify(auth.slice(7), JWT_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// ─── Auth routes ───────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body ?? {};
  if (!email || !password) return res.status(400).json({ error: 'email and password required' });

  try {
    const [rows] = await pool.execute('SELECT * FROM admins WHERE email = ?', [email]);
    const admin = rows[0];
    if (!admin) return res.status(401).json({ error: 'Invalid email or password' });

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(401).json({ error: 'Invalid email or password' });

    const token = signToken(admin);
    res.json({ token, admin: { id: admin.id, email: admin.email } });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, email, created_at FROM admins WHERE id = ?', [req.admin.id]);
    if (!rows[0]) return res.status(404).json({ error: 'Admin not found' });
    res.json({ admin: rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/auth/logout', (_req, res) => res.json({ ok: true }));

// ─── Departments ───────────────────────────────────────────────────────────────

app.get('/api/departments', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, is_active FROM departments WHERE is_active = 1 ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: get ALL (including inactive)
app.get('/api/departments/all', requireAuth, async (_req, res) => {
  try {
    const [rows] = await pool.execute('SELECT id, name, is_active FROM departments ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/departments', requireAuth, async (req, res) => {
  const { name } = req.body ?? {};
  if (!name?.trim()) return res.status(400).json({ error: 'name required' });
  try {
    await pool.execute('INSERT INTO departments (name) VALUES (?)', [name.trim()]);
    const [rows] = await pool.execute('SELECT id, name, is_active FROM departments ORDER BY name');
    res.status(201).json(rows);
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'Department already exists' });
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Services ──────────────────────────────────────────────────────────────────

app.get('/api/services', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, department_id, designation, is_active FROM services WHERE is_active = 1 ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/services', requireAuth, async (req, res) => {
  const { name, department_id, designation } = req.body ?? {};
  if (!name?.trim() || !department_id) return res.status(400).json({ error: 'name and department_id required' });
  try {
    await pool.execute(
      'INSERT INTO services (name, department_id, designation) VALUES (?, ?, ?)',
      [name.trim(), department_id, designation?.trim() || null]
    );
    const [rows] = await pool.execute(
      'SELECT id, name, department_id, designation, is_active FROM services WHERE is_active = 1 ORDER BY name'
    );
    res.status(201).json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Locations ─────────────────────────────────────────────────────────────────

app.get('/api/locations', async (_req, res) => {
  try {
    const [rows] = await pool.execute(
      'SELECT id, name, floor, ward, is_active FROM locations WHERE is_active = 1 ORDER BY name'
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Feedback ──────────────────────────────────────────────────────────────────

app.post('/api/feedback', async (req, res) => {
  const f = req.body ?? {};
  const required = ['visit_type', 'department_id', 'rating_cleanliness', 'rating_staff', 'rating_wait_time', 'rating_overall'];
  for (const k of required) {
    if (!f[k]) return res.status(400).json({ error: `${k} is required` });
  }
  try {
    await pool.execute(
      `INSERT INTO feedback_entries
         (patient_name, age, visit_type, admitted_date, relieved_date,
          department_id, service_id, location_id,
          rating_doctor, rating_cleanliness, rating_staff, rating_wait_time, rating_overall, comments)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        f.patient_name || null,
        f.age ? Number(f.age) : null,
        f.visit_type,
        f.admitted_date || null,
        f.relieved_date || null,
        f.department_id,
        f.service_id || null,
        f.location_id || null,
        f.rating_doctor || null,
        f.rating_cleanliness,
        f.rating_staff,
        f.rating_wait_time,
        f.rating_overall,
        f.comments || null,
      ]
    );
    res.status(201).json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: paginated list
app.get('/api/feedback', requireAuth, async (req, res) => {
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const size = Math.min(100, parseInt(req.query.size) || 20);
  const offset = (page - 1) * size;
  try {
    const [[{ total }]] = await pool.execute('SELECT COUNT(*) as total FROM feedback_entries');
    const [rows] = await pool.query(
      `SELECT f.*, d.name AS department_name, s.name AS service_name, l.name AS location_name
       FROM feedback_entries f
       LEFT JOIN departments d ON d.id = f.department_id
       LEFT JOIN services    s ON s.id = f.service_id
       LEFT JOIN locations   l ON l.id = f.location_id
       ORDER BY f.submitted_at DESC
       LIMIT ? OFFSET ?`,
      [size, offset]
    );
    res.json({ data: rows, total, page, size });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin: dashboard stats
app.get('/api/feedback/stats', requireAuth, async (_req, res) => {
  try {
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const [[todayRow]]   = await pool.execute(
      'SELECT COUNT(*) as cnt FROM feedback_entries WHERE DATE(submitted_at) = ?', [today]
    );
    const [[avgRow]]     = await pool.execute(
      'SELECT AVG(rating_overall) as avg_overall FROM feedback_entries'
    );
    const [deptStats]    = await pool.execute(
      `SELECT d.name, COUNT(*) as count, AVG(f.rating_overall) as avg
       FROM feedback_entries f
       JOIN departments d ON d.id = f.department_id
       GROUP BY f.department_id, d.name
       ORDER BY avg DESC`
    );
    const [latest]       = await pool.execute(
      `SELECT f.id, f.patient_name, f.visit_type, f.rating_overall, f.comments, f.submitted_at,
              d.name AS department
       FROM feedback_entries f
       JOIN departments d ON d.id = f.department_id
       ORDER BY f.submitted_at DESC LIMIT 10`
    );
    res.json({
      today:     todayRow.cnt,
      overall:   avgRow.avg_overall ?? 0,
      deptStats,
      latest,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ─── Health ────────────────────────────────────────────────────────────────────
app.get('/api/health', (_req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`\n🚀 KauFeedback API running on http://localhost:${PORT}`);
  console.log(`   Admin login: POST /api/auth/login`);
});
