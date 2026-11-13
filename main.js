'use strict';

// Le webhook Discord reste exclusivement configuré comme secret du Worker.
const DISCORD_PROXY_URL = 'https://overlord-candidature.anarchique.workers.dev';
const API_BASE = 'https://overlord-candidature.anarchique.workers.dev';
let SITE_CONTENT = null;

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
const safeHttpUrl=(value,fallback='')=>{try{const u=new URL(String(value),location.href);return ['http:','https:'].includes(u.protocol)?u.href:fallback}catch{return fallback}};
const joinApiUrl=(base,path)=>`${String(base||'').replace(/\/+$/,'')}/${String(path||'').replace(/^\/+/, '')}`;

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
  const animate = (target, fromCurrent = false) => {
    const targetValue = Number(target.dataset.count);
    const suffix = target.dataset.suffix || '';
    if (!Number.isFinite(targetValue) || targetValue < 0) return;
    const current = fromCurrent ? (Number.parseInt(target.textContent,10) || 0) : 0;
    if (reduceMotion) { target.textContent = `${targetValue}${suffix}`; return; }
    const start = performance.now();
    const tick = (now) => {
      const progress = Math.min((now - start) / 900, 1);
      const eased = 1 - (1 - progress) ** 4;
      target.textContent = `${Math.round(current + (targetValue-current)*eased)}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  };
  const counters = document.querySelectorAll('[data-count]');
  if (!('IntersectionObserver' in window)) { counters.forEach(animate); return; }
  const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(({ target, isIntersecting }) => {
      if (!isIntersecting) return;
      animate(target);
      observer.unobserve(target);
    });
  }, { threshold: 0.5 });
  counters.forEach((element) => counterObserver.observe(element));
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
  let sending = false;
  const setStatus = (message, error = false) => {
    if (!status) { showToast(message, error); return; }
    status.textContent = message;
    status.classList.toggle('error', error);
    status.classList.toggle('success', !error);
    status.hidden = false;
  };
  const setLoading = (loading) => {
    if (!button) return;
    button.disabled = loading;
    button.classList.toggle('is-loading', loading);
    const normal = button.querySelector('.submit-label');
    const busy = button.querySelector('.submit-loading');
    if (normal) normal.hidden = loading;
    if (busy) busy.hidden = !loading;
  };
  const value = (name) => String(form.elements[name]?.value ?? '').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').trim();
  const updateAgeWarning = () => {
    const age = Number(form.elements.age?.value);
    if (warning) warning.hidden = !(age > 0 && age < 16);
  };
  form.elements.age?.addEventListener('input', updateAgeWarning);
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (sending) return;
    if (form.elements.website?.value) return; // Honeypot.
    updateAgeWarning();
    if (!form.reportValidity()) return;

    const mc = value('mc');
    if (!/^[A-Za-z0-9_]{3,16}$/.test(mc)) {
      form.elements.mc.setCustomValidity('Pseudo Minecraft invalide : 3 à 16 caractères, lettres, chiffres ou tiret bas.');
      form.reportValidity(); form.elements.mc.setCustomValidity('');
      return;
    }
    const ageRaw = value('age');
    const age = Number(ageRaw);
    if (!/^\d+$/.test(ageRaw) || !Number.isInteger(age) || age < 1 || age > 99) {
      form.elements.age.setCustomValidity('Âge invalide : indique un âge entier de 1 à 99 ans.');
      form.reportValidity(); form.elements.age.setCustomValidity('');
      return;
    }
    const motivation = value('motivation');
    if (motivation.length < 50) {
      form.elements.motivation.setCustomValidity('La motivation doit contenir au moins 50 caractères.');
      form.reportValidity(); form.elements.motivation.setCustomValidity('');
      return;
    }
    for (const name of ['pvp', 'raid', 'experience', 'availability']) {
      if (!value(name)) { form.elements[name]?.focus(); setStatus(`Le champ « ${name} » est obligatoire.`, true); return; }
    }

    const now = Date.now();
    try {
      const lastSent = Number(sessionStorage.getItem(cooldownKey) || 0);
      if (lastSent && now - lastSent < cooldownMs) {
        const minutes = Math.ceil((cooldownMs - (now - lastSent)) / 60000);
        setStatus(`Une candidature a déjà été envoyée depuis cet appareil. Réessaie dans environ ${minutes} min.`, true);
        return;
      }
    } catch { /* Le stockage désactivé ne bloque pas l’envoi. */ }

    const baseUrl = safeHttpUrl(DISCORD_PROXY_URL);
    if (!baseUrl) {
      setStatus('Le service de candidature est indisponible : URL du Worker invalide.', true);
      return;
    }
    // Whitelist explicite : aucun champ technique/personnalisé n’est envoyé au Worker.
    const app = {
      mc, age,
      pvp: value('pvp').slice(0, 20),
      raid: value('raid').slice(0, 20),
      experience: value('experience').slice(0, 1800),
      motivation: motivation.slice(0, 1800),
      availability: value('availability').slice(0, 300),
      ...(value('discord') ? { discord: value('discord').slice(0, 80) } : {}),
    };

    sending = true;
    setLoading(true);
    if (status) status.hidden = true;
    try {
      const response = await fetch(joinApiUrl(baseUrl, 'candidature'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ application: app }),
      });
      let result = {};
      try { result = await response.json(); } catch { /* handled with HTTP status below */ }
      if (!response.ok) {
        let message = typeof result.error === 'string' ? result.error : `Le service a répondu avec l’erreur ${response.status}.`;
        if (response.status === 429) {
          const seconds = Math.max(1, Number(response.headers.get('Retry-After')) || 0);
          if (seconds && !/\\d+\\s*seconde/i.test(message)) message += ` Réessaie dans ${seconds} seconde${seconds > 1 ? 's' : ''}.`;
        }
        throw new Error(message);
      }
      try { sessionStorage.setItem(cooldownKey, String(Date.now())); } catch { /* no-op */ }
      form.reset(); updateAgeWarning();
      setStatus('Candidature envoyée ! Les officiers Overlord vont l’examiner. Bonne chance, aventurier !');
    } catch (error) {
      console.error('Envoi de candidature impossible.', error);
      setStatus(error instanceof Error ? error.message : 'Échec de l’envoi. Réessaie plus tard.', true);
    } finally {
      sending = false;
      setLoading(false);
    }
  });
}

const FALLBACK_MEMBERS = [
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
const FALLBACK_HEAD = 'https://minotar.net/helm/MHF_Steve/128.png';
function headSources(member) {
  const encodedName = encodeURIComponent(String(member.mc || '').trim());
  const uuid = String(member.uuid || '').replace(/-/g, '');
  const validUuid = /^[a-f0-9]{32}$/i.test(uuid);
  const sources = [
    `https://mc-heads.net/avatar/${encodedName}/128`,
    `https://minotar.net/helm/${encodedName}/128.png`,
  ];
  if (validUuid) sources.push(`https://crafatar.com/avatars/${uuid}?size=128&overlay`);
  // Keep existing providers as alternatives after the requested services.
  sources.push(
    `https://vzge.me/face/128/${validUuid ? uuid : encodedName}.png`,
    `https://api.mineatar.io/face/${validUuid ? uuid : encodedName}?scale=16&overlay=true`,
    `https://starlightskins.lunareclipse.studio/render/pixel/${validUuid ? uuid : encodedName}/face`,
    FALLBACK_HEAD,
  );
  return sources;
}
function memberAvatarSources(member) {
  const custom = safeHttpUrl(member.avatar);
  const sources = [...(custom ? [custom] : []), ...headSources(member).map(url => safeHttpUrl(url)).filter(Boolean)];
  return [...new Set(sources)];
}
function setAvatarSource(image, sources) {
  image.dataset.sources = JSON.stringify(sources);
  image.dataset.index = '0';
  image.onerror = () => {
    const next = Number(image.dataset.index) + 1;
    if (next >= sources.length) { image.onerror = null; return; }
    image.dataset.index = String(next);
    image.src = sources[next];
  };
  image.src = sources[0];
}
function renderMembers() {
  const grid = document.getElementById('grid');
  if (!grid) return;
  const members = Array.isArray(SITE_CONTENT?.members) ? SITE_CONTENT.members : FALLBACK_MEMBERS;
  const ranks = Array.isArray(SITE_CONTENT?.ranks) ? SITE_CONTENT.ranks : [];
  const filters = document.querySelector('.filters');
  if (filters && ranks.length) {
    filters.replaceChildren();
    [['all','Tous'], ...ranks.slice().sort((a,b)=>(a.order||0)-(b.order||0)).map(r=>[r.name,r.name])].forEach(([key,label],i)=>{
      const button=document.createElement('button');button.type='button';button.className=`filter${i===0?' active':''}`;button.dataset.filter=key;button.setAttribute('aria-pressed',String(i===0));button.textContent=label;filters.append(button);
    });
  }
  grid.replaceChildren();
  members.forEach((member,index)=>{
    const safeName=String(member.mc||'').slice(0,16);if(!/^[A-Za-z0-9_]{3,16}$/.test(safeName))return;const sources=memberAvatarSources({...member,mc:safeName});
    const article=document.createElement('article');article.className='card member reveal';article.dataset.tilt='';article.dataset.role=String(member.role||'').slice(0,80);
    const link=document.createElement('a');link.className='avatar';link.href=`https://namemc.com/profile/${encodeURIComponent(safeName)}`;link.target='_blank';link.rel='noopener noreferrer';link.title=`Profil NameMC de ${safeName}`;
    const image=document.createElement('img');image.width=image.height=104;image.alt=`Tête de ${safeName}`;image.referrerPolicy='no-referrer';image.loading='lazy';image.decoding='async';image.style.imageRendering='pixelated';setAvatarSource(image,sources);link.append(image);
    const indicator=document.createElement('span');indicator.className=`status ${member.status==='on'?'on':'off'}`;indicator.setAttribute('aria-label',member.status==='on'?'En ligne':'Hors ligne');link.append(indicator);
    const heading=document.createElement('h3');heading.textContent=String(member.name||safeName).slice(0,100);const tag=document.createElement('div');tag.className='tagd';tag.textContent=String(member.tag||'').slice(0,100);
    const badge=document.createElement('span');badge.className='role';badge.textContent=String(member.role||'').slice(0,80);const rank=ranks.find(item=>item.name===member.role);if(/^#[0-9a-fA-F]{6}$/.test(rank?.color||'')){badge.style.setProperty('--rank-color',rank.color);badge.style.borderColor=rank.color;badge.style.backgroundColor=rank.color;badge.style.color='#fff';}
    article.append(link,heading,tag,badge);grid.append(article);
  });
}

async function loadSiteContent() {
  try {
    const response = await fetch(`${API_BASE}/api/content`, { headers: { Accept: 'application/json' }, cache: 'no-store' });
    if (!response.ok) return;
    const result = await response.json();
    SITE_CONTENT = result.content || null;
    if (!SITE_CONTENT) return;
    applySiteSettings(); applyHomeContent(); applyLoreContent(); applyRulesContent(); applyJoinContent(); await refreshDiscordStats(false);
  } catch (error) { console.warn('Contenu dynamique indisponible ; contenu local conservé.', error); await refreshDiscordStats(false); }
}
function setText(selector,value) { const node=document.querySelector(selector); if(node && value!==undefined)node.textContent=String(value); }
function normalizeStatLabel(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('fr').replace(/[^a-z0-9]+/g,' ').trim()}
function discordStatNodes(){const found={};document.querySelectorAll('.stats .stat').forEach(card=>{const label=normalizeStatLabel(card.querySelector('[data-stat-label]')?.textContent),key=card.dataset.statKey;const target=card.querySelector('b[data-count]');if(key==='members'||label==='membres')found.members=target;if(key==='online'||label==='en ligne'||label==='enligne')found.online=target});return found}
function applyDiscordStats(stats,animateRefresh=false){const nodes=discordStatNodes();for(const [key,node] of Object.entries(nodes)){const value=Number(stats?.[key]);if(!node||!Number.isFinite(value)||value<0)continue;node.dataset.count=String(value);node.dataset.discordStat=key;if(animateRefresh)animateStatFromCurrent(node);else node.textContent=`${value}${node.dataset.suffix||''}`}}
function animateStatFromCurrent(node){const target=Number(node.dataset.count),suffix=node.dataset.suffix||'',from=Number.parseInt(node.textContent,10)||0;if(!Number.isFinite(target))return;if(reduceMotion){node.textContent=`${target}${suffix}`;return}const started=performance.now();const step=now=>{const p=Math.min((now-started)/900,1),eased=1-(1-p)**4;node.textContent=`${Math.round(from+(target-from)*eased)}${suffix}`;if(p<1)requestAnimationFrame(step)};requestAnimationFrame(step)}
async function refreshDiscordStats(animateRefresh=false){try{const response=await fetch(`${API_BASE}/api/discord-stats`,{headers:{Accept:'application/json'},cache:'no-store'});if(!response.ok)return;const result=await response.json();applyDiscordStats(result,animateRefresh)}catch(error){console.warn('Statistiques Discord indisponibles ; valeurs du panneau conservées.',error)}}
function applySiteSettings() {
  const settings=SITE_CONTENT?.settings;if(!settings)return;
  if(typeof settings.name==='string'&&settings.name.trim())document.title=document.title.replace(/Overlord/gi,settings.name);
  document.querySelectorAll('a[href^="https://discord.gg/"]').forEach(a=>{if(settings.discordInvite){const valid=safeHttpUrl(settings.discordInvite);if(valid){CONFIG.inviteUrl=valid;a.href=valid}}});
  document.querySelectorAll('[data-copy-invite]').forEach(a=>a.dataset.invite=safeHttpUrl(settings.discordInvite,CONFIG.inviteUrl));
  document.querySelectorAll('.nav-shell .logo,.f-grid .logo').forEach(node=>{const image=node.querySelector('img');node.textContent=settings.name||CONFIG.name;if(image)node.prepend(image)});
  if(settings.footerText){const copy=document.querySelector('.copy');if(copy)copy.textContent=settings.footerText}
  if(settings.serverIp){const node=document.querySelector('[data-server-ip]');if(node)node.textContent=settings.serverIp}
}
function applyHomeContent() {
  const data=SITE_CONTENT?.home;if(!data)return;
  const hero=document.querySelector('.hero');if(!hero)return;
  if(data.eyebrow)setText('.hero .eyebrow',data.eyebrow);if(data.title)setText('.hero h1',data.title);if(Array.isArray(data.taglines)){const typing=document.getElementById('typing');if(typing)typing.dataset.lines=JSON.stringify(data.taglines)}
  if(data.ctaTitle)setText('.cta h2',data.ctaTitle);if(data.ctaText)setText('.cta p',data.ctaText);
  if(Array.isArray(data.stats)){
    const cards=document.querySelectorAll('.stats .stat');
    cards.forEach((card,i)=>{
      const item=data.stats[i],number=card.querySelector('b'),label=card.querySelector('[data-stat-label]');
      if(!item){card.hidden=true;return} card.hidden=false;
      if(number){const value=Number(item.value);if(Number.isFinite(value)&&value>=0){number.dataset.count=String(value);number.dataset.suffix=String(item.suffix||'');number.textContent=`${value}${number.dataset.suffix}`}}
      if(label)label.textContent=String(item.label||'');
    });
  }
  if(Array.isArray(data.features))data.features.slice(0,6).forEach((item,i)=>{const card=document.querySelectorAll('#pourquoi .card')[i];if(!card)return;setNodeText(card,'.icon',item.icon||'✦');setNodeText(card,'h3',item.title||'');setNodeText(card,'p',item.text||'')});
}

function setNodeText(root,selector,value){const node=root.querySelector(selector);if(node)node.textContent=String(value??'')}
function applyLoreContent(){const entries=SITE_CONTENT?.lore;if(!Array.isArray(entries))return;const timeline=document.querySelector('.timeline');if(!timeline)return;timeline.replaceChildren();const fill=document.createElement('div');fill.className='timeline-fill';fill.setAttribute('aria-hidden','true');timeline.append(fill);entries.forEach(item=>{const wrap=document.createElement('div');wrap.className='tl-item reveal';const date=document.createElement('span');date.className='tl-date';date.textContent=item.date||'';const article=document.createElement('article');article.className='card';const h=document.createElement('h2');h.textContent=item.title||'';const p=document.createElement('p');p.textContent=item.text||'';article.append(h,p);wrap.append(date,article);timeline.append(wrap)});}
function applyRulesContent(){const categories=SITE_CONTENT?.rules;if(!Array.isArray(categories))return;const root=document.querySelector('.rules');if(!root)return;root.replaceChildren();categories.forEach(category=>{const section=document.createElement('section');section.className='rule-category';if(category.name){const title=document.createElement('h2');title.textContent=category.name;section.append(title)};(category.items||[]).forEach(item=>{const card=document.createElement('article');card.className='card rule reveal';const h=document.createElement('h2');const button=document.createElement('button');button.type='button';button.setAttribute('aria-expanded','false');button.textContent=item.title||'';h.append(button);const body=document.createElement('div');body.className='rule-body';body.hidden=true;const p=document.createElement('p');p.textContent=item.text||'';body.append(p);if(item.sanction){const sanction=document.createElement('span');sanction.className='sanction';sanction.textContent=`Sanction : ${item.sanction}`;p.append(document.createElement('br'),sanction)}card.append(h,body);section.append(card)});root.append(section)});initAccordion()}
function applyJoinContent(){const data=SITE_CONTENT?.join;if(!data)return;if(data.eyebrow)setText('.page-hero .eyebrow',data.eyebrow);if(data.title)setText('.page-hero h1',data.title);if(data.intro)setText('.page-hero p',data.intro);if(data.formTitle)setText('.form-heading h3',data.formTitle);if(data.formDescription)setText('.form-heading p',data.formDescription);if(Array.isArray(data.questions))data.questions.forEach(q=>{const control=document.querySelector(`[name="${CSS.escape(q.name)}"]`);const field=control?.closest('.field');if(field){field.hidden=q.enabled===false;control.required=q.required!==false&&q.enabled!==false;if(q.label)setNodeText(field,'label',q.label)}})}
function init() {
  document.documentElement.classList.add('js-enabled');
  injectLayout();
  document.documentElement.classList.remove('js-pending');
  loadSiteContent().finally(() => { initCounters(); renderMembers(); initReveal(); initFilters(); initAccordion(); initTyping(); });
  setInterval(() => refreshDiscordStats(true), 60000);
  renderMembers();
  initReveal(); initCursor(); initCards(); initMagnetic(); initNav(); initTransitions();
  initCanvas(); initTyping(); initTimeline(); initFilters(); initAccordion(); initForm(); bindCopy();
  addEventListener('load', () => setTimeout(() => document.getElementById('loader')?.classList.add('done'), reduceMotion ? 0 : 180), { once: true });
  setTimeout(() => document.getElementById('loader')?.classList.add('done'), 2500); // Failsafe si une ressource externe bloque load.
  addEventListener('pageshow', (event) => { if (event.persisted) { document.getElementById('curtain')?.classList.remove('in'); document.getElementById('loader')?.classList.add('done'); document.documentElement.classList.remove('is-leaving'); } });
}
document.documentElement.classList.add('js-pending');setTimeout(()=>document.documentElement.classList.remove('js-pending'),2500);
if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
else init();
