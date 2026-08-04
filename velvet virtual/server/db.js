const fs = require('fs');
const path = require('path');
const { DatabaseSync } = require('node:sqlite');

const dataDir = process.env.DATA_DIR || path.join(__dirname, 'data');
fs.mkdirSync(dataDir, { recursive: true });
const sqlite = new DatabaseSync(path.join(dataDir, 'velvet-virtual.db'));
sqlite.exec('PRAGMA journal_mode = WAL');

const db = {
  exec: (sql) => sqlite.exec(sql),
  prepare: (sql) => {
    const statement = sqlite.prepare(sql);
    return { run: (...values) => statement.run(...values), get: (...values) => statement.get(...values), all: (...values) => statement.all(...values) };
  },
};

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, google_id TEXT,
    display_name TEXT NOT NULL, avatar_url TEXT, role TEXT NOT NULL DEFAULT 'leitor',
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS categories (
    id TEXT PRIMARY KEY, name TEXT UNIQUE NOT NULL, slug TEXT UNIQUE NOT NULL,
    description TEXT, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
    excerpt TEXT, content TEXT NOT NULL DEFAULT '', cover_url TEXT, category_id TEXT,
    status TEXT NOT NULL DEFAULT 'draft', published_at TEXT, views INTEGER NOT NULL DEFAULT 0,
    is_featured INTEGER NOT NULL DEFAULT 0, created_by TEXT NOT NULL,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL,
    FOREIGN KEY(category_id) REFERENCES categories(id), FOREIGN KEY(created_by) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS post_categories (
    post_id TEXT NOT NULL, category_id TEXT NOT NULL, position INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (post_id, category_id),
    FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY(category_id) REFERENCES categories(id)
  );
  CREATE TABLE IF NOT EXISTS banners (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, subtitle TEXT, image_url TEXT,
    cta_label TEXT, cta_url TEXT, position INTEGER NOT NULL DEFAULT 0,
    duration INTEGER NOT NULL DEFAULT 6, is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS vimos_voce (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, image_url TEXT,
    instagram_url TEXT, position INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS magazine_pages (
    id TEXT PRIMARY KEY, title TEXT NOT NULL, image_url TEXT NOT NULL,
    position INTEGER NOT NULL DEFAULT 0, is_active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY, value TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS post_likes (
    post_id TEXT NOT NULL, user_id TEXT NOT NULL, created_at TEXT NOT NULL,
    PRIMARY KEY (post_id, user_id),
    FOREIGN KEY(post_id) REFERENCES posts(id), FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS post_saves (
    post_id TEXT NOT NULL, user_id TEXT NOT NULL, created_at TEXT NOT NULL,
    PRIMARY KEY (post_id, user_id),
    FOREIGN KEY(post_id) REFERENCES posts(id), FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY, post_id TEXT NOT NULL, user_id TEXT NOT NULL,
    content TEXT NOT NULL, created_at TEXT NOT NULL,
    FOREIGN KEY(post_id) REFERENCES posts(id), FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS post_reads (
    post_id TEXT NOT NULL, user_id TEXT NOT NULL, created_at TEXT NOT NULL,
    PRIMARY KEY (post_id, user_id),
    FOREIGN KEY(post_id) REFERENCES posts(id), FOREIGN KEY(user_id) REFERENCES users(id)
  );
  CREATE TABLE IF NOT EXISTS post_guest_views (
    post_id TEXT NOT NULL, visitor_id TEXT NOT NULL, created_at TEXT NOT NULL,
    PRIMARY KEY (post_id, visitor_id),
    FOREIGN KEY(post_id) REFERENCES posts(id)
  );
`);

const postColumns = db.prepare('PRAGMA table_info(posts)').all().map((column) => column.name);
if (!postColumns.includes('views')) db.exec('ALTER TABLE posts ADD COLUMN views INTEGER NOT NULL DEFAULT 0');
if (!postColumns.includes('is_featured')) db.exec('ALTER TABLE posts ADD COLUMN is_featured INTEGER NOT NULL DEFAULT 0');
const userColumns = db.prepare('PRAGMA table_info(users)').all().map((column) => column.name);
if (!userColumns.includes('google_id')) db.exec('ALTER TABLE users ADD COLUMN google_id TEXT');
const bannerColumns = db.prepare('PRAGMA table_info(banners)').all().map((column) => column.name);
if (!bannerColumns.includes('duration')) db.exec('ALTER TABLE banners ADD COLUMN duration INTEGER NOT NULL DEFAULT 6');

// Preserva as matérias antigas: a categoria principal também passa a integrar
// a lista de categorias que pode ser exibida e filtrada pela revista.
db.exec(`INSERT OR IGNORE INTO post_categories (post_id, category_id, position)
  SELECT id, category_id, 0 FROM posts WHERE category_id IS NOT NULL AND category_id <> ''`);

// A capa inicial também é um banner real, para aparecer e poder ser editada no Admin.
const bannerCount = db.prepare('SELECT COUNT(*) AS total FROM banners').get().total;
if (!bannerCount) {
  const date = new Date().toISOString();
  db.prepare('INSERT INTO banners (id,title,subtitle,image_url,cta_label,cta_url,position,duration,is_active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?)')
    .run('velvet-initial-cover', 'O som que vem antes do amanhã.', 'Entre o palco, a internet e a pista, uma nova geração está transformando a forma de sentir cultura.', 'assets/velvet-virtual-cover.png', 'LER MATÉRIA', '#materias', 0, 6, 1, date, date);
}

const standardCategories = [
  'Música', 'Cinema', 'Televisão', 'Séries', 'Streaming', 'Celebridades', 'Cultura Pop', 'Entretenimento', 'Terror', 'Suspense', 'Mistério', 'True Crime', 'Sobrenatural', 'Ficção Científica', 'Fantasia', 'Ação', 'Comédia', 'Romance', 'Drama', 'Documentários', 'Animação', 'Games', 'Tecnologia', 'Moda', 'Beleza', 'Comportamento', 'Lifestyle', 'Arte', 'Literatura', 'Teatro', 'Dança', 'Fotografia', 'Internet', 'Redes Sociais', 'Influenciadores', 'Virais', 'Fandoms', 'Nostalgia', 'Curiosidades', 'Notícias', 'Entrevistas', 'Críticas', 'Resenhas', 'Lançamentos', 'Estreias', 'Bastidores', 'Premiações', 'Festivais', 'Eventos', 'Shows', 'Agenda Cultural', 'Bilheteria', 'Rankings', 'Paradas Musicais', 'Álbuns', 'Singles', 'Videoclipes', 'Artistas', 'Podcasts', 'Cultura Geek', 'Quadrinhos', 'Anime', 'K-Pop', 'Música Pop', 'Rock', 'Rap e Hip-Hop', 'Funk', 'Eletrônica', 'Sertanejo', 'MPB', 'Música Latina', 'Música Internacional', 'Música Nacional', 'Filmes de Terror', 'Histórias Reais', 'Lendas Urbanas', 'Casos Misteriosos', 'Fenômenos Paranormais', 'Crimes Famosos', 'Teorias', 'Universo dos Famosos', 'Indústria Musical', 'Indústria do Cinema', 'Opinião', 'Listas', 'Especial', 'Retrospectiva'
].sort((first, second) => first.localeCompare(second, 'pt-BR'));
const categorySlug = (value) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
const categoryDate = new Date().toISOString();
const insertCategory = db.prepare('INSERT OR IGNORE INTO categories (id,name,slug,description,created_at,updated_at) VALUES (?,?,?,?,?,?)');
standardCategories.forEach((name) => {
  const slug = categorySlug(name);
  insertCategory.run(`velvet-${slug}`, name, slug, '', categoryDate, categoryDate);
});

module.exports = { db };
