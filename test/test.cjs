const { JSDOM, VirtualConsole } = require('jsdom');
const fs = require('fs');
const path = require('path');

const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf8');

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name); }
}

const URL_ESPECIALISTAS = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ3qHe5tUeKIoZLpnE6YKD4xmqlMe-dPR5R5f75UwUKM0jeYfcVCXuuR-io1WC0OQejQPG3J88nv?gv=true';
const URL_NATTAN = 'https://calendar.google.com/calendar/appointments/schedules/AcZssZ2C5-9-rVr5-YXQM-M1gFiSOZQ_ylxMYBCdI_U1W9bkQegl1gsSXEbuNOdLeZcO31npuhk4uykM?gv=true';
const TEST_ENDPOINT = 'https://test.worker.example/lead';

const vc = new VirtualConsole();
vc.on('jsdomError', () => {}); // suprime "Not implemented: navigation" ao setar iframe.src

const dom = new JSDOM(html, {
  virtualConsole: vc,
  runScripts: 'dangerously',
  beforeParse(window) {
    window.lucide = { createIcons: () => {} };
    window.tailwind = {};
    window.IntersectionObserver = class { observe(){} unobserve(){} disconnect(){} };
    window.__events = [];
    window.gtag = function () { window.__events.push(Array.from(arguments)); };
    window.__fetch = [];
    window.fetch = function (url, opts) {
      window.__fetch.push({ url, opts });
      return Promise.resolve({ ok: true, json: () => Promise.resolve({ ok: true }), text: () => Promise.resolve('') });
    };
  }
});
const { window } = dom;
const doc = window.document;
const $ = id => doc.getElementById(id);
const val = id => { const el = $(id); return (el.innerText != null ? el.innerText : el.textContent); };

function visibleStep() {
  const steps = [...doc.querySelectorAll('#scheduler-modal .qual-step')];
  const vis = steps.filter(s => !s.classList.contains('hidden'));
  return vis.length === 1 ? vis[0].getAttribute('data-step') : ('MULTIPLOS(' + vis.length + ')');
}
const progressWidth = () => $('qual-progress-bar').style.width;
const progressHidden = () => $('qual-progress').classList.contains('hidden');
const iframeSrc = () => $('qual-iframe').src;
const costBannerHidden = () => $('qual-cost-banner').classList.contains('hidden');
const errorHidden = () => $('lead-error').classList.contains('hidden');
function lastEvent(name) {
  const evs = window.__events.filter(e => e[0] === 'event' && e[1] === name);
  return evs.length ? evs[evs.length - 1][2] : null;
}
function setEndpoint(v) { doc.querySelector('meta[name="lead-endpoint"]').setAttribute('content', v); }
function fillContact(o = {}) {
  $('lead-nome').value = 'nome' in o ? o.nome : 'Maria';
  $('lead-whatsapp').value = 'whatsapp' in o ? o.whatsapp : '24999999999';
  $('lead-email').value = 'email' in o ? o.email : 'maria@acme.com';
  $('lead-empresa').value = 'empresa' in o ? o.empresa : 'ACME';
  $('lead-website').value = 'website' in o ? o.website : '';
}
// avanca o wizard ate o passo de contato escolhendo a agenda informada
function goToContato(agenda) {
  window.qualReset();
  window.qualAnswer('decisor', 'sim');
  window.qualAnswer('urgencia', 'rapido');
  window.qualAnswer('chatbot', 'nao');
  window.qualAnswer('quem', agenda);
  if (agenda === 'nattan') window.qualShow('contato'); // simula o "Estou ciente"
}

(async () => {
  console.log('\n[1] Estrutura: elementos-chave existem');
  ['tab-api','tab-ai','content-api','content-ai','marketingRange','utilityRange','aiRange',
   'totalApiCost','totalAiCost','scheduler-modal','qual-body','qual-progress','qual-progress-bar',
   'qual-iframe','qual-cost-banner','lead-nome','lead-whatsapp','lead-email','lead-empresa',
   'lead-website','lead-error','lead-submit'].forEach(id => check('#'+id, !!$(id)));

  console.log('\n[2] Funcoes globais definidas');
  ['switchTab','toggleScheduler','updateApiCost','updateAiCost','trackEvent','qualShow','qualReset',
   'qualAnswer','qualOpenCalendar','qualBackFromCalendar','qualBackFromContato','qualSubmitContact',
   'leadEndpoint','isEmailValido'].forEach(fn => check('window.'+fn, typeof window[fn] === 'function'));

  console.log('\n[3] BUG das abas corrigido (switchTab)');
  window.switchTab('ai');
  check('API recebe cinza', $('tab-api').classList.contains('text-slate-500'));
  check('API perde brand-primary', !$('tab-api').classList.contains('text-brand-primary'));
  window.switchTab('api');
  check('volta: AI recebe cinza', $('tab-ai').classList.contains('text-slate-500'));

  console.log('\n[4] Calculadoras (valores != default)');
  $('marketingRange').value = '2000'; $('utilityRange').value = '1000'; window.updateApiCost();
  check('API = 880,00', val('totalApiCost') === '880,00');
  $('aiRange').value = '100'; window.updateAiCost();
  check('IA = 21,00', val('totalAiCost') === '21,00');

  console.log('\n[5] Abertura inicia no passo decisor (25%)');
  window.toggleScheduler();
  check('modal aberto', $('scheduler-modal').classList.contains('open'));
  check('passo = decisor / 25%', visibleStep() === 'decisor' && progressWidth() === '25%');

  console.log('\n[6] Bloqueio do nao-decisor');
  window.qualAnswer('decisor', 'nao');
  check('passo = block', visibleStep() === 'block');
  check('progresso oculto', progressHidden());
  check('evento agendamento_bloqueado', (lastEvent('agendamento_bloqueado') || {}).motivo === 'nao_decisor');

  console.log('\n[7] Caminho ESPECIALISTAS: 4 perguntas -> CONTATO (nao pula pra agenda)');
  window.qualReset();
  check('reset => decisor', visibleStep() === 'decisor');
  window.qualAnswer('decisor', 'sim');
  check('=> urgencia (50%)', visibleStep() === 'urgencia' && progressWidth() === '50%');
  window.qualAnswer('urgencia', 'rapido');
  check('=> chatbot (75%)', visibleStep() === 'chatbot' && progressWidth() === '75%');
  window.qualAnswer('chatbot', 'nao');
  check('=> quem (100%)', visibleStep() === 'quem' && progressWidth() === '100%');
  window.qualAnswer('quem', 'especialistas');
  check('quem->especialistas => CONTATO', visibleStep() === 'contato');
  check('agenda ainda nao carregou', iframeSrc() === 'about:blank');

  console.log('\n[8] Validacao do formulario de contato bloqueia envio');
  setEndpoint(TEST_ENDPOINT);
  const fetchesBefore = window.__fetch.length;
  fillContact({ nome: '', whatsapp: '', email: '' });
  await window.qualSubmitContact();
  check('continua em CONTATO (nao avancou)', visibleStep() === 'contato');
  check('mensagem de erro visivel', !errorHidden());
  check('nao chamou o Worker', window.__fetch.length === fetchesBefore);
  fillContact({ email: 'invalido' });
  await window.qualSubmitContact();
  check('e-mail invalido tambem bloqueia', visibleStep() === 'contato' && window.__fetch.length === fetchesBefore);

  console.log('\n[9] Contato valido => envia ao Worker e abre agenda ESPECIALISTAS');
  fillContact();
  await window.qualSubmitContact();
  check('chamou o Worker 1x', window.__fetch.length === fetchesBefore + 1);
  const sent = window.__fetch[window.__fetch.length - 1];
  check('POST para o endpoint configurado', sent.url === TEST_ENDPOINT);
  const body = JSON.parse(sent.opts.body);
  check('payload: nome do lead', body.nome === 'Maria');
  check('payload: e-mail do lead', body.email === 'maria@acme.com');
  check('payload: respostas da qualificacao', body.decisor === 'sim' && body.urgencia === 'rapido' && body.chatbot === 'nao');
  check('payload: agenda = especialistas', body.agenda === 'especialistas');
  check('=> agenda dos ESPECIALISTAS carregada', visibleStep() === 'calendar' && iframeSrc() === URL_ESPECIALISTAS);
  check('banner de custo OCULTO (gratuito)', costBannerHidden());
  check('evento lead_enviado', !!lastEvent('lead_enviado'));

  console.log('\n[10] Caminho NATTAN: confirmacao -> contato -> agenda paga');
  goToContato('nattan');
  const nattanBtn = doc.querySelector('#scheduler-modal [data-step="nattan"] button');
  check('botao "Estou ciente" leva ao contato', (nattanBtn.getAttribute('onclick') || '').includes("qualShow('contato')"));
  check('passo atual = contato', visibleStep() === 'contato');
  fillContact();
  await window.qualSubmitContact();
  const bodyN = JSON.parse(window.__fetch[window.__fetch.length - 1].opts.body);
  check('payload: agenda = nattan', bodyN.agenda === 'nattan');
  check('=> agenda do NATTAN carregada', visibleStep() === 'calendar' && iframeSrc() === URL_NATTAN);
  check('banner de custo VISIVEL (pago)', !costBannerHidden());

  console.log('\n[11] Honeypot e endpoint vazio nao chamam o Worker (mas seguem pra agenda)');
  goToContato('especialistas');
  let n = window.__fetch.length;
  fillContact({ website: 'http://bot' }); // honeypot
  await window.qualSubmitContact();
  check('honeypot: nao chamou Worker', window.__fetch.length === n);
  check('honeypot: mesmo assim abriu a agenda', visibleStep() === 'calendar');

  goToContato('especialistas');
  setEndpoint(''); // endpoint nao configurado
  n = window.__fetch.length;
  fillContact();
  await window.qualSubmitContact();
  check('endpoint vazio: nao chamou Worker', window.__fetch.length === n);
  check('endpoint vazio: abriu a agenda mesmo assim', visibleStep() === 'calendar');

  console.log('\n[12] Voltar do contato retorna para a escolha de call');
  goToContato('especialistas');
  window.qualBackFromContato();
  check('voltar => quem', visibleStep() === 'quem');

  console.log('\n========================================');
  console.log(`UI/FLUXO: ${pass} passou, ${fail} falhou`);
  console.log('========================================');
  process.exit(fail === 0 ? 0 : 1);
})();
