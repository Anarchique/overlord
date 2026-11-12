/** Cloudflare Worker — secret webhook relay for Overlord applications.
 * Configure DISCORD_WEBHOOK_URL as a Worker secret and ALLOWED_ORIGIN as the
 * exact public site origin (for example https://faction.example), no trailing slash.
 */
const corsHeaders = (origin) => ({
  'Access-Control-Allow-Origin': origin,
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
});
const clean = (value, limit) => String(value ?? '').replace(/[\u0000-\u001F\u007F]/g, ' ').trim().slice(0, limit) || '—';
const json = (body, status, headers) => new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json; charset=utf-8' } });

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = 'https://overlordmc.online';
    if (!allowed || origin !== allowed) return new Response('Origin not allowed', { status: 403 });
    const headers = corsHeaders(allowed);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers });
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers });
    if (!env.DISCORD_WEBHOOK_URL) return json({ error: 'Webhook secret is not configured.' }, 503, headers);
    const contentLength = Number(request.headers.get('Content-Length') || 0);
    if (contentLength > 12000) return json({ error: 'Request too large.' }, 413, headers);
    let incoming;
    try { incoming = await request.json(); } catch { return json({ error: 'Invalid JSON.' }, 400, headers); }
    const app = incoming?.application;
    if (!app || typeof app !== 'object') return json({ error: 'Missing application.' }, 400, headers);
    const mc = clean(app.mc, 16);
    if (!/^[A-Za-z0-9_]{3,16}$/.test(mc)) return json({ error: 'Invalid Minecraft username.' }, 400, headers);
    const age = Number(app.age);
    if (!Number.isInteger(age) || age < 1 || age > 99) return json({ error: 'Invalid age.' }, 400, headers);
    const underage = age < 16;
    const exp = clean(app.experience, 1800);
    const motivation = clean(app.motivation, 1800);
    if (motivation.length < 50 || exp === '—') return json({ error: 'Required answers are missing.' }, 400, headers);
    const embed = {
      title: `Nouvelle candidature — ${mc}`,
      color: 0x9b4dff,
      fields: [
        { name: 'Pseudo IG', value: mc, inline: true },
        { name: 'Âge', value: `${age} ans${underage ? ' ⚠️ (moins de 16 ans — exception à examiner)' : ''}`, inline: true },
        { name: 'Discord', value: clean(app.discord, 80), inline: true },
        { name: 'Niveau PVP / Farm', value: `${Math.max(1, Math.min(10, Number(app.pvp) || 1))}/10`, inline: true },
        { name: 'Niveau Pillage / Build', value: `${Math.max(1, Math.min(10, Number(app.raid) || 1))}/10`, inline: true },
        { name: 'Expérience (serveurs déjà joués)', value: exp },
        { name: 'Motivation', value: motivation },
        { name: 'Disponibilités', value: clean(app.availability, 300) },
      ],
      thumbnail: { url: `https://mc-heads.net/avatar/${encodeURIComponent(mc)}` },
      timestamp: new Date().toISOString(),
      footer: { text: 'Recrutement Overlord · Candidature du site' },
    };
    let discordResponse;
    try {
      discordResponse = await fetch(env.DISCORD_WEBHOOK_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ embeds: [embed], allowed_mentions: { parse: [] } }),
      });
    } catch { return json({ error: 'Could not reach Discord.' }, 502, headers); }
    if (!discordResponse.ok) return json({ error: 'Discord rejected the application.' }, 502, headers);
    return new Response(null, { status: 204, headers });
  },
};
