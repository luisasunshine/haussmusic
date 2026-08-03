require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const { v4: uuid } = require('uuid');
const { OAuth2Client } = require('google-auth-library');
const { db } = require('./db');
const { signToken, isAdmin, attachUser, requireAuth, requireAdmin } = require('./auth');

const app = express();
const port = process.env.PORT || 4175;
const origins = (process.env.CORS_ORIGIN || '*').split(',').map((value) => value.trim());
const uploadsDir = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');
const googleClient = process.env.GOOGLE_CLIENT_ID ? new OAuth2Client(process.env.GOOGLE_CLIENT_ID) : null;
fs.mkdirSync(uploadsDir, { recursive: true });
app.set('trust proxy', 1);
app.use(cors({ origin: origins.includes('*') ? '*' : origins }));
app.use(express.json({ limit: '2mb' }));
app.use(attachUser);
app.use('/uploads', express.static(uploadsDir));
const profileStorage = multer.diskStorage({ destination: uploadsDir, filename: (_req, file, done) => done(null, `${Date.now()}-${uuid()}${path.extname(file.originalname).toLowerCase()}`) });
const profileUpload = multer({ storage: profileStorage, limits: { fileSize: 12 * 1024 * 1024 }, fileFilter: (_req, file, done) => done(null, /^image\//.test(file.mimetype)) });

const now = () => new Date().toISOString();
const slugify = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const publicUser = (user) => ({ id: user.id, email: user.email, displayName: user.display_name, avatarUrl: user.avatar_url, role: user.role });
const toCamel = (row) => row && Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, char) => char.toUpperCase()), value]));
const readJson = (value) => { try { return JSON.parse(value); } catch { return value; } };

app.get('/health', (_req, res) => res.json({ ok: true, service: 'velvet-virtual' }));

// The magazine reads podcasts from Velvet Music through the server, avoiding
// browser CORS limits while keeping the two databases and APIs independent.
app.get('/api/velvet-music/podcasts', async (_req, res, next) => {
  try {
    const musicApi = (process.env.VELVET_MUSIC_API_URL || 'https://velvetmusic-production.up.railway.app').replace(/\/$/, '');
    const response = await fetch(`${musicApi}/api/entities/Song?is_podcast=1&sort=-plays&limit=10`);
    if (!response.ok) throw new Error('Não foi possível buscar podcasts na Velvet Music.');
    const podcasts = await response.json();
    res.json(Array.isArray(podcasts) ? podcasts.sort((a, b) => Number(b.plays || 0) - Number(a.plays || 0)) : []);
  } catch (error) { next(error); }
});

app.post('/api/auth/register', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const displayName = String(req.body.displayName || '').trim();
  if (!email || !displayName || password.length < 8) return res.status(400).json({ error: 'Informe nome, e-mail e uma senha com pelo menos 8 caracteres.' });
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) return res.status(409).json({ error: 'Este e-mail já possui uma conta.' });
  const role = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map((item) => item.trim()).includes(email) ? 'admin' : 'leitor';
  const id = uuid(); const date = now();
  db.prepare('INSERT INTO users (id,email,password_hash,display_name,role,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(id, email, await bcrypt.hash(password, 12), displayName, role, date, date);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
  res.status(201).json({ token: signToken(id), user: publicUser(user) });
});

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
  if (!user || !(await bcrypt.compare(String(req.body.password || ''), user.password_hash))) return res.status(401).json({ error: 'E-mail ou senha incorretos.' });
  res.json({ token: signToken(user.id), user: publicUser(user) });
});
app.post('/api/auth/google', async (req, res) => {
  if (!googleClient) return res.status(500).json({ error: 'Login Google não configurado no servidor.' });
  if (!req.body.idToken) return res.status(400).json({ error: 'Token do Google ausente.' });
  try {
    const ticket = await googleClient.verifyIdToken({ idToken: req.body.idToken, audience: process.env.GOOGLE_CLIENT_ID });
    const profile = ticket.getPayload();
    if (!profile.email || !profile.email_verified) return res.status(401).json({ error: 'O Google não confirmou este e-mail.' });
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(profile.email.toLowerCase());
    if (!user) {
      const allowedAdmin = (process.env.ADMIN_EMAILS || '').toLowerCase().split(',').map((item) => item.trim()).includes(profile.email.toLowerCase());
      const id = uuid(); const date = now(); const role = allowedAdmin ? 'admin' : 'leitor';
      db.prepare('INSERT INTO users (id,email,password_hash,google_id,display_name,avatar_url,role,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?)').run(id, profile.email.toLowerCase(), await bcrypt.hash(uuid(), 12), profile.sub, profile.name || profile.email.split('@')[0], profile.picture || null, role, date, date);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    } else {
      db.prepare('UPDATE users SET google_id = ?, avatar_url = COALESCE(avatar_url, ?), updated_at = ? WHERE id = ?').run(profile.sub, profile.picture || null, now(), user.id);
      user = db.prepare('SELECT * FROM users WHERE id = ?').get(user.id);
    }
    res.json({ token: signToken(user.id), user: publicUser(user) });
  } catch { res.status(401).json({ error: 'Não foi possível validar o login Google.' }); }
});
app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: { ...publicUser(req.user), isAdmin: isAdmin(req.user) } }));
app.patch('/api/profile', requireAuth, (req, res) => {
  const displayName = String(req.body.displayName || '').trim();
  if (!displayName || displayName.length > 70) return res.status(400).json({ error: 'Informe um nome de até 70 caracteres.' });
  db.prepare('UPDATE users SET display_name = ?, updated_at = ? WHERE id = ?').run(displayName, now(), req.user.id);
  const user = db.prepare('SELECT id,email,display_name,avatar_url,role FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: { ...publicUser(user), isAdmin: isAdmin(user) } });
});
app.post('/api/profile/avatar', requireAuth, profileUpload.single('avatar'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Selecione uma imagem válida para o perfil.' });
  const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  const avatarUrl = `${base}/uploads/${req.file.filename}`;
  db.prepare('UPDATE users SET avatar_url = ?, updated_at = ? WHERE id = ?').run(avatarUrl, now(), req.user.id);
  const user = db.prepare('SELECT id,email,display_name,avatar_url,role FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: { ...publicUser(user), isAdmin: isAdmin(user) } });
});

app.get('/api/public/home', (_req, res) => {
  const banners = db.prepare('SELECT * FROM banners WHERE is_active = 1 ORDER BY position, created_at DESC').all().map(toCamel);
  const posts = db.prepare("SELECT posts.*, categories.name AS category_name, categories.slug AS category_slug, users.display_name AS author_name FROM posts LEFT JOIN categories ON categories.id = posts.category_id LEFT JOIN users ON users.id = posts.created_by WHERE posts.status = 'published' ORDER BY posts.published_at DESC, posts.created_at DESC").all().map(toCamel);
  const categories = db.prepare('SELECT id,name,slug,description FROM categories ORDER BY name').all().map(toCamel);
  const settings = Object.fromEntries(db.prepare('SELECT key,value FROM settings').all().map((item) => [item.key, readJson(item.value)]));
  res.json({ banners, posts, categories, settings });
});

app.post('/api/public/posts/:id/view', (req, res) => {
  const post = db.prepare("SELECT id, views FROM posts WHERE id = ? AND status = 'published'").get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Matéria não encontrada.' });
  const views = post.views + 1;
  db.prepare('UPDATE posts SET views = ? WHERE id = ?').run(views, req.params.id);
  res.json({ views });
});

function crud(resource, table, fields) {
  app.get(`/api/admin/${resource}`, requireAdmin, (_req, res) => res.json(db.prepare(`SELECT * FROM ${table} ORDER BY ${table === 'categories' ? 'name COLLATE NOCASE' : 'updated_at DESC'}`).all().map(toCamel)));
  app.post(`/api/admin/${resource}`, requireAdmin, (req, res) => {
    const id = uuid(); const date = now(); const data = { ...req.body };
    if (table === 'categories') data.slug = slugify(data.slug || data.name);
    if (table === 'posts') { data.slug = slugify(data.slug || data.title); data.created_by = req.user.id; if (data.status === 'published' && !data.published_at) data.published_at = date; }
    const names = ['id', ...fields, ...(table === 'posts' ? ['created_by'] : []), 'created_at', 'updated_at'];
    const values = names.map((name) => {
      if (name === 'id') return id;
      if (name === 'created_at' || name === 'updated_at') return date;
      if (data[name] !== undefined) return data[name];
      if (table === 'posts' && name === 'status') return 'draft';
      if (table === 'posts' && name === 'views') return 0;
      if (table === 'posts' && name === 'is_featured') return 0;
      if (table === 'banners' && name === 'is_active') return 1;
      if (table === 'banners' && name === 'position') return 0;
      if (table === 'banners' && name === 'duration') return 6;
      return null;
    });
    try { db.prepare(`INSERT INTO ${table} (${names.join(',')}) VALUES (${names.map(() => '?').join(',')})`).run(...values); } catch (error) { return res.status(400).json({ error: error.message }); }
    res.status(201).json(toCamel(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id)));
  });
  app.patch(`/api/admin/${resource}/:id`, requireAdmin, (req, res) => {
    const allowed = fields.filter((field) => Object.hasOwn(req.body, field));
    if (!allowed.length) return res.status(400).json({ error: 'Nenhum campo válido para atualizar.' });
    const data = { ...req.body }; if (table === 'categories' && data.slug) data.slug = slugify(data.slug); if (table === 'posts' && data.slug) data.slug = slugify(data.slug);
    const assignments = [...allowed, 'updated_at'].map((field) => `${field} = ?`).join(', ');
    db.prepare(`UPDATE ${table} SET ${assignments} WHERE id = ?`).run(...[...allowed.map((field) => data[field]), now(), req.params.id]);
    res.json(toCamel(db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id)));
  });
  app.delete(`/api/admin/${resource}/:id`, requireAdmin, (req, res) => { db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id); res.status(204).end(); });
}
crud('categories', 'categories', ['name', 'slug', 'description']);
crud('posts', 'posts', ['title', 'slug', 'excerpt', 'content', 'cover_url', 'category_id', 'status', 'published_at', 'views', 'is_featured']);
crud('banners', 'banners', ['title', 'subtitle', 'image_url', 'cta_label', 'cta_url', 'position', 'duration', 'is_active']);

app.get('/api/admin/users', requireAdmin, (_req, res) => res.json(db.prepare('SELECT id,email,display_name,avatar_url,role,created_at,updated_at FROM users ORDER BY created_at DESC').all().map(toCamel)));
app.post('/api/admin/users', requireAdmin, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const displayName = String(req.body.displayName || '').trim();
  const password = String(req.body.password || '');
  const allowedRoles = ['admin', 'staff', 'leitor', 'podcast', 'modelo', 'influencer', 'creators'];
  const role = allowedRoles.includes(req.body.role) ? req.body.role : 'leitor';
  if (!email || !displayName || password.length < 8) return res.status(400).json({ error: 'Informe nome, e-mail e uma senha com ao menos 8 caracteres.' });
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
  const id = uuid(); const date = now();
  db.prepare('INSERT INTO users (id,email,password_hash,display_name,role,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(id, email, await bcrypt.hash(password, 12), displayName, role, date, date);
  res.status(201).json(toCamel(db.prepare('SELECT id,email,display_name,avatar_url,role,created_at,updated_at FROM users WHERE id = ?').get(id)));
});
app.patch('/api/admin/users/:id', requireAdmin, (req, res) => {
  const allowedRoles = ['admin', 'staff', 'leitor', 'podcast', 'modelo', 'influencer', 'creators'];
  const role = String(req.body.role || ''); if (!allowedRoles.includes(role)) return res.status(400).json({ error: 'Cargo inválido.' });
  db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(role, now(), req.params.id);
  res.json(toCamel(db.prepare('SELECT id,email,display_name,avatar_url,role,created_at,updated_at FROM users WHERE id = ?').get(req.params.id)));
});
app.delete('/api/admin/users/:id', requireAdmin, (req, res) => {
  if (req.params.id === req.user.id) return res.status(400).json({ error: 'Não é possível apagar a própria conta administrativa.' });
  db.prepare('DELETE FROM users WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

app.get('/api/admin/settings', requireAdmin, (_req, res) => res.json(Object.fromEntries(db.prepare('SELECT key,value FROM settings').all().map((item) => [item.key, readJson(item.value)]))));
app.put('/api/admin/settings', requireAdmin, (req, res) => { const date = now(); const save = db.prepare('INSERT INTO settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at'); Object.entries(req.body).forEach(([key, value]) => save.run(key, JSON.stringify(value), date)); res.json({ ok: true }); });

const storage = multer.diskStorage({ destination: uploadsDir, filename: (_req, file, done) => done(null, `${Date.now()}-${uuid()}${path.extname(file.originalname).toLowerCase()}`) });
const upload = multer({ storage, limits: { fileSize: 12 * 1024 * 1024 } });
app.post('/api/admin/uploads', requireAdmin, upload.single('file'), (req, res) => { if (!req.file) return res.status(400).json({ error: 'Arquivo obrigatório.' }); const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`; res.status(201).json({ url: `${base}/uploads/${req.file.filename}` }); });

app.use((error, _req, res, _next) => res.status(error.status || 500).json({ error: error.message || 'Erro interno.' }));
app.listen(port, () => console.log(`VELVET VIRTUAL API on :${port}`));
