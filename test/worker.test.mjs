import worker from '../worker/worker.js';

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name); }
}

const ENV = {
  RESEND_API_KEY: 'test_key_123',
  TO_EMAIL: 'nattan.lima@prismeapp.com.br',
  FROM_EMAIL: 'Prisme Leads <leads@prismeapp.com.br>',
  ALLOWED_ORIGINS: 'https://chatbot.prismeapp.com.br'
};
const ORIGIN = 'https://chatbot.prismeapp.com.br';

// captura a chamada ao Resend
let resendCalls = [];
function stubFetchOk() {
  resendCalls = [];
  globalThis.fetch = async (url, opts) => {
    resendCalls.push({ url, opts });
    return new Response(JSON.stringify({ id: 'email_123' }), { status: 200 });
  };
}
function stubFetchFail() {
  resendCalls = [];
  globalThis.fetch = async (url, opts) => {
    resendCalls.push({ url, opts });
    return new Response('Resend down', { status: 500 });
  };
}
function req(method, body, headers = {}) {
  return new Request('https://worker.example/', {
    method,
    headers: { 'Origin': ORIGIN, 'Content-Type': 'application/json', ...headers },
    body: body === undefined ? undefined : (typeof body === 'string' ? body : JSON.stringify(body))
  });
}
const VALID = {
  nome: 'Maria', whatsapp: '24999999999', email: 'maria@acme.com', empresa: 'ACME',
  decisor: 'sim', urgencia: 'rapido', chatbot: 'nao', agenda: 'especialistas', origem: 'https://chatbot.prismeapp.com.br/'
};

console.log('\n[W1] CORS / preflight OPTIONS');
{
  const r = await worker.fetch(req('OPTIONS'), ENV);
  check('OPTIONS => 204', r.status === 204);
  check('Allow-Origin reflete origem permitida', r.headers.get('Access-Control-Allow-Origin') === ORIGIN);
  check('Allow-Methods inclui POST', (r.headers.get('Access-Control-Allow-Methods') || '').includes('POST'));
}

console.log('\n[W2] POST válido => 200 e chama o Resend corretamente');
{
  stubFetchOk();
  const r = await worker.fetch(req('POST', VALID), ENV);
  const j = await r.json();
  check('status 200', r.status === 200);
  check('resposta ok:true', j.ok === true);
  check('Resend foi chamado 1x', resendCalls.length === 1);
  check('URL do Resend correta', resendCalls[0]?.url === 'https://api.resend.com/emails');
  const h = resendCalls[0]?.opts?.headers || {};
  check('Authorization Bearer com a chave', h['Authorization'] === 'Bearer test_key_123');
  const sent = JSON.parse(resendCalls[0].opts.body);
  check('destinatário = Nattan', Array.isArray(sent.to) && sent.to[0] === 'nattan.lima@prismeapp.com.br');
  check('reply_to = e-mail do lead', sent.reply_to === 'maria@acme.com');
  check('assunto contém o nome', sent.subject.includes('Maria'));
  check('corpo contém urgência traduzida', sent.html.includes('O mais rápido possível'));
  check('CORS na resposta', r.headers.get('Access-Control-Allow-Origin') === ORIGIN);
}

console.log('\n[W3] Honeypot preenchido => não envia, mas finge sucesso');
{
  stubFetchOk();
  const r = await worker.fetch(req('POST', { ...VALID, website: 'http://spam' }), ENV);
  const j = await r.json();
  check('status 200', r.status === 200);
  check('marcado como skipped', j.ok === true && j.skipped === true);
  check('Resend NÃO foi chamado', resendCalls.length === 0);
}

console.log('\n[W4] Campos obrigatórios ausentes => 422');
{
  stubFetchOk();
  const r = await worker.fetch(req('POST', { nome: 'Só nome' }), ENV);
  check('status 422', r.status === 422);
  check('Resend NÃO foi chamado', resendCalls.length === 0);
}

console.log('\n[W5] Método GET => 405');
{
  const r = await worker.fetch(req('GET'), ENV);
  check('status 405', r.status === 405);
}

console.log('\n[W6] JSON inválido => 400');
{
  const r = await worker.fetch(req('POST', '{invalido'), ENV);
  check('status 400', r.status === 400);
}

console.log('\n[W7] Falha do Resend => 502 (propaga erro)');
{
  stubFetchFail();
  const r = await worker.fetch(req('POST', VALID), ENV);
  const j = await r.json();
  check('status 502', r.status === 502);
  check('erro resend_failed', j.error === 'resend_failed');
}

console.log('\n[W8] OpenAI Ads CAPI: com OPENAI_ADS_API_KEY envia checkout_started deduplicado');
{
  stubFetchOk();
  const envOai = { ...ENV, OPENAI_ADS_API_KEY: 'oai_test_key', OPENAI_ADS_PIXEL_ID: 'Fm75B5NPoYhY18xKckDYmW' };
  const ctx = { promises: [], waitUntil(p) { this.promises.push(p); } };
  const r = await worker.fetch(req('POST', { ...VALID, event_id: 'evt-dedup-123' }), envOai, ctx);
  await Promise.all(ctx.promises);
  check('status 200', r.status === 200);
  check('2 chamadas: OpenAI + Resend', resendCalls.length === 2);
  const oai = resendCalls.find(c => String(c.url).includes('bzr.openai.com'));
  check('URL da Events API com pid', oai?.url === 'https://bzr.openai.com/v1/events?pid=Fm75B5NPoYhY18xKckDYmW');
  check('Authorization Bearer com a chave OpenAI', oai?.opts?.headers?.['Authorization'] === 'Bearer oai_test_key');
  const evBody = JSON.parse(oai.opts.body);
  const ev = evBody.events?.[0] || {};
  check('validate_only = false', evBody.validate_only === false);
  check('event_id do navegador reutilizado (dedup)', ev.id === 'evt-dedup-123');
  check('type = checkout_started', ev.type === 'checkout_started');
  check('action_source = web', ev.action_source === 'web');
  check('data.type = contents', ev.data?.type === 'contents');
  check('timestamp_ms numerico', typeof ev.timestamp_ms === 'number' && ev.timestamp_ms > 0);
  check('source_url = origem do lead', ev.source_url === VALID.origem);
}

console.log('\n[W9] OpenAI Ads CAPI: sem event_id gera id; falha da OpenAI nao derruba o lead');
{
  stubFetchOk();
  const envOai = { ...ENV, OPENAI_ADS_API_KEY: 'oai_test_key' };
  const r = await worker.fetch(req('POST', VALID), envOai); // sem ctx => aguarda inline
  check('status 200', r.status === 200);
  const oai = resendCalls.find(c => String(c.url).includes('bzr.openai.com'));
  const ev = JSON.parse(oai.opts.body).events[0];
  check('id gerado quando o navegador nao manda', typeof ev.id === 'string' && ev.id.length > 0);

  // OpenAI fora do ar (fetch lanca) => lead segue normalmente
  resendCalls = [];
  globalThis.fetch = async (url, opts) => {
    resendCalls.push({ url, opts });
    if (String(url).includes('bzr.openai.com')) throw new Error('openai down');
    return new Response(JSON.stringify({ id: 'email_123' }), { status: 200 });
  };
  const r2 = await worker.fetch(req('POST', { ...VALID, event_id: 'evt-x' }), envOai);
  const j2 = await r2.json();
  check('OpenAI caiu, lead ainda 200 ok', r2.status === 200 && j2.ok === true);
  check('Resend ainda foi chamado', resendCalls.some(c => String(c.url).includes('api.resend.com')));
}

console.log('\n[W10] Sem OPENAI_ADS_API_KEY nao chama a OpenAI (comportamento atual)');
{
  stubFetchOk();
  const r = await worker.fetch(req('POST', { ...VALID, event_id: 'evt-y' }), ENV);
  check('status 200', r.status === 200);
  check('apenas o Resend foi chamado', resendCalls.length === 1 && String(resendCalls[0].url).includes('api.resend.com'));
}

console.log('\n========================================');
console.log(`WORKER: ${pass} passou, ${fail} falhou`);
console.log('========================================');
process.exit(fail === 0 ? 0 : 1);
