/* ============================================================================
   Eve: personagem animada (SVG 2D, sem framework, geometria ORIGINAL gerada por parâmetros).
   Técnica: corpo que "morfa" entre formas (molas) com gradiente que gira devagar (ciano → azul, as cores do login), olhos que seguem o cursor e piscam, e um ADEREÇO próprio por
   estado (lupa, balão de pensamento, ondas de som, bochechas e brilhos, "!" e gota de suor, zZz, linhas de velocidade), para a
   emoção ser lida de longe. Nada aqui vem de outro personagem: as formas são curvas calculadas em tempo real.

   API (global window.EveCharacter):
     var eve = EveCharacter.mount(elemento, { forma: 'prisma' | 'gota', tema: 'light' | 'dark', spawn: true });
     eve.setState('idle' | 'listening' | 'typing' | 'sending' | 'searching' | 'thinking' | 'speaking' | 'happy' | 'error' | 'sleep');
     eve.play('spawn' | 'send' | 'celebrate' | 'shake' | 'wave' | 'nod' | 'tick' | 'peek' | 'stretch' | 'yawn');
     eve.setTheme('dark' | 'light');   eve.setShape('prisma' | 'gota');
     eve.lookAt(clientX, clientY) / eve.lookAtElement(el) / eve.lookFree()   // alvo do olhar (padrão: mouse da página)
     eve.setTalking(true|false)       // "falando": pulsa e mostra ondas enquanto o texto da resposta aparece
     eve.destroy();
   O SVG ocupa 100% do elemento-host (o tamanho vem do CSS). Respeita prefers-reduced-motion.
   ============================================================================ */
(function () {
  'use strict';
  if (window.EveCharacter) return;

  var NS = 'http://www.w3.org/2000/svg';
  var REDUZIDO = false;
  try { REDUZIDO = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}
  var TAU = Math.PI * 2;
  var clamp = function (v, a, b) { return v < a ? a : v > b ? b : v; };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var pick = function (arr) { return arr[Math.floor(Math.random() * arr.length)]; };
  var el = function (tag, attrs, parent) { var n = document.createElementNS(NS, tag); if (attrs) for (var k in attrs) n.setAttribute(k, attrs[k]); if (parent) parent.appendChild(n); return n; };
  var txt = function (tag, attrs, parent, conteudo) { var n = el(tag, attrs, parent); n.textContent = conteudo; return n; };

  /* ---- mola (semi-implícita) ---- */
  function Spring(v, k, d) { this.v = v; this.t = v; this.vel = 0; this.k = k || 0.16; this.d = d || 0.72; }
  Spring.prototype.step = function () { this.vel += (this.t - this.v) * this.k; this.vel *= this.d; this.v += this.vel; if (Math.abs(this.vel) < 1e-4 && Math.abs(this.t - this.v) < 1e-4) { this.v = this.t; this.vel = 0; } return this.v; };
  Spring.prototype.set = function (t) { this.t = t; };
  Spring.prototype.kick = function (imp) { this.vel += imp; };

  /* ---- vocabulário: cada estado é um vetor de parâmetros; morfar = interpolar ----
     corpo: sx/sy escala · bulge calombo (pensando) · flat achatamento da base (dormindo) · rot inclinação · breath respiração
     olhos: ew/eh largura/altura (fração do raio) · ey altura · gap distância · happy arcos · sad caídos · ehR altura do olho direito (piscadela)
     olhar: lookx/looky · blinkEvery (bo/by/ba/bd ficaram no vocabulário por compatibilidade, mas a Eve não tem sobrancelha desde 21/10)
     adereços (0..1): ouvir (ondas de som) · falar (ondas de fala) · pensar (balão "?") · lupa · alerta ("!" + gota de suor) ·
     feliz (bochechas + brilhos) · zz (zZz) · vento (linhas de velocidade) · digitar (balão "…") */
  var BASE = { sx: 1, sy: 0.98, bulge: 0, flat: 0, rot: 0, breath: 0.022, ew: 0.17, eh: 0.34, ey: -0.02, gap: 0.46, happy: 0, sad: 0, ehR: 1, lookx: 0, looky: 0,
    bo: 0, by: 0.30, ba: 0, bd: 0, blinkEvery: 4.2, ouvir: 0, falar: 0, pensar: 0, lupa: 0, alerta: 0, feliz: 0, zz: 0, vento: 0, digitar: 0 };
  function forma(o) { var f = {}; for (var k in BASE) f[k] = (k in o) ? o[k] : BASE[k]; return f; }
  var FORMAS = {
    idle:      forma({}),
    listening: forma({ sx: 0.96, sy: 1.05, rot: -5, ew: 0.19, eh: 0.42, ey: -0.04, gap: 0.48, looky: -0.04, breath: 0.014, blinkEvery: 5.5, bo: 0.9, by: 0.34, ba: 0, ouvir: 1 }),
    typing:    forma({ sx: 0.97, sy: 1.03, rot: 4, ew: 0.18, eh: 0.38, gap: 0.48, happy: 0.2, lookx: -0.1, looky: 0.22, breath: 0.016, blinkEvery: 5, bo: 0.8, by: 0.30, ba: -4, digitar: 1 }),
    sending:   forma({ sx: 0.92, sy: 1.10, rot: -10, ew: 0.20, eh: 0.30, ey: -0.06, gap: 0.50, looky: -0.3, breath: 0.01, blinkEvery: 8, bo: 1, by: 0.28, ba: -14, vento: 1 }),
    searching: forma({ sx: 1.03, sy: 0.95, ew: 0.17, eh: 0.30, ey: -0.02, gap: 0.46, ehR: 1.35, looky: 0.02, breath: 0.012, blinkEvery: 9, bo: 1, by: 0.28, ba: -10, bd: 6, lupa: 1 }),
    thinking:  forma({ sx: 1.04, sy: 0.93, bulge: 0.16, rot: 9, ew: 0.16, eh: 0.24, ey: -0.06, gap: 0.44, lookx: 0.22, looky: -0.26, breath: 0.012, blinkEvery: 7, bo: 1, by: 0.30, ba: 0, bd: 12, pensar: 1 }),
    speaking:  forma({ sx: 1.02, sy: 0.98, ew: 0.17, eh: 0.36, ey: -0.02, gap: 0.46, happy: 0.35, looky: 0.06, breath: 0.03, blinkEvery: 4, bo: 0.7, by: 0.34, ba: 2, falar: 1 }),
    happy:     forma({ sx: 1.08, sy: 0.90, ew: 0.19, eh: 0.30, ey: -0.06, gap: 0.60, happy: 1, breath: 0.03, blinkEvery: 6, bo: 0.9, by: 0.40, ba: 4, feliz: 1 }),
    error:     forma({ sx: 1.12, sy: 0.82, rot: -3, ew: 0.20, eh: 0.30, ey: 0.02, gap: 0.50, happy: -1, looky: 0.08, breath: 0.01, blinkEvery: 9, bo: 1, by: 0.34, ba: 16, alerta: 1 }),
    sleep:     forma({ sx: 1.06, sy: 0.86, flat: 0.35, ew: 0.18, eh: 0.05, ey: 0.04, gap: 0.46, looky: 0.1, breath: 0.04, blinkEvery: 999, bo: 0, zz: 1 })
  };
  var NUMERICOS = Object.keys(BASE).filter(function (k) { return k !== 'blinkEvery'; });
  /* paleta: a Eve é CIANO (cor secundária da Prisme, a do fundo do login: #03becf → #209dcf), para contrastar com o verde do painel */
  var PALETAS = {
    light: { cor: '#12b5dc', clara: '#5ee6ff', escura: '#1565c0', olho: '#ffffff', sombra: '#0a6ea8', texto: '#0b5f8f', adereco: '#ffffff' },
    dark:  { cor: '#2cc4f0', clara: '#8df0ff', escura: '#1976d2', olho: '#0b1220', sombra: '#000000', texto: '#0b1220', adereco: '#0b1220' }
  };

  /* ---- corpo: 24 pontos num contorno modulado (tri 0..1 = gota → prisma), fechados com Catmull-Rom → cúbicas ---- */
  function corpoPath(R, p, tri, respiracao) {
    var n = 24, pts = [];
    for (var i = 0; i < n; i++) {
      var th = (i / n) * TAU - Math.PI / 2, a = th + Math.PI / 2;
      var g = Math.exp(-Math.pow((a - 0.78) / 0.55, 2)), fundo = Math.max(0, Math.sin(th));
      var prisma = 1 + tri * (0.17 * Math.cos(3 * a) + 0.035 * Math.cos(6 * a));
      var r = R * prisma * (1 + p.bulge * g * 0.9) * (1 + respiracao);
      pts.push([Math.cos(th) * r * p.sx, Math.sin(th) * r * p.sy * (1 - p.flat * fundo * fundo * 0.45) + p.flat * R * 0.08 + tri * R * 0.05]);
    }
    var d = 'M' + pts[0][0].toFixed(2) + ',' + pts[0][1].toFixed(2);
    for (var j = 0; j < n; j++) {
      var p0 = pts[(j - 1 + n) % n], p1 = pts[j], p2 = pts[(j + 1) % n], p3 = pts[(j + 2) % n];
      d += 'C' + (p1[0] + (p2[0] - p0[0]) / 6).toFixed(2) + ',' + (p1[1] + (p2[1] - p0[1]) / 6).toFixed(2) + ' ' + (p2[0] - (p3[0] - p1[0]) / 6).toFixed(2) + ',' + (p2[1] - (p3[1] - p1[1]) / 6).toFixed(2) + ' ' + p2[0].toFixed(2) + ',' + p2[1].toFixed(2);
    }
    return d + 'Z';
  }
  function olhoPath(w, h, happy) {
    var r = Math.min(w, h) / 2;
    if (happy > 0.5) { var a = w * 0.42, alt = h * 0.55; return 'M' + (-a).toFixed(2) + ',' + (alt * 0.3).toFixed(2) + ' Q0,' + (-alt).toFixed(2) + ' ' + a.toFixed(2) + ',' + (alt * 0.3).toFixed(2); }
    if (happy < -0.5) { var a2 = w * 0.42, alt2 = h * 0.55; return 'M' + (-a2).toFixed(2) + ',' + (-alt2 * 0.3).toFixed(2) + ' Q0,' + alt2.toFixed(2) + ' ' + a2.toFixed(2) + ',' + (-alt2 * 0.3).toFixed(2); }   // arco para baixo: olhos tristes
    var x0 = -w / 2, y0 = -h / 2, x1 = w / 2, y1 = h / 2;
    return 'M' + (x0 + r).toFixed(2) + ',' + y0.toFixed(2) + 'H' + (x1 - r).toFixed(2) + 'A' + r + ',' + r + ' 0 0 1 ' + x1.toFixed(2) + ',' + (y0 + r).toFixed(2) + 'V' + (y1 - r).toFixed(2) + 'A' + r + ',' + r + ' 0 0 1 ' + (x1 - r).toFixed(2) + ',' + y1.toFixed(2) + 'H' + (x0 + r).toFixed(2) + 'A' + r + ',' + r + ' 0 0 1 ' + x0.toFixed(2) + ',' + (y1 - r).toFixed(2) + 'V' + (y0 + r).toFixed(2) + 'A' + r + ',' + r + ' 0 0 1 ' + (x0 + r).toFixed(2) + ',' + y0.toFixed(2) + 'Z';
  }

  var contador = 0;
  function mount(container, opts) {
    opts = opts || {};
    var R = 40, id = 'eve' + (++contador);
    var svg = el('svg', { viewBox: '-64 -64 128 128', 'aria-hidden': 'true', class: 'eve-char' });
    svg.style.display = 'block'; svg.style.overflow = 'visible'; svg.style.width = '100%'; svg.style.height = '100%';
    var defs = el('defs', null, svg);
    var grad = el('linearGradient', { id: id + 'g', gradientUnits: 'userSpaceOnUse', x1: -R, y1: -R, x2: R, y2: R }, defs);   // gira devagar no quadro
    var stops = [el('stop', { offset: '0' }, grad), el('stop', { offset: '0.5' }, grad), el('stop', { offset: '1' }, grad)];
    var lustre = el('radialGradient', { id: id + 'l', cx: '30%', cy: '22%', r: '70%' }, defs);   // luz no alto à esquerda, por cima do gradiente
    el('stop', { offset: '0', 'stop-color': '#fff', 'stop-opacity': '0.55' }, lustre); el('stop', { offset: '0.5', 'stop-color': '#fff', 'stop-opacity': '0.08' }, lustre); el('stop', { offset: '1', 'stop-color': '#000', 'stop-opacity': '0.10' }, lustre);
    var brilho = el('linearGradient', { id: id + 'b', x1: '0', y1: '0', x2: '1', y2: '1' }, defs);
    [['0', '0'], ['0.45', '0.55'], ['0.5', '0.75'], ['0.55', '0.55'], ['1', '0']].forEach(function (s) { el('stop', { offset: s[0], 'stop-color': '#fff', 'stop-opacity': s[1] }, brilho); });
    var clip = el('clipPath', { id: id + 'c' }, defs); var clipPath = el('path', null, clip);
    var filtro = el('filter', { id: id + 's', x: '-50%', y: '-50%', width: '200%', height: '200%' }, defs);
    var sombra = el('feDropShadow', { dx: '0', dy: '6', stdDeviation: '5', 'flood-opacity': '0.35' }, filtro);

    /* camadas (de trás para a frente) */
    var anel = el('circle', { r: R + 7, fill: 'none', 'stroke-width': '2', opacity: '0' }, svg);
    var particulas = el('g', null, svg);
    var raiz = el('g', null, svg);                                   // posição + escala
    var corpoG = el('g', { filter: 'url(#' + id + 's)' }, raiz);     // rotação
    var corpo = el('path', { fill: 'url(#' + id + 'g)' }, corpoG);
    var corpoLustre = el('path', { fill: 'url(#' + id + 'l)' }, corpoG);   // mesmo contorno, só a luz
    var faixa = el('rect', { x: '-90', y: '-90', width: '60', height: '180', fill: 'url(#' + id + 'b)', 'clip-path': 'url(#' + id + 'c)', opacity: '0', transform: 'rotate(25)' }, corpoG);
    var feixe = el('rect', { x: '-3', y: '-60', width: '6', height: '120', rx: '3', fill: '#fff', opacity: '0', 'clip-path': 'url(#' + id + 'c)' }, corpoG);   // varredura da consulta
    var reflexo = el('ellipse', { cx: '-13', cy: '-20', rx: '13', ry: '8', fill: '#fff', opacity: '0.32', transform: 'rotate(-28 -13 -20)' }, corpoG);
    var bochechas = el('g', { opacity: '0' }, corpoG);
    var bochE = el('ellipse', { rx: 6, ry: 3.6, fill: '#ff8fa3' }, bochechas), bochD = el('ellipse', { rx: 6, ry: 3.6, fill: '#ff8fa3' }, bochechas);
    var olhosG = el('g', null, corpoG);                              // olhar (translação)
    var olhoE = el('path', { 'stroke-width': '0', 'stroke-linecap': 'round' }, olhosG), olhoD = el('path', { 'stroke-width': '0', 'stroke-linecap': 'round' }, olhosG);
    var suor = el('path', { d: 'M0,-6 C3,-1 4,1 4,3.5 A4,4 0 1 1 -4,3.5 C-4,1 -3,-1 0,-6Z', fill: '#7fd6ff', stroke: '#2b8fc8', 'stroke-width': '0.8', opacity: '0' }, corpoG);   // gota de suor (erro)
    /* adereços FORA do corpo (não giram com ele) */
    var props = el('g', null, raiz);
    var ouvirG = el('g', { opacity: '0' }, props);                   // ondas de som à direita
    var ondas = [0, 1].map(function (i) { return el('path', { d: 'M0,-' + (8 + i * 7) + ' A' + (10 + i * 8) + ',' + (10 + i * 8) + ' 0 0 1 0,' + (8 + i * 7), fill: 'none', 'stroke-width': '3', 'stroke-linecap': 'round' }, ouvirG); });
    var falarG = el('g', { opacity: '0' }, props);                   // ondas de fala dos dois lados
    var fala = [[-1, 0], [-1, 1], [1, 0], [1, 1]].map(function (s) { return el('path', { d: 'M0,-' + (6 + s[1] * 6) + ' A' + (8 + s[1] * 7) + ',' + (8 + s[1] * 7) + ' 0 0 ' + (s[0] > 0 ? 1 : 0) + ' 0,' + (6 + s[1] * 6), fill: 'none', 'stroke-width': '2.6', 'stroke-linecap': 'round' }, falarG); });
    var pensarG = el('g', { opacity: '0' }, props);                  // balão de pensamento com "?"
    var pb = [el('circle', { r: 2.2 }, pensarG), el('circle', { r: 3.4 }, pensarG), el('ellipse', { rx: 13, ry: 10 }, pensarG)];
    var pensarTxt = txt('text', { 'text-anchor': 'middle', 'font-family': 'Nunito, Arial, sans-serif', 'font-weight': '800', 'font-size': '14' }, pensarG, '?');
    var digitarG = el('g', { opacity: '0' }, props);                 // balão "…" (digitando)
    var db = [el('circle', { r: 2 }, digitarG), el('ellipse', { rx: 13, ry: 8 }, digitarG)];
    var dpts = [0, 1, 2].map(function (i) { return el('circle', { r: 1.9, cx: (i - 1) * 6 }, digitarG); });
    var lupaG = el('g', { opacity: '0' }, props);                    // lupa sobre o olho direito
    var lupaVidro = el('circle', { r: 13, fill: 'rgba(255,255,255,0.18)', 'stroke-width': '3.2' }, lupaG);
    var lupaCabo = el('path', { d: 'M9.5,9.5 L19,19', 'stroke-width': '4.5', 'stroke-linecap': 'round', fill: 'none' }, lupaG);
    var lupaBrilho = el('path', { d: 'M-7,-3 Q-5,-8 0,-9', fill: 'none', 'stroke-width': '1.8', 'stroke-linecap': 'round', stroke: '#fff', opacity: '0.8' }, lupaG);
    var alertaG = el('g', { opacity: '0' }, props);                  // "!" no alto à direita
    el('circle', { r: 9, fill: '#ff5a5f' }, alertaG); txt('text', { 'text-anchor': 'middle', y: '5', 'font-family': 'Nunito, Arial, sans-serif', 'font-weight': '900', 'font-size': '15', fill: '#fff' }, alertaG, '!');
    var felizG = el('g', { opacity: '0' }, props);                   // brilhos (estrelas de 4 pontas)
    var brilhos = [0, 1, 2].map(function () { return el('path', { d: 'M0,-6 Q1,-1 6,0 Q1,1 0,6 Q-1,1 -6,0 Q-1,-1 0,-6Z', fill: '#ffd166' }, felizG); });
    var zzG = el('g', { opacity: '0' }, props);                      // zZz subindo
    var zz = [0, 1, 2].map(function (i) { return txt('text', { 'font-family': 'Nunito, Arial, sans-serif', 'font-weight': '800', 'font-size': String(9 + i * 3) }, zzG, i === 1 ? 'Z' : 'z'); });
    var ventoG = el('g', { opacity: '0' }, props);                   // linhas de velocidade à esquerda
    var vento = [0, 1, 2].map(function (i) { return el('path', { d: 'M0,0 H-' + (12 + i * 5), 'stroke-width': '2.6', 'stroke-linecap': 'round', fill: 'none' }, ventoG); });
    var orbita = el('g', { opacity: '0' }, props);                   // pontinhos (enviando)
    var dots = [0, 1, 2].map(function () { return el('circle', { r: 3.2 }, orbita); });
    container.appendChild(svg);

    /* estado animado */
    var estado = 'idle', f = {}, molas = {}, paleta = PALETAS.light, k;
    for (k = 0; k < NUMERICOS.length; k++) { f[NUMERICOS[k]] = FORMAS.idle[NUMERICOS[k]]; molas[NUMERICOS[k]] = new Spring(FORMAS.idle[NUMERICOS[k]], 0.14, 0.7); }
    var tri = new Spring(opts.forma === 'gota' ? 0 : 1, 0.08, 0.8);
    var escala = new Spring(opts.spawn === false ? 1 : 0, 0.2, 0.62), pulo = new Spring(0, 0.2, 0.6), tremor = 0, tremorT = 0;
    var olharX = new Spring(0, 0.12, 0.7), olharY = new Spring(0, 0.12, 0.7), inclina = new Spring(0, 0.1, 0.75), extraRot = new Spring(0, 0.12, 0.7);
    var mouse = null, alvoOlhar = null, alvoEl = null, blinkT = 0, blinkProx = rnd(2, 5), orbAng = 0;
    var faixaX = -200, faixaOp = new Spring(0, 0.2, 0.7), anelR = 0, anelOp = 0, t0 = performance.now(), vivo = true, raf = 0, parts = [];
    var waveT = -1, nodT = -1, bocejoT = -1, falando = false, falaT = 0, glance = null, glanceAte = 0, proxManeirismo = rnd(4, 9), peekT = -1;

    function aplicarPaleta() {
      stops[0].setAttribute('stop-color', paleta.clara); stops[1].setAttribute('stop-color', paleta.cor); stops[2].setAttribute('stop-color', paleta.escura);
      sombra.setAttribute('flood-color', paleta.sombra); anel.setAttribute('stroke', paleta.cor);
      dots.forEach(function (d) { d.setAttribute('fill', paleta.cor); });
      olhoE.setAttribute('stroke', paleta.olho); olhoD.setAttribute('stroke', paleta.olho);
      ondas.concat(fala).concat(vento).forEach(function (o) { o.setAttribute('stroke', paleta.cor); });
      pb.concat(db).forEach(function (o) { o.setAttribute('fill', paleta.adereco); o.setAttribute('stroke', paleta.cor); o.setAttribute('stroke-width', '1.4'); });
      dpts.forEach(function (o) { o.setAttribute('fill', paleta.cor); }); pensarTxt.setAttribute('fill', paleta.cor);
      lupaVidro.setAttribute('stroke', paleta.adereco); lupaCabo.setAttribute('stroke', paleta.adereco);
      zz.forEach(function (z) { z.setAttribute('fill', paleta.adereco); z.setAttribute('stroke', paleta.cor); z.setAttribute('stroke-width', '0.6'); });
      reflexo.setAttribute('opacity', paleta === PALETAS.dark ? '0.42' : '0.32');
    }
    function setTheme(t) { paleta = t === 'dark' ? PALETAS.dark : PALETAS.light; aplicarPaleta(); }
    function setShape(s) { tri.set(s === 'gota' ? 0 : 1); }
    setTheme(opts.tema);

    function setState(nome) {
      if (!FORMAS[nome]) nome = 'idle';
      estado = nome;
      for (var i = 0; i < NUMERICOS.length; i++) molas[NUMERICOS[i]].set(FORMAS[nome][NUMERICOS[i]]);
      if (nome === 'sleep') { olharX.set(0); olharY.set(0.1); }
      glance = null;
    }
    function particula(x, y, vx, vy, cor, tipo) {
      if (REDUZIDO || parts.length > 18) return;
      var n = tipo === 'rect' ? el('rect', { width: 6, height: 3.5, rx: 1.5, fill: cor }, particulas) : tipo === 'star' ? el('path', { d: 'M0,-5 Q1,-1 5,0 Q1,1 0,5 Q-1,1 -5,0 Q-1,-1 0,-5Z', fill: cor }, particulas) : el('circle', { r: rnd(2, 3.6), fill: cor }, particulas);
      parts.push({ el: n, x: x, y: y, vx: vx, vy: vy, vida: 1, rot: rnd(0, 360), vr: rnd(-8, 8), tipo: tipo });
    }
    function play(efeito) {
      if (efeito === 'spawn') { escala.v = 0; escala.vel = 0; escala.set(1); setState('idle'); waveT = 0; return; }
      if (efeito === 'send') { escala.kick(-0.14); pulo.kick(2.2); anelR = R; anelOp = 0.7;
        for (var i = 0; i < 8; i++) { var a = rnd(-2.6, -0.5); particula(rnd(-12, 12), -R * 0.7, Math.cos(a) * rnd(1.2, 2.6), Math.sin(a) * rnd(1.8, 3.2), i % 3 === 0 ? '#fff' : paleta.clara, 'dot'); }
        return; }
      if (efeito === 'celebrate') { pulo.kick(-3.4); escala.kick(0.08); setState('happy'); faixaX = -200; faixaOp.v = 1; faixaOp.set(0);
        var cores = ['#fff', '#ffd166', paleta.clara, '#ff8fa3'];
        for (var j = 0; j < 14; j++) { var an = rnd(-3.0, -0.1); particula(rnd(-10, 10), -R * 0.2, Math.cos(an) * rnd(1.5, 3.4), Math.sin(an) * rnd(2.5, 4.2), cores[j % cores.length], j % 4 === 1 ? 'star' : 'rect'); }
        return; }
      if (efeito === 'shake') { if (!REDUZIDO) { tremor = 1; tremorT = 0; } setState('error'); return; }
      if (efeito === 'wave') { waveT = 0; return; }
      if (efeito === 'nod') { nodT = 0; return; }
      if (efeito === 'tick') { pulo.kick(rnd(0.5, 0.9)); extraRot.kick(rnd(-0.6, 0.6)); return; }
      if (efeito === 'peek') { pulo.kick(-2.2); escala.kick(0.05); blinkT = 0; blinkProx = 0.9; peekT = 0; return; }
      if (efeito === 'stretch') { escala.kick(0.07); inclina.kick(1.5); return; }
      if (efeito === 'yawn') { if (estado === 'idle') bocejoT = 0; return; }
    }
    function lookAt(cx, cy) { alvoOlhar = { x: cx, y: cy }; alvoEl = null; }
    function lookAtElement(e) { alvoEl = e || null; alvoOlhar = null; }
    function lookFree() { alvoOlhar = null; alvoEl = null; }
    function setTalking(sim) { falando = !!sim; if (!sim) falaT = 0; }

    function onMove(e) { mouse = { x: e.clientX, y: e.clientY }; }
    function onTouch(e) { if (e.touches && e.touches[0]) mouse = { x: e.touches[0].clientX, y: e.touches[0].clientY }; }
    document.addEventListener('mousemove', onMove, { passive: true });
    document.addEventListener('touchstart', onTouch, { passive: true });

    function maneirismo(t) {
      if (t < proxManeirismo || REDUZIDO) return;
      proxManeirismo = t + rnd(5, 12);
      if (estado !== 'idle' && estado !== 'listening') return;
      var acao = pick(['glance', 'glance', 'blink2', 'stretch', 'tilt', 'yawn', 'nod']);
      if (acao === 'glance') { glance = { x: rnd(-0.35, 0.35), y: rnd(-0.3, 0.2) }; glanceAte = t + rnd(0.8, 1.6); }
      else if (acao === 'blink2') { blinkT = 0; blinkProx = 0.3; }
      else if (acao === 'stretch') play('stretch');
      else if (acao === 'tilt') extraRot.kick(rnd(-2.5, 2.5));
      else if (acao === 'yawn') { if (estado === 'idle' && Math.random() < 0.5) play('yawn'); }
      else if (acao === 'nod') nodT = 0;
    }
    var pulsa = function (t, hz, a, b) { return a + (Math.sin(t * hz * TAU) * 0.5 + 0.5) * (b - a); };

    function quadro(agora) {
      if (!vivo) return;
      raf = requestAnimationFrame(quadro);
      if (document.hidden) return;
      var t = (agora - t0) / 1000;
      for (var i = 0; i < NUMERICOS.length; i++) f[NUMERICOS[i]] = molas[NUMERICOS[i]].step();
      var triV = tri.step();
      maneirismo(t);
      /* olhar */
      var ox = f.lookx, oy = f.looky, alvo = alvoOlhar;
      if (alvoEl && alvoEl.getBoundingClientRect) { var ra = alvoEl.getBoundingClientRect(); alvo = { x: ra.left + ra.width / 2, y: ra.top + ra.height / 2 }; }
      if (!alvo) alvo = mouse;
      if (glance && t < glanceAte) { ox += glance.x; oy += glance.y; inclina.set(glance.x * 6); }
      else if (alvo && estado !== 'sleep' && estado !== 'thinking' && estado !== 'searching') {
        var rc = svg.getBoundingClientRect(), dx = alvo.x - (rc.left + rc.width / 2), dy = alvo.y - (rc.top + rc.height / 2), dist = Math.sqrt(dx * dx + dy * dy) || 1;
        var forca = clamp(dist / 260, 0, 1);
        ox += (dx / dist) * 0.3 * forca; oy += (dy / dist) * 0.22 * forca; inclina.set((dx / dist) * 5 * forca);
      } else if (estado === 'idle') { ox += Math.sin(t * 0.7) * 0.08; oy += Math.cos(t * 0.5) * 0.05; inclina.set(0); }
      else if (estado === 'searching') { ox += Math.sin(t * 5.2) * 0.22; inclina.set(Math.sin(t * 5.2) * 3); }
      else inclina.set(0);
      olharX.set(ox); olharY.set(oy);
      var gx = olharX.step() * R, gy = olharY.step() * R;
      /* piscar */
      var blink = 1;
      if (estado !== 'sleep') {
        blinkT += 1 / 60;
        if (blinkT > blinkProx) { blinkT = 0; var be = FORMAS[estado].blinkEvery; blinkProx = rnd(0.6 * be, 1.4 * be); if (Math.random() < 0.2) blinkProx = 0.35; }
        if (blinkT < 0.16) blink = Math.abs(Math.cos((blinkT / 0.16) * Math.PI)) * 0.92 + 0.08;
      }
      if (bocejoT >= 0) { bocejoT += 1 / 60; var bz = Math.sin(Math.min(bocejoT, 1.2) / 1.2 * Math.PI); blink = Math.min(blink, 1 - bz * 0.92); if (bocejoT > 1.2) bocejoT = -1; }
      /* corpo */
      var resp = Math.sin(t * (estado === 'sleep' ? 1.6 : 2.4)) * f.breath;
      if (bocejoT >= 0) resp += Math.sin(Math.min(bocejoT, 1.2) / 1.2 * Math.PI) * 0.07;
      var falaV = 0;
      if (falando) { falaT += 1 / 60; falaV = (Math.sin(falaT * 11) * 0.5 + Math.sin(falaT * 17) * 0.5) * 0.035; }
      var sc = escala.step(), py = pulo.step() + falaV * 30, px = 0;
      if (tremor > 0) { tremorT += 1 / 60; px = Math.sin(tremorT * 48) * 6 * tremor; tremor *= 0.93; if (tremor < 0.02) tremor = 0; }
      var rot = f.rot + inclina.step() + extraRot.step();
      if (waveT >= 0) { waveT += 1 / 60; rot += Math.sin(waveT * 9) * 12 * Math.max(0, 1 - waveT / 1.4); if (waveT > 1.4) waveT = -1; }
      if (nodT >= 0) { nodT += 1 / 60; py += Math.sin(nodT * 14) * 4 * Math.max(0, 1 - nodT / 0.9); if (nodT > 0.9) nodT = -1; }
      var squash = clamp(-pulo.vel * 0.04, -0.12, 0.18);
      raiz.setAttribute('transform', 'translate(' + px.toFixed(2) + ',' + py.toFixed(2) + ') scale(' + (sc * (1 - squash * 0.6 + falaV * 0.4)).toFixed(3) + ',' + (sc * (1 + squash - falaV * 0.6)).toFixed(3) + ')');
      corpoG.setAttribute('transform', 'rotate(' + rot.toFixed(2) + ')');
      var d = corpoPath(R, f, triV, resp); corpo.setAttribute('d', d); corpoLustre.setAttribute('d', d); clipPath.setAttribute('d', d);
      grad.setAttribute('gradientTransform', 'rotate(' + ((t * 24) % 360).toFixed(1) + ')');   // 15 s por volta: o ciano e o azul trocam de lado devagar
      /* olhos (sem sobrancelha: a expressão fica no corpo, no olhar e nos adereços) */
      var ew = f.ew * R * 2, ehBase = f.eh * R * 2, gap = f.gap * R, ey = f.ey * R + triV * R * 0.12;
      var feliz = f.happy, triste = f.sad, arco = feliz > 0.5 || feliz < -0.5;
      [olhoE, olhoD].forEach(function (o, idx) {
        var lado = idx === 0 ? -1 : 1, eh = Math.max(ehBase * blink * (idx === 1 ? f.ehR : 1), 2.2);
        o.setAttribute('d', olhoPath(ew, eh, feliz));
        o.setAttribute('fill', arco ? 'none' : paleta.olho); o.setAttribute('stroke-width', arco ? (ew * 0.42).toFixed(2) : '0');
        o.setAttribute('transform', 'translate(' + (lado * gap / 2).toFixed(2) + ',' + ey.toFixed(2) + ') rotate(' + (triste * 14 * lado).toFixed(1) + ')');
      });
      olhosG.setAttribute('transform', 'translate(' + gx.toFixed(2) + ',' + gy.toFixed(2) + ')');
      /* bochechas (feliz) e suor (erro) */
      bochechas.setAttribute('opacity', (f.feliz * 0.55).toFixed(2));
      bochE.setAttribute('cx', (-gap / 2 - 9).toFixed(1)); bochE.setAttribute('cy', (ey + 11).toFixed(1)); bochD.setAttribute('cx', (gap / 2 + 9).toFixed(1)); bochD.setAttribute('cy', (ey + 11).toFixed(1));
      var sy2 = f.alerta > 0.05 ? (R * 0.55 * 0.2 + ((t * 0.7) % 1) * 14) : 0;
      suor.setAttribute('opacity', (f.alerta * (1 - ((t * 0.7) % 1) * 0.6)).toFixed(2)); suor.setAttribute('transform', 'translate(' + (R * 0.78).toFixed(1) + ',' + (-R * 0.35 + sy2).toFixed(1) + ') scale(' + (0.9 + f.alerta * 0.3).toFixed(2) + ')');
      /* reflexo varrendo + feixe da consulta */
      var fo = faixaOp.step();
      if (fo > 0.01) { faixaX += 5; faixa.setAttribute('opacity', fo.toFixed(2)); faixa.setAttribute('transform', 'translate(' + faixaX + ',0) rotate(25)'); if (faixaX > 200) faixaOp.v = 0; } else faixa.setAttribute('opacity', '0');
      feixe.setAttribute('opacity', (f.lupa * 0.35).toFixed(2)); if (f.lupa > 0.01) feixe.setAttribute('transform', 'translate(' + (Math.sin(t * 5.2) * R * 0.9).toFixed(1) + ',0)');
      /* ---- adereços por estado ---- */
      ouvirG.setAttribute('opacity', f.ouvir.toFixed(2)); ouvirG.setAttribute('transform', 'translate(' + (R * 1.18).toFixed(1) + ',' + (ey * 0.6).toFixed(1) + ')');
      ondas.forEach(function (o, i) { o.setAttribute('opacity', pulsa(t + i * 0.25, 1.3, 0.25, 1).toFixed(2)); });
      var falarV = falando ? 1 : f.falar;
      falarG.setAttribute('opacity', falarV.toFixed(2));
      fala.forEach(function (o, i) { var lado = i < 2 ? -1 : 1, n = i % 2; o.setAttribute('transform', 'translate(' + (lado * R * 1.12).toFixed(1) + ',' + (ey * 0.5).toFixed(1) + ')'); o.setAttribute('opacity', pulsa(t * 1.6 + n * 0.3 + (lado > 0 ? 0.5 : 0), 2.2, 0.15, 1).toFixed(2)); });
      pensarG.setAttribute('opacity', f.pensar.toFixed(2)); pensarG.setAttribute('transform', 'translate(' + (R * 0.9).toFixed(1) + ',' + (-R * 0.95 + Math.sin(t * 2) * 1.5).toFixed(1) + ')');
      pb[0].setAttribute('cx', -11); pb[0].setAttribute('cy', 9); pb[1].setAttribute('cx', -6); pb[1].setAttribute('cy', 2); pb[2].setAttribute('cx', 6); pb[2].setAttribute('cy', -9);
      pensarTxt.setAttribute('x', 6); pensarTxt.setAttribute('y', -4); pensarTxt.setAttribute('transform', 'rotate(' + (Math.sin(t * 3) * 8).toFixed(1) + ' 6 -9)');
      digitarG.setAttribute('opacity', f.digitar.toFixed(2)); digitarG.setAttribute('transform', 'translate(' + (R * 0.95).toFixed(1) + ',' + (-R * 0.85).toFixed(1) + ')');
      db[0].setAttribute('cx', -9); db[0].setAttribute('cy', 8); db[1].setAttribute('cx', 4); db[1].setAttribute('cy', -4);
      dpts.forEach(function (p, i) { p.setAttribute('cx', 4 + (i - 1) * 6); p.setAttribute('cy', -4 + (Math.sin(t * 7 - i * 0.9) > 0.6 ? -1.5 : 0)); p.setAttribute('opacity', pulsa(t * 1.4 - i * 0.33, 1, 0.3, 1).toFixed(2)); });
      lupaG.setAttribute('opacity', f.lupa.toFixed(2));
      if (f.lupa > 0.01) { var lx = gap / 2 + gx * 0.6 + Math.sin(t * 5.2) * 2, ly = ey + gy * 0.6 - 2; lupaG.setAttribute('transform', 'rotate(' + rot.toFixed(1) + ') translate(' + lx.toFixed(1) + ',' + ly.toFixed(1) + ') scale(' + (0.9 + Math.sin(t * 5.2) * 0.05).toFixed(2) + ')'); }
      alertaG.setAttribute('opacity', f.alerta.toFixed(2)); alertaG.setAttribute('transform', 'translate(' + (R * 0.95).toFixed(1) + ',' + (-R * 1.05 + Math.abs(Math.sin(t * 4)) * -5).toFixed(1) + ') rotate(' + (Math.sin(t * 8) * 6).toFixed(1) + ')');
      felizG.setAttribute('opacity', f.feliz.toFixed(2));
      brilhos.forEach(function (b, i) { var bx = [-R * 1.15, R * 1.1, R * 0.2][i], by2 = [-R * 0.6, -R * 0.95, -R * 1.35][i], s = pulsa(t * 1.2 + i * 0.4, 1, 0.2, 1); b.setAttribute('transform', 'translate(' + bx.toFixed(1) + ',' + by2.toFixed(1) + ') scale(' + s.toFixed(2) + ') rotate(' + (t * 60 + i * 40).toFixed(0) + ')'); });
      zzG.setAttribute('opacity', f.zz.toFixed(2));
      zz.forEach(function (z, i) { var ph = ((t * 0.45 + i * 0.33) % 1); z.setAttribute('x', (R * 0.6 + i * 8 + Math.sin(ph * 6) * 3).toFixed(1)); z.setAttribute('y', (-R * 0.5 - ph * 34).toFixed(1)); z.setAttribute('opacity', (ph < 0.15 ? ph / 0.15 : 1 - (ph - 0.15) / 0.85).toFixed(2)); });
      ventoG.setAttribute('opacity', f.vento.toFixed(2)); ventoG.setAttribute('transform', 'translate(' + (-R * 0.95).toFixed(1) + ',0)');
      vento.forEach(function (v, i) { var ph = ((t * 2.2 + i * 0.33) % 1); v.setAttribute('transform', 'translate(' + (-ph * 14).toFixed(1) + ',' + ((i - 1) * 9).toFixed(1) + ')'); v.setAttribute('opacity', (1 - ph).toFixed(2)); });
      orbita.setAttribute('opacity', (f.vento * 0.9).toFixed(2));
      if (f.vento > 0.01) { orbAng += 0.06; for (var q = 0; q < 3; q++) { var a2 = orbAng + q * (TAU / 3), rr = R * 1.32; dots[q].setAttribute('cx', (Math.cos(a2) * rr).toFixed(1)); dots[q].setAttribute('cy', (Math.sin(a2) * rr * 0.55 - R * 0.9).toFixed(1)); dots[q].setAttribute('r', (2.4 + Math.sin(a2) * 1.1).toFixed(2)); dots[q].setAttribute('opacity', (0.55 + Math.sin(a2) * 0.45).toFixed(2)); } }
      if (peekT >= 0) { peekT += 1 / 60; alertaG.setAttribute('opacity', Math.max(f.alerta, Math.max(0, 1 - peekT / 0.8)).toFixed(2)); if (peekT > 0.8) peekT = -1; }
      /* anel + partículas */
      if (anelOp > 0) { anelR += 2.6; anelOp -= 0.035; anel.setAttribute('r', anelR.toFixed(1)); anel.setAttribute('opacity', Math.max(0, anelOp).toFixed(2)); } else anel.setAttribute('opacity', '0');
      for (var p = parts.length - 1; p >= 0; p--) {
        var it = parts[p]; it.x += it.vx; it.y += it.vy; it.vy += 0.09; it.vida -= 0.022; it.rot += it.vr;
        if (it.vida <= 0) { it.el.parentNode && it.el.parentNode.removeChild(it.el); parts.splice(p, 1); continue; }
        it.el.setAttribute('opacity', it.vida.toFixed(2));
        if (it.tipo === 'dot') { it.el.setAttribute('cx', it.x.toFixed(1)); it.el.setAttribute('cy', it.y.toFixed(1)); }
        else it.el.setAttribute('transform', 'translate(' + it.x.toFixed(1) + ',' + it.y.toFixed(1) + ') rotate(' + it.rot.toFixed(0) + ')');
      }
    }
    raf = requestAnimationFrame(quadro);
    if (opts.spawn !== false) setTimeout(function () { play('spawn'); }, 60);
    svg.addEventListener('mouseenter', function () { if (estado === 'idle') { faixaX = -200; faixaOp.v = 0.8; faixaOp.set(0); } });

    return {
      svg: svg, setState: setState, play: play, lookAt: lookAt, lookAtElement: lookAtElement, lookFree: lookFree, setTalking: setTalking, setTheme: setTheme, setShape: setShape,
      getState: function () { return estado; },
      destroy: function () { vivo = false; cancelAnimationFrame(raf); document.removeEventListener('mousemove', onMove); document.removeEventListener('touchstart', onTouch); svg.parentNode && svg.parentNode.removeChild(svg); }
    };
  }
  window.EveCharacter = { mount: mount, FORMAS: FORMAS, PALETAS: PALETAS };
})();
