const searchButtons = document.querySelectorAll('[data-search-toggle]');
const searchPanel = document.querySelector('[data-search-panel]');
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
const API_URL = window.VELVET_VIRTUAL_API_URL || 'https://velvetvirtual.up.railway.app';

searchButtons.forEach((button) => button.addEventListener('click', () => {
  const opening = searchPanel.hidden;
  searchPanel.hidden = !opening;
  document.body.classList.toggle('is-locked', opening);
  if (opening) searchPanel.querySelector('input').focus();
}));

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

function articleCard(post, large = false) {
  const article = document.createElement('article');
  article.className = large ? 'vv-news-card vv-news-card-large' : 'vv-news-card';
  const image = document.createElement('div');
  image.className = 'vv-news-card-image';
  if (post.coverUrl) image.style.backgroundImage = `url("${post.coverUrl}")`;
  const category = document.createElement('p'); category.className = 'vv-label'; category.textContent = post.categoryName || 'VELVET';
  const title = document.createElement('h3'); title.textContent = post.title;
  const excerpt = document.createElement('p'); excerpt.className = 'vv-news-card-excerpt'; excerpt.textContent = post.excerpt || 'Leia a matéria completa na Velvet Virtual.';
  const meta = document.createElement('span'); meta.textContent = `${Number(post.views || 0).toLocaleString('pt-BR')} visualizações`;
  image.append(category); article.append(image, title, excerpt, meta);
  return article;
}

async function loadNews() {
  newsGrid.replaceChildren(); newsFeatured.replaceChildren();
  try {
    const response = await fetch(`${API_URL}/api/public/home`);
    if (!response.ok) throw new Error('Falha ao carregar notícias');
    const data = await response.json();
    const posts = [...data.posts].sort((a, b) => new Date(b.publishedAt || b.createdAt) - new Date(a.publishedAt || a.createdAt));
    const highlighted = [...posts].filter((post) => Number(post.isFeatured) || Number(post.views) > 0).sort((a, b) => Number(b.isFeatured) - Number(a.isFeatured) || Number(b.views) - Number(a.views)).slice(0, 2);
    const featuredIds = new Set(highlighted.map((post) => post.id));
    highlighted.forEach((post, index) => newsFeatured.append(articleCard(post, index === 0)));
    posts.filter((post) => !featuredIds.has(post.id)).forEach((post) => newsGrid.append(articleCard(post)));
    newsCount.textContent = `${posts.length} PUBLICAÇ${posts.length === 1 ? 'ÃO' : 'ÕES'}`;
    newsEmpty.hidden = posts.length > 0;
  } catch {
    newsEmpty.hidden = false;
    newsEmpty.querySelector('p').textContent = 'As notícias estarão disponíveis assim que a API da revista estiver conectada.';
  }
}

function openNews() { newsPage.hidden = false; document.body.classList.add('is-locked'); window.history.replaceState(null, '', '#noticias'); loadNews(); }
function closeNews() { newsPage.hidden = true; document.body.classList.remove('is-locked'); window.history.replaceState(null, '', '#top'); }
document.querySelectorAll('[data-news-open]').forEach((button) => button.addEventListener('click', openNews));
document.querySelectorAll('[data-news-close]').forEach((button) => button.addEventListener('click', closeNews));
if (window.location.hash === '#noticias') openNews();

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
function openEditor(resource, item = null) {
  const schemas = {
    banners: [['title', 'Título', 'text'], ['subtitle', 'Subtítulo', 'text'], ['image_url', 'URL da imagem', 'url'], ['cta_label', 'Texto do botão', 'text'], ['cta_url', 'Link do botão', 'url'], ['position', 'Ordem', 'number'], ['is_active', 'Banner ativo', 'checkbox']],
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
    let input;
    if (type === 'textarea') { input = document.createElement('textarea'); input.value = value || ''; }
    else if (type === 'select') { input = document.createElement('select'); choices.forEach((choice) => { const option = new Option(choice.toUpperCase(), choice, false, value === choice); input.add(option); }); }
    else { input = document.createElement('input'); input.type = type; if (type === 'checkbox') { input.checked = Boolean(Number(value) || value === true); wrap.className = 'vv-check'; wrap.textContent = ''; wrap.append(input, document.createTextNode(` ${label}`)); } else { input.value = value || ''; } }
    input.name = name; if (resource === 'users' && item && name === 'password') { input.placeholder = 'Deixe vazio para não alterar'; input.required = false; } if (resource === 'users' && !item && name === 'password') input.required = true;
    if (type !== 'checkbox') wrap.append(input);
    if (name === 'cover_url' || name === 'image_url') {
      wrap.classList.add('vv-editor-media');
      const preview = document.createElement('div'); preview.className = 'vv-editor-preview'; if (value) preview.style.backgroundImage = `url("${value}")`;
      const uploadLabel = document.createElement('label'); uploadLabel.className = 'vv-upload-button'; uploadLabel.textContent = 'ENVIAR IMAGEM';
      const file = document.createElement('input'); file.type = 'file'; file.accept = 'image/*'; file.hidden = true;
      file.addEventListener('change', async () => { if (!file.files?.[0]) return; uploadLabel.textContent = 'ENVIANDO...'; try { const data = new FormData(); data.append('file', file.files[0]); const response = await fetch(`${API_URL}/api/admin/uploads`, { method: 'POST', headers: session.token ? { Authorization: `Bearer ${session.token}` } : {}, body: data }); const result = await response.json(); if (!response.ok) throw new Error(result.error); input.value = result.url; preview.style.backgroundImage = `url("${result.url}")`; uploadLabel.textContent = 'TROCAR IMAGEM'; } catch (error) { uploadLabel.textContent = error.message || 'TENTAR NOVAMENTE'; } });
      uploadLabel.append(file); wrap.append(preview, uploadLabel);
    }
    area.append(wrap);
  });
  const deleteButton = document.querySelector('[data-editor-delete]'); deleteButton.hidden = !item; editorPanel.hidden = false; document.body.classList.add('is-locked');
}
function closeEditor() { editorPanel.hidden = true; session.editor = null; document.body.classList.remove('is-locked'); }
function adminEmpty(icon, title, text) { return `<div class="vv-admin-empty"><span>${icon}</span><h3>${title}</h3><p>${text}</p></div>`; }
function escapeHtml(value = '') { return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }

async function renderPostsAdmin(section) {
  let items, categories;
  try {
    [items, categories] = await Promise.all([requestApi('/api/admin/posts'), requestApi('/api/admin/categories')]);
  } catch (error) { section.innerHTML = adminEmpty('!', 'Não foi possível carregar.', error.message); return; }
  const editingId = section.dataset.editingId || '';
  const editing = editingId ? items.find((post) => post.id === editingId) : null;
  const categoryOptions = categories.map((category) => `<option value="${category.id}" ${editing?.categoryId === category.id ? 'selected' : ''}>${escapeHtml(category.name)}</option>`).join('');
  section.innerHTML = `<div class="vv-post-admin">
    <form class="vv-post-form-card" data-post-form>
      <h3>${editing ? '✎ Editar matéria' : '+ Criar matéria'}</h3>
      <label>Título<input name="title" required value="${escapeHtml(editing?.title || '')}"></label>
      <label>Categoria<select name="category_id"><option value="">Sem categoria</option>${categoryOptions}</select></label>
      <label>Resumo<textarea name="excerpt">${escapeHtml(editing?.excerpt || '')}</textarea></label>
      <label>Conteúdo<textarea name="content" required>${escapeHtml(editing?.content || '')}</textarea></label>
      <label>Capa<div class="vv-post-dropzone${editing?.coverUrl ? ' has-image' : ''}" data-post-dropzone style="${editing?.coverUrl ? `background-image:url('${escapeHtml(editing.coverUrl)}')` : ''}"><span>${editing?.coverUrl ? 'TROCAR IMAGEM' : 'CLIQUE PARA ENVIAR IMAGEM'}</span><input type="file" accept="image/*" hidden data-post-cover-file></div></label>
      <input type="hidden" name="cover_url" value="${escapeHtml(editing?.coverUrl || '')}" data-post-cover-input>
      <label>Status<select name="status"><option value="draft" ${editing?.status !== 'published' ? 'selected' : ''}>Rascunho</option><option value="published" ${editing?.status === 'published' ? 'selected' : ''}>Publicado</option></select></label>
      <label class="vv-post-check"><input type="checkbox" name="is_featured" ${Number(editing?.isFeatured) ? 'checked' : ''}> Destacar na capa</label>
      <div class="vv-post-form-actions">
        ${editing ? '<button type="button" class="vv-post-form-ghost" data-post-cancel>CANCELAR</button>' : ''}
        <button type="submit" class="vv-admin-add">${editing ? 'SALVAR' : 'PUBLICAR'}</button>
      </div>
      ${editing ? '<button type="button" class="vv-post-form-delete" data-post-delete>EXCLUIR MATÉRIA</button>' : ''}
    </form>
    <div>
      <div class="vv-post-list-head"><h3>Postagens (<span data-post-count>${items.length}</span>)</h3><div class="vv-search-field"><input placeholder="Buscar postagens..." data-post-search></div></div>
      <div class="vv-post-cards" data-post-cards></div>
    </div>
  </div>`;

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
    container.innerHTML = filtered.length ? filtered.map(cardHtml).join('') : adminEmpty('▤', 'Nenhuma postagem encontrada.', 'Use o formulário ao lado para publicar a primeira matéria.');
    container.querySelectorAll('[data-post-edit]').forEach((button) => button.addEventListener('click', () => { section.dataset.editingId = button.dataset.postEdit; renderPostsAdmin(section); }));
    container.querySelectorAll('[data-post-remove]').forEach((button) => button.addEventListener('click', async () => {
      if (!confirm('Excluir esta matéria permanentemente?')) return;
      try { await requestApi(`/api/admin/posts/${button.dataset.postRemove}`, { method: 'DELETE' }); if (section.dataset.editingId === button.dataset.postRemove) delete section.dataset.editingId; renderPostsAdmin(section); } catch (error) { alert(error.message); }
    }));
  }
  renderCards();
  section.querySelector('[data-post-search]').addEventListener('input', renderCards);

  const dropzone = section.querySelector('[data-post-dropzone]');
  const fileInput = section.querySelector('[data-post-cover-file]');
  const coverInput = section.querySelector('[data-post-cover-input]');
  dropzone.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    if (!fileInput.files?.[0]) return;
    const label = dropzone.querySelector('span'); label.textContent = 'ENVIANDO...';
    try {
      const data = new FormData(); data.append('file', fileInput.files[0]);
      const response = await fetch(`${API_URL}/api/admin/uploads`, { method: 'POST', headers: session.token ? { Authorization: `Bearer ${session.token}` } : {}, body: data });
      const result = await response.json(); if (!response.ok) throw new Error(result.error);
      coverInput.value = result.url; dropzone.style.backgroundImage = `url("${result.url}")`; dropzone.classList.add('has-image'); label.textContent = 'TROCAR IMAGEM';
    } catch (error) { label.textContent = error.message || 'ERRO AO ENVIAR'; }
  });

  section.querySelector('[data-post-cancel]')?.addEventListener('click', () => { delete section.dataset.editingId; renderPostsAdmin(section); });
  section.querySelector('[data-post-delete]')?.addEventListener('click', async () => {
    if (!editing || !confirm('Excluir esta matéria permanentemente?')) return;
    try { await requestApi(`/api/admin/posts/${editing.id}`, { method: 'DELETE' }); delete section.dataset.editingId; renderPostsAdmin(section); } catch (error) { alert(error.message); }
  });

  section.querySelector('[data-post-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form));
    payload.is_featured = form.elements.is_featured.checked ? 1 : 0;
    if (!payload.category_id) delete payload.category_id;
    if (payload.status === 'published' && !editing?.publishedAt) payload.published_at = new Date().toISOString();
    try {
      await requestApi(`/api/admin/posts${editing ? `/${editing.id}` : ''}`, { method: editing ? 'PATCH' : 'POST', body: JSON.stringify(payload) });
      delete section.dataset.editingId;
      renderPostsAdmin(section);
    } catch (error) { alert(error.message); }
  });
}

async function renderAdmin(resource) {
  const section = document.querySelector(`[data-admin-section="${resource}"]`); if (!section) return;
  if (resource === 'posts') { delete section.dataset.editingId; return renderPostsAdmin(section); }
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
      section.innerHTML = `<form class="vv-settings" data-live-settings><label>Nome da revista<input name="siteName" value="${escapeHtml(settings.siteName || 'Velvet Virtual')}" required></label><label>Link do Discord<input name="discordUrl" type="url" value="${escapeHtml(settings.discordUrl || '')}"></label><label>Link do Velvet Music<input name="velvetMusicUrl" type="url" value="${escapeHtml(settings.velvetMusicUrl || 'https://velvetentertainment.vercel.app')}"></label><button class="vv-admin-add" type="submit">SALVAR CONFIGURAÇÕES</button></form>`;
      section.querySelector('form').addEventListener('submit', async (event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget)); await requestApi('/api/admin/settings', { method: 'PUT', body: JSON.stringify(values) }); alert('Configurações salvas.'); }); return;
    }
    const items = await requestApi(`/api/admin/${resource}`);
    const toolbar = `<div class="vv-admin-toolbar"><p>${resource === 'banners' ? 'Escolha os destaques da página inicial.' : resource === 'categories' ? 'Organize os assuntos da revista.' : 'Gerencie os acessos da comunidade.'}</p><button class="vv-admin-add" data-live-create="${resource}">+ CRIAR</button></div>`;
    if (!items.length) { section.innerHTML = toolbar + adminEmpty(resource === 'banners' ? '▧' : resource === 'categories' ? '◇' : '♙', 'Nada por aqui ainda.', 'Crie o primeiro item usando o botão acima.'); return; }
    if (resource === 'banners') section.innerHTML = toolbar + `<div class="vv-banner-list">${items.map((item) => `<article><div class="vv-banner-thumb" style="${item.imageUrl ? `background-image:url('${escapeHtml(item.imageUrl)}');background-size:cover` : ''}"></div><div><b>${escapeHtml(item.title)}</b><p><span class="vv-badge ${Number(item.isActive) ? 'vv-badge-published' : 'vv-badge-inactive'}">${Number(item.isActive) ? 'ATIVO' : 'INATIVO'}</span> · ORDEM ${item.position || 0}</p></div><button data-live-edit="banners" data-id="${item.id}">EDITAR</button></article>`).join('')}</div>`;
    if (resource === 'categories') section.innerHTML = toolbar + `<div class="vv-category-admin">${items.map((item) => `<div><b>${escapeHtml(item.name)}</b><span>${escapeHtml(item.description || item.slug)}</span><button data-live-edit="categories" data-id="${item.id}">EDITAR</button></div>`).join('')}</div>`;
    if (resource === 'users') section.innerHTML = toolbar + `<div class="vv-admin-table"><div class="vv-admin-row is-head"><span>USUÁRIO</span><span>E-MAIL</span><span>CARGO</span><span></span></div>${items.map((item) => `<div class="vv-admin-row"><b>${escapeHtml(item.displayName)}</b><span>${escapeHtml(item.email)}</span><i>${escapeHtml(item.role)}</i><button data-live-edit="users" data-id="${item.id}">EDITAR</button></div>`).join('')}</div>`;
    section.dataset.items = JSON.stringify(items);
  } catch (error) { section.innerHTML = adminEmpty('!', 'Não foi possível carregar.', error.message); }
}

document.querySelectorAll('[data-admin-tab]').forEach((tab) => tab.addEventListener('click', () => renderAdmin(tab.dataset.adminTab)));
document.addEventListener('click', (event) => {
  const create = event.target.closest('[data-live-create]'); if (create) openEditor(create.dataset.liveCreate);
  const edit = event.target.closest('[data-live-edit]'); if (edit) { const section = document.querySelector(`[data-admin-section="${edit.dataset.liveEdit}"]`); const item = JSON.parse(section.dataset.items || '[]').find((row) => row.id === edit.dataset.id); openEditor(edit.dataset.liveEdit, item); }
  if (event.target.matches('[data-editor-close]')) closeEditor();
  if (event.target.matches('[data-auth-close]')) closeAuth();
});
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
  setTimeout(() => document.querySelector('[data-post-form] input[name="title"]')?.focus(), 30);
});
document.querySelector('.vv-roles-heading button')?.addEventListener('click', () => { adminButtons[0]?.click(); setTimeout(() => document.querySelector('[data-admin-tab="roles"]')?.click(), 20); });
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
