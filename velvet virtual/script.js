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
const toast = document.querySelector('[data-toast]');
let toastTimer;
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

function createDropzone(initialValue, onChange) {
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
    const localUrl = URL.createObjectURL(fileObj);
    dropzone.style.backgroundImage = `url("${localUrl}")`; dropzone.classList.add('has-image'); remove.hidden = false;
    try {
      const url = await uploadFile(fileObj, (pct) => { label.textContent = `ENVIANDO ${pct}%`; });
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
      try { await requestApi(`/api/admin/posts/${button.dataset.postRemove}`, { method: 'DELETE' }); notify('Matéria excluída.'); renderPostsAdmin(section); } catch (error) { alert(error.message); }
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
    <label>Conteúdo<textarea name="content" required>${escapeHtml(post?.content || '')}</textarea></label>
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

  postEditorForm.querySelector('[data-post-cancel]')?.addEventListener('click', closePostEditor);
  postEditorForm.querySelector('[data-post-delete]')?.addEventListener('click', async () => {
    if (!post || !confirm('Excluir esta matéria permanentemente?')) return;
    try { await requestApi(`/api/admin/posts/${post.id}`, { method: 'DELETE' }); closePostEditor(); notify('Matéria excluída.'); renderPostsAdmin(section); } catch (error) { alert(error.message); }
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
const avatarCropImage = document.querySelector('[data-avatar-crop-image]');
const avatarCropZoom = document.querySelector('[data-avatar-crop-zoom]');
let avatarCropSource = null;
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
profileEditForm.elements.avatar.addEventListener('change', () => {
  const file = profileEditForm.elements.avatar.files[0];
  if (!file) return;
  if (!file.type.startsWith('image/') || file.size > 12 * 1024 * 1024) {
    profileEditMessage.textContent = 'Envie uma imagem de até 12 MB.';
    profileEditForm.elements.avatar.value = '';
    return;
  }
  if (avatarCropSource) URL.revokeObjectURL(avatarCropSource);
  avatarCropSource = URL.createObjectURL(file);
  avatarCropImage.onload = () => { avatarCropper.hidden = false; };
  avatarCropImage.onerror = () => { profileEditMessage.textContent = 'Não foi possível abrir esta imagem. Tente uma foto em JPG ou PNG.'; profileEditForm.elements.avatar.value = ''; if (avatarCropSource) URL.revokeObjectURL(avatarCropSource); avatarCropSource = null; };
  avatarCropImage.src = avatarCropSource;
  avatarCropZoom.value = '1';
  avatarCropImage.style.setProperty('--crop-scale', '1');
});
avatarCropZoom.addEventListener('input', () => avatarCropImage.style.setProperty('--crop-scale', avatarCropZoom.value));
document.querySelectorAll('[data-avatar-crop-cancel]').forEach((button) => button.addEventListener('click', () => {
  avatarCropper.hidden = true;
  profileEditForm.elements.avatar.value = '';
  if (avatarCropSource) URL.revokeObjectURL(avatarCropSource);
  avatarCropSource = null;
  resetProfileAvatarUpload();
}));
document.querySelector('[data-avatar-crop-apply]').addEventListener('click', () => {
  const scale = Number(avatarCropZoom.value);
  const side = Math.min(avatarCropImage.naturalWidth, avatarCropImage.naturalHeight) / scale;
  const startX = (avatarCropImage.naturalWidth - side) / 2;
  const startY = (avatarCropImage.naturalHeight - side) / 2;
  const canvas = document.createElement('canvas');
  canvas.width = 512; canvas.height = 512;
  canvas.getContext('2d').drawImage(avatarCropImage, startX, startY, side, side, 0, 0, 512, 512);
  canvas.toBlob((blob) => {
    if (!blob) return;
    croppedAvatarFile = new File([blob], 'velvet-profile.jpg', { type: 'image/jpeg' });
    profileAvatarUpload.querySelector('b').textContent = 'FOTO RECORTADA';
    profileAvatarUpload.querySelector('small').textContent = 'Pronta para salvar no seu perfil';
    avatarCropper.hidden = true;
    if (avatarCropSource) URL.revokeObjectURL(avatarCropSource);
    avatarCropSource = null;
  }, 'image/jpeg', .92);
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
