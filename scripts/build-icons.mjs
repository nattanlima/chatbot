// Gera assets/icons.js só com os ícones Lucide usados no index.html.
// Antes a página baixava a biblioteca Lucide inteira do unpkg (~393 KB, 70 KB comprimidos) para 57 ícones.
// Uso: npm run build:icons  (o Action build-css roda junto com o CSS a cada push na main)
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const lucide = require('lucide');
const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const version = require('lucide/package.json').version;

// mesma conversão de nome que o Lucide usa (ex.: "loader-2" -> "Loader2")
const toPascal = (s) => s.replace(/(^\w|[-_\s]+\w)/g, (m) => m.replace(/[-_\s]/, '').toUpperCase());

const names = [...new Set([...html.matchAll(/data-lucide="([^"]+)"/g)].map((m) => m[1]))].sort();
const icons = {};
const missing = [];
for (const name of names) {
  const node = lucide.icons[toPascal(name)] || lucide[toPascal(name)];
  if (node) icons[name] = node;
  else missing.push(name);
}
if (missing.length) {
  console.error('Ícones não encontrados no Lucide ' + version + ': ' + missing.join(', '));
  process.exit(1);
}

const out = `/* Gerado por scripts/build-icons.mjs (npm run build:icons). Não editar à mão.
   ${names.length} ícones do Lucide v${version} (licença ISC, https://lucide.dev) usados no index.html. */
(function () {
  var I = ${JSON.stringify(icons)};
  var NS = 'http://www.w3.org/2000/svg';
  var BASE = { xmlns: NS, width: 24, height: 24, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
    'stroke-width': 2, 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
  function createIcons() {
    var els = document.querySelectorAll('i[data-lucide]');
    for (var n = 0; n < els.length; n++) {
      var el = els[n], name = el.getAttribute('data-lucide'), node = I[name];
      if (!node) continue;
      var svg = document.createElementNS(NS, 'svg'), k, a11y = false;
      for (k in BASE) svg.setAttribute(k, BASE[k]);
      for (var j = 0; j < el.attributes.length; j++) {
        var at = el.attributes[j];
        if (at.name.indexOf('aria-') === 0 || at.name === 'role' || at.name === 'title') a11y = true;
        if (at.name !== 'class') svg.setAttribute(at.name, at.value);
      }
      if (!a11y) svg.setAttribute('aria-hidden', 'true');
      svg.setAttribute('class', ('lucide lucide-' + name + ' ' + (el.getAttribute('class') || '')).trim());
      for (var c = 0; c < node.length; c++) {
        var child = document.createElementNS(NS, node[c][0]);
        for (k in node[c][1]) child.setAttribute(k, node[c][1][k]);
        svg.appendChild(child);
      }
      el.parentNode.replaceChild(svg, el);
    }
  }
  window.lucide = window.lucide || {};
  window.lucide.createIcons = createIcons;
})();
`;
fs.mkdirSync(path.join(root, 'assets'), { recursive: true });
fs.writeFileSync(path.join(root, 'assets', 'icons.js'), out);
console.log(`assets/icons.js: ${names.length} ícones, ${(out.length / 1024).toFixed(1)} KB`);
