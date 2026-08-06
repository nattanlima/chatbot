// Cloudflare Worker — recebe o lead do site e envia por e-mail via Resend.
// A chave do Resend fica como SECRET no Worker (nunca no front-end / GitHub Pages).
// Opcional: reenvia a conversao "checkout_started" para a OpenAI Ads (Conversions API),
// deduplicada com o evento do navegador pelo mesmo event_id. Ativa ao definir o
// secret OPENAI_ADS_API_KEY (wrangler secret put OPENAI_ADS_API_KEY).

const OPENAI_ADS_PIXEL_ID = 'Fm75B5NPoYhY18xKckDYmW';

// Envia o evento de conversao server-side para a OpenAI Ads. Nunca lanca erro:
// a notificacao de anuncio nao pode derrubar o fluxo do lead.
function sendOpenAIAdsEvent(env, data) {
  const pid = env.OPENAI_ADS_PIXEL_ID || OPENAI_ADS_PIXEL_ID;
  const eventId = String(data.event_id || '').slice(0, 64) || crypto.randomUUID();
  return fetch('https://bzr.openai.com/v1/events?pid=' + encodeURIComponent(pid), {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${env.OPENAI_ADS_API_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      validate_only: false,
      events: [{
        id: eventId,
        type: 'checkout_started',
        timestamp_ms: Date.now(),
        source_url: String(data.origem || 'https://chatbot.prismeapp.com.br/').slice(0, 500),
        action_source: 'web',
        data: { type: 'contents' }
      }]
    })
  }).catch(() => {});
}

const DEFAULT_ALLOWED = [
  'https://chatbot.prismeapp.com.br',
  'http://localhost:8765',
  'http://127.0.0.1:8765'
];

const LABELS = {
  rapido: 'O mais rápido possível',
  breve: 'Em breve',
  pensando: 'Ainda pensando',
  sim: 'Sim',
  nao: 'Não',
  especialistas: 'Time de Especialistas (gratuito)',
  nattan: 'Nattan Lima (R$ 197,90)'
};
const label = (v) => LABELS[v] || (v == null || v === '' ? '-' : String(v));

function allowedOrigins(env) {
  if (env && env.ALLOWED_ORIGINS) return env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
  return DEFAULT_ALLOWED;
}
function corsHeaders(origin, env) {
  const list = allowedOrigins(env);
  const allow = list.includes(origin) ? origin : list[0];
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin'
  };
}
function json(obj, status, origin, env) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin, env) }
  });
}
function esc(s) {
  return String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

export default {
  async fetch(request, env, ctx) {
    const origin = request.headers.get('Origin') || '';

    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders(origin, env) });
    if (request.method !== 'POST') return json({ ok: false, error: 'method_not_allowed' }, 405, origin, env);

    let data;
    try { data = await request.json(); } catch { return json({ ok: false, error: 'invalid_json' }, 400, origin, env); }

    // honeypot: bots preenchem este campo invisível
    if (data.website) return json({ ok: true, skipped: true }, 200, origin, env);

    const nome = String(data.nome || '').slice(0, 120).trim();
    const whatsapp = String(data.whatsapp || '').slice(0, 40).trim();
    const email = String(data.email || '').slice(0, 160).trim();
    const empresa = String(data.empresa || '').slice(0, 160).trim();
    if (!nome || !whatsapp || !email) return json({ ok: false, error: 'missing_fields' }, 422, origin, env);

    // Conversao OpenAI Ads (fire-and-forget: nao atrasa nem bloqueia a resposta)
    if (env.OPENAI_ADS_API_KEY) {
      const capi = sendOpenAIAdsEvent(env, data);
      if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(capi); else await capi;
    }

    const subject = `Novo lead — ${nome}${empresa ? ' (' + empresa + ')' : ''} • ${label(data.agenda)}`;
    const html =
      `<h2 style="font-family:sans-serif">Novo lead pelo agendamento</h2>
       <table style="font-family:sans-serif;border-collapse:collapse" cellpadding="6">
         <tr><td><b>Nome</b></td><td>${esc(nome)}</td></tr>
         <tr><td><b>WhatsApp</b></td><td>${esc(whatsapp)}</td></tr>
         <tr><td><b>E-mail</b></td><td>${esc(email)}</td></tr>
         <tr><td><b>Empresa</b></td><td>${esc(empresa || '-')}</td></tr>
         <tr><td><b>É decisor?</b></td><td>${esc(label(data.decisor))}</td></tr>
         <tr><td><b>Urgência</b></td><td>${esc(label(data.urgencia))}</td></tr>
         <tr><td><b>Já tem chatbot?</b></td><td>${esc(label(data.chatbot))}</td></tr>
         <tr><td><b>Agenda escolhida</b></td><td>${esc(label(data.agenda))}</td></tr>
         <tr><td><b>Origem</b></td><td>${esc(data.origem || '-')}</td></tr>
       </table>`;

    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${env.RESEND_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: env.FROM_EMAIL || 'Prisme Leads <leads@prismeapp.com.br>',
        to: [env.TO_EMAIL || 'nattan.lima@prismeapp.com.br'],
        reply_to: email,
        subject,
        html
      })
    });

    if (!resp.ok) {
      const detail = (await resp.text()).slice(0, 300);
      return json({ ok: false, error: 'resend_failed', detail }, 502, origin, env);
    }
    return json({ ok: true }, 200, origin, env);
  }
};
