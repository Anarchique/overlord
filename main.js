/* ===== main.js — Logique partagée (version complète) ===== */
const CONFIG = {
  name: 'VOIDBORN',
  invite: 'voidborn', // Code d'invitation Discord (discord.gg/xxxx)
  get inviteUrl() { return `https://discord.gg/${this.invite}`; },
  socials: {
    youtube: 'https://youtube.com/@voidborn',
    twitter: 'https://x.com/voidborn',
    tiktok: 'https://tiktok.com/@voidborn',
  },
};

const ICONS = {
  discord: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M20.3 4.4A19.8 19.8 0 0 0 15.4 3l-.2.4a18.4 18.4 0 0 1 4.5 2.3 15.9 15.9 0 0 0-15.4 0A18.4 18.4 0 0 1 8.8 3.4L8.6 3a19.8 19.8 0 0 0-4.9 1.4C.6 9.1-.3 13.6.1 18.1a20 20 0 0 0 6 3l1.3-2a12.5 12.5 0 0 1-2-1l.5-.4a14.2 14.2 0 0 0 12.2 0l.5.4a12.5 12.5 0 0 1-2 1l1.3 2a20 20 0 0 0 6-3c.5-5.2-.9-9.7-3.6-13.7ZM8.5 15.4c-1.2 0-2.1-1.1-2.1-2.4s1-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Zm7 0c-1.2 0-2.1-1.1-2.1-2.4s.9-2.4 2.1-2.4 2.2 1.1 2.1 2.4c0 1.3-.9 2.4-2.1 2.4Z"/></svg>',
  youtube: '<svg viewBox="0 0 24 24"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8ZM9.6 15.6V8.4l6.2 3.6-6.2 3.6Z"/></svg>',
  twitter: '<svg viewBox="0 0 24 24"><path d="M18.2 2h3.4l-7.4 8.5L23 22h-6.8l-5.3-7-6.1 7H1.4l7.9-9.1L1 2h7l4.8 6.4L18.2 2Zm-1.2 18h1.9L7.1 3.9H5.1L17 20Z"/></svg>',
  tiktok: '<svg viewBox="0 0 24 24"><path d="M19.6 6.7a4.8 4.8 0 0 1-3.8-4.2V2h-3.5v13.7a2.9 2.9 0 1 1-2-2.8V9.3a6.4 6.4 0 1 0 5.5 6.4V8.5a8.3 8.3 0 0 0 4.8 1.5V6.7h-1Z"/></svg>',
};

const PAGES = [
  ['index.html', 'Accueil'], ['lore.html', 'Lore'], ['membres.html', 'Membres'],
  ['regles.html', 'Règles'], ['rejoindre.html', 'Rejoindre'],
];
const current = location.pathname.split('/').pop() || 'index.html';
const isTouch = matchMedia('(hover:none)').matches;

/* ===== Injection du layout commun (nav, footer, fond, toast...) ===== */
function injectLayout() {
  document.body.insertAdjacentHTML('afterbegin', `
    <div class="loader" id="loader"><div><div class="loader-logo">${CONFIG.name}</div><div class="loader-bar"><i></i></div></div></div>
    <div class="curtain" id="curtain"><i></i><i></i><i></i><i></i><i></i></div>
    <div class="progress" id="progress"></div>
    <div class="aurora"><i></i><i></i><i></i></div>
    <canvas id="fx"></canvas>
    <div class="grain"></div>
    <div class="cursor" id="cursor"></div><div class="cursor-dot" id="cursorDot"></div>
    <nav id="nav">
      <a href="index.html" class="logo">${CONFIG.name}</a>
      <ul id="menu">${PAGES.map(([h, l]) => `<li><a href="${h}" class="${h === current ? 'active' : ''}">${l}</a></li>`).join('')}</ul>
      <a href="${CONFIG.inviteUrl}" target="_blank" rel="noopener" class="btn btn-discord nav-cta magnetic">${ICONS.discord}Discord</a>
      <button class="burger" id="burger" aria-label="Menu">☰</button>
    </nav>`);

  document.body.insertAdjacentHTML('beforeend', `
    <footer>
      <div class="f-grid">
        <div>
          <div class="logo">${CONFIG.name}</div>
          <p style="color:var(--muted);font-size:.9rem;margin-top:10px;max-width:340px">Faction Discord Minecraft. Stratégie, entraide et domination — sur tous les serveurs où nous posons le pied.</p>
          <div class="socials">
            <a href="${CONFIG.inviteUrl}" target="_blank" rel="noopener" aria-label="Discord">${ICONS.discord}</a>
            <a href="${CONFIG.socials.youtube}" target="_blank" rel="noopener" aria-label="YouTube">${ICONS.youtube}</a>
            <a href="${CONFIG.socials.twitter}" target="_blank" rel="noopener" aria-label="X">${ICONS.twitter}</a>
            <a href="${CONFIG.socials.tiktok}" target="_blank" rel="noopener" aria-label="TikTok">${ICONS.tiktok}</a>
          </div>
        </div>
        <div><h4>Navigation</h4><ul>${PAGES.map(([h, l]) => `<li><a href="${h}">${l}</a></li>`).join('')}</ul></div>
        <div><h4>Communauté</h4><ul>
          <li><a href="${CONFIG.inviteUrl}" target="_blank" rel="noopener">Serveur Discord</a></li>
          <li><a href="#" data-copy-invite>Copier l'invitation</a></li>
          <li><a href="rejoindre.html">Candidater</a></li>
        </ul></div>
      </div>
      <p class="copy">© ${new Date().getFullYear()} ${CONFIG.name} · Faction communautaire non affiliée à Mojang / Microsoft / Discord</p>
    </footer>
    <div class="toast" id="toast" role="status" aria-live="polite"><span class="dot"></span><span id="toastMsg"></span></div>`);
}

/* ===== Toast ===== */
let toastTimer;
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  document.getElementById('toastMsg').textContent = msg;
  t.classList.toggle('error', isError);
  t.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove('show'), 3200);
}

/* ===== Copie presse-papier (API + fallback) ===== */
async function copyText(text) {
  if (navigator.clipboard?.writeText && window.isSecureContext) return navigator.clipboard.writeText(text);
  const ta = Object.assign(document.createElement('textarea'), { value: text });
  ta.style.cssText = 'position:fixed;opacity:0';
  document.body.appendChild(ta); ta.select();
  const ok = document.execCommand('copy'); ta.remove();
  if (!ok) throw new Error('copy failed');
}
function bindCopy() {
  document.addEventListener('click', async e => {
    const el = e.target.closest('[data-copy-invite]');
    if (!el) return;
    e.preventDefault();
    try { await copyText(CONFIG.inviteUrl); showToast(`Invitation copiée : ${CONFIG.inviteUrl}`); }
    catch { showToast(`Copie impossible — ${CONFIG.inviteUrl}`, true); }
  });
}

/* ===== Compteurs animés ===== */
const counterIO = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    const el = e.target, target = +el.dataset.count, suffix = el.dataset.suffix || '', t0 = performance.now();
    const step = now => {
      const p = Math.min((now - t0) / 1800, 1);
      el.textContent = Math.round(target * (1 - Math.pow(1 - p, 4))) + suffix;
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
    counterIO.unobserve(el);
  });
}, { threshold: .5 });

/* ===== Stats Discord en direct (API publique des invitations) ===== */
async function loadDiscordStats() {
  const total = document.querySelector('[data-discord="members"]');
  const online = document.querySelector('[data-discord="online"]');
  try {
    if (total || online) {
      const res = await fetch(`https://discord.com/api/v10/invites/${CONFIG.invite}?with_counts=true`);
      if (!res.ok) throw new Error();
      const d = await res.json();
      if (total) total.dataset.count = d.approximate_member_count;
      if (online) online.dataset.count = d.approximate_presence_count;
    }
  } catch { /* fallback : valeurs data-count écrites dans le HTML */ }
  document.querySelectorAll('[data-count]').forEach(el => counterIO.observe(el));
}

/* ===== Reveal + titres lettre par lettre ===== */
function initReveal() {
  document.querySelectorAll('.split').forEach(el => {
    const text = el.textContent;
    el.setAttribute('aria-label', text);
    el.innerHTML = [...text].map((c, i) =>
      `<span class="char" aria-hidden="true" style="transition-delay:${i * 35}ms">${c === ' ' ? '&nbsp;' : c}</span>`).join('');
  });
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      if (e.target.classList.contains('reveal')) {
        const sibs = [...e.target.parentElement.children].filter(c => c.classList.contains('reveal'));
        e.target.style.transitionDelay = `${(Math.max(0, sibs.indexOf(e.target)) % 8) * 90}ms`;
      }
      e.target.classList.add('visible');
      io.unobserve(e.target);
    });
  }, { threshold: .12 });
  document.querySelectorAll('.reveal, .split').forEach(el => io.observe(el));
}

/* ===== Curseur custom ===== */
function initCursor() {
  if (isTouch) return;
  const c = document.getElementById('cursor'), d = document.getElementById('cursorDot');
  let mx = innerWidth / 2, my = innerHeight / 2, cx = mx, cy = my;
  addEventListener('mousemove', e => { mx = e.clientX; my = e.clientY; d.style.transform = `translate(${mx - 3}px,${my - 3}px)`; });
  (function loop() {
    cx += (mx - cx) * .15; cy += (my - cy) * .15;
    c.style.transform = `translate(${cx}px,${cy}px) translate(-50%,-50%)`;
    requestAnimationFrame(loop);
  })();
  document.addEventListener('mouseover', e => c.classList.toggle('hover', !!e.target.closest('a,button,.card,input,select,textarea')));
}

/* ===== Cartes : tilt 3D + spotlight ===== */
function initCards() {
  document.querySelectorAll('.card').forEach(card => {
    card.addEventListener('mousemove', e => {
      const r = card.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
      card.style.setProperty('--x', `${x}px`); card.style.setProperty('--y', `${y}px`);
      if (card.dataset.tilt === undefined || isTouch) return;
      const rx = (y / r.height - .5) * -10, ry = (x / r.width - .5) * 10;
      card.style.transform = `perspective(900px) rotateX(${rx}deg) rotateY(${ry}deg) translateY(-6px)`;
    });
    card.addEventListener('mouseleave', () => { card.style.transform = ''; });
  });
}

/* ===== Boutons magnétiques ===== */
function initMagnetic() {
  if (isTouch) return;
  document.querySelectorAll('.magnetic').forEach(b => {
    b.addEventListener('mousemove', e => {
      const r = b.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * .3;
      const y = (e.clientY - r.top - r.height / 2) * .4;
      b.style.transform = `translate(${x}px,${y}px)`;
    });
    b.addEventListener('mouseleave', () => { b.style.transform = ''; });
  });
}

/* ===== Nav : burger, auto-hide, barre de progression ===== */
function initNav() {
  const nav = document.getElementById('nav'), menu = document.getElementById('menu');
  const bar = document.getElementById('progress');
  document.getElementById('burger').addEventListener('click', () => menu.classList.toggle('open'));
  let lastY = 0;
  addEventListener('scroll', () => {
    const y = scrollY, h = document.documentElement.scrollHeight - innerHeight;
    bar.style.width = `${h > 0 ? (y / h) * 100 : 0}%`;
    nav.classList.toggle('hidden', y > lastY && y > 300 && !menu.classList.contains('open'));
    lastY = y;
  }, { passive: true });
}

/* ===== Transitions de page (rideau) ===== */
function initTransitions() {
  const curtain = document.getElementById('curtain');
  document.addEventListener('click', e => {
    const a = e.target.closest('a[href]');
    if (!a || a.target === '_blank' || e.ctrlKey || e.metaKey) return;
    const href = a.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('http') || !href.endsWith('.html')) return;
    e.preventDefault();
    curtain.classList.add('in');
    setTimeout(() => { location.href = href; }, 650);
  });
  addEventListener('pageshow', e => { if (e.persisted) curtain.classList.remove('in'); });
}

/* ===== Fond canvas : étoiles/particules reliées + réaction souris ===== */
function initCanvas() {
  const cv = document.getElementById('fx'), ctx = cv.getContext('2d');
  let w, h, parts = [];
  const mouse = { x: -999, y: -999 };
  const resize = () => {
    w = cv.width = innerWidth; h = cv.height = innerHeight;
    const n = Math.min(110, Math.floor(w * h / 15000));
    parts = Array.from({ length: n }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - .5) * .35, vy: (Math.random() - .5) * .35 - .1,
      r: Math.random() * 1.8 + .4, gold: Math.random() > .75,
    }));
  };
  resize(); addEventListener('resize', resize);
  addEventListener('mousemove', e => { mouse.x = e.clientX; mouse.y = e.clientY; });
  (function draw() {
    ctx.clearRect(0, 0, w, h);
    for (const p of parts) {
      const dx = p.x - mouse.x, dy = p.y - mouse.y, d = Math.hypot(dx, dy);
      if (d < 140) { p.x += dx / d * 1.2; p.y += dy / d * 1.2; }
      p.x += p.vx; p.y += p.vy;
      if (p.x < 0) p.x = w; if (p.x > w) p.x = 0;
      if (p.y < 0) p.y = h; if (p.y > h) p.y = 0;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7);
      ctx.fillStyle = p.gold ? 'rgba(245,197,66,.9)' : 'rgba(192,132,252,.85)';
      ctx.shadowBlur = 12; ctx.shadowColor = p.gold ? '#f5c542' : '#9d4dff';
      ctx.fill();
    }
    ctx.shadowBlur = 0;
    for (let i = 0; i < parts.length; i++) for (let j = i + 1; j < parts.length; j++) {
      const d = Math.hypot(parts[i].x - parts[j].x, parts[i].y - parts[j].y);
      if (d < 110) {
        ctx.strokeStyle = `rgba(157,77,255,${.18 * (1 - d / 110)})`;
        ctx.beginPath(); ctx.moveTo(parts[i].x, parts[i].y); ctx.lineTo(parts[j].x, parts[j].y); ctx.stroke();
      }
    }
    requestAnimationFrame(draw);
  })();
}

/* ===== Effet machine à écrire (slogan) ===== */
function initTyping() {
  const el = document.getElementById('typing');
  if (!el) return;
  const lines = JSON.parse(el.dataset.lines);
  let l = 0, c = 0, del = false;
  (function tick() {
    const txt = lines[l];
    el.textContent = txt.slice(0, c);
    if (!del && c === txt.length) { del = true; return setTimeout(tick, 2200); }
    if (del && c === 0) { del = false; l = (l + 1) % lines.length; }
    c += del ? -1 : 1;
    setTimeout(tick, del ? 25 : 55);
  })();
}

/* ===== Parallaxe de l'orbe du hero ===== */
function initParallax() {
  const orb = document.querySelector('.orb');
  if (!orb) return;
  addEventListener('scroll', () => { orb.style.opacity = Math.max(0, .35 - scrollY / 1800); }, { passive: true });
}

/* ===== Timeline : remplissage au scroll ===== */
function initTimeline() {
  const tl = document.querySelector('.timeline'), fill = document.querySelector('.timeline-fill');
  if (!tl || !fill) return;
  const update = () => {
    const r = tl.getBoundingClientRect();
    const p = Math.min(Math.max((innerHeight * .6 - r.top) / r.height, 0), 1);
    fill.style.height = `${p * 100}%`;
  };
  addEventListener('scroll', update, { passive: true }); update();
}

/* ===== Membres : filtres par rôle ===== */
function initFilters() {
  const btns = document.querySelectorAll('.filter');
  if (!btns.length) return;
  btns.forEach(b => b.addEventListener('click', () => {
    btns.forEach(x => x.classList.remove('active')); b.classList.add('active');
    const f = b.dataset.filter;
    document.querySelectorAll('.member').forEach(m => m.classList.toggle('hide', f !== 'all' && m.dataset.role !== f));
  }));
}

/* ===== Règles : accordéon ===== */
function initAccordion() {
  document.querySelectorAll('.rule button').forEach(b => b.addEventListener('click', () => {
    const rule = b.parentElement, wasOpen = rule.classList.contains('open');
    document.querySelectorAll('.rule.open').forEach(r => r.classList.remove('open'));
    if (!wasOpen) rule.classList.add('open');
  }));
}

/* ===== Formulaire de candidature (envoi simulé + copie du message) ===== */
function initForm() {
  const form = document.getElementById('applyForm');
  if (!form) return;
  form.addEventListener('submit', async e => {
    e.preventDefault();
    const d = Object.fromEntries(new FormData(form));
    const msg = `**Candidature ${CONFIG.name}**\nPseudo Discord : ${d.discord}\nPseudo Minecraft : ${d.mc}\nÂge : ${d.age}\nRôle visé : ${d.role}\nMotivation : ${d.why}`;
    try { await copyText(msg); showToast('Candidature copiée ! Colle-la dans #candidatures sur Discord.'); }
    catch { showToast('Copie impossible, réessaie.', true); }
    form.reset();
  });
}

/* ===== Init ===== */
injectLayout();
addEventListener('DOMContentLoaded', () => {
  bindCopy(); initCanvas(); initCursor(); initNav(); initTransitions();
  initReveal(); initCards(); initMagnetic(); initTyping(); initParallax();
  initTimeline(); initFilters(); initAccordion(); initForm(); loadDiscordStats();
});
addEventListener('load', () => setTimeout(() => document.getElementById('loader').classList.add('done'), 500));