const jwt = require('jsonwebtoken');
const { db } = require('./db');

const secret = process.env.JWT_SECRET;
if (!secret) throw new Error('JWT_SECRET is required. Configure velvet virtual/server/.env');

const adminEmails = (process.env.ADMIN_EMAILS || '').split(',').map((email) => email.trim().toLowerCase()).filter(Boolean);
const signToken = (id) => jwt.sign({ sub: id }, secret, { expiresIn: '30d' });
const isAdmin = (user) => user && (user.role === 'admin' || adminEmails.includes(user.email.toLowerCase()));

function attachUser(req, _res, next) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) {
    try { req.user = db.prepare('SELECT id, email, display_name, avatar_url, role FROM users WHERE id = ?').get(jwt.verify(header.slice(7), secret).sub); } catch { req.user = null; }
  }
  next();
}
function requireAuth(req, res, next) { if (!req.user) return res.status(401).json({ error: 'Login necessário.' }); next(); }
function requireAdmin(req, res, next) { if (!isAdmin(req.user)) return res.status(403).json({ error: 'Acesso de administrador necessário.' }); next(); }

module.exports = { signToken, isAdmin, attachUser, requireAuth, requireAdmin };
