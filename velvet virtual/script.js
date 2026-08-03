const searchButtons = document.querySelectorAll('[data-search-toggle]');
const searchPanel = document.querySelector('[data-search-panel]');
const searchInput = document.querySelector('[data-search-input]');
const searchResults = document.querySelector('[data-search-results]');
const searchHint = document.querySelector('[data-search-hint]');
const brandMenuButton = document.querySelector('[data-brand-menu-toggle]');
const brandMenu = document.querySelector('[data-brand-menu]');
const profileButtons = document.querySelectorAll('[data-profile-toggle]');
const profilePanel = document.querySelector('[data-profile-panel]');
const adminButtons = document.querySelectorAll('[data-admin-toggle]');
const adminPanel = document.querySelector('[data-admin-panel]');
const newsPage = document.querySelector('[data-news-page]');
const newsGrid = document.querySelector('[data-news-grid]');
const newsFeatured = document.querySelector('[data-news-featured]');
const newsEmpty = document.querySelector('[data-news-empty]');
const newsCount = document.querySelector('[data-news-count]');
const newsCategoryTabs = document.querySelector('[data-news-category-tabs]');
const vimosPage = document.querySelector('[data-vimos-page]');
const vimosGrid = document.querySelector('[data-vimos-grid]');
const vimosEmpty = document.querySelector('[data-vimos-empty]');
let activeNewsCategory = null;
let newsWeekOnly = false;
const API_URL = window.VELVET_VIRTUAL_API_URL || 'https://velvetvirtual.up.railway.app';
const toast = document.querySelector('[data-toast]');
let toastTimer;
function goHome(event) {
  event?.preventDefault();
  searchPanel.hidden = true; newsPage.hidden = true; vimosPage.hidden = true;
  document.querySelector('[data-read-page]').hidden = true;
  if (profilePanel) profilePanel.hidden = true;
  document.body.classList.remove('is-locked');
  window.history.replaceState(null, '', '#top');
  document.querySelector('#top')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  document.querySelectorAll('[data-nav-link]').forEach((link) => link.classList.toggle('is-active', link.hasAttribute('data-home-link')));
}
document.querySelectorAll('[data-home-link]').forEach((link) => link.addEventListener('click', goHome));
document.querySelectorAll('[data-nav-link]').forEach((link) => link.addEventListener('click', () => {
  document.querySelectorAll('[data-nav-link]').forEach((item) => item.classList.toggle('is-active', item === link));
}));
function notify(message, type = 'success') {
  const icon = toast.querySelector('[data-toast-icon]');
  toast.querySelector('[data-toast-message]').textContent = message;
  icon.textContent = type === 'error' ? '!' : '✓';
  toast.dataset.type = type;
  toast.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.hidden = true; }, 4200);
}
const alert = (message) => notify(message, /Bem-vinda|salvas/i.test(String(message)) ? 'success' : 'error');
document.querySelector('[data-toast-close]').addEventListener('click', () => { toast.hidden = true; clearTimeout(toastTimer); });

let searchCatalog = null;
let searchTimer;
const normalizeSearch = (value) => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
function closeSearch() {
  searchPanel.hidden = true; document.body.classList.remove('is-locked');
  if (searchInput) searchInput.value = '';
  if (searchResults) searchResults.replaceChildren();
  if (searchHint) searchHint.hidden = false;
}
async function getSearchCatalog() {
  if (searchCatalog) return searchCatalog;
  const response = await fetch(`${API_URL}/api/public/home`);
  if (!response.ok) throw new Error('Não foi possível carregar a busca agora.');
  searchCatalog = await response.json(); return searchCatalog;
}
async function runSearch(query) {
  const term = normalizeSearch(query); searchResults.replaceChildren();
  if (searchHint) searchHint.hidden = Boolean(term);
  if (!term) return;
  const loading = document.createElement('p'); loading.className = 'vv-search-status'; loading.textContent = 'BUSCANDO…'; searchResults.append(loading);
  try {
    const data = await getSearchCatalog();
    const posts = (data.posts || []).filter((post) => normalizeSearch([post.title, post.excerpt, post.content, post.categoryName, post.authorName].join(' ')).includes(term));
    const categories = (data.categories || []).filter((category) => normalizeSearch(`${category.name} ${category.description || ''}`).includes(term)).slice(0, 6);
    searchResults.replaceChildren();
    if (!posts.length && !categories.length) { searchResults.innerHTML = `<p class="vv-search-status">Nada encontrado para “${escapeHtml(query)}”.</p>`; return; }
    if (posts.length) {
      const heading = document.createElement('p'); heading.className = 'vv-search-group-title'; heading.textContent = `MATÉRIAS · ${posts.length}`; searchResults.append(heading);
      posts.slice(0, 8).forEach((post) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'vv-search-result'; button.innerHTML = `<span>${escapeHtml(post.categoryName || 'VELVET')}</span><b>${escapeHtml(post.title)}</b><small>${escapeHtml(post.excerpt || 'Ler matéria')}</small>`; button.addEventListener('click', () => { closeSearch(); openPost(post); }); searchResults.append(button); });
    }
    if (categories.length) {
      const heading = document.createElement('p'); heading.className = 'vv-search-group-title'; heading.textContent = 'CATEGORIAS'; searchResults.append(heading);
      categories.forEach((category) => { const button = document.createElement('button'); button.type = 'button'; button.className = 'vv-search-category'; button.textContent = category.name; button.addEventListener('click', () => { closeSearch(); openNews(category.name); }); searchResults.append(button); });
    }
  } catch (error) { searchResults.innerHTML = `<p class="vv-search-status">${escapeHtml(error.message)}</p>`; }
}
searchButtons.forEach((button) => button.addEventListener('click', () => {
  const opening = searchPanel.hidden;
  if (!opening) return closeSearch();
  searchPanel.hidden = false; document.body.classList.add('is-locked'); searchInput.focus();
}));
searchInput?.addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(() => runSearch(searchInput.value), 180); });
searchInput?.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeSearch(); });

brandMenuButton.addEventListener('click', () => {
  const opening = brandMenu.hidden;
  brandMenu.hidden = !opening;
  brandMenuButton.setAttribute('aria-expanded', String(opening));
});

brandMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => {
  brandMenu.hidden = true;
  brandMenuButton.setAttribute('aria-expanded', 'false');
}));

profileButtons.forEach((button) => button.addEventListener('click', () => {
  const opening = profilePanel.hidden;
  profilePanel.hidden = !opening;
  document.body.classList.toggle('is-locked', opening);
  if (opening) {
    brandMenu.hidden = true;
    brandMenuButton.setAttribute('aria-expanded', 'false');
  }
}));

adminButtons.forEach((button) => button.addEventListener('click', () => {
  const opening = adminPanel.hidden;
  adminPanel.hidden = !opening;
  document.body.classList.toggle('is-locked', opening);
  if (opening) profilePanel.hidden = true;
}));

document.querySelectorAll('[data-admin-tab]').forEach((tab) => tab.addEventListener('click', () => {
  const target = tab.dataset.adminTab;
  document.querySelectorAll('[data-admin-tab]').forEach((item) => item.classList.toggle('is-active', item === tab));
  document.querySelectorAll('[data-admin-section]').forEach((section) => section.classList.toggle('is-visible', section.dataset.adminSection === target));
  document.querySelector('[data-admin-title]').textContent = tab.textContent.replace(/^[^A-Za-zÀ-ÿ]+\s*/, '');
}));

function viewsLabel(post) { return `${Number(post.views || 0).toLocaleString('pt-BR')} visualizações`; }

function articleCard(post, large = false) {
  const article = document.createElement('article');
  article.className = large ? 'vv-news-card vv-news-card-large' : 'vv-news-card';
  article.dataset.postId = post.id;
  article.tabIndex = 0;
  article.setAttribute('role', 'button');
  article.setAttribute('aria-label', `Ler matéria: ${post.title}`);
  const image = document.createElement('div');
  image.className = `vv-news-card-image${post.coverUrl ? '' : ' no-cover'}`;
  if (post.coverUrl) {
    const img = document.createElement('img');
    img.src = post.coverUrl; img.alt = ''; img.loading = 'lazy';
    image.append(img);
  }
  const category = document.createElement('p'); category.className = 'vv-label'; category.textContent = post.categoryName || 'VELVET';
  image.append(category);
  const title = document.createElement('h3'); title.textContent = post.title;
  const excerpt = document.createElement('p'); excerpt.className = 'vv-news-card-excerpt'; excerpt.textContent = post.excerpt || 'Leia a matéria completa na Velvet Virtual.';
  const meta = document.createElement('span'); meta.className = 'vv-news-card-views'; meta.textContent = viewsLabel(post);
  article.append(image, title, excerpt, meta);
  article.addEventListener('click', () => openPost(post));
  article.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPost(post); } });
  return article;
}

function homeStory(post, kind = 'recent') {
  const story = document.createElement('article');
  story.className = kind === 'top' ? 'vv-story vv-story-large' : 'vv-story vv-story-small';
  story.tabIndex = 0; story.setAttribute('role', 'button'); story.setAttribute('aria-label', `Ler matéria: ${post.title}`);
  if (kind === 'top') {
    story.style.backgroundImage = post.coverUrl ? `url('${post.coverUrl}')` : 'linear-gradient(135deg,#25232c,#0b0b0f)';
    story.innerHTML = `<div class="vv-story-overlay"></div><div class="vv-story-content"><p class="vv-label vv-label-cyan">MAIS VISTA</p><h3>${escapeHtml(post.title)}</h3><p class="vv-story-byline">${viewsLabel(post)} · ${escapeHtml(post.categoryName || 'VELVET')}</p></div>`;
  } else {
    story.innerHTML = `<div class="vv-story-image" style="${post.coverUrl ? `background-image:url('${escapeHtml(post.coverUrl)}')` : ''}"></div><div class="vv-story-text"><p class="vv-label">RECENTE</p><h3>${escapeHtml(post.title)}</h3><p>${escapeHtml(post.excerpt || `${post.categoryName || 'Velvet'} · nova matéria`)}</p></div>`;
  }
  story.addEventListener('click', () => openPost(post));
  story.addEventListener('keydown', (event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); openPost(post); } });
  return story;
}

async function loadHomeFeatured() {
  const target = document.querySelector('[data-home-featured]'); if (!target) return;
  try {
    const response = await fetch(`${API_URL}/api/public/home`); if (!response.ok) throw new Error();
    const posts = (await response.json()).posts || [];
    if (!posts.length) return;
    const recent = [...posts].sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt));
    const top = [...posts].sort((a, b) => Number(b.views || 0) - Number(a.views || 0) || new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt))[0];
    const grid = document.createElement('div'); grid.className = 'vv-feature-grid'; grid.append(homeStory(top, 'top'));
    recent.filter((post) => post.id !== top.id).slice(0, 2).forEach((post) => grid.append(homeStory(post)));
    target.replaceChildren(grid);
  } catch { /* Mantém o estado vazio enquanto a API não estiver disponível. */ }
}

function vimosCard(item) {
  const article = document.createElement('article'); article.className = 'vv-vimos-card';
  article.innerHTML = `${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="">` : ''}<div><p class="vv-label">VIMOS VOCÊ</p><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description || 'Um momento escolhido pela Velvet.')}</p>${item.instagramUrl ? `<a href="${escapeHtml(item.instagramUrl)}" target="_blank" rel="noreferrer">VER NO INSTAGRAM ↗</a>` : ''}</div>`;
  return article;
}

async function loadHomeVimos() {
  const target = document.querySelector('[data-home-vimos]'); if (!target) return;
  try {
    const response = await fetch(`${API_URL}/api/public/home`); if (!response.ok) throw new Error();
    const items = (await response.json()).vimosVoce || [];
    if (!items.length) return;
    const grid = document.createElement('div'); grid.className = 'vv-vimos-grid vv-vimos-home-grid';
    items.slice(0, 3).forEach((item) => grid.append(vimosCard(item)));
    target.replaceChildren(grid);
  } catch { /* Mantém a mensagem editorial enquanto a API não estiver disponível. */ }
}

// Increments the view counter once per post per browser session (so
// reopening the same matéria repeatedly doesn't inflate the count), then
// patches every place that number is currently on screen — the reading
// view, and any matching card still rendered behind it — without a reload.
async function registerView(post) {
  const seenKey = 'vv_seen_posts';
  let seen = [];
  try { seen = JSON.parse(sessionStorage.getItem(seenKey) || '[]'); } catch { seen = []; }
  if (seen.includes(post.id)) return;
  try {
    const data = await requestApi(`/api/public/posts/${post.id}/view`, { method: 'POST' });
    seen.push(post.id);
    sessionStorage.setItem(seenKey, JSON.stringify(seen));
    post.views = data.views;
    updateViewsEverywhere(post);
  } catch { /* offline or API unreachable: the count just won't tick up locally */ }
}
function updateViewsEverywhere(post) {
  document.querySelectorAll(`[data-post-id="${post.id}"] .vv-news-card-views`).forEach((el) => { el.textContent = viewsLabel(post); });
  if (readPage.dataset.postId === post.id) document.querySelector('[data-read-meta]').textContent = metaLine(post);
}

const readPage = document.querySelector('[data-read-page]');
function contentToHtml(content) {
  const renderInline = (text) => escapeHtml(text)
    .replace(/!\[([^\]]*)\]\((https?:\/\/[^\s)]+)\)/g, '<img class="vv-inline-image" src="$2" alt="$1" loading="lazy">')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1 ↗</a>');
  return String(content || '').split(/\n{2,}/).filter(Boolean).map((block) => `<p>${renderInline(block.trim()).replace(/\n/g, '<br>')}</p>`).join('');
}
function metaLine(post) {
  const dateLabel = (post.publishedAt || post.createdAt) ? new Date(post.publishedAt || post.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }) : '';
  return [post.authorName, dateLabel, viewsLabel(post)].filter(Boolean).join(' · ');
}
let currentReadPost = null;

function resetEngagementUI() {
  document.querySelector('[data-read-like]').classList.remove('is-active');
  document.querySelector('[data-read-like-icon]').textContent = '♡';
  document.querySelector('[data-read-like-count]').textContent = '0';
  document.querySelector('[data-read-save]').classList.remove('is-active');
  document.querySelector('[data-read-save-icon]').textContent = '🔖';
  document.querySelector('[data-comments-list]').innerHTML = '';
  document.querySelector('[data-comments-count]').textContent = '0';
  document.querySelector('[data-comment-form] textarea').value = '';
  document.querySelector('[data-comment-login]').hidden = !!session.user;
  document.querySelector('[data-comment-form]').hidden = !session.user;
}
function updateLikeButton(post) {
  document.querySelector('[data-read-like]').classList.toggle('is-active', Boolean(post.liked));
  document.querySelector('[data-read-like-icon]').textContent = post.liked ? '❤' : '♡';
  document.querySelector('[data-read-like-count]').textContent = Number(post.likes || 0);
}
function updateSaveButton(post) {
  document.querySelector('[data-read-save]').classList.toggle('is-active', Boolean(post.saved));
  document.querySelector('[data-read-save-icon]').textContent = post.saved ? '✅' : '🔖';
}
function commentAvatarHtml(comment) {
  const initials = (comment.authorName || 'V').trim().split(/\s+/).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'V';
  return comment.authorAvatar
    ? `<div class="vv-comment-avatar" style="background-image:url('${escapeHtml(comment.authorAvatar)}')"></div>`
    : `<div class="vv-comment-avatar">${escapeHtml(initials)}</div>`;
}
function renderComments(comments) {
  document.querySelector('[data-comments-count]').textContent = comments.length;
  const list = document.querySelector('[data-comments-list]');
  list.innerHTML = comments.length
    ? comments.map((comment) => `<div class="vv-comment">${commentAvatarHtml(comment)}<div class="vv-comment-body"><b>${escapeHtml(comment.authorName || 'Leitor Velvet')}</b><time>${new Date(comment.createdAt).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</time><p>${escapeHtml(comment.content)}</p></div></div>`).join('')
    : '<p class="vv-comments-empty">Nenhum comentário ainda. Seja a primeira pessoa a comentar.</p>';
}
async function loadEngagement(post) {
  try {
    const data = await requestApi(`/api/public/posts/${post.id}/engagement`);
    if (currentReadPost !== post) return; // user moved to a different matéria while this was in flight
    Object.assign(post, { likes: data.likes, liked: data.liked, saved: data.saved, comments: data.comments });
    updateLikeButton(post); updateSaveButton(post); renderComments(data.comments);
  } catch { /* keep the neutral state set by resetEngagementUI */ }
}
document.querySelector('[data-read-like]').addEventListener('click', async () => {
  if (!currentReadPost || !window.requireVelvetLogin('curtir matérias')) return;
  try {
    const data = await requestApi(`/api/public/posts/${currentReadPost.id}/like`, { method: 'POST' });
    Object.assign(currentReadPost, data);
    updateLikeButton(currentReadPost);
  } catch (error) { notify(error.message, 'error'); }
});
document.querySelector('[data-read-save]').addEventListener('click', async () => {
  if (!currentReadPost || !window.requireVelvetLogin('salvar matérias')) return;
  try {
    const data = await requestApi(`/api/public/posts/${currentReadPost.id}/save`, { method: 'POST' });
    currentReadPost.saved = data.saved;
    updateSaveButton(currentReadPost);
    notify(data.saved ? 'Matéria salva no seu perfil.' : 'Matéria removida de Salvos.');
  } catch (error) { notify(error.message, 'error'); }
});
document.querySelector('[data-read-comment-focus]').addEventListener('click', () => {
  if (!window.requireVelvetLogin('comentar')) return;
  const textarea = document.querySelector('[data-comment-form] textarea');
  textarea.scrollIntoView({ behavior: 'smooth', block: 'center' });
  textarea.focus();
});
document.querySelector('[data-comment-login-button]').addEventListener('click', () => window.requireVelvetLogin('comentar'));
document.querySelector('[data-comment-form]').addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentReadPost) return;
  const form = event.currentTarget;
  const content = form.elements.content.value.trim();
  if (!content) return;
  const button = form.querySelector('button');
  button.disabled = true;
  try {
    const comment = await requestApi(`/api/public/posts/${currentReadPost.id}/comments`, { method: 'POST', body: JSON.stringify({ content }) });
    currentReadPost.comments = [...(currentReadPost.comments || []), comment];
    renderComments(currentReadPost.comments);
    form.elements.content.value = '';
  } catch (error) { notify(error.message, 'error'); }
  finally { button.disabled = false; }
});

function openPost(post) {
  currentReadPost = post;
  readPage.dataset.postId = post.id;
  document.querySelector('[data-read-category]').textContent = post.categoryName || 'VELVET';
  document.querySelector('[data-read-title]').textContent = post.title;
  document.querySelector('[data-read-meta]').textContent = metaLine(post);
  const cover = document.querySelector('[data-read-cover]');
  cover.hidden = !post.coverUrl;
  cover.innerHTML = post.coverUrl ? `<img src="${escapeHtml(post.coverUrl)}" alt="">` : '';
  document.querySelector('[data-read-body]').innerHTML = contentToHtml(post.content) || '<p>Conteúdo em preparação.</p>';
  resetEngagementUI();
  readPage.hidden = false;
  readPage.scrollTop = 0;
  window.history.replaceState(null, '', '#materia');
  registerView(post);
  loadEngagement(post);
}
function closeRead() { readPage.hidden = true; currentReadPost = null; window.history.replaceState(null, '', '#noticias'); }
document.querySelectorAll('[data-read-close]').forEach((button) => button.addEventListener('click', closeRead));
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !readPage.hidden) closeRead(); });

async function loadNews() {
  newsGrid.replaceChildren(); newsFeatured.replaceChildren();
  try {
    const response = await fetch(`${API_URL}/api/public/home`);
    if (!response.ok) throw new Error('Falha ao carregar notícias');
    const data = await response.json();
    const weekStart = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const posts = [...data.posts].filter((post) => (!activeNewsCategory || post.categoryName === activeNewsCategory) && (!newsWeekOnly || (post.categoryName === 'Lançamentos' && new Date(post.publishedAt || post.createdAt).getTime() >= weekStart))).sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt));
    if (newsCategoryTabs) {
      newsCategoryTabs.replaceChildren();
      const all = document.createElement('button'); all.type = 'button'; all.textContent = 'TODAS'; all.classList.toggle('is-active', !activeNewsCategory); all.addEventListener('click', () => openNews()); newsCategoryTabs.append(all);
      (data.categories || []).forEach((category) => { const button = document.createElement('button'); button.type = 'button'; button.textContent = category.name; button.classList.toggle('is-active', activeNewsCategory === category.name); button.addEventListener('click', () => openNews(category.name)); newsCategoryTabs.append(button); });
    }
    const highlighted = [...posts].filter((post) => Number(post.isFeatured) || Number(post.views) > 0).sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || Number(b.views) - Number(a.views)).slice(0, 2);
    const featuredIds = new Set(highlighted.map((post) => post.id));
    highlighted.forEach((post, index) => newsFeatured.append(articleCard(post, index === 0)));
    posts.filter((post) => !featuredIds.has(post.id)).forEach((post) => newsGrid.append(articleCard(post)));
    newsCount.textContent = `${posts.length} PUBLICAÇ${posts.length === 1 ? 'ÃO' : 'ÕES'}`;
    newsPage.querySelector('.vv-news-heading .vv-eyebrow').textContent = newsWeekOnly ? 'NOVIDADES DA SEMANA' : activeNewsCategory ? `CATEGORIA · ${activeNewsCategory.toUpperCase()}` : 'TODAS AS NOTÍCIAS';
    newsPage.querySelector('[data-news-title]').innerHTML = newsWeekOnly ? 'O que chegou<br /><i>agora.</i>' : 'O que está<br /><i>acontecendo.</i>';
    newsPage.querySelector('[data-news-description]').textContent = newsWeekOnly ? 'Lançamentos publicados nos últimos sete dias para você ouvir, assistir e descobrir primeiro.' : 'As novidades da Velvet Virtual, atualizadas diretamente pela redação.';
    newsPage.querySelector('.vv-news-list-header h2').textContent = newsWeekOnly ? 'Novas nesta semana' : activeNewsCategory ? `Em ${activeNewsCategory}` : 'Mais recentes';
    newsEmpty.hidden = posts.length > 0;
  } catch {
    newsEmpty.hidden = false;
    newsEmpty.querySelector('p').textContent = 'As notícias estarão disponíveis assim que a API da revista estiver conectada.';
  }
}

function openNews(category = null, weekOnly = false) { activeNewsCategory = category; newsWeekOnly = weekOnly; newsPage.classList.toggle('is-week-page', weekOnly); vimosPage.hidden = true; document.querySelector('[data-read-page]').hidden = true; newsPage.hidden = false; document.body.classList.add('is-locked'); window.history.replaceState(null, '', weekOnly ? '#novas' : '#noticias'); loadNews(); }
function closeNews() { activeNewsCategory = null; newsWeekOnly = false; newsPage.classList.remove('is-week-page'); newsPage.hidden = true; document.body.classList.remove('is-locked'); window.history.replaceState(null, '', '#top'); }
document.querySelectorAll('[data-news-open]').forEach((button) => button.addEventListener('click', () => openNews()));
document.querySelectorAll('[data-revista-open]').forEach((button) => button.addEventListener('click', (event) => { event.preventDefault(); openNews(); }));
document.querySelectorAll('[data-week-open]').forEach((button) => button.addEventListener('click', (event) => { event.preventDefault(); openNews(null, true); }));
document.querySelectorAll('[data-category-news]').forEach((link) => link.addEventListener('click', (event) => { event.preventDefault(); openNews(link.dataset.categoryNews); }));
document.querySelectorAll('[data-news-close]').forEach((button) => button.addEventListener('click', closeNews));
if (window.location.hash === '#noticias') openNews();
if (window.location.hash === '#novas') openNews(null, true);

async function loadVimosVoce() {
  vimosGrid.replaceChildren();
  try {
    const response = await fetch(`${API_URL}/api/public/home`); if (!response.ok) throw new Error();
    const items = (await response.json()).vimosVoce || [];
    items.forEach((item) => { const article = document.createElement('article'); article.className = 'vv-vimos-card'; article.innerHTML = `${item.imageUrl ? `<img src="${escapeHtml(item.imageUrl)}" alt="">` : ''}<div><p class="vv-label">VIMOS VOCÊ</p><h2>${escapeHtml(item.title)}</h2><p>${escapeHtml(item.description || '')}</p>${item.instagramUrl ? `<a href="${escapeHtml(item.instagramUrl)}" target="_blank" rel="noreferrer">VER NO INSTAGRAM ↗</a>` : ''}</div>`; vimosGrid.append(article); });
    vimosEmpty.hidden = items.length > 0;
  } catch { vimosEmpty.hidden = false; }
}
function openVimos() { newsPage.hidden = true; document.querySelector('[data-read-page]').hidden = true; vimosPage.hidden = false; document.body.classList.add('is-locked'); window.history.replaceState(null, '', '#vimos-voce'); loadVimosVoce(); }
function closeVimos() { vimosPage.hidden = true; document.body.classList.remove('is-locked'); window.history.replaceState(null, '', '#top'); }
document.querySelectorAll('[data-vimos-open]').forEach((button) => button.addEventListener('click', (event) => { event.preventDefault(); openVimos(); }));
document.querySelectorAll('[data-vimos-close]').forEach((button) => button.addEventListener('click', closeVimos));
document.querySelectorAll('[data-section-nav]').forEach((link) => link.addEventListener('click', (event) => {
  event.preventDefault();
  newsPage.hidden = true; vimosPage.hidden = true; document.querySelector('[data-read-page]').hidden = true;
  document.body.classList.remove('is-locked');
  const target = document.querySelector(`#${link.dataset.sectionNav}`); if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  window.history.replaceState(null, '', `#${link.dataset.sectionNav}`);
}));
if (window.location.hash === '#vimos-voce') openVimos();

async function loadFooterSettings() {
  try {
    const response = await fetch(`${API_URL}/api/public/home`);
    if (!response.ok) return;
    const settings = (await response.json()).settings || {};
    const instagram = document.querySelector('[data-footer-instagram]');
    const youtube = document.querySelector('[data-footer-youtube]');
    const contact = document.querySelector('[data-footer-contact]');
    if (settings.instagramUrl) instagram.href = settings.instagramUrl;
    if (settings.youtubeUrl) youtube.href = settings.youtubeUrl;
    if (settings.contactEmail) contact.href = `mailto:${settings.contactEmail}`;
  } catch { /* Os links padrão permanecem visíveis. */ }
}
loadFooterSettings();
loadHomeFeatured();
loadHomeVimos();

async function loadHeroCarousel() {
  try {
    const response = await fetch(`${API_URL}/api/public/home`);
    if (!response.ok) return;
    const banners = (await response.json()).banners || [];
    if (!banners.length) return;
    const hero = document.querySelector('.vv-hero');
    const title = hero.querySelector('h1');
    const deck = hero.querySelector('.vv-deck');
    const cta = hero.querySelector('.vv-button');
    const controls = document.createElement('div');
    controls.className = 'vv-hero-carousel-controls';
    const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = '‹'; previous.setAttribute('aria-label', 'Banner anterior');
    const dots = document.createElement('div'); dots.className = 'vv-hero-dots';
    const next = document.createElement('button'); next.type = 'button'; next.textContent = '›'; next.setAttribute('aria-label', 'Próximo banner');
    controls.append(previous, dots, next); hero.append(controls);
    let active = 0;
    let timer;
    const show = (index) => {
      active = (index + banners.length) % banners.length;
      const banner = banners[active];
      hero.classList.add('is-changing');
      window.setTimeout(() => {
        if (banner.imageUrl) hero.style.backgroundImage = `linear-gradient(90deg,rgba(1,1,3,.97) 0%,rgba(1,1,4,.88) 35%,rgba(1,1,4,.18) 70%,rgba(1,1,4,.25)),linear-gradient(0deg,rgba(1,1,4,.7),transparent 47%),url("${banner.imageUrl}")`;
        title.textContent = banner.title || 'Velvet Virtual';
        deck.textContent = banner.subtitle || '';
        cta.firstChild.textContent = `${banner.ctaLabel || 'LER MATÉRIA'} `;
        cta.href = banner.ctaUrl || '#materias';
        dots.querySelectorAll('button').forEach((dot, dotIndex) => dot.classList.toggle('is-active', dotIndex === active));
        hero.classList.remove('is-changing');
      }, 130);
      window.clearTimeout(timer);
      if (banners.length > 1) timer = window.setTimeout(() => show(active + 1), Math.max(3, Number(banner.duration) || 6) * 1000);
    };
    banners.forEach((banner, index) => { const dot = document.createElement('button'); dot.type = 'button'; dot.setAttribute('aria-label', `Abrir banner ${index + 1}`); dot.addEventListener('click', () => show(index)); dots.append(dot); });
    previous.addEventListener('click', () => show(active - 1));
    next.addEventListener('click', () => show(active + 1));
    if (banners.length === 1) controls.hidden = true;
    show(0);
  } catch { /* A capa estática continua disponível. */ }
}
loadHeroCarousel();

async function loadVelvetPodcasts() {
  const container = document.querySelector('[data-podcast-list]');
  if (!container) return;
  try {
    const response = await fetch(`${API_URL}/api/velvet-music/podcasts`);
    if (!response.ok) throw new Error('Falha ao buscar podcasts');
    const podcasts = await response.json();
    container.replaceChildren();
    if (!podcasts.length) throw new Error('Nenhum podcast publicado');
    podcasts.forEach((podcast, index) => {
      const link = document.createElement('a');
      link.className = 'vv-podcast-row';
      link.href = `https://velvetentertainment.vercel.app/Release?id=${encodeURIComponent(podcast.id)}`;
      link.target = '_blank'; link.rel = 'noreferrer';
      const order = document.createElement('strong'); order.textContent = String(index + 1).padStart(2, '0');
      const cover = document.createElement('div'); cover.className = 'vv-podcast-cover'; if (podcast.cover_url) cover.style.backgroundImage = `url("${podcast.cover_url}")`;
      const details = document.createElement('div'); const title = document.createElement('b'); title.textContent = podcast.title; const author = document.createElement('span'); author.textContent = podcast.artist || 'Velvet Podcast'; details.append(title, author);
      const plays = document.createElement('em'); plays.textContent = `${Number(podcast.plays || 0).toLocaleString('pt-BR')} plays`;
      const icon = document.createElement('i'); icon.textContent = '▶';
      link.append(order, cover, details, plays, icon); container.append(link);
    });
  } catch {
    container.innerHTML = '<div class="vv-content-empty vv-content-empty-dark"><span>♩</span><h3>Ainda não há podcasts publicados.</h3><p>Os episódios da Velvet Music aparecerão aqui automaticamente.</p></div>';
  }
}
loadVelvetPodcasts();

const session = { token: localStorage.getItem('vv_auth_token'), user: null, editor: null };
const authPanel = document.querySelector('[data-auth-panel]');
const editorPanel = document.querySelector('[data-editor]');
const editorForm = document.querySelector('[data-editor-form]');

async function requestApi(path, options = {}) {
  const response = await fetch(`${API_URL}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(session.token ? { Authorization: `Bearer ${session.token}` } : {}), ...(options.headers || {}) } });
  const payload = response.status === 204 ? null : await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(payload.error || 'Não foi possível concluir a ação.');
  return payload;
}

function openAuth(message = '') { authPanel.hidden = false; document.body.classList.add('is-locked'); document.querySelector('[data-auth-message]').textContent = message; }
function closeAuth() { authPanel.hidden = true; document.body.classList.remove('is-locked'); }

function uploadFile(fileObj, onProgress) {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${API_URL}/api/admin/uploads`);
    if (session.token) xhr.setRequestHeader('Authorization', `Bearer ${session.token}`);
    xhr.upload.addEventListener('progress', (event) => { if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100)); });
    xhr.onload = () => {
      try {
        const result = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(result.url); else reject(new Error(result.error || 'Falha ao enviar imagem.'));
      } catch { reject(new Error('Falha ao enviar imagem.')); }
    };
    xhr.onerror = () => reject(new Error('Falha de conexão ao enviar imagem.'));
    const data = new FormData(); data.append('file', fileObj);
    xhr.send(data);
  });
}

const DROPZONE_ASPECT_OPTIONS = [
  { label: 'QUADRADO', value: 1 },
  { label: 'PAISAGEM', value: 16 / 9 },
  { label: 'RETRATO', value: 4 / 5 },
];
function createDropzone(initialValue, onChange, cropOptions = { aspect: 16 / 9, aspectOptions: DROPZONE_ASPECT_OPTIONS }) {
  const dropzone = document.createElement('div');
  dropzone.className = `vv-dropzone${initialValue ? ' has-image' : ''}`;
  if (initialValue) dropzone.style.backgroundImage = `url("${initialValue}")`;
  const label = document.createElement('span'); label.textContent = initialValue ? 'TROCAR IMAGEM' : 'CLIQUE OU ARRASTE UMA IMAGEM';
  const remove = document.createElement('button'); remove.type = 'button'; remove.className = 'vv-dropzone-remove'; remove.hidden = !initialValue; remove.setAttribute('aria-label', 'Remover imagem'); remove.textContent = '✕';
  const file = document.createElement('input'); file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
  dropzone.append(label, remove, file);
  let currentValue = initialValue || '';

  async function handleFile(fileObj) {
    if (!fileObj.type.startsWith('image/')) { notify('Envie um arquivo de imagem.', 'error'); return; }
    if (fileObj.size > 12 * 1024 * 1024) { notify('Imagem muito grande (máximo 12MB).', 'error'); return; }
    const blob = await requestCrop(fileObj, cropOptions);
    if (!blob) return;
    const croppedFile = new File([blob], 'imagem.jpg', { type: 'image/jpeg' });
    const localUrl = URL.createObjectURL(croppedFile);
    dropzone.style.backgroundImage = `url("${localUrl}")`; dropzone.classList.add('has-image'); remove.hidden = false;
    try {
      const url = await uploadFile(croppedFile, (pct) => { label.textContent = `ENVIANDO ${pct}%`; });
      currentValue = url; onChange(url);
      dropzone.style.backgroundImage = `url("${url}")`; label.textContent = 'TROCAR IMAGEM';
    } catch (error) {
      notify(error.message || 'Erro ao enviar imagem.', 'error');
      if (currentValue) { dropzone.style.backgroundImage = `url("${currentValue}")`; label.textContent = 'TROCAR IMAGEM'; }
      else { dropzone.classList.remove('has-image'); dropzone.style.backgroundImage = ''; label.textContent = 'CLIQUE OU ARRASTE UMA IMAGEM'; remove.hidden = true; }
    } finally { URL.revokeObjectURL(localUrl); }
  }

  dropzone.addEventListener('click', () => file.click());
  file.addEventListener('change', () => { if (file.files?.[0]) handleFile(file.files[0]); file.value = ''; });
  dropzone.addEventListener('dragover', (event) => { event.preventDefault(); dropzone.classList.add('is-dragover'); });
  dropzone.addEventListener('dragleave', () => dropzone.classList.remove('is-dragover'));
  dropzone.addEventListener('drop', (event) => {
    event.preventDefault(); dropzone.classList.remove('is-dragover');
    const dropped = event.dataTransfer.files?.[0]; if (dropped) handleFile(dropped);
  });
  remove.addEventListener('click', (event) => {
    event.stopPropagation(); currentValue = ''; onChange('');
    dropzone.classList.remove('has-image'); dropzone.style.backgroundImage = ''; label.textContent = 'CLIQUE OU ARRASTE UMA IMAGEM'; remove.hidden = true;
  });
  return dropzone;
}

function openEditor(resource, item = null) {
  const schemas = {
    banners: [['title', 'Título', 'text'], ['subtitle', 'Subtítulo', 'text'], ['image_url', 'Imagem do banner', 'url'], ['cta_label', 'Texto do botão', 'text'], ['cta_url', 'Link do botão', 'url'], ['position', 'Ordem', 'number'], ['duration', 'Tempo na tela (segundos)', 'number'], ['is_active', 'Banner ativo', 'checkbox']],
    'vimos-voce': [['title', 'Título', 'text'], ['description', 'Descrição', 'textarea'], ['image_url', 'Foto', 'url'], ['instagram_url', 'Link do Instagram', 'url'], ['position', 'Ordem', 'number'], ['is_active', 'Publicação ativa', 'checkbox']],
    categories: [['name', 'Nome', 'text'], ['slug', 'Slug (opcional)', 'text'], ['description', 'Descrição', 'textarea']],
    users: [['displayName', 'Nome', 'text'], ['email', 'E-mail', 'email'], ['password', 'Senha', 'password'], ['role', 'Cargo', 'select', ['admin', 'staff', 'leitor', 'podcast', 'modelo', 'influencer', 'creators']]],
  };
  const fields = item && resource === 'users' ? [schemas.users[3]] : schemas[resource]; if (!fields) return;
  session.editor = { resource, item };
  document.querySelector('[data-editor-kicker]').textContent = resource.toUpperCase();
  document.querySelector('[data-editor-title]').textContent = item ? 'Editar' : 'Criar';
  const area = document.querySelector('[data-editor-fields]'); area.replaceChildren();
  fields.forEach(([name, label, type, choices]) => {
    const wrap = document.createElement('label'); wrap.className = `vv-editor-field vv-editor-field-${name}`; wrap.textContent = label;
    const camel = name.replace(/_([a-z])/g, (_, letter) => letter.toUpperCase());
    const value = item?.[name] ?? item?.[camel] ?? (name === 'position' ? 0 : '');
    const isMedia = name === 'cover_url' || name === 'image_url';
    let input;
    if (type === 'textarea') { input = document.createElement('textarea'); input.value = value || ''; }
    else if (type === 'select') { input = document.createElement('select'); choices.forEach((choice) => { const option = new Option(choice.toUpperCase(), choice, false, value === choice); input.add(option); }); }
    else { input = document.createElement('input'); input.type = isMedia ? 'hidden' : type; if (type === 'checkbox') { input.checked = Boolean(Number(value) || value === true); wrap.className = 'vv-check'; wrap.textContent = ''; wrap.append(input, document.createTextNode(` ${label}`)); } else { input.value = value || ''; } }
    input.name = name; if (resource === 'users' && item && name === 'password') { input.placeholder = 'Deixe vazio para não alterar'; input.required = false; } if (resource === 'users' && !item && name === 'password') input.required = true;
    if (type !== 'checkbox') wrap.append(input);
    if (isMedia) {
      wrap.classList.add('vv-editor-media');
      wrap.append(createDropzone(value, (url) => { input.value = url; }));
    }
    area.append(wrap);
  });
  const deleteButton = document.querySelector('[data-editor-delete]'); deleteButton.hidden = !item; editorPanel.hidden = false; document.body.classList.add('is-locked');
}
function closeEditor() { editorPanel.hidden = true; session.editor = null; document.body.classList.remove('is-locked'); }
function adminEmpty(icon, title, text) { return `<div class="vv-admin-empty"><span>${icon}</span><h3>${title}</h3><p>${text}</p></div>`; }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }

async function renderPostsAdmin(section) {
  let items;
  try { items = await requestApi('/api/admin/posts'); } catch (error) { section.innerHTML = adminEmpty('!', 'Não foi possível carregar.', error.message); return; }
  section.dataset.items = JSON.stringify(items);
  section.innerHTML = `<div class="vv-admin-toolbar"><p>Gerencie todas as matérias da revista.</p><button class="vv-admin-add" data-post-new>+ NOVA MATÉRIA</button></div>
    <div class="vv-post-list-head"><h3>Postagens (<span data-post-count>${items.length}</span>)</h3><div class="vv-search-field"><input placeholder="Buscar postagens..." data-post-search></div></div>
    <div class="vv-post-cards" data-post-cards></div>`;

  const cardHtml = (post) => `<div class="vv-post-card">
    <div class="vv-post-card-cover" style="${post.coverUrl ? `background-image:url('${escapeHtml(post.coverUrl)}')` : ''}">${post.coverUrl ? '' : '▤'}</div>
    <div class="vv-post-card-body">
      <b>${escapeHtml(post.title)}</b>
      <div class="vv-post-card-meta">
        <span class="vv-badge ${post.status === 'published' ? 'vv-badge-published' : 'vv-badge-draft'}">${post.status === 'published' ? 'PUBLICADO' : 'RASCUNHO'}</span>
        ${Number(post.isFeatured) ? '<span class="vv-badge vv-badge-featured">DESTAQUE</span>' : ''}
        <span class="vv-post-card-views">${Number(post.views || 0).toLocaleString('pt-BR')} views</span>
      </div>
    </div>
    <div class="vv-post-card-actions">
      <button type="button" data-post-edit="${post.id}" aria-label="Editar">✎</button>
      <button type="button" class="vv-post-delete" data-post-remove="${post.id}" aria-label="Excluir">✕</button>
    </div>
  </div>`;

  function renderCards() {
    const term = section.querySelector('[data-post-search]').value.trim().toLowerCase();
    const filtered = items.filter((post) => !term || post.title.toLowerCase().includes(term));
    section.querySelector('[data-post-count]').textContent = filtered.length;
    const container = section.querySelector('[data-post-cards]');
    container.innerHTML = filtered.length ? filtered.map(cardHtml).join('') : adminEmpty('▤', 'Nenhuma postagem encontrada.', 'Use "Nova matéria" para publicar a primeira.');
    container.querySelectorAll('[data-post-edit]').forEach((button) => button.addEventListener('click', () => {
      const post = items.find((row) => row.id === button.dataset.postEdit);
      openPostEditor(post, section);
    }));
    container.querySelectorAll('[data-post-remove]').forEach((button) => button.addEventListener('click', async () => {
      if (!confirm('Excluir esta matéria permanentemente?')) return;
      try { await requestApi(`/api/admin/posts/${button.dataset.postRemove}`, { method: 'DELETE' }); searchCatalog = null; notify('Matéria excluída.'); renderPostsAdmin(section); } catch (error) { alert(error.message); }
    }));
  }
  renderCards();
  section.querySelector('[data-post-search]').addEventListener('input', renderCards);
  section.querySelector('[data-post-new]').addEventListener('click', () => openPostEditor(null, section));
}

const postEditorPanel = document.querySelector('[data-post-editor]');
const postEditorForm = document.querySelector('[data-post-form]');

function closePostEditor() { postEditorPanel.hidden = true; }

async function openPostEditor(post, section) {
  postEditorPanel.hidden = false;
  postEditorForm.innerHTML = '<div class="vv-admin-empty"><span>…</span><h3>Abrindo editor</h3><p>Preparando os campos da matéria.</p></div>';
  let categories;
  try { categories = await requestApi('/api/admin/categories'); } catch { categories = []; }
  const categoryOptions = categories.map((category) => `<option value="${category.id}" ${post?.categoryId === category.id ? 'selected' : ''}>${escapeHtml(category.name)}</option>`).join('');
  const defaultStatus = post?.status === 'draft' ? 'draft' : 'published';

  document.querySelector('[data-post-editor-kicker]').textContent = post ? 'EDITAR MATÉRIA' : 'NOVA MATÉRIA';
  document.querySelector('[data-post-editor-title]').textContent = post ? post.title : 'Criar matéria';
  postEditorForm.innerHTML = `
    <label>Título<input name="title" required value="${escapeHtml(post?.title || '')}"></label>
    <label>Categoria<select name="category_id"><option value="">Sem categoria</option>${categoryOptions}</select></label>
    <label>Resumo<textarea name="excerpt">${escapeHtml(post?.excerpt || '')}</textarea></label>
    <label>Conteúdo
      <div class="vv-content-toolbar"><button type="button" data-content-link>↗ INSERIR LINK</button><button type="button" data-content-image>▧ INSERIR IMAGEM</button><input type="file" accept="image/*" hidden data-content-image-file></div>
      <textarea name="content" required>${escapeHtml(post?.content || '')}</textarea>
      <span class="vv-content-help">Use os botões para inserir links e imagens entre os parágrafos.</span>
    </label>
    <label>Capa</label>
    <div data-cover-slot></div>
    <label>Publicação
      <div class="vv-status-toggle" data-status-toggle>
        <button type="button" data-status-value="draft" class="${defaultStatus === 'draft' ? 'is-active' : ''}">RASCUNHO</button>
        <button type="button" data-status-value="published" class="${defaultStatus === 'published' ? 'is-active' : ''}">PUBLICAR</button>
      </div>
    </label>
    <label class="vv-post-check"><input type="checkbox" name="is_featured" ${Number(post?.isFeatured) ? 'checked' : ''}> Destacar na capa</label>
    <div class="vv-post-form-actions">
      ${post ? '<button type="button" class="vv-post-form-ghost" data-post-cancel>CANCELAR</button>' : ''}
      <button type="submit" class="vv-admin-add" data-post-submit>${defaultStatus === 'published' ? 'PUBLICAR' : 'SALVAR RASCUNHO'}</button>
    </div>
    ${post ? '<button type="button" class="vv-post-form-delete" data-post-delete>EXCLUIR MATÉRIA</button>' : ''}`;

  let status = defaultStatus;
  const submitButton = postEditorForm.querySelector('[data-post-submit]');
  postEditorForm.querySelectorAll('[data-status-value]').forEach((button) => button.addEventListener('click', () => {
    status = button.dataset.statusValue;
    postEditorForm.querySelectorAll('[data-status-value]').forEach((item) => item.classList.toggle('is-active', item === button));
    submitButton.textContent = status === 'published' ? 'PUBLICAR' : 'SALVAR RASCUNHO';
  }));

  let coverUrl = post?.coverUrl || '';
  try {
    postEditorForm.querySelector('[data-cover-slot]').replaceWith(createDropzone(coverUrl, (url) => { coverUrl = url; }));
  } catch (error) {
    postEditorForm.querySelector('[data-cover-slot]')?.replaceWith(Object.assign(document.createElement('p'), { textContent: 'Não foi possível preparar o envio da imagem.' }));
    notify(error.message || 'Não foi possível abrir o envio de capa.', 'error');
  }

  const contentField = postEditorForm.elements.content;
  const insertContent = (value) => {
    const start = contentField.selectionStart ?? contentField.value.length;
    const end = contentField.selectionEnd ?? start;
    contentField.value = `${contentField.value.slice(0, start)}${value}${contentField.value.slice(end)}`;
    contentField.focus();
    const cursor = start + value.length;
    contentField.setSelectionRange(cursor, cursor);
  };
  postEditorForm.querySelector('[data-content-link]').addEventListener('click', () => {
    const label = window.prompt('Texto do link:');
    if (!label) return;
    const url = window.prompt('Cole a URL completa (https://):');
    if (!url || !/^https?:\/\//i.test(url)) { notify('Informe um link começando com https://', 'error'); return; }
    insertContent(`${contentField.value.trim() ? '\n\n' : ''}[${label}](${url})`);
  });
  const inlineImageInput = postEditorForm.querySelector('[data-content-image-file]');
  postEditorForm.querySelector('[data-content-image]').addEventListener('click', () => inlineImageInput.click());
  inlineImageInput.addEventListener('change', async () => {
    const file = inlineImageInput.files?.[0];
    if (!file) return;
    try {
      const blob = await requestCrop(file, { aspect: 16 / 9, aspectOptions: DROPZONE_ASPECT_OPTIONS });
      if (!blob) return;
      const url = await uploadFile(new File([blob], 'imagem-na-materia.jpg', { type: 'image/jpeg' }), () => {});
      insertContent(`${contentField.value.trim() ? '\n\n' : ''}![Imagem da matéria](${url})`);
      notify('Imagem inserida no conteúdo.');
    } catch (error) { notify(error.message || 'Não foi possível enviar a imagem.', 'error'); }
    finally { inlineImageInput.value = ''; }
  });

  postEditorForm.querySelector('[data-post-cancel]')?.addEventListener('click', closePostEditor);
  postEditorForm.querySelector('[data-post-delete]')?.addEventListener('click', async () => {
    if (!post || !confirm('Excluir esta matéria permanentemente?')) return;
    try { await requestApi(`/api/admin/posts/${post.id}`, { method: 'DELETE' }); searchCatalog = null; closePostEditor(); notify('Matéria excluída.'); renderPostsAdmin(section); } catch (error) { alert(error.message); }
  });

  postEditorForm.onsubmit = async (event) => {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(postEditorForm));
    payload.cover_url = coverUrl;
    payload.status = status;
    payload.is_featured = postEditorForm.elements.is_featured.checked ? 1 : 0;
    if (!payload.category_id) delete payload.category_id;
    if (status === 'published' && !post?.publishedAt) payload.published_at = new Date().toISOString();
    try {
      await requestApi(`/api/admin/posts${post ? `/${post.id}` : ''}`, { method: post ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      searchCatalog = null;
      closePostEditor();
      notify(status === 'published' ? 'Publicado! Já está disponível em Notícias.' : 'Rascunho salvo.');
      renderPostsAdmin(section);
      if (!newsPage.hidden) loadNews();
    } catch (error) { alert(error.message); }
  };

}

async function renderAdmin(resource) {
  const section = document.querySelector(`[data-admin-section="${resource}"]`); if (!section) return;
  if (resource === 'posts') return renderPostsAdmin(section);
  try {
    if (resource === 'roles') {
      section.innerHTML = `<div class="vv-admin-toolbar"><p>Os cargos definem as permissões da comunidade.</p></div><div class="vv-role-admin-list"><div><b>ADMIN</b><span>Acesso completo: conteúdos, banners, categorias, usuários e configurações.</span></div><div><b>STAFF</b><span>Gestão editorial de conteúdos e banners.</span></div><div><b>LEITOR · PODCAST · MODELO · INFLUENCER · CREATORS</b><span>Cargos de identificação da comunidade. Altere o cargo de cada pessoa na aba Usuários.</span></div></div>`;
      return;
    }
    if (resource === 'overview') {
      const [posts, banners, users] = await Promise.all(['posts', 'banners', 'users'].map((name) => requestApi(`/api/admin/${name}`)));
      section.innerHTML = `<div class="vv-admin-stats"><div><b>${posts.filter((post) => post.status === 'published').length}</b><span>POSTAGENS PUBLICADAS</span></div><div><b>${banners.filter((banner) => Number(banner.isActive)).length}</b><span>BANNERS ATIVOS</span></div><div><b>${posts.reduce((total, post) => total + Number(post.views || 0), 0)}</b><span>VISUALIZAÇÕES</span></div><div><b>${users.length}</b><span>USUÁRIOS</span></div></div>${adminEmpty('✦', 'Seu painel está conectado.', 'Use as abas ao lado para criar e gerenciar os conteúdos reais da revista.')}`;
      return;
    }
    if (resource === 'settings') {
      const settings = await requestApi('/api/admin/settings');
      section.innerHTML = `<form class="vv-settings" data-live-settings><label>Nome da revista<input name="siteName" value="${escapeHtml(settings.siteName || 'Velvet Virtual')}" required></label><label>Link do Discord<input name="discordUrl" type="url" value="${escapeHtml(settings.discordUrl || '')}"></label><label>Link do Velvet Music<input name="velvetMusicUrl" type="url" value="${escapeHtml(settings.velvetMusicUrl || 'https://velvetentertainment.vercel.app')}"></label><label>Link do Instagram<input name="instagramUrl" type="url" placeholder="https://instagram.com/seuperfil" value="${escapeHtml(settings.instagramUrl || '')}"></label><label>Link do YouTube<input name="youtubeUrl" type="url" placeholder="https://youtube.com/@seucanal" value="${escapeHtml(settings.youtubeUrl || '')}"></label><label>E-mail de contato<input name="contactEmail" type="email" placeholder="contato@velvet.com" value="${escapeHtml(settings.contactEmail || '')}"></label><button class="vv-admin-add" type="submit">SALVAR CONFIGURAÇÕES</button></form>`;
      section.querySelector('form').addEventListener('submit', async (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); await requestApi('/api/admin/settings', { method: 'PUT', body: JSON.stringify(values) }); alert('Configurações salvas.'); }); return;
    }
    const items = await requestApi(`/api/admin/${resource}`);
    const toolbar = `<div class="vv-admin-toolbar"><p>${resource === 'banners' ? 'Escolha os destaques da página inicial.' : resource === 'vimos-voce' ? 'Fotos e momentos da comunidade Velvet.' : resource === 'categories' ? 'Organize os assuntos da revista.' : 'Gerencie os acessos da comunidade.'}</p>${resource === 'users' ? '' : `<button class="vv-admin-add" data-live-create="${resource}">+ ${resource === 'vimos-voce' ? 'ADICIONAR FOTO' : 'CRIAR'}</button>`}</div>`;
    if (!items.length) { section.innerHTML = toolbar + adminEmpty(resource === 'banners' ? '▧' : resource === 'vimos-voce' ? '◉' : resource === 'categories' ? '◇' : '♙', 'Nada por aqui ainda.', 'Crie o primeiro item usando o botão acima.'); return; }
    if (resource === 'banners') section.innerHTML = toolbar + `<div class="vv-banner-list">${items.map((item) => `<article><div class="vv-banner-thumb" style="${item.imageUrl ? `background-image:url('${escapeHtml(item.imageUrl)}');background-size:cover` : ''}"></div><div><b>${escapeHtml(item.title)}</b><p><span class="vv-badge ${Number(item.isActive) ? 'vv-badge-published' : 'vv-badge-inactive'}">${Number(item.isActive) ? 'ATIVO' : 'INATIVO'}</span> · ORDEM ${item.position || 0}</p></div><button data-live-edit="banners" data-id="${item.id}">EDITAR</button></article>`).join('')}</div>`;
    if (resource === 'vimos-voce') section.innerHTML = toolbar + `<div class="vv-banner-list">${items.map((item) => `<article><div class="vv-banner-thumb" style="${item.imageUrl ? `background-image:url('${escapeHtml(item.imageUrl)}');background-size:cover` : ''}"></div><div><b>${escapeHtml(item.title)}</b><p>${escapeHtml(item.description || 'Sem descrição')} · ORDEM ${item.position || 0}</p></div><button data-live-edit="vimos-voce" data-id="${item.id}">EDITAR</button></article>`).join('')}</div>`;
    if (resource === 'categories') section.innerHTML = toolbar + `<div class="vv-category-admin">${items.map((item) => `<div><b>${escapeHtml(item.name)}</b><span>${escapeHtml(item.description || item.slug)}</span><button data-live-edit="categories" data-id="${item.id}">EDITAR</button></div>`).join('')}</div>`;
    if (resource === 'users') section.innerHTML = toolbar + `<div class="vv-admin-table"><div class="vv-admin-row is-head"><span>USUÁRIO</span><span>E-MAIL</span><span>CARGO</span><span></span></div>${items.map((item) => `<div class="vv-admin-row"><b>${escapeHtml(item.displayName)}</b><span>${escapeHtml(item.email)}</span><i>${escapeHtml(item.role)}</i><button data-live-edit="users" data-id="${item.id}">EDITAR</button></div>`).join('')}</div>`;
    section.dataset.items = JSON.stringify(items);
  } catch (error) { section.innerHTML = adminEmpty('!', 'Não foi possível carregar.', error.message); }
}

document.querySelectorAll('[data-admin-tab]').forEach((tab) => tab.addEventListener('click', () => renderAdmin(tab.dataset.adminTab)));
// Delegação em captura: mantém os atalhos de postagem ativos mesmo após a lista ser redesenhada.
document.addEventListener('click', (event) => {
  const newPost = event.target.closest('[data-post-new], .vv-admin-header .vv-admin-add, [data-admin-section="posts"] .vv-admin-toolbar .vv-admin-add');
  if (newPost) {
    event.preventDefault();
    event.stopImmediatePropagation();
    openPostEditor(null, document.querySelector('[data-admin-section="posts"]')).catch((error) => notify(error.message || 'Não foi possível abrir o editor.', 'error'));
    return;
  }
  const editPost = event.target.closest('[data-post-edit]');
  if (!editPost) return;
  event.preventDefault();
  event.stopImmediatePropagation();
  const section = document.querySelector('[data-admin-section="posts"]');
  let post = JSON.parse(section?.dataset.items || '[]').find((item) => item.id === editPost.dataset.postEdit);
  if (!post) { notify('Recarregue a lista de postagens e tente novamente.', 'error'); return; }
  openPostEditor(post, section).catch((error) => notify(error.message || 'Não foi possível abrir o editor.', 'error'));
}, true);
document.addEventListener('click', (event) => {
  const create = event.target.closest('[data-live-create]'); if (create) openEditor(create.dataset.liveCreate);
  const edit = event.target.closest('[data-live-edit]'); if (edit) { const section = document.querySelector(`[data-admin-section="${edit.dataset.liveEdit}"]`); const item = JSON.parse(section.dataset.items || '[]').find((row) => row.id === edit.dataset.id); openEditor(edit.dataset.liveEdit, item); }
  if (event.target.matches('[data-editor-close]')) closeEditor();
  if (event.target.matches('[data-auth-close]')) closeAuth();
  if (event.target.matches('[data-post-editor-close]') || event.target === postEditorPanel) closePostEditor();
  const fallbackPostNew = event.target.closest('.vv-admin-toolbar .vv-admin-add:not([data-live-create]):not([data-post-new])');
  if (fallbackPostNew && document.querySelector('[data-admin-section="posts"]')?.classList.contains('is-visible')) {
    event.preventDefault();
    openPostEditor(null, document.querySelector('[data-admin-section="posts"]')).catch((error) => notify(error.message || 'Não foi possível abrir o editor.', 'error'));
  }
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape' && !postEditorPanel.hidden) closePostEditor(); });
editorForm.addEventListener('submit', async (event) => { event.preventDefault(); const { resource, item } = session.editor; const payload = Object.fromEntries(new FormData(editorForm)); ['is_featured', 'is_active'].forEach((name) => { if (editorForm.elements[name]) payload[name] = editorForm.elements[name].checked ? 1 : 0; }); if (resource === 'users' && item && !payload.password) delete payload.password; try { await requestApi(`/api/admin/${resource}${item ? `/${item.id}` : ''}`, { method: item ? 'PATCH' : 'POST', body: JSON.stringify(payload) }); closeEditor(); renderAdmin(resource); } catch (error) { alert(error.message); } });
document.querySelector('[data-editor-delete]').addEventListener('click', async () => { const { resource, item } = session.editor; if (!item || !confirm('Apagar este item permanentemente?')) return; try { await requestApi(`/api/admin/${resource}/${item.id}`, { method: 'DELETE' }); closeEditor(); renderAdmin(resource); } catch (error) { alert(error.message); } });

document.querySelector('[data-auth-switch]').addEventListener('click', () => { const creating = document.querySelector('[data-auth-name]').hidden; document.querySelector('[data-auth-name]').hidden = !creating; document.querySelector('[data-auth-title]').textContent = creating ? 'Criar conta' : 'Entrar'; document.querySelector('[data-auth-submit]').textContent = creating ? 'CRIAR CONTA' : 'ENTRAR'; document.querySelector('[data-auth-switch]').textContent = creating ? 'JÁ TENHO UMA CONTA' : 'CRIAR UMA CONTA'; });
document.querySelector('[data-auth-form]').addEventListener('submit', async (event) => { event.preventDefault(); const form = event.currentTarget; const creating = !document.querySelector('[data-auth-name]').hidden; const message = document.querySelector('[data-auth-message]'); try { const response = await requestApi(`/api/auth/${creating ? 'register' : 'login'}`, { method: 'POST', body: JSON.stringify(Object.fromEntries(new FormData(form))) }); session.token = response.token; session.user = response.user; localStorage.setItem('vv_auth_token', response.token); closeAuth(); alert(`Bem-vinda, ${response.user.displayName}.`); } catch (error) { message.textContent = error.message; } });
function finishGoogleLogin(response) {
  const message = document.querySelector('[data-auth-message]');
  requestApi('/api/auth/google', { method: 'POST', body: JSON.stringify({ idToken: response.credential }) })
    .then((data) => { session.token = data.token; session.user = data.user; localStorage.setItem('vv_auth_token', data.token); closeAuth(); alert(`Bem-vinda, ${data.user.displayName}.`); })
    .catch((error) => { message.textContent = error.message; });
}
function initializeGoogleLogin() {
  if (!window.google?.accounts?.id) { setTimeout(initializeGoogleLogin, 250); return; }
  const button = document.querySelector('[data-google-login]');
  if (!button || button.dataset.ready) return;
  window.google.accounts.id.initialize({ client_id: '530388505659-knfq71sbse2t4kh6norpvqbcm05eaut7.apps.googleusercontent.com', callback: finishGoogleLogin, auto_select: false });
  window.google.accounts.id.renderButton(button, { theme: 'outline', size: 'large', width: 360, text: 'continue_with', locale: 'pt-BR', shape: 'rectangular' });
  button.dataset.ready = 'true';
}
initializeGoogleLogin();
async function restoreSession() { if (!session.token) return; try { session.user = (await requestApi('/api/auth/me')).user; } catch { localStorage.removeItem('vv_auth_token'); session.token = null; } }
restoreSession();
document.querySelector('.vv-admin-header .vv-admin-add').addEventListener('click', () => {
  document.querySelector('[data-admin-tab="posts"]')?.click();
  openPostEditor(null, document.querySelector('[data-admin-section="posts"]'));
});
adminButtons.forEach((button) => button.addEventListener('click', () => {
  setTimeout(() => {
    if (!session.user) { adminPanel.hidden = true; openAuth('Entre com a conta administrativa para abrir o painel.'); return; }
    if (!session.user.isAdmin && session.user.role !== 'admin') { adminPanel.hidden = true; alert('Esta conta não tem acesso administrativo.'); return; }
    renderAdmin('overview');
  }, 0);
}));

document.querySelector('.vv-subscribe-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const message = document.querySelector('.vv-form-message');
  message.textContent = 'Você entrou para a lista. Bem-vinda à Velvet Virtual.';
  event.currentTarget.reset();
});

// Perfil: navegar é livre; ações pessoais só existem para contas autenticadas.
const profileName = document.querySelector('.vv-profile-head h2');
const profileEmail = document.querySelector('.vv-profile-head h2 + p');
const profileAvatar = document.querySelector('.vv-profile-avatar');
const profileRole = document.querySelector('.vv-current-role');
const profileAdminTab = document.querySelector('.vv-admin-tab');
const profileAdminNote = document.querySelector('.vv-admin-note');
const profileManageRoles = document.querySelector('.vv-roles-heading button');
const profileRoleList = document.querySelector('.vv-role-list');

function getRoleName(role) {
  return ({ admin: 'Admin', staff: 'Staff', leitor: 'Leitor', podcast: 'Podcast', modelo: 'Modelo', influencer: 'Influencer', creators: 'Creators' })[role] || 'Leitor';
}

function updateProfileView() {
  if (!session.user) return;
  const user = session.user;
  const role = user.isAdmin ? 'admin' : (user.role || 'leitor');
  const name = user.displayName || user.name || user.email?.split('@')[0] || 'Leitor Velvet';
  const initials = name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() || 'VV';
  const isAdmin = role === 'admin';

  profileName.textContent = name;
  profileEmail.textContent = user.email || 'Conta Velvet';
  profileAvatar.textContent = initials;
  profileAvatar.style.backgroundImage = user.avatarUrl ? `url("${user.avatarUrl}")` : '';
  profileAvatar.style.backgroundSize = 'cover';
  profileAvatar.style.backgroundPosition = 'center';
  profileRole.textContent = `${getRoleName(role).toUpperCase()} · ${isAdmin ? 'ACESSO TOTAL' : 'MEMBRO VELVET'}`;
  requestApi('/api/public/reads/count').then((data) => {
    const el = document.querySelector('[data-profile-read-count] b');
    if (el) el.textContent = data.count;
  }).catch(() => {});
  profileAdminTab.hidden = !isAdmin;
  profileAdminNote.hidden = !isAdmin;
  if (profileManageRoles) profileManageRoles.hidden = !isAdmin;

  profileRoleList.replaceChildren();
  const roleCard = document.createElement('div');
  roleCard.className = `vv-role${isAdmin ? ' is-admin' : ''}`;
  const roleTitle = document.createElement('b');
  roleTitle.textContent = getRoleName(role).toUpperCase();
  const roleDescription = document.createElement('span');
  roleDescription.textContent = isAdmin ? 'Acesso a toda a revista' : 'Sua conta na comunidade Velvet';
  roleCard.append(roleTitle, roleDescription);
  profileRoleList.append(roleCard);

  let logout = document.querySelector('[data-profile-logout]');
  if (!logout) {
    logout = document.createElement('button');
    logout.type = 'button';
    logout.className = 'vv-profile-logout';
    logout.dataset.profileLogout = '';
    logout.textContent = 'SAIR DA CONTA';
    document.querySelector('.vv-profile-card').append(logout);
    logout.addEventListener('click', () => {
      localStorage.removeItem('vv_auth_token');
      session.token = null;
      session.user = null;
      profilePanel.hidden = true;
      document.body.classList.remove('is-locked');
      notify('Você saiu da sua conta Velvet.');
    });
  }
}

function savedItemHtml(post) {
  return `<button type="button" class="vv-saved-item" data-saved-open="${post.id}">
    <div class="vv-saved-item-cover" style="${post.coverUrl ? `background-image:url('${escapeHtml(post.coverUrl)}')` : ''}"></div>
    <div><b>${escapeHtml(post.title)}</b><span>${escapeHtml(post.categoryName || 'VELVET')}</span></div>
  </button>`;
}
async function loadSavedPosts() {
  const list = document.querySelector('[data-saved-list]');
  list.innerHTML = '<p class="vv-saved-empty">Carregando...</p>';
  try {
    const data = await requestApi('/api/public/saved');
    const countEl = document.querySelector('[data-profile-saved-count] b');
    if (countEl) countEl.textContent = data.posts.length;
    list.innerHTML = data.posts.length ? data.posts.map(savedItemHtml).join('') : '<p class="vv-saved-empty">Você ainda não salvou nenhuma matéria.</p>';
    list.querySelectorAll('[data-saved-open]').forEach((button) => button.addEventListener('click', () => {
      const post = data.posts.find((item) => item.id === button.dataset.savedOpen);
      if (!post) return;
      profilePanel.hidden = true;
      document.body.classList.remove('is-locked');
      openPost(post);
    }));
  } catch (error) { list.innerHTML = `<p class="vv-saved-empty">${escapeHtml(error.message)}</p>`; }
}
document.querySelectorAll('[data-profile-tab-btn]').forEach((button) => button.addEventListener('click', () => {
  document.querySelectorAll('[data-profile-tab-btn]').forEach((item) => item.classList.toggle('is-active', item === button));
  const target = button.dataset.profileTabBtn;
  document.querySelectorAll('[data-profile-tab-panel]').forEach((panel) => { panel.hidden = panel.dataset.profileTabPanel !== target; });
  if (target === 'saved') loadSavedPosts();
}));
document.querySelector('.vv-admin-tab')?.addEventListener('click', () => { document.querySelector('[data-admin-toggle]')?.click(); });

window.requireVelvetLogin = (action = 'continuar') => {
  if (session.user) return true;
  openAuth(`Entre ou crie uma conta para ${action}.`);
  return false;
};

profileButtons.forEach((button) => button.addEventListener('click', () => {
  if (button.classList.contains('vv-profile-close')) return;
  window.setTimeout(() => {
    if (!session.user) {
      profilePanel.hidden = true;
      document.body.classList.remove('is-locked');
      openAuth('Entre ou crie uma conta para acessar seu perfil.');
      return;
    }
    updateProfileView();
  }, 0);
}));

document.addEventListener('click', (event) => {
  const personalAction = event.target.closest('[data-requires-auth]');
  if (!personalAction) return;
  if (!window.requireVelvetLogin(personalAction.dataset.requiresAuth || 'continuar')) event.preventDefault();
});

const profileEditToggle = document.querySelector('[data-profile-edit]');
const profileEditForm = document.querySelector('[data-profile-edit-form]');
const profileEditMessage = document.querySelector('[data-profile-edit-message]');
const profileAvatarUpload = document.querySelector('[data-profile-avatar-upload]');
const avatarCropper = document.querySelector('[data-avatar-cropper]');
const avatarCropStage = document.querySelector('[data-crop-stage]');
const avatarCropCanvas = document.querySelector('[data-avatar-crop-canvas]');
const avatarCropLoading = document.querySelector('[data-crop-loading]');
const avatarCropZoom = document.querySelector('[data-avatar-crop-zoom]');
const avatarCropAspects = document.querySelector('[data-crop-aspects]');
const avatarCropCtx = avatarCropCanvas.getContext('2d');
let cropSource = null;

// Mirrors Velvet Music's ImageCropper: a 300px interactive stage (pointer
// drags and the zoom slider operate in this space) rendered onto a much
// higher-resolution export canvas, so the saved image isn't a blurry
// stretched-out crop. Reused for the profile avatar (locked 1:1) and for
// any admin image upload (post covers, banners), which offer a choice of
// aspect ratios since there's no single "correct" cover shape.
const CROP_DISPLAY_SIZE = 300;
const CROP_EXPORT_MAX = 1200;
let cropImage = null;
let cropZoom = 1;
let cropOffset = { x: 0, y: 0 };
let cropDragging = false;
let cropDragStart = { x: 0, y: 0 };
let cropAspect = 1;
let cropResolve = null;

function cropExportSize() {
  return cropAspect >= 1
    ? { w: CROP_EXPORT_MAX, h: Math.round(CROP_EXPORT_MAX / cropAspect) }
    : { w: Math.round(CROP_EXPORT_MAX * cropAspect), h: CROP_EXPORT_MAX };
}
function drawCrop() {
  if (!cropImage) return;
  const { w, h } = cropExportSize();
  avatarCropCanvas.width = w;
  avatarCropCanvas.height = h;
  const baseScale = Math.max(w / cropImage.width, h / cropImage.height);
  const scale = baseScale * cropZoom;
  const drawW = cropImage.width * scale;
  const drawH = cropImage.height * scale;
  const ratio = w / CROP_DISPLAY_SIZE;
  const x = (w - drawW) / 2 + cropOffset.x * ratio;
  const y = (h - drawH) / 2 + cropOffset.y * ratio;
  avatarCropCtx.clearRect(0, 0, w, h);
  avatarCropCtx.drawImage(cropImage, x, y, drawW, drawH);
}
function setCropZoom(value) {
  cropZoom = Math.min(4, Math.max(0.5, value));
  avatarCropZoom.value = String(cropZoom);
  drawCrop();
}
function resetCrop() { cropZoom = 1; cropOffset = { x: 0, y: 0 }; avatarCropZoom.value = '1'; drawCrop(); }
function setCropAspect(aspect) {
  cropAspect = aspect;
  avatarCropStage.style.aspectRatio = String(aspect);
  avatarCropAspects.querySelectorAll('button').forEach((button) => button.classList.toggle('is-active', Number(button.dataset.cropAspect) === aspect));
  cropOffset = { x: 0, y: 0 };
  drawCrop();
}

function cropPointerPos(event) {
  const point = event.touches ? event.touches[0] : event;
  return { x: point.clientX, y: point.clientY };
}
avatarCropStage.addEventListener('mousedown', (event) => { event.preventDefault(); cropDragging = true; avatarCropStage.classList.add('is-dragging'); const p = cropPointerPos(event); cropDragStart = { x: p.x - cropOffset.x, y: p.y - cropOffset.y }; });
avatarCropStage.addEventListener('touchstart', (event) => { cropDragging = true; avatarCropStage.classList.add('is-dragging'); const p = cropPointerPos(event); cropDragStart = { x: p.x - cropOffset.x, y: p.y - cropOffset.y }; }, { passive: true });
window.addEventListener('mousemove', (event) => { if (!cropDragging) return; const p = cropPointerPos(event); cropOffset = { x: p.x - cropDragStart.x, y: p.y - cropDragStart.y }; drawCrop(); });
avatarCropStage.addEventListener('touchmove', (event) => { if (!cropDragging) return; event.preventDefault(); const p = cropPointerPos(event); cropOffset = { x: p.x - cropDragStart.x, y: p.y - cropDragStart.y }; drawCrop(); }, { passive: false });
window.addEventListener('mouseup', () => { cropDragging = false; avatarCropStage.classList.remove('is-dragging'); });
avatarCropStage.addEventListener('touchend', () => { cropDragging = false; avatarCropStage.classList.remove('is-dragging'); });
avatarCropStage.addEventListener('wheel', (event) => { event.preventDefault(); setCropZoom(cropZoom - event.deltaY * 0.001); }, { passive: false });
avatarCropZoom.addEventListener('input', () => { cropZoom = Number(avatarCropZoom.value); drawCrop(); });
document.querySelector('[data-crop-zoom-out]').addEventListener('click', () => setCropZoom(cropZoom - 0.1));
document.querySelector('[data-crop-zoom-in]').addEventListener('click', () => setCropZoom(cropZoom + 0.1));
document.querySelector('[data-crop-reset]').addEventListener('click', resetCrop);

function finishCrop(blob) {
  avatarCropper.hidden = true;
  if (cropSource) URL.revokeObjectURL(cropSource);
  cropSource = null;
  cropImage = null;
  const resolve = cropResolve; cropResolve = null;
  resolve?.(blob);
}
document.querySelectorAll('[data-avatar-crop-cancel]').forEach((button) => button.addEventListener('click', () => finishCrop(null)));
document.querySelector('[data-avatar-crop-apply]').addEventListener('click', () => { avatarCropCanvas.toBlob((blob) => finishCrop(blob), 'image/jpeg', .92); });

// Opens the shared cropper for `file`; resolves with the cropped JPEG Blob,
// or null if the user cancels. `aspectOptions` (array of {label,value}) adds
// a switcher above the zoom controls; omit it to lock to a single `aspect`.
function requestCrop(file, { aspect = 1, aspectOptions = null } = {}) {
  return new Promise((resolve) => {
    cropResolve = resolve;
    if (cropSource) URL.revokeObjectURL(cropSource);
    cropSource = URL.createObjectURL(file);
    if (aspectOptions) {
      avatarCropAspects.innerHTML = aspectOptions.map(({ label, value }) => `<button type="button" data-crop-aspect="${value}">${label}</button>`).join('');
      avatarCropAspects.hidden = false;
      avatarCropAspects.querySelectorAll('button').forEach((button) => button.addEventListener('click', () => setCropAspect(Number(button.dataset.cropAspect))));
    } else {
      avatarCropAspects.hidden = true;
      avatarCropAspects.innerHTML = '';
    }
    cropAspect = aspect;
    avatarCropStage.style.aspectRatio = String(aspect);
    avatarCropLoading.dataset.visible = '';
    avatarCropper.hidden = false;
    const img = new Image();
    img.onload = () => {
      cropImage = img;
      resetCrop();
      setCropAspect(aspect);
      delete avatarCropLoading.dataset.visible;
    };
    img.onerror = () => { notify('Não foi possível abrir esta imagem. Tente uma foto em JPG ou PNG.', 'error'); finishCrop(null); };
    img.src = cropSource;
  });
}

let croppedAvatarFile = null;
function resetProfileAvatarUpload() {
  croppedAvatarFile = null;
  profileAvatarUpload.querySelector('b').textContent = 'ENVIAR NOVA FOTO';
  profileAvatarUpload.querySelector('small').textContent = 'Escolha da galeria ou câmera · até 12 MB';
}

profileEditToggle.addEventListener('click', () => {
  profileEditForm.hidden = false;
  profileEditForm.elements.displayName.value = session.user?.displayName || '';
  profileEditMessage.textContent = '';
  profileEditForm.elements.displayName.focus();
});
document.querySelector('[data-profile-edit-cancel]').addEventListener('click', () => { profileEditForm.hidden = true; profileEditForm.reset(); resetProfileAvatarUpload(); });
profileEditForm.elements.avatar.addEventListener('change', () => {
  const file = profileEditForm.elements.avatar.files[0];
  croppedAvatarFile = null;
  const title = profileAvatarUpload.querySelector('b');
  const hint = profileAvatarUpload.querySelector('small');
  title.textContent = file ? 'FOTO SELECIONADA' : 'ENVIAR NOVA FOTO';
  hint.textContent = file ? file.name : 'Escolha da galeria ou câmera · até 12 MB';
});
profileEditForm.elements.avatar.addEventListener('change', async () => {
  const file = profileEditForm.elements.avatar.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/') || file.size > 12 * 1024 * 1024) {
    profileEditMessage.textContent = 'Envie uma imagem de até 12 MB.';
    profileEditForm.elements.avatar.value = '';
    return;
  }
  const blob = await requestCrop(file, { aspect: 1 });
  if (!blob) { profileEditForm.elements.avatar.value = ''; resetProfileAvatarUpload(); return; }
  croppedAvatarFile = new File([blob], 'velvet-profile.jpg', { type: 'image/jpeg' });
  profileAvatarUpload.querySelector('b').textContent = 'FOTO RECORTADA';
  profileAvatarUpload.querySelector('small').textContent = 'Pronta para salvar no seu perfil';
});
profileEditForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const submit = form.querySelector('[type="submit"]');
  const displayName = form.elements.displayName.value.trim();
  submit.disabled = true;
  profileEditMessage.textContent = 'Salvando perfil...';
  try {
    let response = await requestApi('/api/profile', { method: 'PATCH', body: JSON.stringify({ displayName }) });
    session.user = response.user;
    const image = croppedAvatarFile || form.elements.avatar.files[0];
    if (image) {
      const data = new FormData(); data.append('avatar', image);
      const uploadResponse = await fetch(`${API_URL}/api/profile/avatar`, { method: 'POST', headers: { Authorization: `Bearer ${session.token}` }, body: data });
      const uploadData = await uploadResponse.json().catch(() => ({}));
      if (!uploadResponse.ok) throw new Error(uploadData.error || 'Não foi possível enviar a foto.');
      session.user = uploadData.user;
    }
    updateProfileView();
    profileEditForm.hidden = true;
    profileEditForm.reset();
    resetProfileAvatarUpload();
    notify('Perfil atualizado com sucesso.');
  } catch (error) { profileEditMessage.textContent = error.message; }
  finally { submit.disabled = false; }
});
