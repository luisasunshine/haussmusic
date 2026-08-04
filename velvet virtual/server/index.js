require('dotenv').config();
const fs = require('fs');
const path = require('path');
const tls = require('tls');
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
const portfolioUpload = multer({ storage: profileStorage, limits: { fileSize: 50 * 1024 * 1024 }, fileFilter: (_req, file, done) => done(null, /^(image|video)\//.test(file.mimetype)) });

const now = () => new Date().toISOString();
const slugify = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const publicUser = (user) => ({ id: user.id, email: user.email, displayName: user.display_name, avatarUrl: user.avatar_url, role: user.role });
const publicCreator = (user) => ({ id: user.id, displayName: user.display_name, avatarUrl: user.avatar_url, role: user.role, instagramUrl: user.instagram_url || '', youtubeUrl: user.youtube_url || '', customUrl: user.custom_url || '', customLabel: user.custom_label || '' });
const toCamel = (row) => row && Object.fromEntries(Object.entries(row).map(([key, value]) => [key.replace(/_([a-z])/g, (_, char) => char.toUpperCase()), value]));
const readJson = (value) => { try { return JSON.parse(value); } catch { return value; } };
const normalizeCategoryIds = (value) => [...new Set((Array.isArray(value) ? value : String(value || '').split(',')).map((item) => String(item).trim()).filter(Boolean))];
const PORTFOLIO_ROLES = ['modelo', 'influencer', 'creators'];
const hasUserRole = (user, role) => String(user?.role || '').split(',').map((value) => value.trim()).includes(role);
const siteUrl = (process.env.SITE_URL || 'https://velvetvirtual.vercel.app').replace(/\/$/, '');
const apiUrl = (process.env.PUBLIC_URL || 'https://velvetvirtual.up.railway.app').replace(/\/$/, '');
const emailFrom = process.env.EMAIL_FROM || 'Velvet Virtual <newsletter@velvetvirtual.com>';
const emailEscape = (value = '') => String(value).replace(/[&<>"']/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
function newsletterHtml({ eyebrow, title, text, imageUrl, buttonLabel, buttonUrl, unsubscribeToken }) {
  const image = imageUrl ? `<img src="${emailEscape(imageUrl)}" alt="" style="display:block;width:100%;max-height:430px;object-fit:cover;border:0">` : '';
  return `<!doctype html><html><body style="margin:0;background:#08080a;color:#fff;font-family:Arial,sans-serif"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#08080a"><tr><td align="center" style="padding:32px 14px"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#121216;border:1px solid #303036"><tr><td style="padding:26px 32px;border-bottom:1px solid #303036"><b style="font-size:24px;letter-spacing:-1px">VELVET</b> <span style="color:#999;font-size:10px;letter-spacing:3px">VIRTUAL</span></td></tr>${image}<tr><td style="padding:42px 32px 30px"><p style="margin:0 0 15px;color:#b9bac1;font:700 10px monospace;letter-spacing:2px">${emailEscape(eyebrow)}</p><h1 style="margin:0 0 20px;color:#fff;font-size:46px;line-height:.98;letter-spacing:-3px">${emailEscape(title)}</h1><p style="margin:0 0 28px;color:#b9b9c0;font-size:15px;line-height:1.7">${emailEscape(text)}</p><a href="${emailEscape(buttonUrl)}" style="display:inline-block;padding:15px 22px;background:#e1e2e6;color:#09090b;text-decoration:none;font:700 11px monospace;letter-spacing:1px">${emailEscape(buttonLabel)} &nbsp;→</a></td></tr><tr><td style="padding:22px 32px;border-top:1px solid #303036;color:#717179;font-size:10px;line-height:1.6">Você recebeu este e-mail porque assinou a Newsletter Velvet Virtual.<br><a href="${apiUrl}/api/newsletter/unsubscribe?token=${encodeURIComponent(unsubscribeToken)}" style="color:#aaaab2">Cancelar inscrição</a></td></tr></table></td></tr></table></body></html>`;
}
async function sendNewsletterEmail(to, subject, html) {
  if (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) return sendGmailEmail(to, subject, html);
  if (process.env.RESEND_API_KEY) {
    const response = await fetch('https://api.resend.com/emails', { method: 'POST', headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ from: emailFrom, to: [to], subject, html }) });
    if (!response.ok) throw new Error(`Resend recusou o envio (${response.status}).`);
    return;
  }
  throw new Error('Configure Gmail ou Resend para enviar a newsletter.');
}
function sendGmailEmail(to, subject, html) {
  const user = String(process.env.GMAIL_USER || '').trim();
  const password = String(process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '');
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host: 'smtp.gmail.com', port: 465, servername: 'smtp.gmail.com', rejectUnauthorized: true });
    let buffer = ''; const responses = []; const waiters = [];
    const finishResponse = (line) => { if (waiters.length) waiters.shift()(line); else responses.push(line); };
    socket.setTimeout(30000, () => socket.destroy(new Error('Tempo esgotado ao conectar ao Gmail.')));
    socket.on('data', (chunk) => {
      buffer += chunk.toString('utf8');
      const lines = buffer.split(/\r?\n/); buffer = lines.pop();
      lines.forEach((line) => { if (/^\d{3} /.test(line)) finishResponse(line); });
    });
    socket.on('error', reject);
    const read = () => responses.length ? Promise.resolve(responses.shift()) : new Promise((done) => waiters.push(done));
    const command = async (value, expected) => { socket.write(`${value}\r\n`); const response = await read(); if (!expected.includes(Number(response.slice(0, 3)))) throw new Error(`Gmail recusou o envio (${response}).`); return response; };
    socket.once('secureConnect', async () => {
      try {
        let response = await read(); if (!response.startsWith('220')) throw new Error(`SMTP indisponível (${response}).`);
        await command('EHLO velvetvirtual.com', [250]);
        await command('AUTH LOGIN', [334]);
        await command(Buffer.from(user).toString('base64'), [334]);
        await command(Buffer.from(password).toString('base64'), [235]);
        await command(`MAIL FROM:<${user}>`, [250]);
        await command(`RCPT TO:<${to}>`, [250, 251]);
        await command('DATA', [354]);
        const encodedSubject = `=?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`;
        const message = [`From: Velvet Virtual <${user}>`, `To: <${to}>`, `Subject: ${encodedSubject}`, 'MIME-Version: 1.0', 'Content-Type: text/html; charset=UTF-8', 'Content-Transfer-Encoding: base64', '', Buffer.from(html).toString('base64').replace(/(.{76})/g, '$1\r\n')].join('\r\n');
        await command(`${message}\r\n.`, [250]);
        socket.write('QUIT\r\n'); socket.end(); resolve();
      } catch (error) { socket.destroy(); reject(error); }
    });
  });
}
async function notifyNewsletter(event) {
  const subscribers = db.prepare('SELECT * FROM newsletter_subscribers WHERE is_active = 1').all();
  for (const subscriber of subscribers) {
    if (db.prepare('SELECT 1 FROM newsletter_deliveries WHERE subscriber_id = ? AND event_key = ?').get(subscriber.id, event.key)) continue;
    try {
      await sendNewsletterEmail(subscriber.email, event.subject, newsletterHtml({ ...event, unsubscribeToken: subscriber.unsubscribe_token }));
      db.prepare('INSERT INTO newsletter_deliveries (subscriber_id,event_key,sent_at) VALUES (?,?,?)').run(subscriber.id, event.key, now());
    } catch (error) { console.error(`[newsletter] ${subscriber.email}: ${error.message}`); }
  }
}
function attachPostCategories(rows) {
  if (!rows.length) return [];
  const grouped = new Map();
  db.prepare(`SELECT post_categories.post_id, categories.id, categories.name, categories.slug
    FROM post_categories JOIN categories ON categories.id = post_categories.category_id
    ORDER BY post_categories.position, categories.name COLLATE NOCASE`).all().forEach((item) => {
    if (!grouped.has(item.post_id)) grouped.set(item.post_id, []);
    grouped.get(item.post_id).push({ id: item.id, name: item.name, slug: item.slug });
  });
  return rows.map((row) => {
    const post = toCamel(row);
    const categories = grouped.get(post.id) || (post.categoryId ? [{ id: post.categoryId, name: post.categoryName, slug: post.categorySlug }] : []);
    post.categoryIds = categories.map((category) => category.id);
    post.categoryNames = categories.map((category) => category.name).filter(Boolean);
    post.categorySlugs = categories.map((category) => category.slug).filter(Boolean);
    if (post.categoryNames.length) post.categoryName = post.categoryNames[0];
    if (post.categorySlugs.length) post.categorySlug = post.categorySlugs[0];
    return post;
  });
}
function syncPostCategories(postId, categoryIds) {
  db.prepare('DELETE FROM post_categories WHERE post_id = ?').run(postId);
  const insert = db.prepare('INSERT OR IGNORE INTO post_categories (post_id,category_id,position) VALUES (?,?,?)');
  categoryIds.forEach((categoryId, position) => insert.run(postId, categoryId, position));
}

app.get('/health', (_req, res) => res.json({ ok: true, service: 'velvet-virtual' }));
app.post('/api/newsletter/subscribe', async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) return res.status(400).json({ error: 'Informe um e-mail válido.' });
  const date = now();
  let subscriber = db.prepare('SELECT * FROM newsletter_subscribers WHERE email = ?').get(email);
  if (subscriber) {
    db.prepare('UPDATE newsletter_subscribers SET is_active = 1, updated_at = ? WHERE id = ?').run(date, subscriber.id);
    subscriber = db.prepare('SELECT * FROM newsletter_subscribers WHERE id = ?').get(subscriber.id);
  } else {
    const id = uuid();
    db.prepare('INSERT INTO newsletter_subscribers (id,email,unsubscribe_token,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?)').run(id, email, uuid(), 1, date, date);
    subscriber = db.prepare('SELECT * FROM newsletter_subscribers WHERE id = ?').get(id);
  }
  const welcomeKey = `welcome:${subscriber.id}`;
  let emailSent = Boolean(db.prepare('SELECT 1 FROM newsletter_deliveries WHERE subscriber_id = ? AND event_key = ?').get(subscriber.id, welcomeKey));
  if (!emailSent) {
    try {
      await sendNewsletterEmail(email, 'Você entrou para a Velvet Virtual ✦', newsletterHtml({ eyebrow: 'DIRETO DA REDAÇÃO', title: 'Sua próxima obsessão começa aqui.', text: 'Agora você recebe em primeira mão novas edições da revista, novidades e os momentos de Te vi por aí.', buttonLabel: 'ABRIR VELVET', buttonUrl: siteUrl, unsubscribeToken: subscriber.unsubscribe_token }));
      db.prepare('INSERT INTO newsletter_deliveries (subscriber_id,event_key,sent_at) VALUES (?,?,?)').run(subscriber.id, welcomeKey, now());
      emailSent = true;
    } catch (error) { console.error(`[newsletter] boas-vindas ${email}: ${error.message}`); }
  }
  res.status(201).json({ ok: true, emailSent, emailConfigured: Boolean((process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) || process.env.RESEND_API_KEY) });
});
app.get('/api/newsletter/unsubscribe', (req, res) => {
  db.prepare('UPDATE newsletter_subscribers SET is_active = 0, updated_at = ? WHERE unsubscribe_token = ?').run(now(), String(req.query.token || ''));
  res.type('html').send('<!doctype html><meta charset="utf-8"><title>Velvet Virtual</title><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#08080a;color:#fff;font-family:Arial"><main style="text-align:center"><h1>VELVET VIRTUAL</h1><p style="color:#aaa">Sua inscrição foi cancelada.</p><a href="https://velvetvirtual.vercel.app" style="color:#fff">Voltar ao site</a></main>');
});

// The magazine reads podcasts from Velvet Music through the server, avoiding
// browser CORS limits while keeping the two databases and APIs independent.
app.get('/api/velvet-music/podcasts', async (_req, res, next) => {
  try {
    const musicApi = (process.env.VELVET_MUSIC_API_URL || 'https://velvetmusic-production.up.railway.app').replace(/\/$/, '');
    const [episodesResponse, showsResponse] = await Promise.all([
      fetch(`${musicApi}/api/entities/Song?is_podcast=1&sort=-plays&limit=10`),
      fetch(`${musicApi}/api/entities/Post?is_podcast=1`),
    ]);
    if (!episodesResponse.ok || !showsResponse.ok) throw new Error('Não foi possível buscar podcasts na Velvet Music.');
    const episodes = await episodesResponse.json();
    const shows = await showsResponse.json();
    const normalizedShows = (Array.isArray(shows) ? shows : []).filter((show) => show.is_podcast).map((show) => ({
      ...show,
      matchTitle: String(show.title || '').trim().toLocaleLowerCase('pt-BR'),
    }));
    const podcasts = (Array.isArray(episodes) ? episodes : []).map((episode) => {
      const album = String(episode.album || '').trim().toLocaleLowerCase('pt-BR');
      const show = normalizedShows.find((candidate) => candidate.matchTitle === album && (!episode.created_by || !candidate.created_by || candidate.created_by === episode.created_by))
        || normalizedShows.find((candidate) => candidate.matchTitle === album);
      return { ...episode, release_id: show?.id || null };
    });
    res.json(podcasts.sort((a, b) => Number(b.plays || 0) - Number(a.plays || 0)));
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
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate');
  const banners = db.prepare('SELECT * FROM banners WHERE is_active = 1 ORDER BY position, created_at DESC').all().map(toCamel);
  const posts = attachPostCategories(db.prepare(`SELECT posts.*, categories.name AS category_name, categories.slug AS category_slug, users.display_name AS author_name,
    (SELECT COUNT(*) FROM post_likes WHERE post_likes.post_id = posts.id) AS likes
    FROM posts LEFT JOIN categories ON categories.id = posts.category_id LEFT JOIN users ON users.id = posts.created_by
    WHERE posts.status = 'published' ORDER BY posts.published_at DESC, posts.created_at DESC`).all());
  const categories = db.prepare('SELECT id,name,slug,description FROM categories ORDER BY name').all().map(toCamel);
  const vimosVoce = db.prepare('SELECT * FROM vimos_voce WHERE is_active = 1 ORDER BY position, created_at DESC').all().map(toCamel);
  const magazinePages = db.prepare('SELECT * FROM magazine_pages WHERE is_active = 1 ORDER BY position, created_at').all().map(toCamel);
  const settings = Object.fromEntries(db.prepare('SELECT key,value FROM settings').all().map((item) => [item.key, readJson(item.value)]));
  res.json({ banners, posts, categories, vimosVoce, magazinePages, settings });
});

app.post('/api/public/posts/:id/view', (req, res) => {
  const post = db.prepare("SELECT id, views FROM posts WHERE id = ? AND status = 'published'").get(req.params.id);
  if (!post) return res.status(404).json({ error: 'Matéria não encontrada.' });
  let counted = false;
  let readCount = null;
  const visitorId = String(req.get('x-velvet-visitor') || '').trim();
  const validVisitor = /^[a-z0-9-]{20,80}$/i.test(visitorId);
  if (req.user) {
    const result = db.prepare('INSERT OR IGNORE INTO post_reads (post_id,user_id,created_at) VALUES (?,?,?)').run(req.params.id, req.user.id, now());
    const alreadySeenHere = validVisitor && Boolean(db.prepare('SELECT 1 FROM post_guest_views WHERE post_id = ? AND visitor_id = ?').get(req.params.id, visitorId));
    if (validVisitor) db.prepare('INSERT OR IGNORE INTO post_guest_views (post_id,visitor_id,created_at) VALUES (?,?,?)').run(req.params.id, visitorId, now());
    counted = Number(result.changes) > 0 && !alreadySeenHere;
    readCount = db.prepare('SELECT COUNT(*) AS total FROM post_reads WHERE user_id = ?').get(req.user.id).total;
  } else {
    if (validVisitor) {
      const result = db.prepare('INSERT OR IGNORE INTO post_guest_views (post_id,visitor_id,created_at) VALUES (?,?,?)').run(req.params.id, visitorId, now());
      counted = Number(result.changes) > 0;
    }
  }
  if (counted) db.prepare('UPDATE posts SET views = views + 1 WHERE id = ?').run(req.params.id);
  const views = db.prepare('SELECT views FROM posts WHERE id = ?').get(req.params.id).views;
  res.json({ views, counted, readCount });
});

// Separate from the view counter above on purpose: that one is deduped
// client-side per browser session (so a plain visitor can't inflate it by
// reloading), which meant a post already "seen" anonymously before login
// never got recorded once the reader signed in. This is called every time
// a logged-in reader opens a matéria, with no client-side gate at all —
// the post_reads primary key is what actually prevents double-counting,
// so it stays correct across logins, logouts, and account switches.
app.post('/api/public/posts/:id/read', requireAuth, (req, res) => {
  if (!publishedPost(req.params.id)) return res.status(404).json({ error: 'Matéria não encontrada.' });
  db.prepare('INSERT OR IGNORE INTO post_reads (post_id,user_id,created_at) VALUES (?,?,?)').run(req.params.id, req.user.id, now());
  res.json({ count: db.prepare('SELECT COUNT(*) AS total FROM post_reads WHERE user_id = ?').get(req.user.id).total });
});

app.get('/api/public/reads/count', requireAuth, (req, res) => {
  res.json({ count: db.prepare('SELECT COUNT(*) AS total FROM post_reads WHERE user_id = ?').get(req.user.id).total });
});

const publicComment = (row) => ({ id: row.id, content: row.content, createdAt: row.created_at, authorName: row.display_name, authorAvatar: row.avatar_url });
const publishedPost = (id) => db.prepare("SELECT id FROM posts WHERE id = ? AND status = 'published'").get(id);

app.get('/api/public/posts/:id/engagement', (req, res) => {
  if (!publishedPost(req.params.id)) return res.status(404).json({ error: 'Matéria não encontrada.' });
  const likes = db.prepare('SELECT COUNT(*) AS total FROM post_likes WHERE post_id = ?').get(req.params.id).total;
  const liked = req.user ? Boolean(db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(req.params.id, req.user.id)) : false;
  const saved = req.user ? Boolean(db.prepare('SELECT 1 FROM post_saves WHERE post_id = ? AND user_id = ?').get(req.params.id, req.user.id)) : false;
  const comments = db.prepare('SELECT comments.*, users.display_name, users.avatar_url FROM comments JOIN users ON users.id = comments.user_id WHERE comments.post_id = ? ORDER BY comments.created_at ASC').all(req.params.id).map(publicComment);
  res.json({ likes, liked, saved, comments });
});

app.post('/api/public/posts/:id/like', requireAuth, (req, res) => {
  if (!publishedPost(req.params.id)) return res.status(404).json({ error: 'Matéria não encontrada.' });
  const existing = db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (existing) db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(req.params.id, req.user.id);
  else db.prepare('INSERT INTO post_likes (post_id,user_id,created_at) VALUES (?,?,?)').run(req.params.id, req.user.id, now());
  const likes = db.prepare('SELECT COUNT(*) AS total FROM post_likes WHERE post_id = ?').get(req.params.id).total;
  res.json({ liked: !existing, likes });
});

app.post('/api/public/posts/:id/save', requireAuth, (req, res) => {
  if (!publishedPost(req.params.id)) return res.status(404).json({ error: 'Matéria não encontrada.' });
  const existing = db.prepare('SELECT 1 FROM post_saves WHERE post_id = ? AND user_id = ?').get(req.params.id, req.user.id);
  if (existing) db.prepare('DELETE FROM post_saves WHERE post_id = ? AND user_id = ?').run(req.params.id, req.user.id);
  else db.prepare('INSERT INTO post_saves (post_id,user_id,created_at) VALUES (?,?,?)').run(req.params.id, req.user.id, now());
  res.json({ saved: !existing });
});

app.post('/api/public/posts/:id/comments', requireAuth, (req, res) => {
  const content = String(req.body.content || '').trim();
  if (!content) return res.status(400).json({ error: 'Escreva algo antes de comentar.' });
  if (content.length > 2000) return res.status(400).json({ error: 'Comentário muito longo (máx. 2000 caracteres).' });
  if (!publishedPost(req.params.id)) return res.status(404).json({ error: 'Matéria não encontrada.' });
  const id = uuid(); const date = now();
  db.prepare('INSERT INTO comments (id,post_id,user_id,content,created_at) VALUES (?,?,?,?,?)').run(id, req.params.id, req.user.id, content, date);
  res.status(201).json(publicComment({ id, content, created_at: date, display_name: req.user.display_name, avatar_url: req.user.avatar_url }));
});

app.get('/api/public/saved', requireAuth, (req, res) => {
  const posts = attachPostCategories(db.prepare(`SELECT posts.*, categories.name AS category_name, categories.slug AS category_slug, users.display_name AS author_name
    FROM post_saves JOIN posts ON posts.id = post_saves.post_id
    LEFT JOIN categories ON categories.id = posts.category_id LEFT JOIN users ON users.id = posts.created_by
    WHERE post_saves.user_id = ? AND posts.status = 'published' ORDER BY post_saves.created_at DESC`).all(req.user.id));
  res.json({ posts });
});

app.get('/api/public/creators', (req, res) => {
  const role = String(req.query.role || '').toLowerCase();
  if (!PORTFOLIO_ROLES.includes(role)) return res.status(400).json({ error: 'Categoria de perfil inválida.' });
  const users = db.prepare('SELECT id,display_name,avatar_url,role FROM users ORDER BY display_name COLLATE NOCASE').all()
    .filter((user) => hasUserRole(user, role))
    .map((user) => ({ ...publicCreator(user), portfolioCount: db.prepare('SELECT COUNT(*) AS total FROM portfolio_posts WHERE user_id = ? AND role = ?').get(user.id, role).total }));
  res.json({ users });
});

app.get('/api/public/creators/:id', (req, res) => {
  const role = String(req.query.role || '').toLowerCase();
  const user = db.prepare('SELECT id,display_name,avatar_url,role,instagram_url,youtube_url,custom_url,custom_label FROM users WHERE id = ?').get(req.params.id);
  if (!user || !PORTFOLIO_ROLES.includes(role) || !hasUserRole(user, role)) return res.status(404).json({ error: 'Perfil não encontrado.' });
  const posts = db.prepare('SELECT * FROM portfolio_posts WHERE user_id = ? AND role = ? ORDER BY created_at DESC').all(user.id, role).map(toCamel);
  res.json({ user: publicCreator(user), posts });
});

app.patch('/api/portfolio/socials', requireAuth, (req, res) => {
  if (!PORTFOLIO_ROLES.some((role) => hasUserRole(req.user, role))) return res.status(403).json({ error: 'Seu cargo não possui um portfólio.' });
  const normalizeUrl = (value) => {
    const url = String(value || '').trim();
    if (!url) return '';
    try { const parsed = new URL(url); return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null; } catch { return null; }
  };
  const instagramUrl = normalizeUrl(req.body.instagramUrl);
  const youtubeUrl = normalizeUrl(req.body.youtubeUrl);
  const customUrl = normalizeUrl(req.body.customUrl);
  const customLabel = String(req.body.customLabel || '').trim().slice(0, 30);
  if ([instagramUrl, youtubeUrl, customUrl].includes(null)) return res.status(400).json({ error: 'Use links completos começando com https://.' });
  db.prepare('UPDATE users SET instagram_url = ?, youtube_url = ?, custom_url = ?, custom_label = ?, updated_at = ? WHERE id = ?').run(instagramUrl, youtubeUrl, customUrl, customLabel, now(), req.user.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id);
  res.json({ user: publicCreator(user) });
});

app.post('/api/portfolio/uploads', requireAuth, (req, res, next) => {
  if (!PORTFOLIO_ROLES.some((role) => hasUserRole(req.user, role))) return res.status(403).json({ error: 'Seu cargo não permite publicar portfólios.' });
  next();
}, portfolioUpload.single('image'), (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Selecione uma foto, GIF ou vídeo.' });
  const base = process.env.PUBLIC_URL || `${req.protocol}://${req.get('host')}`;
  res.status(201).json({ url: `${base}/uploads/${req.file.filename}` });
});

app.post('/api/portfolio/posts', requireAuth, (req, res) => {
  const role = String(req.body.role || '').toLowerCase();
  const title = String(req.body.title || '').trim();
  const content = String(req.body.content || '').trim();
  const imageUrl = String(req.body.image_url || '').trim();
  if (!PORTFOLIO_ROLES.includes(role) || !hasUserRole(req.user, role)) return res.status(403).json({ error: 'Seu cargo não permite publicar nesta categoria.' });
  if (!title || !imageUrl) return res.status(400).json({ error: 'Informe título e imagem.' });
  const id = uuid(); const date = now();
  db.prepare('INSERT INTO portfolio_posts (id,user_id,role,title,content,image_url,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?)').run(id, req.user.id, role, title, content, imageUrl, date, date);
  res.status(201).json(toCamel(db.prepare('SELECT * FROM portfolio_posts WHERE id = ?').get(id)));
});

app.delete('/api/portfolio/posts/:id', requireAuth, (req, res) => {
  const post = db.prepare('SELECT * FROM portfolio_posts WHERE id = ?').get(req.params.id);
  if (!post || (post.user_id !== req.user.id && !isAdmin(req.user))) return res.status(403).json({ error: 'Você não pode excluir esta publicação.' });
  db.prepare('DELETE FROM portfolio_posts WHERE id = ?').run(req.params.id);
  res.status(204).end();
});

function newsletterEventFor(table, item, date = now()) {
  if (table === 'posts' && item.status === 'published') return { key: `post:${item.id}`, subject: `Novidade Velvet: ${item.title}`, eyebrow: 'NOVIDADE VELVET', title: item.title, text: item.excerpt || 'Uma nova matéria acaba de chegar à Velvet Virtual.', imageUrl: item.cover_url, buttonLabel: 'LER AGORA', buttonUrl: `${siteUrl}/#novas` };
  if (table === 'vimos_voce' && Number(item.is_active)) return { key: `te-vi:${item.id}`, subject: `Te vi por aí: ${item.title}`, eyebrow: 'TE VI POR AÍ', title: item.title, text: item.description || 'Um novo momento da comunidade acaba de entrar no ar.', imageUrl: item.image_url, buttonLabel: 'VER AGORA', buttonUrl: `${siteUrl}/#vimos-voce` };
  if (table === 'magazine_pages' && Number(item.is_active)) return { key: `magazine:${date.slice(0, 10)}`, subject: 'Nova edição da Revista Velvet no ar', eyebrow: 'REVISTA VELVET', title: 'Uma nova edição para sentir agora.', text: 'A nova experiência editorial da Velvet Virtual já está disponível. Entre, deslize e descubra página por página.', imageUrl: item.image_url, buttonLabel: 'ABRIR REVISTA', buttonUrl: `${siteUrl}/#revista` };
  return null;
}
function crud(resource, table, fields) {
  app.get(`/api/admin/${resource}`, requireAdmin, (_req, res) => {
    const rows = db.prepare(`SELECT * FROM ${table} ORDER BY ${table === 'categories' ? 'name COLLATE NOCASE' : 'updated_at DESC'}`).all();
    res.json(table === 'posts' ? attachPostCategories(rows) : rows.map(toCamel));
  });
  app.post(`/api/admin/${resource}`, requireAdmin, (req, res) => {
    const id = uuid(); const date = now(); const data = { ...req.body };
    if (table === 'categories') data.slug = slugify(data.slug || data.name);
    const categoryIds = table === 'posts' ? normalizeCategoryIds(data.category_ids ?? data.category_id) : [];
    if (table === 'posts') { data.category_id = categoryIds[0] || null; data.slug = slugify(data.slug || data.title); data.created_by = req.user.id; if (data.status === 'published' && !data.published_at) data.published_at = date; }
    const names = ['id', ...fields.filter((field) => field !== 'category_ids'), ...(table === 'posts' ? ['created_by'] : []), 'created_at', 'updated_at'];
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
      if (table === 'vimos_voce' && name === 'is_active') return 1;
      if (table === 'vimos_voce' && name === 'position') return 0;
      if (table === 'magazine_pages' && name === 'is_active') return 1;
      if (table === 'magazine_pages' && name === 'position') return 0;
      return null;
    });
    try { db.prepare(`INSERT INTO ${table} (${names.join(',')}) VALUES (${names.map(() => '?').join(',')})`).run(...values); if (table === 'posts') syncPostCategories(id, categoryIds); } catch (error) { return res.status(400).json({ error: error.message }); }
    const item = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(id);
    const newsletterEvent = newsletterEventFor(table, item, date);
    if (newsletterEvent) void notifyNewsletter(newsletterEvent);
    res.status(201).json(table === 'posts' ? attachPostCategories([item])[0] : toCamel(item));
  });
  app.patch(`/api/admin/${resource}/:id`, requireAdmin, (req, res) => {
    const previousItem = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    const allowed = fields.filter((field) => Object.hasOwn(req.body, field));
    if (!allowed.length) return res.status(400).json({ error: 'Nenhum campo válido para atualizar.' });
    const data = { ...req.body }; if (table === 'categories' && data.slug) data.slug = slugify(data.slug); if (table === 'posts' && data.slug) data.slug = slugify(data.slug);
    const categoryWasUpdated = table === 'posts' && (Object.hasOwn(data, 'category_ids') || Object.hasOwn(data, 'category_id'));
    const categoryIds = categoryWasUpdated ? normalizeCategoryIds(data.category_ids ?? data.category_id) : [];
    if (categoryWasUpdated) data.category_id = categoryIds[0] || null;
    const databaseFields = allowed.filter((field) => field !== 'category_ids');
    if (categoryWasUpdated && !databaseFields.includes('category_id')) databaseFields.push('category_id');
    const assignments = [...databaseFields, 'updated_at'].map((field) => `${field} = ?`).join(', ');
    db.prepare(`UPDATE ${table} SET ${assignments} WHERE id = ?`).run(...[...databaseFields.map((field) => data[field]), now(), req.params.id]);
    if (categoryWasUpdated) syncPostCategories(req.params.id, categoryIds);
    const item = db.prepare(`SELECT * FROM ${table} WHERE id = ?`).get(req.params.id);
    const becamePublic = (table === 'posts' && previousItem?.status !== 'published' && item?.status === 'published')
      || (table === 'vimos_voce' && !Number(previousItem?.is_active) && Number(item?.is_active))
      || (table === 'magazine_pages' && !Number(previousItem?.is_active) && Number(item?.is_active));
    const newsletterEvent = becamePublic ? newsletterEventFor(table, item) : null;
    if (newsletterEvent) void notifyNewsletter(newsletterEvent);
    res.json(table === 'posts' ? attachPostCategories([item])[0] : toCamel(item));
  });
  app.delete(`/api/admin/${resource}/:id`, requireAdmin, (req, res) => {
    if (table === 'posts') db.prepare('DELETE FROM post_categories WHERE post_id = ?').run(req.params.id);
    if (table === 'categories') db.prepare('DELETE FROM post_categories WHERE category_id = ?').run(req.params.id);
    db.prepare(`DELETE FROM ${table} WHERE id = ?`).run(req.params.id);
    res.status(204).end();
  });
}
crud('categories', 'categories', ['name', 'slug', 'description']);
crud('posts', 'posts', ['title', 'slug', 'excerpt', 'content', 'cover_url', 'category_id', 'category_ids', 'status', 'published_at', 'views', 'is_featured']);
crud('banners', 'banners', ['title', 'subtitle', 'image_url', 'cta_label', 'cta_url', 'position', 'duration', 'is_active']);
crud('vimos-voce', 'vimos_voce', ['title', 'description', 'image_url', 'instagram_url', 'position', 'is_active']);
crud('magazine-pages', 'magazine_pages', ['title', 'image_url', 'position', 'is_active']);

app.get('/api/admin/users', requireAdmin, (_req, res) => res.json(db.prepare('SELECT id,email,display_name,avatar_url,role,created_at,updated_at FROM users ORDER BY created_at DESC').all().map(toCamel)));
const ALLOWED_ROLES = ['admin', 'staff', 'leitor', 'podcast', 'modelo', 'influencer', 'creators'];
// A pessoa pode acumular vários cargos (ex.: staff + podcast), então role
// é guardado como uma lista separada por vírgula em vez de um valor único.
function parseRoles(value, fallback = 'leitor') {
  const roles = [...new Set(String(value || '').split(',').map((role) => role.trim()).filter(Boolean))];
  return roles.length && roles.every((role) => ALLOWED_ROLES.includes(role)) ? roles.join(',') : fallback;
}

app.post('/api/admin/users', requireAdmin, async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const displayName = String(req.body.displayName || '').trim();
  const password = String(req.body.password || '');
  const role = parseRoles(req.body.role);
  if (!email || !displayName || password.length < 8) return res.status(400).json({ error: 'Informe nome, e-mail e uma senha com ao menos 8 caracteres.' });
  if (db.prepare('SELECT id FROM users WHERE email = ?').get(email)) return res.status(409).json({ error: 'Este e-mail já está cadastrado.' });
  const id = uuid(); const date = now();
  db.prepare('INSERT INTO users (id,email,password_hash,display_name,role,created_at,updated_at) VALUES (?,?,?,?,?,?,?)').run(id, email, await bcrypt.hash(password, 12), displayName, role, date, date);
  res.status(201).json(toCamel(db.prepare('SELECT id,email,display_name,avatar_url,role,created_at,updated_at FROM users WHERE id = ?').get(id)));
});
app.patch('/api/admin/users/:id', requireAdmin, (req, res) => {
  const roles = [...new Set(String(req.body.role || '').split(',').map((role) => role.trim()).filter(Boolean))];
  if (!roles.length || !roles.every((role) => ALLOWED_ROLES.includes(role))) return res.status(400).json({ error: 'Cargo inválido.' });
  if (req.params.id === req.user.id && !roles.includes('admin')) return res.status(400).json({ error: 'Você não pode remover seu próprio acesso de admin.' });
  db.prepare('UPDATE users SET role = ?, updated_at = ? WHERE id = ?').run(roles.join(','), now(), req.params.id);
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
