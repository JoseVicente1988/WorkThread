const API = location.origin.replace(/\/$/, '') + '/api';
let token = localStorage.getItem('token') || null;

const $ = (sel) => document.querySelector(sel);

function setRootAuthClass() {
  document.body.classList.toggle('auth-yes', !!token);
  document.body.classList.toggle('auth-no', !token);
}

function show(sel, on = true) {
  const el = $(sel);
  if (!el) return;
  el.classList.toggle('hidden', !on);
}

function view(name) {
  show('#auth', false);
  show('#jobs', false);
  show('#composer', false);
  show('#feed', false);
  if (name === 'auth') show('#auth', true);
  if (name === 'jobs') show('#jobs', true);
  if (name === 'feed') { show('#composer', true); show('#feed', true); }
}

function setAuthUI() {
  const logged = !!token;
  setRootAuthClass();
  show('#btn-login', !logged);
  show('#btn-register', !logged);
  show('#btn-logout', logged);
  show('#btn-jobs', logged);
  show('#btn-feed', logged);

  if (!logged) {
    view('auth');
  } else {
    view('jobs');
    loadJobs();
    loadFeed();
  }
}

async function api(path, opts = {}) {
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(opts.headers || {}),
      ...(token ? { 'Authorization': 'Bearer ' + token } : {})
    }
  });
  if (!res.ok) {
    let e = 'Error';
    try { e = (await res.json()).error || e; } catch {}
    throw new Error(e);
  }
  return res.json();
}

// NAV
$('#btn-login').onclick = () => { $('#auth-title').textContent = 'Entrar'; show('#username-wrap', false); $('#auth-help').textContent=''; view('auth'); };
$('#btn-register').onclick = () => { $('#auth-title').textContent = 'Crear cuenta'; show('#username-wrap', true); $('#auth-help').textContent=''; view('auth'); };
$('#btn-logout').onclick = () => { token = null; localStorage.removeItem('token'); setAuthUI(); };
$('#btn-jobs').onclick = () => { if (!token) return; view('jobs'); loadJobs(); };
$('#btn-feed').onclick = () => { if (!token) return; view('feed'); loadFeed(); };

// AUTH
$('#auth-form').onsubmit = async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  try {
    if ($('#auth-title').textContent.includes('Crear')) {
      const body = { email: data.email, password: data.password, username: data.username };
      const r = await api('/auth/register', { method:'POST', body: JSON.stringify(body) });
      token = r.token; localStorage.setItem('token', token);
    } else {
      const body = { email: data.email, password: data.password };
      const r = await api('/auth/login', { method:'POST', body: JSON.stringify(body) });
      token = r.token; localStorage.setItem('token', token);
    }
    setAuthUI();
  } catch (err) {
    $('#auth-help').textContent = err.message;
  }
};

// POSTS
$('#post-send').onclick = async () => {
  if (!token) return alert('Inicia sesión para publicar');
  const content = $('#post-content').value.trim();
  const tags = $('#post-tags').value.trim();
  if (!content) return;
  try {
    await api('/posts', { method:'POST', body: JSON.stringify({ content, tags }) });
    $('#post-content').value=''; $('#post-tags').value='';
    await loadFeed();
  } catch (e) { alert(e.message); }
};

async function loadFeed() {
  if (!token) return;
  const container = $('#posts');
  container.innerHTML = '<div class="meta">Cargando...</div>';
  try {
    const posts = await api('/posts/feed');
    container.innerHTML = '';

    posts.forEach((p, idx) => {
      // AdSense slot cada 5 items
      if (idx > 0 && idx % 5 === 0) {
        const slot = document.createElement('div');
        slot.className = 'post sponsored';
        slot.innerHTML = `
          <div class="ad-label">Patrocinado</div>
          <ins class="adsbygoogle"
               style="display:block"
               data-ad-client="ca-pub-4481682062230576"
               data-ad-slot="1234567890"
               data-ad-format="fluid"
               data-full-width-responsive="true"></ins>
        `;
        container.appendChild(slot);
        try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (e) {}
      }

      const el = document.createElement('div');
      el.className = 'post';
      const tags = (p.tags || '').split(',').map(s=>s.trim()).filter(Boolean);
      el.innerHTML = `
        <div class="meta">@${p.author.username} · ${new Date(p.createdAt).toLocaleString()} · ${tags.map(t=>`<span class="tag">#${escapeHtml(t)}</span>`).join(' ')}</div>
        <div class="content">${escapeHtml(p.content)}</div>
        <div class="actions">
          <button data-act="LIKE" class="only-auth">👍 Like <span class="count">${p.feedbackCounts.LIKE}</span></button>
          <button data-act="INSIGHT" class="only-auth">💡 Insight <span class="count">${p.feedbackCounts.INSIGHT}</span></button>
          <button data-act="QUESTION" class="only-auth">❓ Pregunta <span class="count">${p.feedbackCounts.QUESTION}</span></button>
          <button data-act="HIRE_ME" class="only-auth">💼 Interés <span class="count">${p.feedbackCounts.HIRE_ME}</span></button>
          <button data-act="REFER" class="only-auth">🔗 Referir <span class="count">${p.feedbackCounts.REFER}</span></button>
          <button data-act="COMMENT" class="only-auth">💬 Comentarios <span class="count">${p.commentsCount}</span></button>
        </div>
      `;
      el.querySelectorAll('button').forEach(btn => {
        const act = btn.dataset.act;
        if (act === 'COMMENT') {
          btn.onclick = () => openComments(p.id);
        } else {
          btn.onclick = async () => {
            try {
              await api('/feedbacks', { method:'POST', body: JSON.stringify({ postId: p.id, type: act, content: '' }) });
              await loadFeed();
            } catch (e) { alert(e.message); }
          };
        }
      });
      container.appendChild(el);
    });
  } catch (e) {
    container.innerHTML = `<div class="meta">Error: ${escapeHtml(e.message)}</div>`;
  }
}

// MODAL
function closeModal() {
  $('#modal').classList.add('hidden');
  document.body.classList.remove('modal-open');
  $('#modal').onclick = null;
  document.onkeydown = null;
}

async function openComments(postId) {
  $('#modal').classList.remove('hidden');
  document.body.classList.add('modal-open');
  $('#modal-title').textContent = 'Comentarios';
  $('#comment-input').value = '';

  $('#comment-send').onclick = async () => {
    const content = $('#comment-input').value.trim();
    if (!content) return;
    try {
      await api('/comments', { method:'POST', body: JSON.stringify({ postId, content }) });
      $('#comment-input').value = '';
      await renderComments(postId);
      await loadFeed();
    } catch (e) { alert(e.message); }
  };

  $('#modal-close').onclick = closeModal;
  document.onkeydown = (ev) => { if (ev.key === 'Escape') closeModal(); };
  $('#modal').onclick = (ev) => { if (ev.target === $('#modal')) closeModal(); };

  await renderComments(postId);
}

async function renderComments(postId) {
  const box = $('#modal-body');
  box.innerHTML = 'Cargando...';
  const list = await api('/comments/for/' + postId);
  box.innerHTML = list.map(c => `
    <div class="post">
      <div class="meta">@${c.author.username} · ${new Date(c.createdAt).toLocaleString()}</div>
      <div>${escapeHtml(c.content)}</div>
    </div>
  `).join('');
}

// JOBS
$('#job-search').onclick = () => { if (!token) return alert('Inicia sesión para buscar empleos'); loadJobs(); };
$('#job-post').onclick = async () => {
  if (!token) return alert('Inicia sesión para publicar empleos');
  const title = prompt('Título del puesto'); if (!title) return;
  const company = prompt('Empresa'); if (!company) return;
  const description = prompt('Descripción (breve)'); if (!description) return;
  const skills = prompt('Skills (coma separadas)') || '';
  const location = prompt('Ubicación (o "Remote")') || 'Remote';
  const remote = confirm('¿Es remoto?');
  const minSalary = Number(prompt('Salario mínimo (número, opcional)') || 0) || null;
  const maxSalary = Number(prompt('Salario máximo (número, opcional)') || 0) || null;
  const currency = prompt('Moneda (USD/EUR...)') || 'USD';
  try {
    await api('/jobs', { method: 'POST', body: JSON.stringify({ title, company, description, skills, location, remote, minSalary, maxSalary, currency }) });
    await loadJobs();
  } catch (e) { alert(e.message); }
};

async function loadJobs() {
  if (!token) return;
  const q = $('#job-q').value.trim();
  const skills = $('#job-skills').value.trim();
  const location = $('#job-location').value.trim();
  const remote = $('#job-remote').value;
  const minSalary = $('#job-min').value.trim();

  const params = new URLSearchParams();
  if (q) params.set('q', q);
  if (skills) params.set('skills', skills);
  if (location) params.set('location', location);
  if (remote) params.set('remote', remote);
  if (minSalary) params.set('minSalary', minSalary);

  const listEl = $('#job-list');
  listEl.innerHTML = '<div class="meta">Buscando...</div>';
  try {
    const jobs = await api('/jobs/search?' + params.toString());
    listEl.innerHTML = '';
    for (const j of jobs) {
      const el = document.createElement('div');
      el.className = 'job';
      const skillsHtml = (j.skills || '').split(',').map(s=>s.trim()).filter(Boolean).map(s => `<span class="chip">${escapeHtml(s)}</span>`).join('');
      const salary = (j.minSalary || j.maxSalary) ? `${j.minSalary ? j.minSalary.toLocaleString() : ''}${j.maxSalary ? ' - ' + j.maxSalary.toLocaleString() : ''} ${j.currency}` : 'No especificado';
      el.innerHTML = `
        <h4>${escapeHtml(j.title)} — ${escapeHtml(j.company)}</h4>
        <div class="meta">${j.remote ? 'Remoto' : escapeHtml(j.location)} · Publicado: ${new Date(j.createdAt).toLocaleDateString()} · Match: ${j.score || 0}</div>
        <div>${escapeHtml(j.description.slice(0, 240))}${j.description.length > 240 ? '...' : ''}</div>
        <div class="chips">${skillsHtml}</div>
        <div class="meta">Salario: ${salary}</div>
        <div class="actions">
          <button data-action="details" class="only-auth">Ver detalle</button>
          <button data-action="apply" class="primary only-auth">Aplicar</button>
          <button data-action="save" class="only-auth">Guardar</button>
        </div>
      `;
      el.querySelector('[data-action="details"]').onclick = async () => {
        const full = await api('/jobs/' + j.id);
        alert(`${full.title} — ${full.company}\n${full.location} · ${full.remote ? 'Remoto' : 'Presencial'}\n\n${full.description}`);
      };
      el.querySelector('[data-action="apply"]').onclick = async () => {
        const msg = prompt('Mensaje para tu aplicación (opcional)') || '';
        try {
          await api('/apps', { method:'POST', body: JSON.stringify({ jobId: j.id, message: msg }) });
          alert('Aplicación enviada.');
        } catch (e) { alert(e.message); }
      };
      el.querySelector('[data-action="save"]').onclick = async () => {
        try {
          await api(`/jobs/${j.id}/save`, { method:'POST' });
          alert('Guardado.');
        } catch (e) { alert(e.message); }
      };
      listEl.appendChild(el);
    }
    if (!jobs.length) listEl.innerHTML = '<div class="meta">Sin resultados.</div>';
  } catch (e) {
    listEl.innerHTML = `<div class="meta">Error: ${escapeHtml(e.message)}</div>`;
  }
}

function escapeHtml(s) {
  return (s || '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

setAuthUI();