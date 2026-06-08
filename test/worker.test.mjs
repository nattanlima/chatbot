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

console.log('\n========================================');
console.log(`WORKER: ${pass} passou, ${fail} falhou`);
console.log('========================================');
process.exit(fail === 0 ? 0 : 1);
