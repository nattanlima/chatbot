/* Gera a imagem que aparece ao compartilhar o link (og:image), a partir do topo real da página.
   Não roda no CI. Uso:
     npm i --no-save playwright && npx playwright install chromium
     python3 -m http.server 8766 &            # na raiz do repositório
     node test/qa/imagem-compartilhamento.mjs  # grava og-image-v2.jpg na raiz
   Mudou a imagem? Troque o nome do arquivo (v3, v4...) aqui e em fonte/cabecalho-producao.html:
   WhatsApp e redes sociais guardam a imagem antiga pelo endereço. */
const { chromium } = await import(process.env.PLAYWRIGHT || 'playwright');
const SAIDA = process.argv[2] || 'og-image-v2.jpg';
const URL_PAGINA = process.env.QA_URL || 'http://localhost:8766/index.html';
/* fora da imagem: botões, contador e a Eve do canto. A marca cresce para ser lida em miniatura. */
/* o título encolhe um pouco para caber inteiro também quando o aplicativo corta a imagem em quadrado */
const CSS = '.hx-ctas,.hx-count,.ed{display:none!important}.hx-logo{zoom:1.55!important}#topo h1{zoom:.93!important}';

const b = await chromium.launch({ executablePath: process.env.CHROME || undefined, args: process.env.CHROME ? ['--no-sandbox'] : [] });
const p = await b.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 2 });
await p.addInitScript((css) => {
  document.addEventListener('DOMContentLoaded', () => {
    const s = document.createElement('style'); s.textContent = css; document.head.appendChild(s);
    /* marca o instante em que os balões começam a chegar */
    const topo = document.getElementById('topo');
    new MutationObserver(() => { if (topo.getAttribute('data-phase') === 'chegam' && !window.__chegam) window.__chegam = performance.now(); })
      .observe(topo, { attributes: true, attributeFilter: ['data-phase'] });
  });
}, CSS);
await p.goto(URL_PAGINA);
/* 4 segundos depois de os balões começarem: todos já chegaram e nenhum foi para a Eve ainda */
await p.waitForFunction(() => window.__chegam && performance.now() - window.__chegam >= 4000, null, { timeout: 30000 });
await p.evaluate(() => document.getAnimations().forEach(a => { try { a.pause(); } catch (e) {} }));
const fase = await p.evaluate(() => document.getElementById('topo').getAttribute('data-phase'));
await p.screenshot({ path: SAIDA, type: 'jpeg', quality: 90, scale: 'css' });
console.log('gravado', SAIDA, 'na fase', fase);
await b.close();
