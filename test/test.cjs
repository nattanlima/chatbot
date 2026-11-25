/* Testes da página (jsdom): fluxo de agendamento, envio do lead, pixel, dependências e conteúdo.
   Não usam rede: o index.html e o assets/site.js reais são executados, e fetch/gtag são simulados. */
const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const RAIZ = path.join(__dirname, '..');
const ler = f => fs.readFileSync(path.join(RAIZ, f), 'utf8');
let html = ler('index.html');
let siteJs = ler('assets/site.js');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name); }
}
const espera = ms => new Promise(r => setTimeout(r, ms));

const URL_ESPECIALISTAS = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ3qHe5tUeKIoZLpnE6YKD4xmqlMe-dPR5R5f75UwUKM0jeYfcVCXuuR-io1WC0OQejQPG3J88nv?gv=true';
const URL_NATTAN = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ2C5-9-rVr5-YXQM-M1gFiSOZQ_ylxMYBCdI_U1W9bkQegl1gsSXEbuNOdLeZcO31npuhk4uykM?gv=true';
const TEST_ENDPOINT = 'https://test.worker.example/lead';

console.log('\n[0] Arquivos gerados em dia com fonte/');
{
  const gerados = ['index.html', 'assets/site.js', 'assets/imagens.css'];
  const antes = gerados.map(ler);
  const r = spawnSync('python3', [path.join(RAIZ, 'fonte', 'build.py')], { encoding: 'utf8' });
  if (r.error || r.status !== 0) console.log('  (python3 indisponível ou build falhou: checagem pulada) ' + (r.stderr || '').trim().split('\n').pop());
  else {
    const depois = gerados.map(ler);
    gerados.forEach((f, i) => check(f + ' igual ao que o build gera', antes[i] === depois[i]));
    html = depois[0]; siteJs = depois[1];
  }
}

const vc = new VirtualConsole();
vc.on('jsdomError', () => {}); // "Not implemented": navegação do iframe e canvas
const dom = new JSDOM(html, {
  url: 'https://chatbot.prismeapp.com.br/',
  virtualConsole: vc,
  runScripts: 'dangerously',
  pretendToBeVisual: true,
  beforeParse(window) {
    window.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
    window.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
    window.Element.prototype.scrollIntoView = function () {};
    window.__events = [];
    window.gtag = function () { window.__events.push(Array.from(arguments)); };
    window.__fetch = [];
    window.fetch = function (url, opts) {
      window.__fetch.push({ url, opts });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ ok: true }), text: () => Promise.resolve('') });
    };
  }
});
const { window } = dom;
const doc = window.document;
const $ = id => doc.getElementById(id);
let erroDoScript = null;
try { window.eval(siteJs); } catch (e) { erroDoScript = e; }

const modal = () => $('agModal');
const aberto = () => modal().classList.contains('open');
const abrir = () => { if (!aberto()) window.toggleScheduler(); };
const fechar = () => { if (aberto()) window.toggleScheduler(); };
function passo() {
  const vis = [...doc.querySelectorAll('#agModal .ag-p')].filter(p => !p.hidden);
  return vis.length === 1 ? vis[0].getAttribute('data-p') : ('MULTIPLOS(' + vis.length + ')');
}
const pergunta = () => $('agH').textContent;
const progresso = () => doc.querySelectorAll('#agProg i.on').length;
const progressoOculto = () => $('agProg').classList.contains('fora');
const iframeSrc = () => $('qual-iframe').getAttribute('src');
const responder = v => doc.querySelector('#agOps .ag-op[data-v="' + v + '"]').click();
const irPara = p => doc.querySelector('#agModal .ag-p:not([hidden]) [data-ag-ir="' + p + '"]').click();
function lastEvent(name) {
  const evs = window.__events.filter(e => e[0] === 'event' && e[1] === name);
  return evs.length ? evs[evs.length - 1][2] : null;
}
function oaiCalls(evName) {
  const q = (window.oaiq && window.oaiq.q) ? Array.from(window.oaiq.q).map(a => Array.from(a)) : [];
  return evName === undefined ? q : q.filter(c => c[0] === 'measure' && c[1] === evName);
}
function setEndpoint(v) { doc.querySelector('meta[name="lead-endpoint"]').setAttribute('content', v); }
function preencher(o) {
  o = Object.assign({ nome: 'Maria', whatsapp: '(32) 99999-0000', email: 'maria@acme.com', empresa: 'Acme', isca: '' }, o || {});
  $('lead-nome').value = o.nome; $('lead-whatsapp').value = o.whatsapp; $('lead-email').value = o.email; $('lead-empresa').value = o.empresa; $('lead-website').value = o.isca;
}
async function enviar() { $('agForm').dispatchEvent(new window.Event('submit', { bubbles: true, cancelable: true })); await espera(30); }
function ateContato(quem) {
  fechar(); abrir();
  responder('sim'); responder('rapido'); responder('nao'); responder(quem);
  if (quem === 'nattan') irPara('contato');
}

(async () => {
  console.log('\n[1] Estrutura');
  check('script da página executa sem erro', erroDoScript === null);
  if (erroDoScript) console.log('        ' + erroDoScript.stack.split('\n').slice(0, 3).join('\n        '));
  ['agModal', 'agForm', 'agOps', 'agProg', 'qual-iframe', 'lead-nome', 'lead-empresa', 'lead-whatsapp', 'lead-email',
   'lead-website', 'lead-error', 'lead-submit'].forEach(id => check('#' + id, !!$(id)));
  ['toggleScheduler', 'trackEvent'].forEach(fn => check('window.' + fn, typeof window[fn] === 'function'));
  check('personagem Eve carregado', typeof window.EveCharacter === 'object');
  check('meta lead-endpoint aponta para o Worker', doc.querySelector('meta[name="lead-endpoint"]').content === 'https://lead.prismesales.com.br');
  check('canonical do domínio de produção', doc.querySelector('link[rel="canonical"]').href === 'https://chatbot.prismeapp.com.br/');
  check('idioma pt-BR', doc.documentElement.lang === 'pt-BR');

  console.log('\n[2] OpenAI Ads Pixel');
  check('window.oaiq definido', typeof window.oaiq === 'function');
  const oaiInit = oaiCalls().find(c => c[0] === 'init');
  check('init com pixelId correto', !!oaiInit && oaiInit[1] && oaiInit[1].pixelId === 'Fm75B5NPoYhY18xKckDYmW');
  check('page_viewed no carregamento', oaiCalls('page_viewed').length === 1);

  console.log('\n[3] Todo botão de agendar abre o popup');
  const botoes = [...doc.querySelectorAll('[data-agendar]')];
  check('há pelo menos 8 botões de agendar', botoes.length >= 8);
  let abriram = 0;
  botoes.forEach(b => { fechar(); b.click(); if (aberto()) abriram++; });
  check('todos abrem (' + abriram + '/' + botoes.length + ')', abriram === botoes.length);
  check('os três planos têm botão "Saber mais"', ['Essencial', 'Integrador', 'IA Power'].every(p => !!doc.querySelector('.jr-plano button[data-agendar][data-plano="' + p + '"]')));
  fechar();
  check('fecha e libera a página', !aberto() && !doc.querySelector('[inert]') && doc.body.style.overflow === '');
  abrir();
  check('abre na primeira pergunta', passo() === 'pergunta' && /decisor/i.test(pergunta()) && progresso() === 1);
  check('fundo fica inerte', doc.querySelector('section').hasAttribute('inert'));
  check('evento abrir_agendamento', !!lastEvent('abrir_agendamento'));
  doc.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  check('Esc fecha', !aberto());

  console.log('\n[4] Não é decisor => bloqueio');
  abrir(); responder('nao');
  check('passo = block', passo() === 'block');
  check('progresso oculto', progressoOculto());
  check('evento agendamento_bloqueado', (lastEvent('agendamento_bloqueado') || {}).motivo === 'nao_decisor');
  const waLink = doc.querySelector('#agModal a[href*="wa.me"]');
  check('bloqueio oferece WhatsApp', !!waLink);
  if (waLink) {
    const nLc = oaiCalls('lead_created').length;
    waLink.addEventListener('click', e => e.preventDefault());
    waLink.dispatchEvent(new window.MouseEvent('click', { bubbles: true, cancelable: true }));
    check('clique no WhatsApp => lead_created (OpenAI)', oaiCalls('lead_created').length === nLc + 1);
    check('clique no WhatsApp => contato_whatsapp (GA4)', !!lastEvent('contato_whatsapp'));
  }
  irPara('decisor');
  check('voltar => primeira pergunta', passo() === 'pergunta' && /decisor/i.test(pergunta()));

  console.log('\n[5] Quatro perguntas em ordem');
  responder('sim');
  check('=> urgência (2 de 4)', /urg/i.test(pergunta()) && progresso() === 2);
  responder('rapido');
  check('=> chatbot (3 de 4)', /chatbot/i.test(pergunta()) && progresso() === 3);
  responder('nao');
  check('=> com quem (4 de 4)', /prefere a call/i.test(pergunta()) && progresso() === 4);
  $('agVolta').click();
  check('Voltar => chatbot', /chatbot/i.test(pergunta()) && progresso() === 3);
  responder('nao'); responder('especialistas');
  check('especialistas => contato', passo() === 'contato');
  check('agenda ainda não carregou', iframeSrc() === 'about:blank');

  console.log('\n[6] Validação do contato');
  setEndpoint(TEST_ENDPOINT);
  let n = window.__fetch.length;
  preencher({ nome: '', whatsapp: '', email: '' }); await enviar();
  check('campos vazios: continua no contato', passo() === 'contato');
  check('campos vazios: mostra o erro', !$('lead-error').hidden);
  check('campos vazios: não chamou o Worker', window.__fetch.length === n);
  preencher({ email: 'sem-arroba' }); await enviar();
  check('e-mail inválido bloqueia', passo() === 'contato' && window.__fetch.length === n && $('lead-email').getAttribute('aria-invalid') === 'true');
  preencher({ whatsapp: '123' }); await enviar();
  check('WhatsApp curto bloqueia', passo() === 'contato' && window.__fetch.length === n && $('lead-whatsapp').getAttribute('aria-invalid') === 'true');

  console.log('\n[7] Envio válido (especialistas)');
  preencher(); await enviar();
  check('chamou o Worker 1x', window.__fetch.length === n + 1);
  const sent = window.__fetch[window.__fetch.length - 1] || { opts: { body: '{}' } };
  const body = JSON.parse(sent.opts.body);
  check('POST para o endpoint configurado', sent.url === TEST_ENDPOINT && sent.opts.method === 'POST');
  check('payload: nome, e-mail, WhatsApp e empresa', body.nome === 'Maria' && body.email === 'maria@acme.com' && body.whatsapp === '(32) 99999-0000' && body.empresa === 'Acme');
  check('payload: respostas da qualificação', body.decisor === 'sim' && body.urgencia === 'rapido' && body.chatbot === 'nao');
  check('payload: agenda = especialistas', body.agenda === 'especialistas');
  check('payload: origem da página', body.origem === 'https://chatbot.prismeapp.com.br/');
  check('=> agenda dos ESPECIALISTAS carregada', passo() === 'calendar' && iframeSrc() === URL_ESPECIALISTAS);
  check('link "abrir em outra aba" aponta para a mesma agenda', $('agFora').getAttribute('href') === URL_ESPECIALISTAS);
  check('aviso de custo OCULTO (gratuito)', $('agCusto').hidden);
  check('evento lead_enviado', !!lastEvent('lead_enviado'));
  check('payload leva event_id para o Worker', typeof body.event_id === 'string' && body.event_id.length > 0);
  const cs = oaiCalls('checkout_started');
  check('checkout_started disparado no cadastro', cs.length > 0);
  const lastCs = cs[cs.length - 1] || [];
  check('checkout_started com type contents', !!lastCs[2] && lastCs[2].type === 'contents');
  check('checkout_started com o MESMO event_id do Worker', !!lastCs[3] && lastCs[3].event_id === body.event_id);
  check('appointment_scheduled ao abrir a agenda', oaiCalls('appointment_scheduled').length > 0);
  check('gtag também recebeu cadastro_concluido', !!lastEvent('cadastro_concluido'));
  const q = lastEvent('agendamento_qualificado') || {};
  check('agendamento_qualificado leva as respostas', q.agenda === 'especialistas' && q.decisor === 'sim' && q.urgencia === 'rapido' && q.chatbot === 'nao');
  irPara('quem');
  check('"Trocar tipo de call" volta e descarrega a agenda', passo() === 'pergunta' && /prefere a call/i.test(pergunta()) && iframeSrc() === 'about:blank');

  console.log('\n[8] Call com Nattan Lima: confirma o custo antes');
  fechar(); abrir(); responder('sim'); responder('breve'); responder('sim'); responder('nattan');
  check('nattan => tela de custo', passo() === 'nattan' && /197,90/.test(doc.querySelector('[data-p="nattan"]').textContent));
  check('tela de custo avisa que não é reembolsável', /não é reembolsável/i.test(doc.querySelector('[data-p="nattan"]').textContent));
  irPara('contato');
  check('"Estou ciente" leva ao contato', passo() === 'contato');
  preencher(); await enviar();
  const bodyN = JSON.parse(window.__fetch[window.__fetch.length - 1].opts.body);
  check('payload: agenda = nattan', bodyN.agenda === 'nattan' && bodyN.urgencia === 'breve' && bodyN.chatbot === 'sim');
  check('=> agenda do NATTAN carregada', passo() === 'calendar' && iframeSrc() === URL_NATTAN);
  check('aviso de custo VISÍVEL (pago)', !$('agCusto').hidden);

  console.log('\n[9] Honeypot (bot)');
  ateContato('especialistas');
  n = window.__fetch.length; let nCs = oaiCalls('checkout_started').length;
  preencher({ isca: 'http://spam' }); await enviar();
  check('honeypot: não chamou o Worker', window.__fetch.length === n);
  check('honeypot: mesmo assim abriu a agenda', passo() === 'calendar');
  check('honeypot: NÃO conta conversão OpenAI', oaiCalls('checkout_started').length === nCs);

  console.log('\n[10] Endpoint vazio');
  ateContato('especialistas');
  setEndpoint(''); n = window.__fetch.length; nCs = oaiCalls('checkout_started').length;
  preencher(); await enviar();
  check('endpoint vazio: não chamou o Worker', window.__fetch.length === n);
  check('endpoint vazio: abriu a agenda mesmo assim', passo() === 'calendar');
  check('endpoint vazio: conversão OpenAI conta mesmo assim', oaiCalls('checkout_started').length === nCs + 1);

  console.log('\n[11] Voltar do contato');
  ateContato('especialistas'); irPara('quem');
  check('voltar => com quem', passo() === 'pergunta' && /prefere a call/i.test(pergunta()));

  console.log('\n[12] Worker respondeu erro: não conta como enviado, agenda abre');
  setEndpoint(TEST_ENDPOINT);
  const fetchOk = window.fetch;
  window.fetch = function (url, opts) {
    window.__fetch.push({ url, opts });
    return Promise.resolve({ ok: false, status: 502, json: () => Promise.resolve({ ok: false }), text: () => Promise.resolve('resend_failed') });
  };
  ateContato('especialistas');
  const nEnv = window.__events.filter(e => e[1] === 'lead_enviado').length;
  preencher(); await enviar();
  check('erro 502: NÃO registra lead_enviado', window.__events.filter(e => e[1] === 'lead_enviado').length === nEnv);
  check('erro 502: registra lead_envio_falhou com status', (lastEvent('lead_envio_falhou') || {}).status === 502);
  check('erro 502: agenda abre mesmo assim', passo() === 'calendar');
  window.fetch = function (url, opts) { window.__fetch.push({ url, opts }); return Promise.reject(new Error('rede')); };
  ateContato('especialistas'); preencher(); await enviar();
  check('rede fora: agenda abre mesmo assim', passo() === 'calendar');
  window.fetch = fetchOk;
  fechar();

  console.log('\n[13] Sem dependências externas no caminho crítico');
  const tudo = html + siteJs;
  check('sem Tailwind de CDN', !tudo.includes('cdn.tailwindcss.com'));
  check('sem Google Fonts, unpkg ou jsdelivr', !/fonts\.googleapis\.com|fonts\.gstatic\.com|unpkg\.com|cdn\.jsdelivr\.net/.test(tudo));
  check('sem imagens de terceiros (pravatar, ytimg, githubusercontent)', !/pravatar\.cc|ytimg\.com|githubusercontent\.com/.test(tudo));
  const externos = [...html.matchAll(/<script[^>]+src="(https?:\/\/[^"]+)"/g)].map(m => new URL(m[1]).host).concat([...html.matchAll(/'(https:\/\/[^']+\.js)'/g)].map(m => new URL(m[1]).host));
  check('scripts externos só de rastreamento conhecido (' + [...new Set(externos)].join(', ') + ')', externos.every(h => ['go.klicou.com.br', 'bzrcdn.openai.com'].includes(h)));
  const refs = [...new Set([...tudo.matchAll(/["'(]((?:\.\/)?assets\/[\w./-]+)/g)].map(m => m[1].replace(/^\.\//, '')))];
  const faltam = refs.filter(r => !fs.existsSync(path.join(RAIZ, r)));
  check('todo arquivo de assets/ citado existe (' + refs.length + ' citados)' + (faltam.length ? ' faltam: ' + faltam.join(', ') : ''), refs.length >= 15 && faltam.length === 0);
  ['assets/3d/cena-porte.js', 'assets/3d/boneco-dados.js', 'assets/3d/mulher-dados.js'].forEach(f => check(f + ' existe', fs.existsSync(path.join(RAIZ, f))));
  ['favicon.svg', 'favicon.ico', 'apple-touch-icon.png', 'og-image.png', 'logo.webp', 'CNAME'].forEach(f => check(f + ' existe', fs.existsSync(path.join(RAIZ, f))));
  {
    const og = (doc.querySelector('meta[property="og:image"]') || {}).content || '';
    const arq = og.replace('https://chatbot.prismeapp.com.br/', '');
    const existe = og.startsWith('https://chatbot.prismeapp.com.br/') && fs.existsSync(path.join(RAIZ, arq));
    check('imagem de compartilhamento existe no repositório (' + arq + ')', existe);
    check('imagem de compartilhamento leve o bastante para o WhatsApp (abaixo de 300 KB)', existe && fs.statSync(path.join(RAIZ, arq)).size < 300 * 1024);
    check('Twitter Card usa a mesma imagem', (doc.querySelector('meta[name="twitter:image"]') || {}).content === og);
  }
  check('fontes hospedadas no site, com preload', (html.match(/rel="preload"[^>]+as="font"/g) || []).length === 2);
  check('imagens.css entra depois do <style> (as fotos ganham na cascata)', html.indexOf('assets/imagens.css') > html.indexOf('</style>'));
  check('página inicial leve (HTML abaixo de 260 KB)', Buffer.byteLength(html) < 260 * 1024);

  console.log('\n[14] Conteúdo e navegação');
  const texto = doc.body.textContent;
  check('três preços na página', ['599,90', '799,90', '999,90'].every(p => texto.includes(p)));
  check('preços iguais aos dados estruturados', ['599.90', '799.90', '999.90'].every(p => html.includes('"price": "' + p + '"')));
  check('botão do Modo Híbrido leva ao simulador', !!doc.querySelector('#modo-hibrido a[href^="https://apioficial.prismeapp.com.br"]'));
  check('sem promessa de treinamento ou onboarding ilimitado', !/(treinamento|onboarding)s?\s+ilimitad/i.test(texto));
  check('página não cita a Prisme Lite', !/prisme\s*lite/i.test(tudo));
  check('sem travessão no texto e no script', !tudo.includes(String.fromCharCode(0x2014)));
  check('sem marcas de rascunho', !/confirmar plano|lorem ipsum|prévia do hero/i.test(tudo));
  const ids = new Set([...doc.querySelectorAll('[id]')].map(e => e.id));
  const ancoras = [...doc.querySelectorAll('a[href^="#"]')].map(a => a.getAttribute('href').slice(1)).filter(Boolean);
  check('toda âncora interna tem destino (' + ancoras.length + ')', ancoras.length >= 15 && ancoras.every(a => ids.has(a)));
  check('ids únicos', ids.size === doc.querySelectorAll('[id]').length);
  check('links em nova aba com rel noopener', [...doc.querySelectorAll('a[target="_blank"]')].every(a => /noopener/.test(a.rel)));
  check('toda imagem tem alt', [...doc.querySelectorAll('img')].every(i => i.hasAttribute('alt')));
  check('todo botão tem nome acessível', [...doc.querySelectorAll('button')].every(b => (b.textContent || '').trim() || b.getAttribute('aria-label')));
  check('menu do topo leva às cinco seções', ['onboarding', 'modulos', 'modo-hibrido', 'so-a-prisme', 'planos'].every(i => !!doc.querySelector('.hx-cap a[href="#' + i + '"]')));
  check('rodapé com CNPJ e política de privacidade', /34\.322\.622\/0001-58/.test(texto) && !!doc.querySelector('.rp a[href*="politica-de-privacidade"]'));
  check('quatro áudios cadastrados e presentes', ['coex', 'pratica-media', 'custos', 'planos'].every(a => siteJs.includes("'assets/audio/" + a + ".mp3'") && fs.existsSync(path.join(RAIZ, 'assets', 'audio', a + '.mp3'))));
  {
    const b = [...doc.querySelectorAll('.jr-seg button')], t = [];
    for (const x of b) { x.click(); await espera(320); t.push($('jrModsH').textContent); }
    check('os três portes mudam o conteúdo', b.length === 3 && new Set(t).size === 3);
  }

  console.log('\n[15] Busca e robôs de IA');
  {
    const robots = ler('robots.txt'), mapa = ler('sitemap.xml'), llms = ler('llms.txt');
    check('robots.txt libera o site e aponta o sitemap', /Allow: \//.test(robots) && !/Disallow: \/\s*$/m.test(robots) && robots.includes('https://chatbot.prismeapp.com.br/sitemap.xml'));
    check('sitemap.xml lista a página inicial', mapa.includes('<loc>https://chatbot.prismeapp.com.br/</loc>'));
    check('llms.txt com os três preços da página', ['599,90', '799,90', '999,90'].every(p => llms.includes(p)));
    check('llms.txt sem travessão e sem Prisme Lite', !llms.includes(String.fromCharCode(0x2014)) && !/prisme\s*lite/i.test(llms));
    /* o que um robô sem JavaScript enxerga: o HTML cru, sem executar nada */
    const cru = new JSDOM(html).window.document;
    const txt = id => (cru.getElementById(id).textContent || '').trim();
    check('sem JavaScript: dor e resposta da Eve no HTML', txt('jrDor').length > 20 && txt('jrSub').length > 20);
    check('sem JavaScript: seis módulos e a lista "Também disponível"', cru.querySelectorAll('#jrMods > div').length === 6 && cru.querySelectorAll('#jrExtras i').length >= 15);
    check('sem JavaScript: exemplos na prática e argumento de custo', cru.querySelectorAll('#cfAbas button').length === 3 && txt('cfPratH').length > 10 && txt('jrCustoH').length > 10);
    check('sem JavaScript: planos e preços no HTML', ['599,90', '799,90', '999,90'].every(p => cru.body.textContent.includes(p)));
  }

  console.log('\n========================================');
  console.log(`PÁGINA/FLUXO: ${pass} passou, ${fail} falhou`);
  console.log('========================================');
  process.exit(fail === 0 ? 0 : 1);
})();
