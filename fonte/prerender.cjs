/* Roda a página no jsdom e devolve o conteúdo da visão padrão (média empresa) que o script monta.
   O build grava esse conteúdo direto no index.html, para robôs que não executam JavaScript
   (ChatGPT, Claude, Perplexity) lerem o mesmo texto que o visitante vê. Entrada e saída em JSON. */
const { JSDOM, VirtualConsole } = require('jsdom');
const IDS = ['jrDor', 'jrSub', 'cfPratH', 'cfAbas', 'jrModsH', 'jrMods', 'jrExtras', 'jrCustoH'];
let entrada = '';
process.stdin.on('data', d => { entrada += d; });
process.stdin.on('end', () => {
  const { html, js } = JSON.parse(entrada);
  const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
  const dom = new JSDOM(html, {
    url: 'https://chatbot.prismeapp.com.br/', virtualConsole: vc, runScripts: 'dangerously', pretendToBeVisual: true,
    beforeParse(w) {
      w.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} };
      /* movimento reduzido: tudo é pintado de uma vez, sem animação de digitação */
      w.matchMedia = q => ({ matches: /reduced-motion/.test(q), addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
      w.Element.prototype.scrollIntoView = function () {};
      w.fetch = () => Promise.reject(new Error('sem rede no build'));
    }
  });
  dom.window.eval(js);
  const saida = {};
  for (const id of IDS) {
    const el = dom.window.document.getElementById(id);
    if (!el || !el.innerHTML.trim()) { console.error('prerender: #' + id + ' veio vazio'); process.exit(1); }
    saida[id] = el.innerHTML;
  }
  process.stdout.write(JSON.stringify(saida));
  process.exit(0);
});
