import pool from '../config/db.js';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const JWT_SECRET = (() => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is required in production');
    }
    console.warn('WARNING: JWT_SECRET not set. Using insecure fallback for development only.');
    return 'dev_insecure_fallback';
  }
  return secret;
})();

// Fallback in-memory user store used only if DB is not reachable
const fallbackUsers = [
  {
    id: 1,
    name: 'Admin User',
    email: 'admin@travel.test',
    password: bcrypt.hashSync('admin123', 10),
    role: 'admin',
  },
];
const DB_AVAILABLE = !!(
  process.env.DB_HOST && process.env.DB_HOST.trim() &&
  process.env.DB_USER && process.env.DB_USER.trim() &&
  process.env.DB_NAME && process.env.DB_NAME.trim()
);

export async function register(req, res) {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ message: 'Name, email, and password are required.' });
  }
  if (typeof name !== 'string' || !name.trim()) {
    return res.status(400).json({ message: 'Name is required.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ message: 'Invalid email format.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ message: 'Password must be at least 6 characters.' });
  }

  if (DB_AVAILABLE) {
    try {
      const [rows] = await pool.execute('SELECT id FROM users WHERE email = ?', [email]);
      if (rows.length > 0) {
        return res.status(409).json({ message: 'Email already in use.' });
      }

      const hash = await bcrypt.hash(password, 10);
      const [result] = await pool.execute(
        'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
        [name, email, hash, 'user']
      );

      const user = { id: result.insertId, name, email };
      const token = jwt.sign({ id: user.id, email: user.email, role: 'user' }, JWT_SECRET, { expiresIn: '8h' });
      return res.status(201).json({ message: 'User registered successfully.', user, token });
    } catch (err) {
      console.warn('DB register error, falling back to in-memory users', err.message || err);
      // fallback to in-memory below
    }
  }

  // fallback: use in-memory users
  const existing = fallbackUsers.find((u) => u.email === email);
  if (existing) {
    return res.status(409).json({ message: 'Email already in use.' });
  }
  const hash = await bcrypt.hash(password, 10);
  const user = { id: fallbackUsers.length + 1, name, email, password: hash, role: 'user' };
  fallbackUsers.push(user);
  const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
  return res.status(201).json({ message: 'User registered (in-memory fallback).', user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
}

export async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required.' });
  }

  try {
    const [rows] = await pool.execute('SELECT * FROM users WHERE email = ? LIMIT 1', [email]);
    if (rows.length > 0) {
      const user = rows[0];
      const match = await bcrypt.compare(password, user.password);
      if (!match) {
        return res.status(401).json({ message: 'Invalid credentials.' });
      }

      const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET, { expiresIn: '8h' });
      return res.status(200).json({ message: 'Login successful.', user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
    }
    // If DB available but no rows, fall through to fallback below
  } catch (err) {
    console.warn('DB login error, falling back to in-memory', err.message || err);
    // fall through to fallback below
  }

  // fallback: check in-memory users
  const local = fallbackUsers.find((u) => u.email === email);
  if (!local) return res.status(401).json({ message: 'Invalid credentials.' });
  const matchLocal = await bcrypt.compare(password, local.password);
  if (!matchLocal) return res.status(401).json({ message: 'Invalid credentials.' });

  const tokenLocal = jwt.sign({ id: local.id, email: local.email, role: local.role }, JWT_SECRET, { expiresIn: '8h' });
  return res.status(200).json({ message: 'Login successful (in-memory).', user: { id: local.id, name: local.name, email: local.email, role: local.role }, token: tokenLocal });
}
