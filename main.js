'use strict';

// Configuration candidature : garder vide tant que le webhook n’est pas configuré.
const DISCORD_WEBHOOK_URL = '';
// Alternative Cloudflare Worker : renseigner l’URL du proxy et laisser le webhook direct vide.
const DISCORD_PROXY_URL = 'https://overlord-candidature.anarchique.workers.dev';

const CONFIG = {
  logo: 'assets/logo.png',
  name: 'Overlord',
  inviteUrl: 'https://discord.gg/KHTgbP7aTX',
  pages: [
    ['index.html', 'Accueil'], ['lore.html', 'Lore'], ['membres.html', 'Membres'],
    ['regles.html', 'Règles'], ['rejoindre.html', 'Rejoindre'],
  ],
};
const currentPage = location.pathname.split('/').pop() || 'index.html';
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = matchMedia('(hover: none)').matches;
const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (c) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[c]));

function injectLayout() {
  document.body.insertAdjacentHTML('afterbegin', `
    <div class="ambient" aria-hidden="true"></div>
    <canvas class="fx" id="fx" aria-hidden="true"></canvas>
    <div class="loader" id="loader" aria-hidden="true"><div><img src="${CONFIG.logo}" alt=""><span>${CONFIG.name}</span><i></i></div></div>
    <div class="curtain" id="curtain" aria-hidden="true"></div>
    <div class="progress" id="progress" role="presentation"></div>
    <div class="pixel-cursor" id="pixelCursor" aria-hidden="true"></div>
    <header class="nav-shell" id="nav-shell"><nav aria-label="Navigation principale">
      <a href="index.html" class="logo"><img src="${CONFIG.logo}" alt="">${CONFIG.name}</a>
      <button class="burger" id="burger" type="button" aria-label="Ouvrir le menu" aria-expanded="false" aria-controls="menu">Menu</button>
      <ul class="nav-links" id="menu">${CONFIG.pages.map(([href, label]) => `<li><a href="${href}" data-tip="${label}"${href === currentPage ? ' class="active" aria-current="page"' : ''}>${label}</a></li>`).join('')}</ul>
      <a href="${CONFIG.inviteUrl}" target="_blank" rel="noopener noreferrer" class="btn btn-discord nav-cta">Discord</a>
    </nav></header>`);

  document.body.insertAdjacentHTML('beforeend', `
    <footer><div class="f-grid"><div>
      <div class="logo"><img src="${CONFIG.logo}" alt="">${CONFIG.name}</div>
      <p style="color:var(--muted);font-size:21px;margin-top:10px;max-width:340px">Faction Discord Minecraft. Stratégie, entraide et domination — sur tous les serveurs où nous posons le pied.</p>
      <div class="socials"><a href="${CONFIG.inviteUrl}" target="_blank" rel="noopener noreferrer" aria-label="Discord"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.2.4a18.4 18.4 0 0 1 4.5 2.3 15.9 15.9 0 0 0-15.4 0A18.4 18.4 0 0 1 8.8 3.4L8.6 3a19.8 19.8 0 0 0-4.9 1.4C.6 9.1-.3 13.6.1 18.1a20 20 0 0 0 6 3l1.3-2a12.5 12.5 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4a12.5 12.5 0 0 1-2 1l1.3 2a20 20 0 0 0 6-3c.5-5.2-.9-9.7-3.6-13.7ZM8.5 15.4c-1.2 0-2.1-1.1-2.1-2.4s1-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Zm7 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Z"/></svg></a></div>
    </div><div><h4>Navigation</h4><ul>${CONFIG.pages.map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join('')}</ul></div>
    <div><h4>Communauté</h4><ul><li><a href="${CONFIG.inviteUrl}" target="_blank" rel="noopener noreferrer">Serveur Discord</a></li><li><a href="#" data-copy-invite>Copier l'invitation</a></li><li><a href="rejoindre.html">Candidater</a></li></ul></div></div>
    <p class="copy">© ${new Date().getFullYear()} ${CONFIG.name} · Faction communautaire non affiliée à Mojang / Microsoft / Discord</p></footer>
    <div class="toast" id="toast" role="status" aria-live="polite"><span class="dot" aria-hidden="true"></span><span id="toastMsg"></span></div>`);
}

let toastTimer;
function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3200);
}
async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) return navigator.clipboard.writeText(text);
  const field = Object.assign(document.createElement('textarea'), { value: text, readOnly: true });
  field.style.cssText = 'position:fixed;left:-10000px;top:0';
  document.body.appendChild(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  if (!copied) throw new Error('Clipboard copy failed');
}
function bindCopy() {
  document.addEventListener('click', async (event) => {
    const trigger = event.target.closest('[data-copy-invite]');
    if (!trigger) return;
    event.preventDefault();
    try { await copyText(CONFIG.inviteUrl); showToast(`Invitation copiée : ${CONFIG.inviteUrl}`); }
    catch { showToast(`Copie impossible — ${CONFIG.inviteUrl}`, true); }
  });
}

function initCounters() {
  const animate = (target) => {
    const targetValue = Number(target.dataset.count);
    const suffix = target.dataset.suffix || '';
    if (reduceMotion) { target.textContent = `${targetValue}${suffix}`; return; }
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / 1800, 1);
      target.textContent = `${Math.round(targetValue * (1 - (1 - progress) ** 4))}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      animate(target);
      observer.unobserve(target);
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('[data-count]:not([data-discord])').forEach((element) => counterObserver.observe(element));
}
async function loadDiscordStats() {
  const members = document.querySelector('[data-discord="members"]');
  const online = document.querySelector('[data-discord="online"]');
  if (!members && !online) return;
  try {
    const response = await fetch('https://discord.com/api/v10/invites/KHTgbP7aTX?with_counts=true');
    if (!response.ok) throw new Error(`Discord returned ${response.status}`);
    const data = await response.json();
    if (members && data.approximate_member_count !== undefined) {
      members.textContent = data.approximate_member_count;
      members.removeAttribute('data-count');
    }
    if (online && data.approximate_presence_count !== undefined) {
      online.textContent = data.approximate_presence_count;
      online.removeAttribute('data-count');
    }
  } catch (error) {
    console.warn('Échec de récupération des statistiques Discord ; valeurs statiques conservées.', error);
    document.querySelectorAll('[data-count][data-discord]').forEach((element) => {
      if (element.dataset.count) animate(element);
    });
  }
}

function initReveal() {
  document.querySelectorAll('.split').forEach((element) => {
    const text = element.textContent;
    element.setAttribute('aria-label', text);
    element.replaceChildren(...[...text].map((character) => {
      const span = document.createElement('span');
      span.setAttribute('aria-hidden', 'true');
      span.textContent = character === ' ' ? '\u00a0' : character;
      return span;
    }));
  });
  if (reduceMotion || !('IntersectionObserver' in window)) {
    document.querySelectorAll('.reveal,.split').forEach((element) => element.classList.add('visible'));
    return;
  }
  const observer = new IntersectionObserver((entries, io) => entries.forEach(({ target, isIntersecting }) => {
    if (!isIntersecting) return;
    target.classList.add('visible');
    io.unobserve(target);
  }), { threshold: 0.12 });
  document.querySelectorAll('.reveal,.split').forEach((element) => observer.observe(element));
}
function initCursor() {
  if (isTouch) return;
  const cursor = document.getElementById('pixelCursor');
  document.addEventListener('mousemove', (event) => {
    cursor.style.left = `${event.clientX}px`;
    cursor.style.top = `${event.clientY}px`;
  });
  document.addEventListener('mouseover', (event) => {
    cursor.classList.toggle('hover', Boolean(event.target.closest('a,button,input,select,textarea')));
  });
}
function initCards() {
  if (isTouch || reduceMotion) return;
  document.querySelectorAll('.card[data-tilt]').forEach((card) => {
    card.addEventListener('mousemove', (event) => {
      const rect = card.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width - 0.5;
      const y = (event.clientY - rect.top) / rect.height - 0.5;
      card.style.transform = `perspective(700px) rotateX(${y * -3}deg) rotateY(${x * 3}deg) translateY(-2px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}
function initMagnetic() {
  if (isTouch || reduceMotion) return;
  document.querySelectorAll('.magnetic').forEach((button) => {
    button.addEventListener('mousemove', (event) => {
      const rect = button.getBoundingClientRect();
      button.style.translate = `${(event.clientX - rect.left - rect.width / 2) * 0.12}px ${(event.clientY - rect.top - rect.height / 2) * 0.12}px`;
    });
    button.addEventListener('mouseleave', () => { button.style.translate = ''; });
  });
}
function initNav() {
  const menu = document.getElementById('menu');
  const burger = document.getElementById('burger');
  const nav = document.getElementById('nav-shell');
  const bar = document.getElementById('progress');
  burger.addEventListener('click', () => {
    const open = burger.getAttribute('aria-expanded') !== 'true';
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Fermer le menu' : 'Ouvrir le menu');
    menu.classList.toggle('open', open);
  });
  menu.addEventListener('click', (event) => {
    if (!event.target.closest('a')) return;
    menu.classList.remove('open');
    burger.setAttribute('aria-expanded', 'false');
  });
  let previousY = 0;
  addEventListener('scroll', () => {
    const y = scrollY;
    const maxScroll = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = `${maxScroll > 0 ? (y / maxScroll) * 100 : 0}%`;
    nav.classList.toggle('hidden', y > previousY && y > 300 && !menu.classList.contains('open'));
    previousY = y;
  }, { passive: true });
}
function initTransitions() {
  let navigating = false;
  let failsafe;
  const curtain = document.getElementById('curtain');
  const resetTransition = () => {
    navigating = false;
    clearTimeout(failsafe);
    curtain?.classList.remove('in');
    document.documentElement.classList.remove('is-leaving');
  };
  addEventListener('pageshow', (event) => {
    // BFCache restaure DOM et classes tels quels : toujours retirer l’écran de transition.
    if (event.persisted || curtain?.classList.contains('in')) resetTransition();
  });
  addEventListener('pagehide', () => clearTimeout(failsafe));
  document.addEventListener('click', (event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const anchor = event.target.closest('a[href]');
    if (!anchor || anchor.hasAttribute('download') || (anchor.target && anchor.target.toLowerCase() !== '_self')) return;
    let destination;
    try { destination = new URL(anchor.href, location.href); } catch { return; }
    if (destination.origin !== location.origin || !['http:', 'https:'].includes(destination.protocol)) return;
    if (destination.pathname === location.pathname && destination.search === location.search) return; // #ancre / même URL
    if (!/\.html?$/i.test(destination.pathname) || navigating) return;
    navigating = true;
    if (reduceMotion) return; // Laisser le navigateur effectuer la navigation normale.
    event.preventDefault();
    document.documentElement.classList.add('is-leaving');
    curtain?.classList.add('in');
    // Le fallback évite une navigation bloquée si transitionend ne survient pas.
    failsafe = setTimeout(() => { location.assign(destination.href); }, 280);
  });
}

function initCanvas() {
  const canvas = document.getElementById('fx');
  const context = canvas.getContext('2d');
  let width = 0, height = 0, blocks = [];
  const resize = () => {
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    width = innerWidth; height = innerHeight;
    canvas.width = width * ratio; canvas.height = height * ratio;
    canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    blocks = Array.from({ length: Math.min(55, Math.floor(width * height / 24000)) }, () => ({
      x: Math.random() * width, y: Math.random() * height,
      vx: (Math.random() - 0.5) * 0.25, vy: (Math.random() - 0.5) * 0.25,
      size: Math.random() > 0.7 ? 4 : 3, gold: Math.random() > 0.72,
    }));
  };
  resize(); addEventListener('resize', resize, { passive: true });
  const draw = () => {
    context.clearRect(0, 0, width, height);
    blocks.forEach((block) => {
      block.x += block.vx; block.y += block.vy;
      if (block.x < 0) block.x = width; if (block.x > width) block.x = 0;
      if (block.y < 0) block.y = height; if (block.y > height) block.y = 0;
      context.fillStyle = block.gold ? 'rgba(245,197,66,.52)' : 'rgba(192,140,255,.42)';
      context.fillRect(Math.round(block.x), Math.round(block.y), block.size, block.size);
    });
    if (!reduceMotion) requestAnimationFrame(draw);
  };
  draw();
}
function initTyping() {
  const element = document.getElementById('typing');
  if (!element) return;
  let lines;
  try { lines = JSON.parse(element.dataset.lines); } catch { return; }
  if (!Array.isArray(lines) || !lines.length) return;
  if (reduceMotion) { element.textContent = lines[0]; return; }
  let line = 0, position = 0, deleting = false;
  const tick = () => {
    const text = lines[line];
    element.textContent = text.slice(0, position);
    if (!deleting && position === text.length) { deleting = true; setTimeout(tick, 2200); return; }
    if (deleting && position === 0) { deleting = false; line = (line + 1) % lines.length; }
    position += deleting ? -1 : 1;
    setTimeout(tick, deleting ? 25 : 55);
  };
  tick();
}
function initTimeline() {
  const timeline = document.querySelector('.timeline');
  const fill = document.querySelector('.timeline-fill');
  if (!timeline || !fill || reduceMotion) return;
  const update = () => {
    const rect = timeline.getBoundingClientRect();
    const progress = Math.min(Math.max((innerHeight * 0.6 - rect.top) / rect.height, 0), 1);
    fill.style.height = `${progress * 100}%`;
  };
  addEventListener('scroll', update, { passive: true }); addEventListener('resize', update); update();
}
function initFilters() {
  const buttons = [...document.querySelectorAll('.filter')];
  if (!buttons.length) return;
  buttons.forEach((button) => button.addEventListener('click', () => {
    buttons.forEach((item) => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    const filter = button.dataset.filter;
    document.querySelectorAll('.member').forEach((member) => {
      member.classList.toggle('hide', filter !== 'all' && member.dataset.role !== filter);
    });
  }));
}
function initAccordion() {
  document.querySelectorAll('.rule button').forEach((button) => button.addEventListener('click', () => {
    const rule = button.closest('.rule');
    const opening = button.getAttribute('aria-expanded') !== 'true';
    document.querySelectorAll('.rule').forEach((item) => {
      const itemButton = item.querySelector('button');
      const expanded = item === rule && opening;
      item.classList.toggle('open', expanded);
      itemButton.setAttribute('aria-expanded', String(expanded));
      item.querySelector('.rule-body').hidden = !expanded;
    });
  }));
}
function initForm() {
  const form = document.getElementById('applyForm');
  if (!form) return;
  const button = document.getElementById('applySubmit');
  const status = document.getElementById('formStatus');
  const warning = document.getElementById('ageWarning');
  const cooldownKey = 'overlord_application_sent_at';
  const cooldownMs = 10 * 60 * 1000;
  const setStatus = (message, error = false) => {
    if (!status) { showToast(message, error); return; }
    status.textContent = message;
    status.classList.toggle('error', error);
    status.classList.toggle('success', !error);
    status.hidden = false;
  };
  const field = (value, max = 1024) => String(value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim().slice(0, max) || '—';
  const setLoading = (loading) => {
    if (!button) return;
    button.disabled = loading;
    button.classList.toggle('is-loading', loading);
    const normal = button.querySelector('.submit-label');
    const busy = button.querySelector('.submit-loading');
    if (normal) normal.hidden = loading;
    if (busy) busy.hidden = !loading;
  };
  const updateAgeWarning = () => {
    const age = Number(form.elements.age?.value);
    if (warning) warning.hidden = !(age > 0 && age < 16);
  };
  form.elements.age?.addEventListener('input', updateAgeWarning);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (form.elements.website?.value) return; // honeypot
    updateAgeWarning();
    if (!form.reportValidity()) return;
    const webhookUrl = DISCORD_PROXY_URL.trim() || DISCORD_WEBHOOK_URL.trim();
    if (!webhookUrl) {
      setStatus('Configuration manquante : renseignez DISCORD_WEBHOOK_URL dans main.js ou activez le proxy Cloudflare.', true);
      return;
    }
    const now = Date.now();
    try {
      const lastSent = Number(localStorage.getItem(cooldownKey) || 0);
      if (lastSent && now - lastSent < cooldownMs) {
        const minutes = Math.ceil((cooldownMs - (now - lastSent)) / 60000);
        setStatus(`Une candidature a déjà été envoyée depuis cet appareil. Réessaie dans environ ${minutes} min.`, true);
        return;
      }
    } catch { /* Le stockage peut être désactivé ; l’envoi reste possible. */ }
    const values = Object.fromEntries(new FormData(form));
    const mc = String(values.mc || '').trim();
    if (!/^[A-Za-z0-9_]{3,16}$/.test(mc)) {
      form.elements.mc.setCustomValidity('Pseudo Minecraft invalide : 3 à 16 lettres, chiffres ou tirets bas.');
      form.reportValidity(); form.elements.mc.setCustomValidity('');
      return;
    }
    const underage = Number(values.age) < 16;
    const app = {
      mc, age: field(values.age, 3), underage,
      pvp: field(values.pvp, 20), raid: field(values.raid, 20),
      experience: field(values.experience, 1800), motivation: field(values.motivation, 1800),
      availability: field(values.availability, 300), discord: field(values.discord, 80),
    };
    const embed = {
      title: `Nouvelle candidature — ${mc}`,
      color: 0x9b4dff,
      fields: [
        { name: 'Pseudo IG', value: app.mc, inline: true },
        { name: 'Âge', value: `${app.age} ans${underage ? ' ⚠️ (moins de 16 ans — exception à examiner)' : ''}`, inline: true },
        { name: 'Discord', value: app.discord, inline: true },
        { name: 'Niveau PVP / Farm', value: `${app.pvp}/10`, inline: true },
        { name: 'Niveau Pillage / Build', value: `${app.raid}/10`, inline: true },
        { name: 'Expérience (serveurs déjà joués)', value: app.experience },
        { name: 'Motivation', value: app.motivation },
        { name: 'Disponibilités', value: app.availability },
      ].map((item) => ({ ...item, name: field(item.name, 256), value: field(item.value, 1024) })),
      thumbnail: { url: `https://mc-heads.net/avatar/${encodeURIComponent(mc)}` },
      timestamp: new Date().toISOString(),
      footer: { text: 'Recrutement Overlord · Candidature du site' },
    };
    setLoading(true);
    if (status) status.hidden = true;
    try {
      const payload = DISCORD_PROXY_URL.trim()
        ? { application: app }
        : { embeds: [embed], allowed_mentions: { parse: [] } };
      const response = await fetch(webhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) throw new Error(`Discord/proxy a répondu ${response.status}`);
      try { localStorage.setItem(cooldownKey, String(Date.now())); } catch { /* no-op */ }
      form.reset(); updateAgeWarning();
      setStatus('Candidature envoyée ! Les officiers Overlord vont l’examiner. Bonne chance, aventurier !');
    } catch (error) {
      console.error('Envoi de candidature impossible.', error);
      setStatus('Échec de l’envoi. Vérifie le webhook/proxy et ta connexion, puis réessaie.', true);
    } finally { setLoading(false); }
  });
}

const MEMBERS = [
  { mc: 'Anarchique_', uuid: '78237e3318a74a7c88834670473f483d', name: 'Anarchique', tag: '@3i2e', role: 'Overlord', status: 'on' },
  { mc: 'Zewoofr', uuid: 'ccbe35c712f94c9f908d3057019314b2', name: 'Zewoo', tag: '@zewofr', role: 'Overlord', status: 'on' },
  { mc: 'SucreGlace', uuid: '272e2831fb3347fa911724bcfe6b69ae', name: 'SucreGlace', tag: '@fan_2_nai', role: 'Gardien de Stratum', status: 'on' },
  { mc: 'HanTy14', uuid: 'da98c434453d420bb812390307e440f2', name: 'HanTy14', tag: '@hanty1444_', role: 'Gardien de Stratum', status: 'on' },
  { mc: 'SWHOOK', uuid: '65c570a7033f42888dcd1a87721f683d', name: 'SWHOOK', tag: '@swidow', role: 'Pléiade', status: 'on' },
  { mc: 'Wcodein', uuid: '2aba46c8b1d44e38a166de9eda2005f3', name: 'wcodein', tag: '@5tgl', role: 'Chinois Vénimeux', status: 'on' },
  { mc: 'WhiteScam', name: 'WhiteScam', tag: '@alvaroooo0669', role: 'Chevalier de Death', status: 'on' },
  { mc: '_IPA12', uuid: '2b935195a6504510b5c97dcddc6a12af', name: 'IPA', tag: '@fan_2_nai', role: 'Légionnaire Sombre', status: 'on' },
  { mc: 'NaGaZaKi_0', uuid: 'b4e54ff40c44442084e461f54370df1f', name: 'NaGaZaKi', tag: '@raphael_100807', role: 'Légionnaire Sombre', status: 'on' },
  { mc: 'romsteek', uuid: '48e3c69aaa8647ff98429e533a979753', name: 'romsteek', tag: '@romsteek', role: 'Légionnaire Sombre', status: 'on' },
];
const FALLBACK_HEAD = 'https://minotar.net/helm/MHF_Steve/104.png';
function headSources(member) {
  const encodedName = encodeURIComponent(member.mc.trim());
  const id = member.uuid || encodedName;
  return [
    `https://vzge.me/face/104/${id}.png`,
    `https://starlightskins.lunareclipse.studio/render/pixel/${id}/face`,
    `https://api.mineatar.io/face/${id}?scale=13&overlay=true`,
    `https://crafatar.com/avatars/${member.uuid || encodedName}?size=104&overlay`,
    `https://minotar.net/helm/${id}/104.png`, FALLBACK_HEAD,
  ];
}
function loadImage(source) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.crossOrigin = 'anonymous';
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}
async function renderSkinFace(image, member) {
  try {
    let skin;
    const id = member.uuid || member.mc.trim();
    try {
      const response = await fetch(`https://api.ashcon.app/mojang/v2/user/${encodeURIComponent(id)}`);
      if (response.ok) {
        const data = await response.json();
        if (data?.textures?.skin?.data) skin = await loadImage(`data:image/png;base64,${data.textures.skin.data}`);
      }
    } catch { /* Continue with alternate skin services. */ }
    if (!skin) {
      for (const source of [`https://minotar.net/skin/${encodeURIComponent(id)}`, `https://mc-heads.net/skin/${encodeURIComponent(id)}`]) {
        try { skin = await loadImage(source); break; } catch { /* Try the next service. */ }
      }
    }
    if (!skin) return;
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 104;
    const context = canvas.getContext('2d');
    context.imageSmoothingEnabled = false;
    context.drawImage(skin, 8, 8, 8, 8, 0, 0, 104, 104);
    context.drawImage(skin, 40, 8, 8, 8, 0, 0, 104, 104);
    image.onerror = null;
    image.src = canvas.toDataURL('image/png');
  } catch { /* Keep the available remote head image. */ }
}
function renderMembers() {
  const grid = document.getElementById('grid');
  if (!grid) return;
  grid.innerHTML = MEMBERS.map((member, index) => {
    const sources = headSources(member);
    const role = escapeHtml(member.role);
    return `<article class="card member reveal" data-tilt data-role="${role}">
      <a class="avatar" href="https://namemc.com/profile/${encodeURIComponent(member.mc)}" target="_blank" rel="noopener noreferrer" title="Profil NameMC de ${escapeHtml(member.mc)}">
        <img src="${sources[0]}" data-sources="${escapeHtml(JSON.stringify(sources))}" data-index="0" width="104" height="104" alt="Tête de ${escapeHtml(member.mc)}" referrerpolicy="no-referrer"><span class="status ${escapeHtml(member.status)}" aria-label="En ligne"></span>
      </a><h3>${escapeHtml(member.name || member.mc)}</h3><div class="tagd">${escapeHtml(member.tag)}</div><span class="role">${role}</span></article>`;
  }).join('');
  grid.querySelectorAll('img[data-sources]').forEach((image, index) => {
    renderSkinFace(image, MEMBERS[index]);
    image.addEventListener('error', () => {
      const sources = JSON.parse(image.dataset.sources);
      const index = Number(image.dataset.index) + 1;
      if (index >= sources.length) { image.onerror = null; return; }
      image.dataset.index = String(index); image.src = sources[index];
    });
  });
}

function init() {
  document.documentElement.classList.add('js-enabled');
  injectLayout();
  document.documentElement.classList.remove('js-pending');
  renderMembers();
  initCounters(); initReveal(); initCursor(); initCards(); initMagnetic(); initNav(); initTransitions();
  initCanvas(); initTyping(); initTimeline(); initFilters(); initAccordion(); initForm(); bindCopy();
  loadDiscordStats();
  addEventListener('load', () => setTimeout(() => document.getElementById('loader')?.classList.add('done'), reduceMotion ? 0 : 180), { once: true });
  setTimeout(() => document.getElementById('loader')?.classList.add('done'), 2500); // Failsafe si une ressource externe bloque load.
  addEventListener('pageshow', (event) => { if (event.persisted) { document.getElementById('curtain')?.classList.remove('in'); document.getElementById('loader')?.classList.add('done'); document.documentElement.classList.remove('is-leaving'); } });
}
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
