/* GERADO por fonte/build.py. Edite os arquivos em fonte/ e rode o build. */
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

(function(){
  var nav=document.getElementById('hxNav'),stage=document.getElementById('hxStage'),hero=stage.closest('.hx');
  var reduz=window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* a marca abre centralizada e desliza para a esquerda quando o menu chega (FLIP) */
  var logo=nav.querySelector('.hx-logo'),rolado=false,kb=1;
  function rolar(on){
    if(on===rolado)return;rolado=on;
    var a=logo.getBoundingClientRect().left;nav.classList.toggle('is-rolled',on);var dx=a-logo.getBoundingClientRect().left;
    if(reduz||!dx)return;
    logo.style.transition='none';logo.style.transform='translateX('+(dx/(on?1:kb))+'px)';logo.getBoundingClientRect();
    logo.style.transition='transform .55s cubic-bezier(.22,1,.36,1)';logo.style.transform='';
  }

  /* header + parallax de rolagem (uma leitura por frame) */
  var tick=false;
  function aoRolar(){
    if(tick)return;tick=true;
    requestAnimationFrame(function(){
      tick=false;var y=window.scrollY||0;
      rolar(y>40);
      if(typeof eveDesce==='function')eveDesce(y>hero.offsetHeight*.5);
      if(!reduz)hero.style.setProperty('--sp',Math.min(1,y/Math.max(1,hero.offsetHeight)).toFixed(3));
    });
  }
  window.addEventListener('scroll',aoRolar,{passive:true});aoRolar();

  /* parallax de ponteiro: só mouse (no toque fica o da rolagem) */
  if(!reduz&&window.matchMedia('(hover: hover) and (pointer: fine)').matches){
    var mt=false,mx=0,my=0;
    hero.addEventListener('pointermove',function(e){
      var r=hero.getBoundingClientRect();
      mx=((e.clientX-r.left)/r.width-.5)*2;my=((e.clientY-r.top)/r.height-.5)*2;
      if(mt)return;mt=true;
      requestAnimationFrame(function(){mt=false;hero.style.setProperty('--mx',mx.toFixed(3));hero.style.setProperty('--my',my.toFixed(3));});
    });
    hero.addEventListener('pointerleave',function(){mx=my=0;hero.style.setProperty('--mx',0);hero.style.setProperty('--my',0);});
  }

  /* o hero informa o próprio tamanho e onde a Eve está: os balões se posicionam em % dele
     e convergem para ela, em qualquer tela */
  function medir(){
    var w=hero.clientWidth,h=hero.offsetHeight,vh=window.innerHeight;
    var lg=window.matchMedia('(min-width: 900px)').matches;
    var k=lg?Math.min(w/1440,vh/900):Math.min(w/390,vh/720);k=Math.max(lg?.88:.92,Math.min(lg?2.4:1.6,k));
    kb=Math.max(1,Math.min(1.5,lg?k:Math.min(w/390,vh/800)));
    hero.style.setProperty('--k',k.toFixed(3));hero.style.setProperty('--kb',kb.toFixed(3));nav.style.setProperty('--kb',kb.toFixed(3));
    hero.style.setProperty('--hw',w+'px');hero.style.setProperty('--hh',h+'px');
    var copy=hero.querySelector('.hx-copy'),h1=hero.querySelector('.hx-h1'),foot=hero.querySelector('.hx-foot');
    var largo=window.matchMedia('(min-width: 900px)').matches,topo=copy.offsetTop+h1.offsetTop;
    hero.style.setProperty('--ox',(largo?0:stage.offsetLeft)+'px');hero.style.setProperty('--oy',(largo?topo:stage.offsetTop)+'px');
    hero.style.setProperty('--bw',(largo?w:stage.offsetWidth)+'px');hero.style.setProperty('--bh',(largo?foot.offsetTop-topo:stage.offsetHeight)+'px');
    hero.style.setProperty('--ex',(stage.offsetLeft+stage.offsetWidth/2)+'px');
    hero.style.setProperty('--ey',(stage.offsetTop+stage.offsetHeight/2)+'px');
  }
  medir();
  if('ResizeObserver' in window){var ro=new ResizeObserver(medir);ro.observe(hero);ro.observe(stage);}
  else window.addEventListener('resize',medir);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(medir);

  /* roteiro da cena: o mesmo relógio para qualquer tela (o CSS só reposiciona) */
  var ROTEIRO=[['chegam',4300],['juntam',2400],['organiza',2600],['responde',5400],['sai',900]];
  var passo=0,timer=null,rodando=false;
  /* a Eve atua em cada fase com os estados do próprio personagem: ouve e olha quem chega,
     consulta enquanto os balões entram, pensa, digita e fala as respostas */
  var eve=null,host=document.getElementById('hxEve'),fila=[];
  try{if(window.EveCharacter&&host)eve=window.EveCharacter.mount(host,{forma:'prisma',tema:'light',spawn:true});}catch(e){}
  function depois(ms,fn){fila.push(setTimeout(fn,ms));}
  function atuar(f){
    fila.forEach(function(t){clearTimeout(t);clearInterval(t);});fila=[];
    if(!eve)return;
    eve.setTalking(false);
    if(f==='chegam'){
      eve.setState('listening');
      var bs=[].slice.call(hero.querySelectorAll('.hx-bal')).filter(function(b){return b.offsetParent!==null;})
        .sort(function(a,b){return a.style.getPropertyValue('--o')-b.style.getPropertyValue('--o');}),i=0;
      fila.push(setInterval(function(){if(i<bs.length){eve.lookAtElement(bs[i]);i+=4;}else eve.lookFree();},330));
      depois(3300,function(){eve.play('nod');});
    }else if(f==='juntam'){
      eve.lookFree();eve.setState('listening');
    }else if(f==='organiza'){
      eve.setState('typing');
    }else if(f==='responde'){
      eve.setState('speaking');eve.setTalking(true);
      depois(4300,function(){eve.setTalking(false);eve.play('celebrate');});
    }else{eve.lookFree();eve.setState('idle');}
  }
  /* processamento: o anel e o contador avançam no instante em que cada balão entra na Eve */
  var anel=document.getElementById('hxRing'),num=document.getElementById('hxN');
  function visiveis(){return [].slice.call(hero.querySelectorAll('.hx-bal')).filter(function(b){return b.offsetParent!==null;});}
  function contar(f){
    if(f!=='juntam'){if(f!=='organiza'){anel.style.strokeDashoffset=100;num.textContent='0';}return;}
    var bs=visiveis(),n=bs.length,c=0;
    bs.map(function(b){return +b.style.getPropertyValue('--o');}).sort(function(a,b){return a-b;}).forEach(function(o,i){
      depois(o*27+780,function(){
        c++;num.textContent=c;anel.style.strokeDashoffset=(100-100*c/n).toFixed(1);
        if(eve&&i%4===0)eve.play('tick');
        if(c===n&&eve)eve.play('nod');
      });
    });
  }
  function fase(f){hero.setAttribute('data-phase',f);atuar(f);contar(f);}
  function tocar(){
    fase(ROTEIRO[passo][0]);
    timer=setTimeout(function(){passo=(passo+1)%ROTEIRO.length;tocar();},ROTEIRO[passo][1]);
  }
  function iniciar(){
    if(rodando||reduz)return;rodando=true;passo=0;fase('sai');
    requestAnimationFrame(function(){requestAnimationFrame(function(){if(rodando)tocar();});});
  }
  function parar(){rodando=false;clearTimeout(timer);fase('sai');}

  if(reduz)fase('responde');
  else{
  var visivel=true;
  if('IntersectionObserver' in window){
    new IntersectionObserver(function(es){visivel=es[0].isIntersecting;(visivel&&!document.hidden)?iniciar():parar();},{threshold:.15}).observe(stage);
  }else{iniciar();}
  document.addEventListener('visibilitychange',function(){(document.hidden||!visivel)?parar():iniciar();});
  }

  /* ===== módulo "Foi feito pra mim?" + Eve acompanhante ===== */
  var pm=document.getElementById('pra-mim'),ops=[].slice.call(pm.querySelectorAll('.pm-op')),res=document.getElementById('pmRes'),cena3d=null,porte=-1;
  var foras=0;function dockFora(d){foras=Math.max(0,foras+d);dock.classList.toggle('ausente',foras>0);}
  var dock=document.getElementById('eveDock'),edFala=document.getElementById('edFala'),eveD=null,falaT=0,dockOn=false,somLock=false,somGuarda=null,falaTemp=false,somRever=null;
  var NOMES=['pequeno negócio','média empresa','grande operação'];
  var FALAS=['Pequeno e ágil. Vou te mostrar só o essencial.','Equipe com setores. Vou te mostrar filas, carrinho e campanhas.','Operação grande. Vou te mostrar integrações e IA própria.'];
  function falar(txt,ms){if(somLock){somGuarda={txt:txt,on:!ms};return;}clearTimeout(falaT);falaTemp=!!ms;edFala.textContent=txt;dock.classList.add('tem-fala');if(ms)falaT=setTimeout(function(){falaTemp=false;dock.classList.remove('tem-fala');balaoBase();},ms);}
  /* a pergunta do porte acompanha o bloco "Foi feito pra mim?"; fora dele o balão some para não cobrir o conteúdo */
  var pmVisivel=false;
  function balaoBase(){
    if(somLock||!dockOn||falaTemp)return;
    if(porte<0&&pmVisivel)falar('Me conta: qual é o tamanho do seu negócio?');else dock.classList.remove('tem-fala');
  }
  if('IntersectionObserver' in window)new IntersectionObserver(function(es){pmVisivel=es[0].isIntersecting;dock.classList.toggle('no-pm',pmVisivel);balaoBase();},{threshold:.2}).observe(pm);
  else{pmVisivel=true;dock.classList.add('no-pm');}
  function eveDesce(on){
    if(!dock||on===dockOn)return;dockOn=on;
    if(on&&!eveD){
      try{if(window.EveCharacter)eveD=window.EveCharacter.mount(document.getElementById('edEve'),{forma:'prisma',tema:'light',spawn:false});}catch(e){}
      dock.classList.add('is-chegando');setTimeout(function(){dock.classList.remove('is-chegando');},1000);
    }
    dock.classList.toggle('is-on',on);dock.classList.toggle('esperando',porte<0);
    if(on){
      if(porte<0&&eveD){eveD.setState('listening');eveD.lookAtElement(pm.querySelector('.pm-opcoes'));}
      balaoBase();
    }else dock.classList.remove('tem-fala');
  }
  function apontar(i){
    if(cena3d)cena3d.apontar(i);
    if(eveD&&porte<0){if(i>=0){eveD.lookAtElement(ops[i].querySelector('.pm-card'));eveD.play('tick');}else eveD.lookAtElement(pm.querySelector('.pm-opcoes'));}
  }
  function escolher(i){
    porte=i;if(i<0)dock.classList.add('esperando');else setTimeout(function(){if(porte===i)dock.classList.remove('esperando');},6600);
    ops.forEach(function(b,n){b.setAttribute('aria-pressed',n===i?'true':'false');});
    if(i<0){pm.removeAttribute('data-porte');res.textContent='';}
    else{
      pm.setAttribute('data-porte',i);
      res.innerHTML='Combinado: <b>'+NOMES[i]+'</b>. Daqui pra frente a página mostra o que serve para esse tamanho.<button type="button" id="pmTroca">Trocar</button>';
      document.getElementById('pmTroca').addEventListener('click',function(){escolher(-1);});
    }
    mostrarVisao(i);
    if(cena3d)cena3d.escolher(i);
    if(eveD){
      if(i>=0){eveD.lookFree();eveD.play('celebrate');falar(FALAS[i],6500);setTimeout(function(){if(porte===i)eveD.setState('idle');},2400);}
      else{eveD.setState('listening');falar('Sem problema. Qual é o tamanho do seu negócio?');}
    }
  }
  /* ---------- as três leituras da página: edite aqui os textos de cada porte ---------- */
  var VISOES=[
    {dor:'Atendo sozinho e ainda perco mensagem.',
     sub:'Deixa comigo. A gente configura, treina, e você segue no WhatsApp do jeito que já usa.',
     prat:{h:'O repetitivo anda sozinho.',cenas:[
       {aba:['Fora do horário','Quem chama de noite recebe resposta e entra na fila.'],gat:'22:47, loja fechada',hora:'22:47',msgs:[['c','Vocês abrem amanhã?'],['a','Mensagem de ausência'],['p','Oi! Abrimos às 8h. Já deixei você na fila.']],res:'Na fila para amanhã cedo'},
       {aba:['Lembrete','A mensagem sai no dia e na hora marcados.'],gat:'Sexta, 9h, agendamento',hora:'09:00',msgs:[['a','Agendamento'],['p','Oi, Carla! Seu horário é hoje às 15h.'],['c','Confirmado 👍']],res:'Confirmado sem você digitar'},
       {aba:['Cliente sumiu','Sem resposta, o sistema chama de novo.'],gat:'2 dias sem resposta',hora:'10:15',msgs:[['a','Follow-up por inatividade'],['p','Oi, João! Ainda quer o orçamento?'],['c','Quero sim! Pode mandar.']],res:'Conversa retomada'}]},
     mods:[['Respostas rápidas','Texto, mídia e localização prontos em um atalho.'],
           ['Mensagem de ausência','Quem chama fora do horário recebe resposta e fica na fila.'],
           ['Follow-up por inatividade','Se o cliente parar de responder, o sistema chama de novo.'],
           ['Agendamentos','Mensagem marcada para o dia e a hora certos.'],
           ['Instagram "Eu quero"','Comentou a palavra no post, recebe a resposta no Direct.'],
           ['CRM Kanban','Cada conversa vira um card: novo, negociando, fechado.']],
     extras:['App no celular com notificação','Tags automáticas','Tarefas','Campanhas','Flowbuilder','Web Chat'],
     custo:'Pague menos por mensagem sem mudar seu jeito de atender.'},
    {dor:'Cinco pessoas no mesmo número e ninguém sabe quem respondeu.',
     sub:'Eu coloco cada conversa no setor certo, com dono e histórico. Você enxerga a fila inteira.',
     prat:{h:'Cada conversa acha o setor sozinha.',cenas:[
       {aba:['Menu por setor','O cliente escolhe o assunto antes de chegar em alguém.'],gat:'Novo contato no WhatsApp',hora:'09:12',msgs:[['c','Oi, bom dia!'],['a','Flowbuilder'],['b','Bom dia! Com quem você quer falar?',['Vendas','Financeiro','Suporte']],['c','Financeiro',{toca:1,cita:'Bom dia! Com quem você quer falar?'}]],res:'Na fila do Financeiro'},
       {aba:['Rodízio','A fila distribui entre os atendentes.'],gat:'3 conversas aguardando em Vendas',hora:'14:20',msgs:[['a','Rodízio de atendimento'],['s','Marina assumiu a conversa'],['p','Oi! Aqui é a Marina. Como posso ajudar?']],res:'Ninguém sobrecarregado'},
       {aba:['Remarketing','Uma etiqueta dispara o retorno na hora certa.'],gat:'Etiqueta "Orçamento enviado", 30 min',hora:'16:40',msgs:[['a','Remarketing por tag'],['p','Oi! Ficou alguma dúvida sobre o orçamento?'],['c','Fechado, pode separar.']],res:'Venda recuperada'}]},
     mods:[['Setores e rodízio','Filas por equipe, com distribuição equilibrada entre os atendentes.'],
           ['Flowbuilder','Menus, perguntas e horário de expediente montados arrastando blocos.'],
           ['Carrinho no WhatsApp','Catálogo, carrinho e pagamento na conversa, com preço e estoque do seu ERP.'],
           ['Campanhas e remarketing','Promoção pela API Oficial e fluxo automático quando uma etiqueta é aplicada.'],
           ['Tarefas e avaliações','Pendência com prazo e responsável, e nota do cliente ao encerrar.'],
           ['Carteira de clientes','O contato vai direto para o atendente que já cuida dele.']],
     extras:['CRM com funis','Leads de anúncio','Agendamentos','Respostas rápidas','Instagram e Web Chat','App no celular'],
     custo:'Mais gente respondendo é mais mensagem cobrada. Dá para controlar.'},
    {dor:'Volume alto, vários times e nada conversa com o meu sistema.',
     sub:'Junto números, canais e unidades em um painel e ligo tudo ao sistema que você já usa.',
     prat:{h:'A IA resolve antes de chegar no time.',cenas:[
       {aba:['Consulta no seu sistema','A IA busca o dado pela API e responde.'],gat:'Pergunta sobre pedido',hora:'11:05',msgs:[['c','Qual o status do pedido 4821?'],['a','IA consultando seu sistema'],['p','Saiu para entrega hoje às 10h.']],res:'Resolvido sem atendente'},
       {aba:['Classificação','Cada conversa sai etiquetada para o time certo.'],gat:'Conversa em andamento',hora:'15:30',msgs:[['c','Quero o plano anual para 3 unidades.'],['a','IA classificando'],['s','Etiquetas: Lead quente, Plano anual']],res:'Enviado ao Comercial'},
       {aba:['Passagem para humano','Quando precisa de gente, vai com o histórico.'],gat:'Pedido de atendente',hora:'17:45',msgs:[['c','Preciso falar com alguém.'],['a','IA transferindo'],['p','Já te passo para um especialista.'],['s','Transferido para Suporte N2']],res:'Histórico junto na transferência'}]},
     mods:[['API pública e webhooks','Mensagens, tickets, contatos e CRM acessíveis pelo seu sistema.'],
           ['IA treinada no seu negócio','Atende, qualifica e agenda antes de passar para um humano.'],
           ['Análise de atendimento','A IA aponta objeções e pontos de melhoria em cada conversa.',1],
           ['CRM com vários funis','Oportunidades, propostas, ranking e auditoria de vendas.'],
           ['Permissões por perfil','Cada time enxerga e altera só o que é dele.'],
           ['MCP','Seu assistente de IA consulta e opera a plataforma, com aprovação.',1]],
     extras:['Copilot da raia','Ligações PABX e VoIP','Transcrição de áudio','Leads de anúncio','Carrinho no WhatsApp','Campanhas','Flowbuilder'],
     custo:'Em escala, centavo por mensagem vira linha de orçamento.'}
  ];
  /* ---------- cenas de conversa: implantação, coexistência e exemplos na prática ---------- */
  var ICS='<span class="wa-ics"><i class="cf-ic" data-c="wa"><svg viewBox="0 0 448 512"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg></i><i class="cf-ic" data-c="ig"><svg viewBox="0 0 448 512"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/></svg></i><i class="cf-ic" data-c="fb"><svg viewBox="0 0 24 24"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/></svg></i></span>';
  var TIQUES='<svg viewBox="0 0 18 12" fill="none" stroke="#53bdeb" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="m1 6.5 3.2 3.3L10.6 2"/><path d="m7.4 9.4.4.4L14.6 2"/></svg>';
  var SETA='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10a6 6 0 0 1 6 6v4"/></svg>';
  function balao(tipo,txt,extra,hora){
    var d=document.createElement('div');
    if(tipo==='s'){d.className='wa-sis';d.textContent=txt;}
    else if(tipo==='a'){d.className='wa-auto';d.textContent=txt;}
    else{
      /* "c" e "out" são de quem está com o celular na mão: saem à direita, em verde, com os tiques */
      var meu=tipo==='c'||tipo==='out',ex=extra||'',b=document.createElement('div');
      b.className='wa '+(meu?'wa-out':'wa-in');
      b.innerHTML=(tipo==='in'?'<em>Time Prisme</em>':'')+(ex.cita?'<q><b>Loja</b>'+esc(ex.cita)+'</q>':'')+esc(txt).replace(/\n/g,'<br>')+(typeof ex==='string'?ex:'')+'<small>'+(hora||'')+(meu?TIQUES:'')+'</small>';
      if(tipo!=='b')return b;
      d.className='wa-grupo';d.appendChild(b);
      var bts=document.createElement('div');bts.className='wa-bts';bts.innerHTML=ex.map(function(t){return '<span>'+SETA+esc(t)+'</span>';}).join('');d.appendChild(bts);
    }
    return d;
  }
  /* toca uma lista de mensagens dentro de "corpo"; quem digita mostra os três pontinhos antes */
  function conversar(corpo,msgs,digita,aoPasso,aoFim,hora){
    var vivo=true,fila=[];
    function espera(ms,fn){fila.push(setTimeout(function(){if(vivo)fn();},ms));}
    function passo(i){
      if(i>=msgs.length){if(aoFim)aoFim();return;}
      var m=msgs[i],por=function(){corpo.appendChild(balao(m[0],m[1],m[2],hora));while(corpo.children.length>9)corpo.removeChild(corpo.firstChild);if(aoPasso)aoPasso(i,m);espera(m[0]==='s'||m[0]==='a'?750:1250,function(){passo(i+1);});};
      if(m[2]&&m[2].toca!==undefined){
        var gs=corpo.querySelectorAll('.wa-bts'),alvo=gs.length?gs[gs.length-1].children[m[2].toca]:null;
        if(alvo)alvo.classList.add('toque');espera(520,por);return;
      }
      if(digita.indexOf(m[0])>=0){
        var p=document.createElement('div');p.className='wa wa-dig '+(m[0]==='c'||m[0]==='out'?'wa-out':'wa-in');p.innerHTML='<i></i><i></i><i></i>';corpo.appendChild(p);
        espera(850,function(){corpo.removeChild(p);por();});
      }else por();
    }
    espera(450,function(){passo(0);});
    return function(){vivo=false;fila.forEach(clearTimeout);};
  }
  function aoVer(el,liga,desliga){
    if(!('IntersectionObserver' in window)){liga();return;}
    new IntersectionObserver(function(es){if(es[0].isIntersecting)liga();else desliga();},{threshold:.25}).observe(el);
  }

  /* 1. implantação: o grupo no WhatsApp, a barra de dias e a lista que a Eve vai cumprindo */
  (function(){
    var chat=document.getElementById('cfChat'),etapas=[].slice.call(document.querySelectorAll('#cfEtapas li')),tarefas=[].slice.call(document.querySelectorAll('#cfTarefas li')),
        barra=document.getElementById('cfBarra'),dias=document.getElementById('cfDias'),eveC=null,parar=null,volta=0;
    /* [tipo, texto, extra, etapa, dia (0 a 1), tarefas que ficam prontas] */
    var ROTEIRO=[['s','Time Prisme criou este grupo','',1,.14],['s','Time Prisme adicionou você','',1,.18],
      ['in','Oi! Sua implantação acontece por aqui. 👋','',1,.24],['out','Ótimo! O que eu preciso fazer?','',1,.28],
      ['in','Só liberar os acessos. O resto é com a gente.','',2,.36],['in','Canais conectados',ICS,2,.5,[0]],
      ['in','Filas, usuários e fluxos criados.','',2,.72,[1,2,3]],['in','Treinamento na quinta, 14h. Pode ser?','',3,.84],
      ['out','Fechado!','',3,.9],['in','Pronto. Sua operação está no ar.','',3,1,[4]]];
    function etapa(n,fim){etapas.forEach(function(li,i){li.classList.toggle('feito',i<n||(fim&&i===n));li.classList.toggle('on',i===n&&!fim);});}
    function zerar(){chat.innerHTML='';tarefas.forEach(function(t){t.className='';});barra.style.transform='scaleX(.04)';dias.classList.remove('fim');etapa(0);}
    function fazendo(){var t=tarefas.filter(function(x){return !x.classList.contains('ok');})[0];if(t)t.classList.add('fazendo');}
    function rodar(){
      zerar();if(eveC)eveC.setState('idle');
      parar=conversar(chat,ROTEIRO,['in','out'],function(i,m){
        etapa(m[3]);barra.style.transform='scaleX('+m[4]+')';
        if(m[3]===2&&eveC)eveC.setState('typing');
        (m[5]||[]).forEach(function(k,n){setTimeout(function(){tarefas[k].className='ok';if(m[4]<1)fazendo();},n*260);});
        if(m[3]===2&&!m[5])fazendo();
        if(m[4]===1){dias.classList.add('fim');etapa(3,true);if(eveC){eveC.setState('idle');eveC.play('celebrate');}}
        else if(m[3]===3&&eveC)eveC.setState('idle');
      },function(){volta=setTimeout(rodar,4200);},'10:02');
    }
    if(reduz){ROTEIRO.slice(4).forEach(function(m){chat.appendChild(balao(m[0],m[1],m[2],'10:02'));});tarefas.forEach(function(t){t.className='ok';});barra.style.transform='none';dias.classList.add('fim');etapa(3,true);return;}
    aoVer(document.getElementById('cfVis'),function(){
      if(!eveC){try{if(window.EveCharacter)eveC=window.EveCharacter.mount(document.getElementById('cfEve'),{forma:'prisma',tema:'light',spawn:true});}catch(e){}}
      if(!parar)rodar();
    },function(){if(parar){parar();parar=null;}clearTimeout(volta);});
  })();

  /* 2. coexistência: a mesma mensagem aparece no app e na plataforma */
  (function(){
    var a=document.getElementById('cfSincA'),b=document.getElementById('cfSincB'),falas=['Posso retirar hoje?','Tem no tamanho M?','Aceita Pix?','Qual o horário de vocês?'],n=0,t=0;
    function pisca(el,txt){el.classList.remove('novo');void el.offsetWidth;el.textContent=txt;el.classList.add('novo');}
    if(reduz)return;
    aoVer(a,function(){clearInterval(t);t=setInterval(function(){n=(n+1)%falas.length;pisca(a,falas[n]);setTimeout(function(){pisca(b,falas[n]);},260);},3200);},function(){clearInterval(t);});
  })();

  /* 3. na prática: três cenas por porte, que avançam sozinhas ou no clique */
  var prat=null,pratN=0,pratPara=null,pratT=0,pratVisivel=false;
  function cenaPratica(n){
    if(!prat)return;pratN=n;if(pratPara)pratPara();clearTimeout(pratT);
    var c=prat.cenas[n],conv=document.getElementById('cfConv'),res=document.getElementById('cfRes'),abas=[].slice.call(document.querySelectorAll('#cfAbas button'));
    abas.forEach(function(b,i){b.setAttribute('aria-selected',i===n?'true':'false');var u=b.querySelector('u');u.classList.remove('anda');});
    conv.innerHTML='';conv.appendChild(balao('s',c.gat));res.classList.remove('on');res.textContent=c.res;
    if(reduz||!pratVisivel){c.msgs.forEach(function(m){conv.appendChild(balao(m[0],m[1],m[2],c.hora));});res.classList.add('on');return;}
    var dur=450+c.msgs.reduce(function(s,m){return s+(m[0]==='p'||m[0]==='b'?850:0)+(m[2]&&m[2].toca!==undefined?520:0)+(m[0]==='s'||m[0]==='a'?750:1250);},0)+3000,u=abas[n].querySelector('u');
    u.style.setProperty('--dur',dur+'ms');void u.offsetWidth;u.classList.add('anda');
    pratPara=conversar(conv,c.msgs,['p','b'],null,function(){res.classList.add('on');pratT=setTimeout(function(){cenaPratica((pratN+1)%prat.cenas.length);},3000);},c.hora);
  }
  function montarPratica(p){
    prat=p;document.getElementById('cfPratH').textContent=p.h;
    var abas=document.getElementById('cfAbas');
    abas.innerHTML=p.cenas.map(function(c,i){return '<button type="button" role="tab" aria-selected="false" data-n="'+i+'"><b>'+esc(c.aba[0])+'</b><span><i>'+esc(c.aba[1])+'</i></span><u></u></button>';}).join('');
    [].forEach.call(abas.children,function(b,i){b.addEventListener('click',function(){cenaPratica(i);});});
    cenaPratica(0);
  }
  aoVer(document.querySelector('.cf-palco'),function(){if(!pratVisivel){pratVisivel=true;cenaPratica(pratN);}},function(){pratVisivel=false;if(pratPara)pratPara();clearTimeout(pratT);});

  /* ---------- a Eve sai do canto, pousa ao lado da fala do cliente e responde ---------- */
  var eveR=null,eveRAqui=false,respT=[],balaoR=document.getElementById('jrSub'),hostR=document.getElementById('jrEve'),textoR='';
  function responder(txt){
    textoR=txt;respT.forEach(clearTimeout);respT=[];
    if(reduz||!eveRAqui){balaoR.textContent=txt;balaoR.classList.remove('some');return;}
    balaoR.classList.add('some');if(eveR){eveR.lookAtElement(document.getElementById('jrDor'));eveR.setState('listening');}
    respT.push(setTimeout(function(){balaoR.innerHTML='<span style="visibility:hidden">'+esc(textoR)+'</span><span class="wa-dig jr-dig"><i></i><i></i><i></i></span>';balaoR.classList.remove('some');if(eveR)eveR.setState('typing');},520));
    respT.push(setTimeout(function(){balaoR.textContent=textoR;if(eveR){eveR.lookFree();eveR.setState('speaking');}},1750));
    respT.push(setTimeout(function(){if(eveR)eveR.setState('idle');},4300));
  }
  function eveChega(){
    if(eveRAqui)return;eveRAqui=true;
    if(!eveR){try{if(window.EveCharacter)eveR=window.EveCharacter.mount(hostR,{forma:'prisma',tema:'light',spawn:false});}catch(e){}}
    var d=document.getElementById('edEve').getBoundingClientRect(),h=hostR.getBoundingClientRect(),veio=dock.classList.contains('is-on')&&d.width>0&&!reduz;
    hostR.style.transition='none';
    if(veio)hostR.style.transform='translate('+(d.left+d.width/2-h.left-h.width/2)+'px,'+(d.top+d.height/2-h.top-h.height/2)+'px) scale('+(d.width/h.width)+')';
    else hostR.style.transform=reduz?'none':'translateY(30px) scale(.6)';
    hostR.classList.add('aqui');dockFora(1);void hostR.offsetWidth;
    hostR.style.transition='transform .95s cubic-bezier(.3,1.25,.5,1)';hostR.style.transform='none';
    balaoR.classList.add('some');respT.forEach(clearTimeout);respT=[setTimeout(function(){responder(textoR);},veio?620:300)];
  }
  function eveVolta(){
    if(!eveRAqui)return;eveRAqui=false;respT.forEach(clearTimeout);
    hostR.classList.remove('aqui');dockFora(-1);balaoR.textContent=textoR;balaoR.classList.remove('some');
  }
  if('IntersectionObserver' in window)new IntersectionObserver(function(es){if(es[0].isIntersecting)eveChega();else eveVolta();},{threshold:.55}).observe(document.getElementById('jrResp'));
  else{hostR.classList.add('aqui');}

  /* ---------- custos: Modo Híbrido e Concatenador, a mesma conversa nos dois lados ---------- */
  (function(){
    var TAXA=.035,MES=12000,PCT=70,$=function(id){return document.getElementById(id);};
    var app=$('csApp'),msgs=$('csMsgs'),fone=$('csFone'),tray=$('csTray'),itens=$('csTrayItens'),comp=$('csComp'),notif=$('csNotif'),kpis=$('csKpis'),
        passos=[].slice.call($('csPassos').children),abas=[].slice.call($('csAbas').children),modo=0,ger=0,visivel=false;
    var brl=function(v,d){return 'R$ '+v.toLocaleString('pt-BR',{minimumFractionDigits:d||2,maximumFractionDigits:d||2});};
    var PASSOS=[['Você define o percentual uma vez','A regra vale para toda a equipe','Cada mensagem sai por uma rota','O cliente recebe tudo igual'],
                ['O atendente escreve em rajada','As mensagens esperam na bandeja','A janela de 3 segundos fecha','Sai uma mensagem, uma cobrança']];
    var CONVERSA=[['c','Oi! Chegou aquele remédio que eu pedi?'],['s','Oi, Marina! Chegou sim, acabou de entrar.','hib'],['s','Quer que eu já separe uma caixa?','hib'],['c','Quero sim, por favor'],
                  ['s','Separado! Retira hoje até as 18h?','ofi'],['s','Te mando o código do Pix por aqui.','hib'],['s','Pix enviado. Qualquer coisa é só chamar.','hib'],['s','Pedido 4821 confirmado.','ofi']];
    var LOTE=['Oi, Marina! Tudo certo por aqui.','Seu pedido já está separado.','São 2 caixas do genérico e 1 do xarope.','Total deu R$ 47,80.','Pode retirar hoje até as 18h.','Qualquer coisa é só me chamar.'];
    function dorme(ms,g){return new Promise(function(ok,nao){(function espera(resta){
      if(g!==ger)return nao(0);
      if(!visivel||document.hidden)return setTimeout(function(){espera(resta);},250);
      if(resta<=0)return ok();
      setTimeout(function(){espera(resta-Math.min(resta,200));},Math.min(resta,200));
    })(ms);});}
    var onda='M0 8';for(var k=0;k<14;k++)onda+=(k?' T':' Q'+(100/28).toFixed(2)+' '+(k%2?15:1))+' '+((k+1)*100/14).toFixed(2)+' 8';
    passos.forEach(function(li){li.innerHTML='<svg viewBox="0 0 100 16" preserveAspectRatio="none"><path d="'+onda+'"/></svg><span></span>';});
    /* quanto dura cada etapa, para a onda terminar junto com ela */
    var DUR=[[4200,920,7500,6900],[3250,3650,2760,4550]];
    function passo(n){
      passos.forEach(function(li,i){li.lastChild.textContent=PASSOS[modo][i];li.className='';if(i===n){li.style.setProperty('--dur',DUR[modo][n]+'ms');void li.offsetWidth;}li.className=i===n?'on':i<n?'feito':'';});
      $('csLegenda').textContent=(n+1)+'. '+PASSOS[modo][n];
    }
    function kpi(lista){kpis.innerHTML=lista.map(function(k){return '<div'+(k[2]?' class="bom"':'')+'><dt>'+k[0]+'</dt><dd>'+k[1]+'</dd></div>';}).join('');}
    function linha(onde,lado,html,tag,max){
      var d=document.createElement('div');d.className='cs-l '+lado;d.innerHTML='<span>'+html+'</span>'+(tag||'');onde.appendChild(d);
      while(onde.children.length>max)onde.removeChild(onde.firstChild);return d;
    }
    function noFone(lado,html){var d=document.createElement('div');d.className='wa '+(lado==='in'?'wa-in':'wa-out');d.innerHTML=html+'<small>'+(modo?'14:03':'09:13')+(lado==='in'?'':TIQUES)+'</small>';fone.appendChild(d);while(fone.children.length>5)fone.removeChild(fone.firstChild);}
    function limpar(){msgs.innerHTML='';fone.innerHTML='';itens.innerHTML='';tray.className='cs-tray';notif.classList.remove('on');app.classList.remove('modal');comp.textContent='Mensagem';comp.className='';}
    function pct(p){
      var f=p/100,n=Math.round(p);$('csPct').textContent=n+'%';$('csFill').style.width=p+'%';$('csKnob').style.left=p+'%';
      $('csExpl').textContent=n+' de cada 100 mensagens passam pela conexão do app. O restante segue pela API Oficial.';
      kpi([['Pela conexão do app',n+'%'],['Sem Modo Híbrido',brl(MES*TAXA)],['Custo atual',brl(MES*(1-f)*TAXA)],['Economia no mês',brl(MES*f*TAXA),1]]);
    }
    function kpiLote(n,fim){kpi([['Sem concatenador',brl(Math.max(1,n)*TAXA,n>1?2:3)],['Com concatenador',brl(TAXA,3)],['Economia por atendimento',fim?brl((n-1)*TAXA,3):brl(0),fim],['Em 1.000 atendimentos',fim?'<s>R$ 210</s>R$ 35,00':'R$ 210,00',fim]]);}
    function sobe(g){return new Promise(function(ok,nao){var t0=performance.now();(function q(agora){
      if(g!==ger)return nao(0);var k=Math.min(1,(agora-t0)/2200);pct(PCT*(1-Math.pow(1-k,3)));if(k<1)requestAnimationFrame(q);else ok();
    })(t0);});}
    async function hibrido(g){
      limpar();pct(0);passo(0);$('csModo').textContent='Modo Híbrido';
      await dorme(700,g);app.classList.add('modal');await dorme(700,g);await sobe(g);await dorme(600,g);
      passo(1);$('csSalvar').classList.add('aperta');await dorme(220,g);$('csSalvar').classList.remove('aperta');app.classList.remove('modal');await dorme(700,g);
      passo(2);
      for(var i=0;i<CONVERSA.length;i++){
        var m=CONVERSA[i],tag=m[2]==='hib'?'<b class="cs-tag hib">Conexão do app, R$ 0,00</b>':m[2]==='ofi'?'<b class="cs-tag ofi">API Oficial, R$ 0,035</b>':'';
        linha(msgs,m[0]==='c'?'in':'out',esc(m[1]),tag,4);await dorme(420,g);noFone(m[0]==='c'?'out':'in',esc(m[1]));
        if(i===CONVERSA.length-3)passo(3);
        await dorme(1000,g);
      }
      await dorme(3000,g);
    }
    async function concatenador(g){
      limpar();passo(0);kpiLote(0);$('csModo').textContent='Concatenador';$('csAnel').style.strokeDashoffset='0';$('csTimer').textContent='3s';
      await dorme(600,g);linha(msgs,'in','Oi! Meu pedido já está pronto?','',4);await dorme(350,g);noFone('out','Oi! Meu pedido já está pronto?');await dorme(900,g);
      tray.classList.add('on');
      for(var i=0;i<LOTE.length;i++){
        comp.textContent=LOTE[i];comp.className='dig';await dorme(560,g);comp.textContent='Mensagem';comp.className='';
        var li=document.createElement('div');li.className='cs-ti';li.innerHTML='<span>'+esc(LOTE[i])+'</span><s>'+brl(TAXA,3)+'</s>';itens.appendChild(li);
        $('csTrayN').textContent=(i+1)+(i?' mensagens agrupadas':' mensagem agrupada');kpiLote(i+1);if(i===1)passo(1);
        await dorme(280,g);
      }
      passo(2);
      for(var c=3;c>=1;c--){$('csTimer').textContent=c+'s';$('csAnel').style.strokeDashoffset=String(50.3*(1-(c-1)/3));await dorme(760,g);}
      tray.classList.add('junta');await dorme(480,g);tray.className='cs-tray';passo(3);
      var todas=LOTE.map(function(t){return '<i>'+esc(t)+'</i>';}).join('');
      linha(msgs,'out',todas,'<b class="cs-tag hib">1 mensagem, R$ 0,035</b>',2).classList.add('pulso');kpiLote(LOTE.length,1);
      await dorme(450,g);noFone('in',LOTE.map(function(t){return esc(t);}).join('<br>'));await dorme(500,g);notif.classList.add('on');
      await dorme(3600,g);
    }
    function rodar(n){
      modo=n;var g=++ger;abas.forEach(function(b,i){b.setAttribute('aria-selected',i===n?'true':'false');});
      (n?concatenador:hibrido)(g).then(function(){rodar(1-n);},function(){});
    }
    abas.forEach(function(b,i){b.addEventListener('click',function(){rodar(i);});});
    if(reduz){
      modo=0;passo(3);pct(PCT);CONVERSA.slice(-4).forEach(function(m){linha(msgs,m[0]==='c'?'in':'out',esc(m[1]),m[2]==='hib'?'<b class="cs-tag hib">Conexão do app, R$ 0,00</b>':m[2]==='ofi'?'<b class="cs-tag ofi">API Oficial, R$ 0,035</b>':'',4);noFone(m[0]==='c'?'out':'in',esc(m[1]));});
      return;
    }
    passo(0);pct(0);
    aoVer($('csCena'),function(){var era=visivel;visivel=true;$('csCena').classList.remove('cs-pausa');if(!era&&!ger)rodar(0);},function(){visivel=false;$('csCena').classList.add('cs-pausa');});
  })();

  /* ---------- planos: balão de explicação em cada item, com passeio automático ---------- */
  (function(){
    var itens=[].slice.call(document.querySelectorAll('.jr-plano [data-dica]')),aberto=null,auto=0,n=-1,visto=false,mexeu=0,fecha=0,abriuEm=0;
    itens.forEach(function(li,i){
      var d=document.createElement('span');d.className='jr-dica';d.id='jrDica'+i;d.setAttribute('role','tooltip');
      d.innerHTML=(li.getAttribute('data-dica-t')?'<b>'+esc(li.getAttribute('data-dica-t'))+'</b>':'')+esc(li.getAttribute('data-dica'))+
        (li.getAttribute('data-lista')?'<ul>'+li.getAttribute('data-lista').split('|').map(function(x){return '<li>'+esc(x)+'</li>';}).join('')+'</ul>':'')+
        (li.getAttribute('data-call')?'<button type="button" class="hx-btn hx-btn--sm" data-agendar>'+esc(li.getAttribute('data-call'))+'</button>':'')+
        (li.getAttribute('data-link')?'<br><a href="'+li.getAttribute('data-link')+'"'+(li.getAttribute('data-link').charAt(0)==='#'?'':' target="_blank" rel="noopener"')+'>'+esc(li.getAttribute('data-link-txt'))+'</a>':'');
      li.appendChild(d);li.tabIndex=0;li.setAttribute('aria-describedby',d.id);
      li.addEventListener('pointerenter',function(e){if(e.pointerType==='mouse'){clearTimeout(fecha);parar();abrir(li);}});
      li.addEventListener('pointerleave',function(e){if(e.pointerType==='mouse'){clearTimeout(fecha);fecha=setTimeout(function(){if(aberto===li&&!li.matches(':hover')&&!li.contains(document.activeElement)){abrir(null);retomar();}},320);}});
      li.addEventListener('focus',function(){parar();abrir(li);});
      li.addEventListener('focusout',function(e){if(li.contains(e.relatedTarget)||li.matches(':hover'))return;abrir(null);retomar();});
      /* no toque, o foco abre o balão um instante antes do clique: esse clique não pode fechá-lo de volta */
      li.addEventListener('click',function(e){if(e.target.closest&&e.target.closest('.jr-dica'))return;parar();if(!(aberto===li&&Date.now()-abriuEm<600))abrir(aberto===li?null:li);retomar();});
    });
    function abrir(li){if(aberto)aberto.classList.remove('aberto');aberto=li;if(li){li.classList.add('aberto');abriuEm=Date.now();}}
    function parar(){clearInterval(auto);auto=0;clearTimeout(mexeu);}
    function retomar(){clearTimeout(mexeu);if(reduz)return;mexeu=setTimeout(function(){if(visto&&!auto&&!(aberto&&aberto.matches(':hover,:focus,:focus-within')))ligar();},7000);}
    function ligar(){if(reduz||auto)return;var passo=function(){for(var k=0;k<itens.length;k++){n=(n+1)%itens.length;var r=itens[n].getBoundingClientRect();if(r.top>90&&r.bottom<window.innerHeight-110){abrir(itens[n]);return;}}abrir(null);};passo();auto=setInterval(passo,3200);}
    aoVer(document.querySelector('.jr-planos'),function(){visto=true;ligar();},function(){visto=false;parar();abrir(null);});
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&aberto){parar();abrir(null);}});
  })();

  /* ================= "COISAS QUE SÓ A PRISME TEM": quatro diferenciais, a Eve apresenta cada um ================= */
  (function(){
    var sec=document.getElementById('so-a-prisme');if(!sec)return;
    var $=function(id){return document.getElementById(id);},qa=function(s,r){return [].slice.call((r||sec).querySelectorAll(s));};
    var palco=$('spPalco'),cenas=qa('.sp-cena'),segs=qa('#spSeg button'),pts=qa('#spPts i'),prox=$('spProx');
    var ger=0,visivel=false,atual=0,fixo=false,jaRodou=false;
    var ROTULOS=['WhatsApp Flows','Suporte no grupo','Relatório quinzenal','Meta e comunidade'];

    /* espera cancelável: troca de cena invalida a geração, e sair da tela pausa */
    function dorme(ms,g){return new Promise(function(ok,nao){(function passo(resta){
      if(g!==ger)return nao(0);
      if(!visivel||document.hidden)return setTimeout(function(){passo(resta);},250);
      if(resta<=0)return ok();
      var p=Math.min(resta,180);setTimeout(function(){passo(resta-p);},p);
    })(ms);});}
    function fmt(t){return esc(t).replace(/\*([^*\n]+)\*/g,'<b>$1</b>').replace(/\n/g,'<br>');}
    function conta(el,alvo,dec,suf,ms){var t0=performance.now();(function q(a){var k=Math.min(1,Math.max(0,(a-t0)/ms)),e=1-Math.pow(1-k,3);
      el.textContent=(alvo*e).toLocaleString('pt-BR',{minimumFractionDigits:dec,maximumFractionDigits:dec})+suf;if(k<1)requestAnimationFrame(q);})(t0);}

    /* ---------- a Eve da seção: pousa ao lado do palco e comenta o que está na tela ---------- */
    var FALAS={
      f0a:'Olha isso 👀 O cliente busca o remédio, monta o carrinho e paga, tudo dentro do WhatsApp 🛒💊 Sem link, sem site, sem fila!',
      f0b:'Na clínica é igual 🩺 Escolhe o médico, o dia e o horário em menos de 1 minuto. Agenda cheia sem ninguém digitar ✨',
      f0c:'Bateu a fome? 🍔🍟 O cardápio abre na conversa, com foto e preço, e o pedido já cai pronto na fila 🔥',
      f1:'Aqui ninguém fica sozinho 💬 Todo cliente tem um grupo no WhatsApp comigo e com o time. Mandou print ou vídeo? A gente resolve junto 🙌 Em qualquer plano!',
      f2:'Dia 1 e dia 15 eu mando os números da sua operação no grupo 📊 E o time já chega com ideia pro tráfego e pro comercial 💡🚀',
      f3:'A Prisme é parceira da Meta ✅ E você ainda leva o Faz que Vende junto: canal no YouTube e comunidade pra vender mais ▶️🔥'
    };
    var falaBox=$('spFala'),falasEl=$('spFalas'),hostS=$('spEve'),eveS=null,eveAqui=false,falaT=[],falaAtual='f0a';
    Object.keys(FALAS).forEach(function(k){var p=document.createElement('p');p.setAttribute('data-k',k);p.textContent=FALAS[k];falasEl.appendChild(p);});
    var falaPs=qa('p',falasEl);
    function dizer(k){
      falaT.forEach(clearTimeout);falaT=[];falaAtual=k;
      function mostra(){falaBox.classList.remove('digitando');falaPs.forEach(function(p){var on=p.getAttribute('data-k')===k;p.classList.toggle('on',on);p.setAttribute('aria-hidden',on?'false':'true');});}
      if(reduz||!eveAqui||!visivel){mostra();return;}
      falaPs.forEach(function(p){p.classList.remove('on');});falaBox.classList.add('digitando');
      if(eveS){eveS.lookAtElement(palco);eveS.setState('typing');}
      falaT.push(setTimeout(function(){mostra();if(eveS)eveS.setState('speaking');},950));
      falaT.push(setTimeout(function(){if(eveS){eveS.setState('idle');eveS.lookAtElement(palco);}},3900));
    }
    function eveFaz(efeito){if(eveS&&eveAqui&&!reduz){try{eveS.play(efeito);}catch(e){}}}
    function chega(){
      if(eveAqui)return;eveAqui=true;
      if(!eveS){try{if(window.EveCharacter)eveS=window.EveCharacter.mount(hostS,{forma:'prisma',tema:'light',spawn:false});}catch(e){}}
      var d=document.getElementById('edEve').getBoundingClientRect(),h=hostS.getBoundingClientRect(),veio=dock.classList.contains('is-on')&&d.width>0&&!reduz;
      hostS.style.transition='none';
      hostS.style.transform=veio?'translate('+(d.left+d.width/2-h.left-h.width/2)+'px,'+(d.top+d.height/2-h.top-h.height/2)+'px) scale('+(d.width/h.width)+')':(reduz?'none':'translateY(30px) scale(.6)');
      hostS.classList.add('aqui');dockFora(1);void hostS.offsetWidth;
      hostS.style.transition='transform .95s cubic-bezier(.3,1.25,.5,1)';hostS.style.transform='none';
      setTimeout(function(){if(eveAqui)dizer(falaAtual);},veio?620:300);
    }
    function sai(){if(!eveAqui)return;eveAqui=false;hostS.classList.remove('aqui');dockFora(-1);}
    if('IntersectionObserver' in window)new IntersectionObserver(function(es){if(es[0].isIntersecting)chega();else sai();},{threshold:.5}).observe($('spLado'));
    else hostS.classList.add('aqui');

    /* avatar da Eve nas conversas: uma cópia parada do desenho real */
    var EVE_AV='<span class="gp-eve-fb"></span>';
    (function(){
      var m=$('spMolde');
      try{
        if(!window.EveCharacter)return;
        var inst=window.EveCharacter.mount(m,{forma:'prisma',tema:'light',spawn:false});
        requestAnimationFrame(function(){requestAnimationFrame(function(){
          var s=m.querySelector('svg');if(s){var c=s.cloneNode(true);c.removeAttribute('style');c.removeAttribute('class');EVE_AV=c.outerHTML;}
          inst.destroy();m.innerHTML=EVE_AV;
        });});
      }catch(e){}
    })();

    /* ================= 1. WHATSAPP FLOWS (motor da animação do site atual, com três roteiros) ================= */
    function IMG(n){return '<i class="em em-'+n+'"></i>';}
    var I_VOLTA='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 12H5M11 18l-6-6 6-6"/></svg>',
        I_X='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>',
        I_CHEV='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>',
        I_LIMPA='<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20zm4 13.6L14.6 17 12 14.4 9.4 17 8 15.6 10.6 13 8 10.4 9.4 9l2.6 2.6L14.6 9 16 10.4 13.4 13 16 15.6z"/></svg>',
        I_LISTA='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01"/></svg>',
        I_DOC='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/></svg>';
    var FLOWS=[
      {dono:'Sua farmácia',av:'convenience_store',fala:'f0a',oi:'Oi, vocês entregam?',
       boas:'Entregamos sim! 🛒 Monte seu pedido por aqui: produto, entrega e pagamento, sem esperar atendente.',cta:'Montar meu pedido',
       fim:'Pedido recebido! 🧾 Já estamos separando e avisamos quando sair para entrega.',
       etapas:['Abre o pedido na conversa','Busca o produto','Monta o carrinho','Escolhe entrega e pagamento','Confirma o pedido'],
       painel:{e:'pill',t:'Pedido 4821',s:'2x Dipirona 1 g, 10 comprimidos',f:'Fila de separação',tags:['Rua das Acácias, 100','Pix','R$ 37,80']},
       telas:{
         buscar:{title:'Buscar produto',p:14,footer:'Buscar',need:0,c:[
           {t:'h1',v:'O que você precisa?'},
           {t:'input',cap:'Buscar',ph:'Nome do produto',helper:'Nome ou código de barras'},
           {t:'h2',v:'Ofertas de hoje'},
           {t:'radio',o:[
             {l:'Dipirona 1 g, 10 comprimidos',s:'R$ 18,90 (antes R$ 23,01)',e:'pill'},
             {l:'Vitamina C 1 g efervescente',s:'R$ 15,90 (antes R$ 30,56)',e:'tangerine'},
             {l:'Protetor solar FPS 50',s:'R$ 49,90, em estoque',e:'lotion_bottle'}]}]},
         produto:{title:'Produto',p:32,footer:'Adicionar ao carrinho',need:1,c:[
           {t:'hero',e:'pill',tag:'Oferta'},
           {t:'h1',v:'Dipirona 1 g, 10 comprimidos'},
           {t:'kv',v:'Preço: <b>R$ 18,90</b> (antes R$ 23,01)\nDisponibilidade: em estoque\nLaboratório: Exemplar'},
           {t:'drop',cap:'Quantidade',ph:'Quantidade',val:'2 unidades'}]},
         carrinho:{title:'Seu carrinho',p:50,footer:'Finalizar pedido',need:0,c:[
           {t:'h1',v:'Seu carrinho'},
           {t:'itens',o:[{l:'2x Dipirona 1 g, 10 comprimidos',s:'R$ 37,80',e:'pill'}]},
           {t:'total',v:'Total: <b>R$ 37,80</b>\nUnidade: Loja Centro'},
           {t:'link',v:'Adicionar mais itens'}]},
         entrega:{title:'Como receber',p:68,footer:'Continuar',need:1,c:[
           {t:'h1',v:'Como você quer receber?'},
           {t:'radio',o:[
             {l:'Receber em casa',s:'Rua das Acácias, 100, salvo no cadastro',e:'motor_scooter'},
             {l:'Retirar na loja',s:'Sem taxa de entrega',e:'convenience_store'}]}]},
         pagamento:{title:'Pagamento',p:86,footer:'Revisar pedido',need:1,c:[
           {t:'h1',v:'Como você prefere pagar?'},
           {t:'radio',o:[
             {l:'Pix',s:'Enviamos o código depois da confirmação'},
             {l:'Cartão',s:'Na entrega ou na retirada'},
             {l:'Dinheiro',s:'Na entrega ou na retirada'}]}]},
         confirmar:{title:'Confirmar pedido',p:100,footer:'Confirmar pedido',need:0,c:[
           {t:'h1',v:'Confirme seu pedido'},
           {t:'itens',o:[{l:'2x Dipirona 1 g, 10 comprimidos',s:'R$ 37,80',e:'pill'}]},
           {t:'total',v:'Total: <b>R$ 37,80</b>\nEntrega: Rua das Acácias, 100\nPagamento: Pix'},
           {t:'cap',v:'Ao confirmar, a farmácia recebe seu pedido e responde aqui na conversa.'}]}},
       linha:[
         {s:'buscar',e:1,a:[{w:800},{type:'Dipirona'},{w:400},{foot:1}]},
         {s:'produto',e:1,a:[{w:1000},{drop:1},{w:500},{foot:1}]},
         {s:'carrinho',e:2,a:[{w:1400},{foot:1}]},
         {s:'entrega',e:3,a:[{w:800},{tap:0},{w:500},{foot:1}]},
         {s:'pagamento',e:3,a:[{w:800},{tap:0},{w:500},{foot:1}]},
         {s:'confirmar',e:4,a:[{w:1800},{foot:1}]}]},

      {dono:'Sua clínica',av:'hospital',fala:'f0b',oi:'Quero marcar uma consulta',
       boas:'Claro! 🩺 Escolha a especialidade, o profissional e o melhor horário. Leva menos de 1 minuto.',cta:'Agendar consulta',
       fim:'Consulta confirmada ✅ Quinta, às 14:30, com a Dra. Camila. Você recebe um lembrete aqui na véspera.',
       etapas:['Abre o agendamento na conversa','Escolhe especialidade e profissional','Marca dia e horário','Informa os dados','Confirma a consulta'],
       painel:{e:'anatomical_heart',t:'Consulta agendada',s:'Marina Alves com Dra. Camila Rocha',f:'Na agenda',tags:['Cardiologia','Quinta, 14:30','Particular']},
       telas:{
         esp:{title:'Agendar consulta',p:20,footer:'Continuar',need:1,c:[
           {t:'h1',v:'Qual especialidade?'},
           {t:'radio',o:[
             {l:'Clínico geral',s:'Consulta de rotina',e:'stethoscope'},
             {l:'Cardiologia',s:'Check-up e exames',e:'anatomical_heart'},
             {l:'Odontologia',s:'Avaliação e limpeza',e:'tooth'},
             {l:'Oftalmologia',s:'Exame de vista',e:'glasses'}]}]},
         medico:{title:'Profissional',p:40,footer:'Continuar',need:1,c:[
           {t:'h1',v:'Com quem você quer consultar?'},
           {t:'radio',o:[
             {l:'Dra. Camila Rocha',s:'Cardiologista, atende de terça a quinta',f:17},
             {l:'Dr. Paulo Reis',s:'Cardiologista, atende segunda e sexta',f:8}]}]},
         horario:{title:'Dia e horário',p:60,footer:'Continuar',need:1,c:[
           {t:'h1',v:'Quando fica melhor?'},
           {t:'label',v:'Dia'},
           {t:'chips',o:['Ter 24','Qua 25','Qui 26']},
           {t:'label',v:'Horário'},
           {t:'chips',o:['09:00','10:30','14:30','16:00']}]},
         dados:{title:'Seus dados',p:80,footer:'Revisar',need:1,c:[
           {t:'h1',v:'Para quem é a consulta?'},
           {t:'input',cap:'Nome completo',ph:'Nome completo',helper:'Como está no documento'},
           {t:'radio',o:[{l:'Particular'},{l:'Convênio',s:'Leve a carteirinha no dia'}]}]},
         confirmar:{title:'Confirmar',p:100,footer:'Confirmar consulta',need:0,c:[
           {t:'h1',v:'Confira o agendamento'},
           {t:'pessoa',f:17,l:'Dra. Camila Rocha',s:'Cardiologia'},
           {t:'total',v:'Dia: <b>quinta, 26</b>\nHorário: <b>14:30</b>\nPaciente: Marina Alves\nAtendimento: particular'},
           {t:'cap',v:'Você recebe um lembrete aqui na véspera.'}]}},
       linha:[
         {s:'esp',e:1,a:[{w:800},{tap:1},{w:500},{foot:1}]},
         {s:'medico',e:1,a:[{w:800},{tap:0},{w:500},{foot:1}]},
         {s:'horario',e:2,a:[{w:700},{chip:[0,2]},{w:300},{chip:[1,2]},{w:500},{foot:1}]},
         {s:'dados',e:3,a:[{w:600},{type:'Marina Alves'},{w:250},{tap:0},{w:400},{foot:1}]},
         {s:'confirmar',e:4,a:[{w:1800},{foot:1}]}]},

      {dono:'Sua hamburgueria',av:'hamburger',fala:'f0c',oi:'Boa noite! Tem cardápio?',
       boas:'Tem sim! 🍔 Monte seu pedido aqui mesmo e acompanhe a entrega pelo WhatsApp.',cta:'Ver cardápio',
       fim:'Pedido confirmado! 🔥 Já foi para a cozinha. Entrega em 35 a 45 minutos.',
       etapas:['Abre o cardápio na conversa','Escolhe o lanche','Monta o combo','Define entrega e pagamento','Faz o pedido'],
       painel:{e:'hamburger',t:'Pedido 0312',s:'X-Burger da casa, batata e refrigerante',f:'Fila da cozinha',tags:['Sem cebola','Pix','R$ 45,90']},
       telas:{
         lanche:{title:'Cardápio',p:20,footer:'Continuar',need:1,c:[
           {t:'h1',v:'O que vai ser hoje?'},
           {t:'radio',o:[
             {l:'X-Burger da casa',s:'Pão brioche, 160 g, queijo e molho. R$ 28,90',e:'hamburger'},
             {l:'Hot dog completo',s:'Salsicha, purê e batata palha. R$ 19,90',e:'hot_dog'},
             {l:'Pizza brotinho',s:'Calabresa ou muçarela. R$ 24,90',e:'pizza'}]}]},
         combo:{title:'Monte o combo',p:40,footer:'Continuar',need:1,c:[
           {t:'h1',v:'Quer transformar em combo?'},
           {t:'radio',o:[
             {l:'Batata e refrigerante',s:'Mais R$ 12,00',e:'french_fries'},
             {l:'Só o refrigerante',s:'Mais R$ 6,00',e:'cup_with_straw'},
             {l:'Sem combo',s:'Só o lanche'}]}]},
         obs:{title:'Observações',p:60,footer:'Continuar',need:0,c:[
           {t:'h1',v:'Algum ajuste no lanche?'},
           {t:'input',cap:'Observação',ph:'Ex.: sem cebola',helper:'Opcional'}]},
         entrega:{title:'Entrega',p:80,footer:'Revisar pedido',need:1,c:[
           {t:'h1',v:'Onde entregamos?'},
           {t:'radio',o:[
             {l:'Rua das Acácias, 100',s:'Entrega em 35 a 45 min. Taxa de R$ 5,00',e:'motor_scooter'},
             {l:'Retirar no balcão',s:'Pronto em 20 minutos'}]},
           {t:'label',v:'Pagamento'},
           {t:'chips',o:['Pix','Cartão','Dinheiro']}]},
         confirmar:{title:'Confirmar pedido',p:100,footer:'Fazer pedido',need:0,c:[
           {t:'h1',v:'Tudo certo?'},
           {t:'itens',o:[{l:'1x X-Burger da casa',s:'R$ 28,90',e:'hamburger'},{l:'Combo batata e refrigerante',s:'R$ 12,00',e:'french_fries'}]},
           {t:'total',v:'Entrega: R$ 5,00\nTotal: <b>R$ 45,90</b>\nObservação: sem cebola\nPagamento: Pix'}]}},
       linha:[
         {s:'lanche',e:1,a:[{w:800},{tap:0},{w:500},{foot:1}]},
         {s:'combo',e:2,a:[{w:800},{tap:0},{w:500},{foot:1}]},
         {s:'obs',e:2,a:[{w:500},{type:'Sem cebola'},{w:300},{foot:1}]},
         {s:'entrega',e:3,a:[{w:700},{tap:0},{w:300},{chip:[0,0]},{w:450},{foot:1}]},
         {s:'confirmar',e:4,a:[{w:1800},{foot:1}]}]}
    ];
    var box=$('flBox'),fone=$('flFone'),chat=$('flChat'),veu=$('flVeu'),sheet=$('flSheet'),stack=$('flStack'),bar=$('flBar'),foot=$('flFoot'),tit=$('flTit'),kb=$('flKb'),dot=$('flDot'),
        chips=qa('#flChips button'),etapasEl=$('flEtapas'),painel=$('flPainel'),escala=.7,fixoFlow=-1,cur=null,Z=null;
    function ajustar(){
      var h=box.clientHeight,w=palco.clientWidth>=640?palco.clientWidth*.46:box.clientWidth;if(!h||!w)return;
      escala=Math.max(.36,Math.min(h/720,w/393));box.style.setProperty('--s',escala.toFixed(4));
    }
    if('ResizeObserver' in window)new ResizeObserver(ajustar).observe(palco);else window.addEventListener('resize',ajustar);
    function rico(s){return esc(s).replace(/&lt;(\/?)b>/g,'<$1b>').replace(/\n/g,'<br>');}
    function mini(o){return o.e?'<span class="f-thumb">'+IMG(o.e)+'</span>':o.f?'<span class="f-thumb foto hx-f'+o.f+'"></span>':'';}
    function tela(def){
      var el=document.createElement('div');el.className='fl-scr';
      el.innerHTML=def.c.map(function(c){
        switch(c.t){
          case 'h1':return '<div class="f-h1">'+rico(c.v)+'</div>';
          case 'h2':return '<div class="f-h2">'+rico(c.v)+'</div>';
          case 'body':return '<div class="f-body">'+rico(c.v)+'</div>';
          case 'cap':return '<div class="f-cap">'+rico(c.v)+'</div>';
          case 'label':return '<div class="f-label">'+rico(c.v)+'</div>';
          case 'kv':return '<div class="f-kv">'+rico(c.v)+'</div>';
          case 'total':return '<div class="f-total">'+rico(c.v)+'</div>';
          case 'link':return '<div class="f-link" data-link>'+rico(c.v)+'</div>';
          case 'hero':return '<div class="f-hero">'+IMG(c.e)+(c.tag?'<span>'+esc(c.tag)+'</span>':'')+'</div>';
          case 'pessoa':return '<div class="f-pessoa"><i class="hx-f'+c.f+'"></i><div><b>'+esc(c.l)+'</b><span>'+esc(c.s)+'</span></div></div>';
          case 'itens':return '<div class="f-itens">'+c.o.map(function(o){return '<div class="f-item">'+(o.e?IMG(o.e):'')+'<b>'+esc(o.l)+'</b><span>'+esc(o.s)+'</span></div>';}).join('')+'</div>';
          case 'chips':return '<div class="f-chips" data-chips>'+c.o.map(function(o){return '<span class="f-chip">'+esc(o)+'</span>';}).join('')+'</div>';
          case 'input':return '<div class="f-field" data-input><span class="cap" hidden>'+esc(c.cap)+'</span><span class="val ph">'+esc(c.ph)+'</span></div>'+(c.helper?'<div class="f-helper">'+esc(c.helper)+'</div>':'');
          case 'drop':return '<div class="f-field" data-drop data-val="'+esc(c.val)+'"><span class="cap" hidden>'+esc(c.cap)+'</span><span class="val ph">'+esc(c.ph)+'</span><span class="clear">'+I_CHEV+'</span></div>';
          case 'radio':return '<div>'+c.o.map(function(o){return '<div class="f-opt" data-opt>'+mini(o)+'<span class="txt"><b>'+esc(o.l)+'</b>'+(o.s?'<span>'+esc(o.s)+'</span>':'')+'</span><span class="f-radio"></span></div>';}).join('')+'</div>';
        }
        return '';
      }).join('');
      return el;
    }
    function cabecalho(F,id){
      var def=F.telas[id];tit.textContent=def.title;$('flNav').innerHTML=id===F.linha[0].s?I_X:I_VOLTA;bar.style.width=def.p+'%';
      if(def.footer){foot.textContent=def.footer;foot.classList.toggle('off',!!def.need);foot.style.visibility='visible';}else foot.style.visibility='hidden';
    }
    async function ir(F,id){
      var nova=tela(F.telas[id]),ant=stack.firstElementChild;
      stack.appendChild(nova);
      if(ant){ant.classList.add('sai');nova.classList.add('entra');setTimeout(function(){if(ant.parentNode)ant.parentNode.removeChild(ant);},340);}
      cur=nova;cabecalho(F,id);await Z(340);
    }
    /* o ponto do toque: a posição vem da tela real e volta para a escala do celular */
    function aponta(el){
      var p=fone.getBoundingClientRect(),r=el.getBoundingClientRect();
      dot.style.left=((r.left-p.left+r.width/2)/escala-10)+'px';dot.style.top=((r.top-p.top+Math.min(r.height/2,26*escala))/escala-10)+'px';dot.classList.add('mostra');
    }
    async function aperta(el){aponta(el);await Z(430);dot.classList.add('bate');el.classList.add('aperta');await Z(180);dot.classList.remove('bate');el.classList.remove('aperta');await Z(120);}
    function some(){dot.classList.remove('mostra');}
    var LINHAS=[['q','w','e','r','t','y','u','i','o','p'],['a','s','d','f','g','h','j','k','l'],['⇧','z','x','c','v','b','n','m','⌫']];
    function teclado(){
      kb.innerHTML=LINHAS.map(function(r){return '<div class="row">'+r.map(function(k){return '<div class="k'+(k==='⇧'||k==='⌫'?' dark sm':'')+'" data-k="'+k+'">'+k+'</div>';}).join('')+'</div>';}).join('')+
        '<div class="row"><div class="k dark sm" style="flex:1.5">123</div><div class="k" style="flex:5"></div><div class="k dark sm" style="flex:1.8">ir</div></div>';
      kb.classList.add('sobe');
    }
    function tecla(ch){var k=qa('[data-k]',kb).filter(function(e){return e.getAttribute('data-k')===ch.toLowerCase();})[0];if(!k)return;k.classList.add('press');setTimeout(function(){k.classList.remove('press');},90);}
    async function digita(campo,texto){
      var val=campo.querySelector('.val'),cap=campo.querySelector('.cap'),feito='';
      await aperta(campo);some();campo.classList.add('on');cap.hidden=false;val.classList.remove('ph');val.textContent='';teclado();await Z(420);
      for(var i=0;i<texto.length;i++){feito+=texto.charAt(i);val.innerHTML=esc(feito)+'<span class="f-caret"></span>';tecla(texto.charAt(i));await Z(95+Math.random()*70);}
      val.textContent=feito;
      if(!campo.querySelector('.clear')){var x=document.createElement('span');x.className='clear';x.innerHTML=I_LIMPA;campo.appendChild(x);}
      await Z(300);kb.classList.remove('sobe');await Z(280);foot.classList.remove('off');
    }
    function bolha(lado,html,depois){var d=document.createElement('div');d.className='wa wa-'+lado;d.innerHTML=html+'<small>13:01'+(lado==='out'?TIQUES:'')+'</small>'+(depois||'');chat.appendChild(d);return d;}
    function etapaFlow(F,n){
      qa('li',etapasEl).forEach(function(li,i){li.className=i<n?'feito':i===n?'on':'';});
      $('flLegenda').textContent=n>=F.etapas.length?'Pedido no painel da Prisme':(n+1)+'. '+F.etapas[n];
    }
    function prepara(k){
      var F=FLOWS[k];
      chips.forEach(function(c,i){c.setAttribute('aria-selected',i===k?'true':'false');});
      etapasEl.innerHTML=F.etapas.map(function(e){return '<li><b>'+esc(e)+'</b></li>';}).join('');
      $('flPed').innerHTML='<div class="fl-ped-l">'+IMG(F.painel.e)+'<div><b>'+esc(F.painel.t)+'</b><span>'+esc(F.painel.s)+'</span></div><em>'+esc(F.painel.f)+'</em></div><div class="fl-tags">'+F.painel.tags.map(function(t){return '<span>'+esc(t)+'</span>';}).join('')+'</div>';
      painel.classList.remove('on');sheet.className='fl-sheet';veu.classList.remove('on');kb.classList.remove('sobe');some();stack.innerHTML='';bar.style.width='0%';
      chat.innerHTML='<div class="fl-nota">Esta empresa usa um serviço seguro da Meta para gerenciar esta conversa.</div><div class="wa-sis">Hoje</div>';
      $('flNome').textContent=F.dono;$('flDono').textContent=F.dono;$('flAv').innerHTML=IMG(F.av);
      etapaFlow(F,0);return F;
    }
    function respostaFlow(F){
      var r=document.createElement('div');r.className='wa wa-out fl-resp';
      r.innerHTML='<span class="fl-resp-l">'+I_DOC+'<span><b>'+esc(F.cta)+'</b><i>Resposta enviada</i></span></span><small>13:03'+TIQUES+'</small>';chat.appendChild(r);
    }
    async function rodaFlow(k,g){
      var F=prepara(k);Z=function(ms){return dorme(ms,g);};dizer(F.fala);ajustar();
      await Z(900);bolha('out',esc(F.oi));await Z(1000);
      var cta=bolha('in',fmt(F.boas),'<span class="fl-cta">'+I_LISTA+esc(F.cta)+'</span>').querySelector('.fl-cta');
      await Z(1300);await aperta(cta);some();sheet.classList.add('carrega','aberto');veu.classList.add('on');await Z(700);sheet.classList.remove('carrega');
      for(var i=0;i<F.linha.length;i++){
        var st=F.linha[i];await ir(F,st.s);etapaFlow(F,st.e);
        for(var j=0;j<st.a.length;j++){
          var a=st.a[j];
          if(a.w!==undefined)await Z(a.w);
          if(a.tap!==undefined){var ops=qa('[data-opt]',cur),o=ops[a.tap];await aperta(o);ops.forEach(function(x){x.classList.remove('on');});o.classList.add('on');foot.classList.remove('off');some();}
          if(a.chip!==undefined){var cs=qa('.f-chip',qa('[data-chips]',cur)[a.chip[0]]),c=cs[a.chip[1]];await aperta(c);cs.forEach(function(x){x.classList.remove('on');});c.classList.add('on');foot.classList.remove('off');some();}
          if(a.type!==undefined)await digita(qa('[data-input]',cur)[0],a.type);
          if(a.drop!==undefined){var d=cur.querySelector('[data-drop]');await aperta(d);some();d.classList.add('on');d.querySelector('.cap').hidden=false;var v=d.querySelector('.val');v.classList.remove('ph');v.textContent=d.getAttribute('data-val');foot.classList.remove('off');await Z(400);}
          if(a.foot){await aperta(foot);some();}
        }
      }
      /* o Flow fecha, a resposta volta para a conversa e o pedido aparece no painel */
      sheet.classList.remove('aberto');veu.classList.remove('on');await Z(520);stack.innerHTML='';
      respostaFlow(F);await Z(800);bolha('in',fmt(F.fim));etapaFlow(F,F.etapas.length);painel.classList.add('on');eveFaz('celebrate');
      await Z(3800);
    }
    function flowParado(k){
      var F=prepara(k),ult=F.linha[F.linha.length-1].s;
      bolha('out',esc(F.oi));bolha('in',fmt(F.boas),'<span class="fl-cta">'+I_LISTA+esc(F.cta)+'</span>');
      stack.appendChild(tela(F.telas[ult]));cabecalho(F,ult);sheet.classList.add('aberto');veu.classList.add('on');etapaFlow(F,F.etapas.length);painel.classList.add('on');ajustar();
    }
    async function cenaFlows(g){var lista=fixoFlow>=0?[fixoFlow]:[0,1,2];for(var i=0;i<lista.length;i++)await rodaFlow(lista[i],g);}
    chips.forEach(function(c,i){c.addEventListener('click',function(){fixoFlow=i;mostrar(0,true);});});

    /* ================= conversa de grupo, com foto de quem fala e mídias ================= */
    var GENTE={
      eu:{n:'Você'},
      eve:{n:'Eve',c:'#1766d8',eve:1},
      rafa:{n:'Rafael, da Prisme',c:'#0e8a52',f:10},
      bia:{n:'Bia, da Prisme',c:'#0e8a52',f:19},
      ana:{n:'Ana, sua atendente',c:'#b45309',f:23},
      diego:{n:'Diego, do tráfego',c:'#7c3aed',f:30}
    };
    function foto(p){return p.eve?'<span class="gp-a gp-a--eve">'+EVE_AV+'</span>':'<span class="gp-a hx-f'+p.f+'"></span>';}
    function midia(m){
      if(m.print)return '<span class="md md-print"><span class="pt"><i></i><i></i><i></i>Conexões</span><span class="pc"><i class="cf-ic" data-c="wa"><svg viewBox="0 0 448 512"><path d="M380.9 97.1C339 55.1 283.2 32 223.9 32c-122.4 0-222 99.6-222 222 0 39.1 10.2 77.3 29.6 111L0 480l117.7-30.9c32.4 17.7 68.9 27 106.1 27h.1c122.3 0 224.1-99.6 224.1-222 0-59.3-25.2-115-67.1-157zm-157 341.6c-33.2 0-65.7-8.9-94-25.7l-6.7-4-69.8 18.3L72 359.2l-4.4-7c-18.5-29.4-28.2-63.3-28.2-98.2 0-101.7 82.8-184.5 184.6-184.5 49.3 0 95.6 19.2 130.4 54.1 34.8 34.9 56.2 81.2 56.1 130.5 0 101.8-84.9 184.6-186.6 184.6zm101.2-138.2c-5.5-2.8-32.8-16.2-37.9-18-5.1-1.9-8.8-2.8-12.5 2.8-3.7 5.6-14.3 18-17.6 21.8-3.2 3.7-6.5 4.2-12 1.4-32.6-16.3-54-29.1-75.5-66-5.7-9.8 5.7-9.1 16.3-30.3 1.8-3.7.9-6.9-.5-9.7-1.4-2.8-12.5-30.1-17.1-41.2-4.5-10.8-9.1-9.3-12.5-9.5-3.2-.2-6.9-.2-10.6-.2-3.7 0-9.7 1.4-14.8 6.9-5.1 5.6-19.4 19-19.4 46.3 0 27.3 19.9 53.7 22.6 57.4 2.8 3.7 39.1 59.7 94.8 83.8 35.2 15.2 49 16.5 66.6 13.9 10.7-1.6 32.8-13.4 37.4-26.4 4.6-13 4.6-24.1 3.2-26.4-1.3-2.5-5-3.9-10.5-6.6z"/></svg></i><span><b>Loja Centro</b><small>WhatsApp por QR code</small></span><em>Desconectado</em></span><span class="pc ok"><i class="cf-ic" data-c="ig"><svg viewBox="0 0 448 512"><path d="M224.1 141c-63.6 0-114.9 51.3-114.9 114.9s51.3 114.9 114.9 114.9S339 319.5 339 255.9 287.7 141 224.1 141zm0 189.6c-41.1 0-74.7-33.5-74.7-74.7s33.5-74.7 74.7-74.7 74.7 33.5 74.7 74.7-33.6 74.7-74.7 74.7zm146.4-194.3c0 14.9-12 26.8-26.8 26.8-14.9 0-26.8-12-26.8-26.8s12-26.8 26.8-26.8 26.8 12 26.8 26.8zm76.1 27.2c-1.7-35.9-9.9-67.7-36.2-93.9-26.2-26.2-58-34.4-93.9-36.2-37-2.1-147.9-2.1-184.9 0-35.8 1.7-67.6 9.9-93.9 36.1s-34.4 58-36.2 93.9c-2.1 37-2.1 147.9 0 184.9 1.7 35.9 9.9 67.7 36.2 93.9s58 34.4 93.9 36.2c37 2.1 147.9 2.1 184.9 0 35.9-1.7 67.7-9.9 93.9-36.2 26.2-26.2 34.4-58 36.2-93.9 2.1-37 2.1-147.8 0-184.8zM398.8 388c-7.8 19.6-22.9 34.7-42.6 42.6-29.5 11.7-99.5 9-132.1 9s-102.7 2.6-132.1-9c-19.6-7.8-34.7-22.9-42.6-42.6-11.7-29.5-9-99.5-9-132.1s-2.6-102.7 9-132.1c7.8-19.6 22.9-34.7 42.6-42.6 29.5-11.7 99.5-9 132.1-9s102.7-2.6 132.1 9c19.6 7.8 34.7 22.9 42.6 42.6 11.7 29.5 9 99.5 9 132.1s2.7 102.7-9 132.1z"/></svg></i><span><b>Instagram da loja</b><small>Direct e comentários</small></span><em>Conectado</em></span></span>';
      if(m.video)return '<span class="md md-video"><span class="vf"><span><i></i><i></i><i></i></span><span><i></i><i class="m"></i><i></i></span></span><span class="vm">Transferir para<b>Vendas</b><b>Suporte</b></span><span class="vp"></span><span class="vd">'+esc(m.video)+'</span></span>';
      if(m.pdf)return '<span class="md md-pdf"><span class="pp"><i></i><b></b><b></b><b></b></span><span class="pi"><i>PDF</i><span><b>'+esc(m.pdf.n)+'</b><small>'+esc(m.pdf.i)+'</small></span></span></span>';
      if(m.link)return '<span class="md md-link"><i></i><span><b>'+esc(m.link.t)+'</b><small>'+esc(m.link.d)+'</small></span></span>';
      return '';
    }
    function msgG(m,hora){
      var d=document.createElement('div');
      if(m.sis){d.className='wa-sis';d.textContent=m.sis;return d;}
      var p=GENTE[m.de],meu=m.de==='eu';
      d.className='gp-l'+(meu?' meu':'');
      d.innerHTML=(meu?'':foto(p))+'<div class="wa '+(meu?'wa-out':'wa-in')+'">'+(meu?'':'<em style="color:'+p.c+'">'+esc(p.n)+'</em>')+
        (m.cita?'<q><b>'+esc(m.cita.n)+'</b>'+esc(m.cita.t)+'</q>':'')+midia(m)+(m.txt?fmt(m.txt):'')+'<small>'+(m.h||hora)+(meu?TIQUES:'')+'</small></div>';
      return d;
    }
    function digG(de){var d=document.createElement('div');d.className='gp-l';d.innerHTML=foto(GENTE[de])+'<div class="wa wa-in wa-dig"><i></i><i></i><i></i></div>';return d;}
    function poda(c){while(c.children.length>9)c.removeChild(c.firstChild);}
    async function tocaGrupo(corpo,rot,g,hora,aoPasso){
      for(var i=0;i<rot.length;i++){
        var m=rot[i];
        if(!m.sis&&m.de!=='eu'&&!m.junto){var dg=digG(m.de);corpo.appendChild(dg);poda(corpo);await dorme(m.dig||900,g);if(dg.parentNode)dg.parentNode.removeChild(dg);}
        else await dorme(m.sis?250:m.junto?350:700,g);
        corpo.appendChild(msgG(m,hora));poda(corpo);if(aoPasso)aoPasso(i,m);
        await dorme(m.ler||(m.sis?600:1150+Math.min(2300,(m.txt||'').length*13)),g);
      }
    }
    function grupoParado(corpo,rot,hora){corpo.innerHTML='';rot.forEach(function(m){corpo.appendChild(msgG(m,hora));});poda(corpo);}

    /* ================= 2. SUPORTE NO GRUPO ================= */
    var SUP=[
      {aba:['Dúvida com print','A Eve lê a imagem e responde com o que encontrou.'],hora:'10:41',res:'Resolvido no próprio grupo',msgs:[
        {de:'eu',print:1,txt:'Gente, o WhatsApp parou de receber mensagem 😰'},
        {de:'eve',txt:'Recebi, já estou verificando 👀',dig:500,ler:1200},
        {de:'eve',cita:{n:'Você',t:'📷 Foto'},txt:'Oi! No seu print a conexão *Loja Centro* aparece desconectada desde 10:32. É só ler o QR code de novo:\n1. Menu Conexões\n2. Em Loja Centro, Excluir Sessão\n3. Nos 3 pontinhos, Reiniciar Conexões\n4. Ver QR Code e ler com o celular da loja',dig:1300},
        {de:'eu',txt:'Voltou! Obrigado 🙏'},
        {de:'eve',txt:'Que bom 💚 Dica: abra o WhatsApp no celular pelo menos a cada 14 dias para a conexão não cair.',dig:900}]},
      {aba:['Dúvida em vídeo','O time assiste, entende e resolve junto.'],hora:'15:07',res:'Time humano junto com a Eve',msgs:[
        {de:'ana',video:'0:24',txt:'Olha o que acontece quando tento transferir o atendimento 👆'},
        {de:'rafa',cita:{n:'Ana, sua atendente',t:'🎥 Vídeo (0:24)'},txt:'Vi o vídeo, Ana! Você ainda não tem acesso ao setor *Financeiro*, por isso ele não aparece na lista. Posso liberar?',dig:1400},
        {de:'eu',txt:'Pode liberar sim 👍'},
        {de:'rafa',txt:'Feito ✅ Ana, testa de novo?',dig:800},
        {de:'ana',txt:'Agora foi! 🎉',dig:600}]},
      {aba:['Dica no grupo','Novidade e atalho chegam sem você pedir.'],hora:'09:15',res:'Dica aplicada no mesmo dia',msgs:[
        {de:'eve',txt:'💡 *Dica da semana*\nSeu time escreve em rajada? Ligue o *Concatenador*: seis mensagens saem como uma e você paga uma só.\nO passo a passo com as telas está aqui:',dig:1200,ler:900},
        {de:'eve',link:{t:'Concatenador de Mensagens',d:'ajuda.prismeapp.com.br'},junto:1},
        {de:'eu',txt:'Não sabia dessa! 🤔'},
        {de:'bia',txt:'Quer que eu ligue com você agora? Leva 2 minutos 😉',dig:1000},
        {de:'eu',txt:'Bora!'},
        {de:'bia',txt:'Ligado ✅ A partir de agora, rajada vira uma cobrança só.',dig:1100}]}
    ];
    var supAbas=$('supAbas'),fixoSup=-1;
    supAbas.innerHTML=SUP.map(function(s){return '<button type="button" role="tab" aria-selected="false"><b>'+esc(s.aba[0])+'</b><span><i>'+esc(s.aba[1])+'</i></span></button>';}).join('');
    var supBts=qa('button',supAbas);
    function supAba(k){supBts.forEach(function(b,i){b.setAttribute('aria-selected',i===k?'true':'false');});}
    supBts.forEach(function(b,i){b.addEventListener('click',function(){fixoSup=i;mostrar(1,true);});});
    async function rodaSup(k,g){
      var S=SUP[k],c=$('supChat'),res=$('supRes');supAba(k);c.innerHTML='';res.classList.remove('on');res.textContent=S.res;
      await dorme(500,g);await tocaGrupo(c,S.msgs,g,S.hora);
      res.classList.add('on');eveFaz('nod');await dorme(3200,g);
    }
    async function cenaSuporte(g){dizer('f1');var l=fixoSup>=0?[fixoSup]:[0,1,2];for(var i=0;i<l.length;i++)await rodaSup(l[i],g);}
    function supParado(k){var S=SUP[k],res=$('supRes');supAba(k);grupoParado($('supChat'),S.msgs,S.hora);res.textContent=S.res;res.classList.add('on');}

    /* ================= 3. RELATÓRIO QUINZENAL (mesmo formato da mensagem que a Eve envia nos grupos) ================= */
    var REL=[
      {sis:'Dia 15, 17:00'},
      {de:'eve',txt:'📊 *SUA EMPRESA*\n📅 Período: 01/11 a 15/11\n\n🔹 *Resultados do Período*\n👥 Atendimentos: 1.248 (+12% vs anterior)\n💳 Vendas realizadas: 412 (+18% vs anterior)\n📑 Apenas orçamento: 96\n📦 Ruptura: 31\n📈 Taxa de conversão: 33,0% (+1,8 p.p. vs anterior)',dig:900,ler:2600},
      {de:'eve',pdf:{n:'Relatorio_Sua_Empresa_01-11.pdf',i:'PDF, 170 kB'},junto:1,ler:2200},
      {de:'eve',txt:'💡 *Recomendações*\n• Maior movimento: quarta por volta das 8h. Reforce a equipe nesse horário.\n• Rupturas de estoque subiram 24%: produto em falta vira venda perdida.',dig:900,ler:2800},
      {de:'bia',h:'17:06',txt:'Olha o pico de quarta às 8h 👀 @Diego, vale concentrar os anúncios de clique para o WhatsApp nesse horário?',dig:1300},
      {de:'diego',h:'17:08',txt:'Boa! Ajusto a campanha hoje 👊',dig:700},
      {de:'eu',h:'17:09',txt:'Perfeito, time! A ruptura eu resolvo com o estoque 💪'},
      {de:'bia',h:'17:10',txt:'Fechado 🚀 No próximo relatório a gente compara. E em *Leads de anúncio* dá pra ver qual anúncio virou venda.',dig:1200}
    ];
    var KPIS=[['Atendimentos',1248,0,'','+12%',1],['Vendas',412,0,'','+18%',1],['Conversão',33,1,'%','+1,8 p.p.',1],['Só orçamento',96,0,'','-6%',1],['Ruptura',31,0,'','+24%',0],['Tempo médio',16,0,' min','-11%',1]];
    var HORAS=[18,39,34,30,26,14,12,22,27,25,21,16,10,6],ANTES=[16,33,31,27,25,15,11,20,22,24,18,15,9,7];
    $('relKpis').innerHTML=KPIS.map(function(k){return '<div class="rel-kpi"><small>'+k[0]+'</small><b>0'+k[3]+'</b><em'+(k[5]?'':' class="ruim"')+'>'+(k[4].charAt(0)==='+'?'▲ ':'▼ ')+k[4].slice(1)+'</em></div>';}).join('');
    $('relBarras').innerHTML=HORAS.map(function(h,i){return '<span><i class="ant" style="height:'+Math.round(ANTES[i]/40*100)+'%"></i><i style="height:'+Math.round(h/40*100)+'%;transition-delay:'+(i*35)+'ms"></i></span>';}).join('');
    var kpiB=qa('#relKpis b');
    function kpisZero(){kpiB.forEach(function(b,i){b.textContent='0'+KPIS[i][3];});}
    function kpisSobem(anima){kpiB.forEach(function(b,i){var k=KPIS[i];if(anima)conta(b,k[1],k[2],k[3],1100+i*90);else b.textContent=k[1].toLocaleString('pt-BR',{minimumFractionDigits:k[2],maximumFractionDigits:k[2]})+k[3];});}
    async function cenaRelatorio(g){
      dizer('f2');var c=$('relChat'),doc=$('relDoc');c.innerHTML='';doc.classList.remove('cheio');kpisZero();
      await dorme(500,g);
      await tocaGrupo(c,REL,g,'17:00',function(i,m){if(m.pdf){doc.classList.add('cheio');kpisSobem(true);eveFaz('nod');}});
      eveFaz('celebrate');await dorme(3400,g);
    }
    function relParado(){grupoParado($('relChat'),REL,'17:00');$('relDoc').classList.add('cheio');kpisSobem(false);}

    /* ================= 4. META E COMUNIDADE ================= */
    var selos=qa('#comSelos span'),vids=qa('#comVideos a'),comN=$('comN');
    async function cenaComunidade(g){
      dizer('f3');selos.concat(vids).forEach(function(e){e.classList.remove('on','foco');});comN.textContent='0 mil+';
      await dorme(450,g);
      for(var i=0;i<selos.length;i++){selos[i].classList.add('on');await dorme(380,g);}
      eveFaz('nod');conta(comN,110,0,' mil+',1400);await dorme(700,g);
      for(i=0;i<vids.length;i++){vids[i].classList.add('on');await dorme(260,g);}
      for(var v=0;v<6;v++){vids.forEach(function(a,k){a.classList.toggle('foco',k===v%vids.length);});await dorme(1500,g);}
      vids.forEach(function(a){a.classList.remove('foco');});eveFaz('celebrate');await dorme(1600,g);
    }
    function comParado(){selos.concat(vids).forEach(function(e){e.classList.add('on');});comN.textContent='110 mil+';}

    /* ================= troca de diferencial: pílulas, balão da Eve e avanço automático ================= */
    var CENAS=[cenaFlows,cenaSuporte,cenaRelatorio,cenaComunidade];
    function mostrar(n,usuario){
      atual=n;if(usuario)fixo=true;var g=++ger;
      segs.forEach(function(b,i){b.setAttribute('aria-selected',i===n?'true':'false');b.tabIndex=i===n?0:-1;});
      cenas.forEach(function(c,i){c.classList.toggle('on',i===n);});
      pts.forEach(function(p,i){p.classList.toggle('on',i===n);});
      prox.textContent='👉 '+(n<3?ROTULOS[n+1]:'Ver os planos');
      if(reduz){
        if(n===0){flowParado(fixoFlow>=0?fixoFlow:0);dizer(FLOWS[fixoFlow>=0?fixoFlow:0].fala);}
        else if(n===1){supParado(fixoSup>=0?fixoSup:0);dizer('f1');}
        else if(n===2){relParado();dizer('f2');}
        else{comParado();dizer('f3');}
        return;
      }
      CENAS[n](g).then(function(){if(g===ger)mostrar(fixo?n:(n+1)%4);},function(){});
    }
    function irPara(n){fixoFlow=-1;fixoSup=-1;mostrar(n,true);}
    segs.forEach(function(b,i){
      b.addEventListener('click',function(){irPara(i);});
      b.addEventListener('keydown',function(e){var d=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0;if(!d)return;e.preventDefault();var n=(i+d+4)%4;irPara(n);segs[n].focus();});
    });
    prox.addEventListener('click',function(){
      if(atual<3){irPara(atual+1);return;}
      var p=document.getElementById('planos');if(p)p.scrollIntoView({behavior:reduz?'auto':'smooth',block:'start'});
    });
    /* o item "WhatsApp Flows" dos planos traz o visitante direto para o primeiro diferencial */
    document.addEventListener('click',function(e){
      var a=e.target&&e.target.closest?e.target.closest('a[href="#whatsapp-flows"]'):null;if(!a)return;
      e.preventDefault();irPara(0);sec.scrollIntoView({behavior:reduz?'auto':'smooth',block:'start'});
    });

    /* estado inicial, antes de a seção entrar na tela */
    prox.textContent='👉 '+ROTULOS[1];prepara(0);dizer('f0a');supAba(0);
    aoVer(palco,function(){visivel=true;ajustar();if(!jaRodou){jaRodou=true;mostrar(0);}},function(){visivel=false;});
  })();


  /* ================= AGENDAMENTO: quatro perguntas, contato e agenda (mesmo fluxo e mesmos eventos do site atual) ================= */
  (function(){
    var modal=document.getElementById('agModal');if(!modal)return;
    var $=function(id){return document.getElementById(id);},qa=function(s){return [].slice.call(modal.querySelectorAll(s));};
    var AGENDAS={
      especialistas:'https://calendar.google.com/calendar/appointments/schedules/AcZssZ3qHe5tUeKIoZLpnE6YKD4xmqlMe-dPR5R5f75UwUKM0jeYfcVCXuuR-io1WC0OQejQPG3J88nv?gv=true',
      nattan:'https://calendar.google.com/calendar/appointments/schedules/AcZssZ2C5-9-rVr5-YXQM-M1gFiSOZQ_ylxMYBCdI_U1W9bkQegl1gsSXEbuNOdLeZcO31npuhk4uykM?gv=true'
    };
    var SV=function(d){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+d+'</svg>';};
    var IC={
      certo:SV('<circle cx="12" cy="12" r="9"/><path d="m8.500 12 2.500 2.500 4.500-5"/>'),
      pessoa:SV('<path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>'),
      raio:SV('<path d="M13 2 3 14h9l-1 8 10-12h-9z"/>'),
      relogio:SV('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>'),
      ideia:SV('<path d="M9 18h6M10 22h4M15.090 14c.180-.980.650-1.740 1.410-2.500A4.650 4.650 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .230 2.230 1.500 3.500A4.610 4.610 0 0 1 8.910 14"/>'),
      robo:SV('<rect x="3" y="11" width="18" height="10" rx="2"/><circle cx="12" cy="5" r="2"/><path d="M12 7v4M8 16h.010M16 16h.010"/>'),
      brilho:SV('<path d="M12 3l1.900 5.100L19 10l-5.100 1.900L12 17l-1.900-5.100L5 10l5.100-1.900zM19 15v4M21 17h-4"/>'),
      time:SV('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.870M16 3.130a4 4 0 0 1 0 7.750"/>'),
      coroa:SV('<path d="M2 19h20M4 19 2 7l6 4 4-7 4 7 6-4-2 12"/>')
    };
    var FLUXO=['decisor','urgencia','chatbot','quem'];
    var PERG={
      decisor:{t:'Você é o decisor (dono) da empresa?',s:'Esta é uma <b>call de apresentação</b>. Para ser produtiva, precisa da pessoa que decide pela contratação.',
        o:[['sim','certo','Sim, sou o decisor','Dono ou sócio responsável'],['nao','pessoa','Não sou o decisor','Colaborador ou pesquisando']]},
      urgencia:{t:'Qual o nível de urgência para começar?',s:'Isso nos ajuda a preparar a melhor proposta para o seu momento.',
        o:[['rapido','raio','O mais rápido possível','Quero implementar já'],['breve','relogio','Em breve','Nas próximas semanas'],['pensando','ideia','Ainda pensando','Avaliando possibilidades']]},
      chatbot:{t:'Você já tem chatbot na operação?',s:'Queremos entender seu cenário atual de atendimento.',
        o:[['sim','robo','Sim, já uso','Quero migrar ou melhorar'],['nao','brilho','Ainda não tenho','Seria o primeiro']]},
      quem:{t:'Com quem você prefere a call?',s:'Escolha o formato que faz mais sentido para você.',cartao:1,
        o:[['especialistas','time','Time de Especialistas','Call gratuita com nossos consultores de implementação.','Sem custo'],
           ['nattan','coroa','Direto com Nattan Lima','Call exclusiva. O valor é abatido na implementação em caso de fechamento.','R$ 197,90',1]]}
    };
    var dados={},passoAtual='decisor',quemAbriu=null,eveA=null;
    var prog=$('agProg'),segs=[].slice.call(prog.children),conta=$('agConta'),corpo=$('agCorpo'),iframe=$('qual-iframe'),carrega=$('agCarrega');
    function evento(n,p){try{if(typeof window.trackEvent==='function')window.trackEvent(n,p);}catch(e){}}
    function novoId(){return (window.crypto&&crypto.randomUUID)?crypto.randomUUID():'ev-'+Date.now().toString(36)+Math.random().toString(36).slice(2);}
    function eveFaz(x){if(eveA&&!reduz){try{eveA.play(x);}catch(e){}}}

    function mostrar(passo){
      passoAtual=passo;var i=FLUXO.indexOf(passo),alvo=i>=0?'pergunta':passo;
      qa('.ag-p').forEach(function(p){var on=p.getAttribute('data-p')===alvo;p.hidden=!on;p.classList.remove('entra');if(on){void p.offsetWidth;p.classList.add('entra');}});
      modal.classList.toggle('cal',passo==='calendar');
      if(i>=0){
        var P=PERG[passo];$('agH').textContent=P.t;$('agS').innerHTML=P.s;
        var ops=$('agOps');ops.setAttribute('data-n',P.o.length);if(P.cartao)ops.setAttribute('data-cartao','');else ops.removeAttribute('data-cartao');
        ops.innerHTML=P.o.map(function(o){return '<button type="button" class="ag-op'+(dados[passo]===o[0]?' foi':'')+'" data-v="'+o[0]+'"><span class="ag-ic">'+IC[o[1]]+'</span><span><b>'+esc(o[2])+'</b><small>'+esc(o[3])+'</small></span>'+(o[4]?'<em'+(o[5]?' data-pago':'')+'>'+esc(o[4])+'</em>':'')+'</button>';}).join('');
        $('agVolta').hidden=i===0;
      }
      /* barra: quatro perguntas; o formulário fecha o funil com tudo cheio; bloqueio, custo e agenda escondem */
      var cheio=passo==='contato'?4:i+1;prog.classList.toggle('fora',!(i>=0||passo==='contato'));
      segs.forEach(function(s,k){s.classList.toggle('on',k<cheio);});
      conta.textContent=i>=0?'Pergunta '+(i+1)+' de 4':passo==='contato'?'Quase lá':passo==='calendar'?'Escolha o melhor horário':passo==='nattan'?'Antes de agendar':'Sobre a call';
      corpo.scrollTop=0;
      var h=modal.querySelector('.ag-p:not([hidden]) h3');if(h&&modal.classList.contains('open'))try{h.focus({preventScroll:true});}catch(e){}
    }
    function responder(chave,valor){
      dados[chave]=valor;eveFaz('nod');
      if(chave==='decisor'){if(valor==='nao'){evento('agendamento_bloqueado',{motivo:'nao_decisor'});mostrar('block');return;}mostrar('urgencia');}
      else if(chave==='urgencia')mostrar('chatbot');
      else if(chave==='chatbot')mostrar('quem');
      else if(chave==='quem'){if(valor==='nattan'){mostrar('nattan');return;}mostrar('contato');}
    }
    function abrirAgenda(tipo){
      dados.quem=tipo;carrega.classList.remove('some');$('agFora').href=AGENDAS[tipo];iframe.src=AGENDAS[tipo];$('agCusto').hidden=tipo!=='nattan';
      mostrar('calendar');eveFaz('celebrate');
      evento('agendamento_qualificado',{agenda:tipo,decisor:dados.decisor,urgencia:dados.urgencia,chatbot:dados.chatbot});
    }
    iframe.addEventListener('load',function(){if(iframe.getAttribute('src')!=='about:blank')carrega.classList.add('some');});

    /* contato: valida, avisa a equipe (endereço lido do <meta name="lead-endpoint">) e abre a agenda escolhida */
    var CAMPOS=['lead-nome','lead-whatsapp','lead-email'],erro=$('lead-error');
    function limpa(id){(id?[id]:CAMPOS).forEach(function(f){$(f).removeAttribute('aria-invalid');});}
    function marca(ids,msg){limpa();ids.forEach(function(f){$(f).setAttribute('aria-invalid','true');});$(ids[0]).focus();erro.textContent=msg;erro.hidden=false;}
    CAMPOS.forEach(function(f){$(f).addEventListener('input',function(){limpa(f);});});
    function destino(){var m=document.querySelector('meta[name="lead-endpoint"]');return (m&&m.content?m.content:'').trim();}
    $('agForm').addEventListener('submit',function(e){
      e.preventDefault();
      var nome=$('lead-nome').value.trim(),whats=$('lead-whatsapp').value.trim(),email=$('lead-email').value.trim(),empresa=$('lead-empresa').value.trim(),isca=$('lead-website').value;
      var falta=[];if(!nome)falta.push('lead-nome');if(!whats)falta.push('lead-whatsapp');if(!email)falta.push('lead-email');
      if(falta.length){marca(falta,'Preencha nome, WhatsApp e e-mail.');return;}
      if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){marca(['lead-email'],'Informe um e-mail válido.');return;}
      if(whats.replace(/\D/g,'').length<10){marca(['lead-whatsapp'],'Informe um WhatsApp válido com DDD.');return;}
      limpa();erro.hidden=true;dados.contato={nome:nome,whatsapp:whats,email:email,empresa:empresa};
      var id=novoId();if(!isca)evento('cadastro_concluido',{agenda:dados.quem,event_id:id});
      var url=destino(),bt=$('lead-submit'),segue=function(){bt.disabled=false;bt.textContent='Continuar para a agenda';abrirAgenda(dados.quem);};
      if(!url||isca){segue();return;}
      bt.disabled=true;bt.textContent='Enviando...';
      /* a notificação nunca bloqueia o agendamento do cliente */
      fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({nome:nome,whatsapp:whats,email:email,empresa:empresa,decisor:dados.decisor,urgencia:dados.urgencia,chatbot:dados.chatbot,agenda:dados.quem,origem:location.href,event_id:id})})
        .then(function(r){evento(r&&r.ok?'lead_enviado':'lead_envio_falhou',{agenda:dados.quem,status:r?r.status:0});},function(){evento('lead_envio_falhou',{agenda:dados.quem});}).then(segue);
    });

    modal.addEventListener('click',function(e){
      var t=e.target.closest?e.target:null;if(!t)return;
      if(t.closest('[data-ag-fechar]')){alternar();return;}
      var op=t.closest('.ag-op');if(op){responder(passoAtual,op.getAttribute('data-v'));return;}
      var ir=t.closest('[data-ag-ir]');if(ir){if(passoAtual==='calendar')iframe.src='about:blank';mostrar(ir.getAttribute('data-ag-ir'));return;}
      if(t.closest('#agVolta')){mostrar(FLUXO[Math.max(0,FLUXO.indexOf(passoAtual)-1)]);}
    });
    function inerte(on){[].forEach.call(document.body.children,function(el){if(el===modal||el.tagName==='SCRIPT')return;if(on)el.setAttribute('inert','');else el.removeAttribute('inert');});}
    function alternar(){
      var abre=!modal.classList.contains('open');modal.classList.toggle('open',abre);
      if(abre){
        evento('abrir_agendamento');dados={};iframe.src='about:blank';erro.hidden=true;limpa();
        quemAbriu=document.activeElement;document.body.style.overflow='hidden';inerte(true);mostrar('decisor');
        if(!eveA){try{if(window.EveCharacter)eveA=window.EveCharacter.mount($('agEve'),{forma:'prisma',tema:'light',spawn:false});}catch(e){}}
        var x=modal.querySelector('.ag-x');if(x)x.focus();
      }else{
        iframe.src='about:blank';document.body.style.overflow='';inerte(false);
        if(quemAbriu&&quemAbriu.focus)quemAbriu.focus();quemAbriu=null;
      }
    }
    document.addEventListener('keydown',function(e){if(e.key==='Escape'&&modal.classList.contains('open'))alternar();});
    window.toggleScheduler=alternar;
  })();


  /* ================= ÁUDIO POR SEÇÃO: a Eve do canto fala, com ondas atrás e a transcrição no balão ================= */
  (function(){
    /* seg: [início, fim, bloco, texto, reação]. Reação: e = estado da Eve no trecho (padrão: falando), f = gesto, olha = para onde ela olha, clica = aba que acompanha a fala. */
    var AUD={
      coex:{src:'assets/audio/coex.mp3',rotulo:'a explicação sobre coexistência',convite:'🔊 Quer que eu te explique a coexistência? Toca em mim.',
        seg:[
          [0,1.78,0,"Deixa eu te explicar a coexistência. 👋",{"f":"wave"}],
          [2.43,4.31,1,"Antes, a empresa tinha que escolher: 🤔",{"e":"thinking"}],
          [4.68,7.31,1,"ou ficava no aplicativo do WhatsApp, no celular, 📱",{"olha":".cf-coex"}],
          [7.72,10.93,1,"ou migrava para a API Oficial e perdia o aplicativo. 😕",{"e":"error","f":"shake"}],
          [11.35,14,2,"Com a coexistência, você não escolhe mais. 🎉",{"e":"happy","f":"celebrate"}],
          [14.32,17.86,2,"O mesmo número funciona nos dois lugares ao mesmo tempo. 🤝",{"f":"nod","olha":"#cfSincA"}],
          [18.19,24.72,3,"Você continua respondendo pelo celular, com seus áudios, seu status e suas conversas, do jeito que sempre fez. 💬",{"olha":".cf-coex"}],
          [25.08,31.24,4,"E, na Prisme, esse mesmo número ganha equipe, setores, automação e inteligência artificial. 🚀",{"f":"celebrate","olha":"#cfSincB"}],
          [31.62,33.63,5,"Tudo pela API Oficial da Meta. ✅",{"f":"nod","olha":".cf-selo"}],
          [33.99,37.94,5,"Sem gambiarra e sem aquele medo de perder o número de uma hora para outra. 🔒",{"e":"happy"}],
          [38.32,44.66,6,"A Prisme é provedora de tecnologia habilitada pela Meta e faz essa conexão para você, do começo ao fim. 🤝",{"f":"nod","olha":".cf-selo"}],
          [45.03,51.07,7,"É só abrir o WhatsApp no celular pelo menos uma vez a cada 14 dias, e os dois seguem juntos. 📲",{"f":"wave"}]],
        env:'0236929274027526983589444115422014310000000000004665642232001356547846533553341168765210000006996115116955654034251342324530035665013641134344566520000000998644346895541666897138646513210557885451454455666514245123542221000000029562177523201764320243112413667986543113755466432000000000698886763366687657552157215555553344896535637995539867878344305755401551000001571615534554564341045456561444214444567875101421343379998742442004431017985134341352034257741023002354434755133151004421441165210000000002566025556244410001711587767524566755755325434410166630354101640068765342013984054563004653115765265795555432743227203699864000000057646406679996116445551430169836556530132000000000665345357899973551361103322215554677646341663755544566763566677966147657311321000000660155462445116747737667434153155444423475354550486551556456453034212411188545315154411044345445101765101340167666663016521154220000002621168544564577104861443024443675124444444432342444365533413533143027663763444574100000375553459887157454437755334100000'},
      'na-pratica':{src:'assets/audio/pratica-media.mp3',rotulo:'a explicação sobre menu, rodízio e remarketing',convite:'🔊 Quer que eu te explique menu, rodízio e remarketing? Toca em mim.',
        /* as cenas desta faixa mudam com o porte: este áudio é o da média empresa */
        quando:function(){return (visaoAtual<0?VISAO_PADRAO:visaoAtual)===1;},
        seg:[
          [0,2.69,0,"Deixa eu te mostrar como isso funciona no dia a dia. 👀",{"f":"wave"}],
          [3.28,8.57,1,"O cliente chama e já recebe um menu com botões: vendas, suporte, financeiro. 🔘",{"f":"tick","clica":"#cfAbas button:nth-child(1)","olha":"#cfConv"}],
          [8.84,14.94,2,"Ele toca em uma opção e a conversa cai direto no setor certo, sem ninguém precisar transferir. 🎯",{"f":"nod","olha":"#cfConv"}],
          [15.31,20.16,3,"Dentro do setor, o rodízio distribui os atendimentos entre a equipe, de forma equilibrada. ⚖️",{"e":"sending","clica":"#cfAbas button:nth-child(2)","olha":"#cfConv"}],
          [20.49,25.75,4,"Você escolhe se entra só quem está online, e o atendente ainda pode ser avisado no WhatsApp dele. 🔔",{"f":"nod","olha":"#cfConv"}],
          [26.12,27.25,5,"E quando o cliente some? 👻",{"e":"searching","clica":"#cfAbas button:nth-child(3)"}],
          [27.55,29.31,5,"É só colocar uma tag na conversa. 🏷️",{"f":"tick","olha":"#cfConv"}],
          [29.61,35.61,6,"Depois do tempo que você definir, a Prisme dispara o remarketing sozinha, respeitando o seu horário de atendimento. ⏰",{"e":"sending","olha":"#cfConv"}],
          [35.94,39.68,7,"Se o cliente responder antes, você tira a tag e o envio é cancelado. ✅",{"e":"happy","f":"nod"}]],
        env:'01443362335510157751268731411671114765555433654223322110000000000162775335444489966543166684741676556666832675511552210000000223544456841000001330157762022443114655315743420000362162101122221179651059971456666111066544313881565982141256635857995145624516620488510320000433323459742441336841562154553100000038641454413513678521045697355354351026335555465157755444435565345531154203312233176342165267754431000001393355212699654105552451003883133311764369843332104688164446544234456107965417663653895555730395162598543100000043154392465635312664332100000000883378819865733884665164387610131000003923552640444132344314352134455310054004543663441001887554567841423441047644446544321174034306655416665894547346764654301000000056146663475125458697541441012651840227465059996474058446665741641658985452000000'},
      'modo-hibrido':{src:'assets/audio/custos.mp3',rotulo:'a explicação sobre Concatenador e Modo Híbrido',convite:'🔊 Quer entender o Concatenador e o Modo Híbrido? Toca em mim.',
        seg:[
          [0,6.65,0,"Agora a Meta cobra cada mensagem de serviço na API Oficial, até dentro da janela de 24 horas. 💸",{"e":"error"}],
          [7.58,10.98,1,"Para essa conta não pesar, a Prisme tem dois recursos. ✌️",{"e":"happy","f":"wave"}],
          [11.36,13.2,2,"O primeiro é o Concatenador. 🧩",{"f":"tick","clica":"#csAbas button:nth-child(2)","olha":"#csAbas button:nth-child(2)"}],
          [13.62,17.2,2,"Sua equipe escreve em rajada, e ele junta tudo em uma mensagem só. 📦",{"e":"typing","olha":"#csCena"}],
          [17.6,21.93,3,"O cliente lê do mesmo jeito, e você paga uma cobrança em vez de seis. 💰",{"e":"happy","f":"celebrate"}],
          [22.31,26.69,4,"Esse você pode ligar sem medo: continua tudo dentro da API Oficial. ✅",{"f":"nod"}],
          [27.17,28.97,5,"O segundo é o Modo Híbrido. 🔀",{"f":"tick","clica":"#csAbas button:nth-child(1)","olha":"#csAbas button:nth-child(1)"}],
          [29.36,35.78,5,"Você define um percentual, e essa parte das mensagens sai pela conexão do aplicativo, sem custo por mensagem. 🎚️",{"olha":"#csCena"}],
          [36.2,37.99,6,"Mas aqui vai um aviso sincero: ⚠️",{"e":"error","f":"shake"}],
          [38.51,39.93,6,"o híbrido é um paliativo. 🩹",{"e":"error"}],
          [40.43,44.04,7,"A conexão do aplicativo não tem as garantias da API Oficial, 🛡️",{"e":"thinking"}],
          [44.42,46.91,7,"então use com cuidado e em dose moderada. 🤏",{"f":"nod"}],
          [47.36,49.62,8,"Na dúvida, comece pelo Concatenador, 👉",{"olha":"#csAbas button:nth-child(2)"}],
          [49.87,53.47,8,"e a gente te ajuda a achar o ponto certo do híbrido para a sua operação. 🤝",{"e":"happy","f":"wave"}]],
        env:'0664689878657514325746510027954534431488658552143223411445662254353133015677631018410077424854234455365554553633443221463146554231000000000000000000000486641532663555565316532699741001072056648624556439754155114411111000000000085177468979644999202995359268576456421000000001761174451156845544764458983353113886746326500056655334634413884420079610000001624577532467855667977424444776411320001436154298573017435126368654154034487543136532000000000079931637464396465549921006534576633410000565436575100366467258553345897237646713401576431000000004414635654675531797778666776433242332000000045164531353321631454137887753100268651351487223452433115875233102651455235541115566335235122553331000002542015410415565531553322200000001452430115532544543453320156101243322100000001122121321223210442123214421111110000000432675111565631412312255246676553105777633555523354325541254452131015454310000004325445544156315445445434421445434434544535443321221000000049954666454664102994597415177636846627575667620000399655221387545557973379416533400077711526656544454155117725664017533100'},
      planos:{src:'assets/audio/planos.mp3',rotulo:'a explicação sobre os planos',convite:'🔊 Quer que eu te explique os planos? Toca em mim.',
        seg:[
          [0,2.12,0,"Aqui a gente simplificou tudo. ✨",{"f":"wave"}],
          [2.64,3.79,0,"Sem letras miúdas. 🔍",{"e":"searching"}],
          [4.24,8.27,1,"São três planos, que atendem do pequeno negócio à grande operação. 📈",{"f":"nod","olha":".jr-planos-grade, .jr-plano"}],
          [8.65,12.54,2,"Não tem fidelidade, e em até sete dias você já está no ar. 🚀",{"e":"happy","f":"celebrate"}],
          [12.98,14.89,3,"Mas o plano é só o começo. 😉",{"f":"tick"}],
          [15.29,23.12,4,"O nosso jeito de trabalhar é entrar na sua operação, entender a sua situação, implementar com você e continuar ajudando a melhorar. 🤝",{"f":"nod"}],
          [23.54,26.93,5,"A nossa cultura é humanizada e focada em resultado. 💚",{"e":"happy"}],
          [27.33,31.93,6,"Mais do que um chatbot, a Prisme é uma empresa de relacionamento e vendas. 💬",{"f":"celebrate"}],
          [32.25,34.17,7,"Quer saber qual plano combina com você? 🤔",{"e":"thinking"}],
          [34.52,37.72,7,"Toca no botão \"Saber mais\" e marca uma reunião com a gente. 👉📅",{"e":"happy","f":"wave","olha":".jr-plano button[data-plano=\"Integrador\"]"}]],
        env:'0077201577855435415539717402871000277733522000000000000666782463634654431000000000000075414558110686532200101750554444341330166443534899510442147555996777355651056332000000167520643152555358986323200156666306521116762256444558633612675578541077357887310000000255242036999443114310005674154464210011000000025871265674364414534545787422445412688545315614542001544431006825577499763145121143001554320001663877561499214546300776510043124521323468975534465565647655421000000016595351442046856513564555552246885564235105501278455636735510454222210000003589764471565378133399851111000640045664454654441686472441476741465855554316269349965445210000000003611858740187404787624545763243520577410000007953654672363301743864579754201034479833566674455347646544111000'}
    };
    var bt=document.getElementById('edSom'),cv=document.getElementById('edOndas');if(!bt||!cv||!cv.getContext)return;
    var cx=cv.getContext('2d'),atual=null,A=null,sons={},som=null,tocando=false,raf=0,amp=0,blocoV=-1,segV=-1,us=[],lado=0,conviteT=0;
    function estado(s){if(eveD){try{eveD.setState(s);}catch(e){}}}
    function rotulo(){bt.setAttribute('aria-label',(tocando?'Pausar ':'Ouvir ')+A.rotulo);bt.setAttribute('aria-pressed',tocando?'true':'false');}
    function entra(k){
      if(atual===k)return;if(atual)sai();
      atual=k;A=AUD[k];somGuarda={txt:edFala.textContent,on:dock.classList.contains('tem-fala')&&!falaTemp};somLock=true;clearTimeout(falaT);
      som=sons[k]||null;blocoV=-1;bt.tabIndex=0;
      edFala.textContent=A.convite;recolhe(k);
      dock.classList.add('tem-audio','tem-fala');rotulo();if(!raf)raf=requestAnimationFrame(quadro);
    }
    function sai(){
      if(!atual)return;
      /* saiu da seção: o áudio volta ao começo, tocando ou pausado. Vale para todo áudio cadastrado em AUD. */
      if(som){if(!som.paused)som.pause();try{som.currentTime=0;}catch(e){}}
      tocando=false;amp=0;blocoV=-1;segV=-1;
      atual=null;somLock=false;bt.tabIndex=-1;dock.classList.remove('tem-audio','tocando');
      clearTimeout(conviteT);somGuarda=null;falaTemp=false;dock.classList.remove('tem-fala');balaoBase();
    }
    /* o convite aparece por alguns segundos e depois recolhe: fica só o botão pulsando na Eve, sem cobrir a seção */
    function recolhe(k){clearTimeout(conviteT);conviteT=setTimeout(function(){if(atual===k&&!tocando&&(!som||som.currentTime===0))dock.classList.remove('tem-fala');},6500);}
    function alterna(){
      if(!atual)return;clearTimeout(conviteT);dock.classList.add('tem-fala');
      if(!som){
        som=sons[atual]=new Audio(A.src);som.preload='auto';
        som.addEventListener('play',function(){tocando=true;segV=-1;dock.classList.add('tocando');estado('speaking');rotulo();});
        som.addEventListener('pause',function(){tocando=false;dock.classList.remove('tocando');estado('idle');try{if(eveD)eveD.lookFree();}catch(e){}if(A)rotulo();});
        som.addEventListener('ended',function(){blocoV=-1;if(atual){edFala.textContent='🔁 Quer ouvir de novo? Toca em mim.';recolhe(atual);}try{if(eveD)eveD.play('nod');}catch(e){}});
        som.addEventListener('error',function(){if(atual)edFala.textContent='Não consegui carregar o áudio agora. Tenta de novo daqui a pouco.';});
      }
      if(som.paused){var p=som.play();if(p&&p.catch)p.catch(function(){if(atual)edFala.textContent='Não consegui tocar o áudio. Toca em mim de novo.';});}
      else som.pause();
    }
    /* reação do trecho: ela muda de expressão, faz um gesto, olha para o que está citando e troca a aba da cena */
    function reage(r){
      estado(r.e||'speaking');
      try{
        if(eveD){if(r.f)eveD.play(r.f);var alvo=r.olha?document.querySelector(r.olha):null;if(alvo)eveD.lookAtElement(alvo);else eveD.lookFree();}
        if(r.clica){var aba=document.querySelector(r.clica);if(aba&&aba.getAttribute('aria-selected')!=='true')aba.click();}
      }catch(e){}
    }
    /* transcrição: o balão mostra o bloco da vez e as palavras escurecem conforme são ditas */
    function transcreve(t){
      var S=A.seg,k=0;for(var i=0;i<S.length;i++)if(t>=S[i][0])k=i;
      if(k!==segV){segV=k;reage(S[k][4]||{});}
      var b=S[k][2];
      if(b!==blocoV){
        blocoV=b;var html='';
        S.forEach(function(s,i){if(s[2]===b)html+=s[3].split(' ').map(function(w){return '<u data-s="'+i+'">'+esc(w)+'</u>';}).join(' ')+' ';});
        edFala.innerHTML=html;us=[].slice.call(edFala.querySelectorAll('u'));
      }
      var doSeg=us.filter(function(u){return +u.getAttribute('data-s')===k;}),f=Math.min(1,Math.max(0,(t-S[k][0])/(S[k][1]-S[k][0]))),ate=Math.ceil(f*doSeg.length);
      us.forEach(function(u){var s=+u.getAttribute('data-s');u.classList.toggle('dito',s<k||(s===k&&doSeg.indexOf(u)<ate));});
    }
    /* ondas: barras em volta da Eve, com a altura puxada pelo volume real do áudio naquele instante */
    function quadro(agora){
      raf=0;if(!atual){cx.clearRect(0,0,cv.width,cv.height);return;}
      var r=cv.getBoundingClientRect(),d=Math.min(2,window.devicePixelRatio||1),L=Math.round(r.width*d);
      if(L&&L!==lado){lado=cv.width=cv.height=L;}
      var t=som?som.currentTime:0,alvo=0;
      if(tocando){transcreve(t);var e=A.env,i=Math.min(e.length-1,Math.floor(t*20));alvo=(+e.charAt(i)+(+e.charAt(Math.min(e.length-1,i+1))))/18;}
      amp+=(alvo-amp)*(alvo>amp?.5:.14);
      cx.clearRect(0,0,lado,lado);
      var c=lado/2,r0=lado*.262,N=54,seg=agora/1000,vivo=reduz?0:1;
      for(var n=0;n<N;n++){
        var a=n/N*Math.PI*2-Math.PI/2,onda=.55+.45*Math.sin(n*1.9+seg*5.2*vivo)*Math.cos(n*.7-seg*2.3*vivo);
        var h=lado*(.012+(tocando?.02:0)+amp*.2*Math.max(.12,onda)+(tocando?0:.008*(1+Math.sin(seg*2+n*.5)*vivo)));
        cx.strokeStyle='hsla('+(205-n/N*55)+',78%,'+(tocando?48:62)+'%,'+(tocando?.9:.45)+')';cx.lineWidth=Math.max(2,lado*.014);cx.lineCap='round';
        cx.beginPath();cx.moveTo(c+Math.cos(a)*r0,c+Math.sin(a)*r0);cx.lineTo(c+Math.cos(a)*(r0+h),c+Math.sin(a)*(r0+h));cx.stroke();
      }
      raf=requestAnimationFrame(quadro);
    }
    bt.addEventListener('click',alterna);edFala.addEventListener('click',function(){if(atual)alterna();});
    if(!('IntersectionObserver' in window))return;
    /* quem manda é a seção visível; se ela tiver condição (quando), o áudio só é oferecido enquanto a condição valer */
    var dentro={};
    function rever(){var alvo=null;Object.keys(AUD).forEach(function(k){if(!alvo&&dentro[k]&&(!AUD[k].quando||AUD[k].quando()))alvo=k;});if(alvo===atual)return;if(atual)sai();if(alvo)entra(alvo);}
    somRever=rever;
    var io=new IntersectionObserver(function(es){es.forEach(function(e){dentro[e.target.id]=e.isIntersecting;});rever();},{rootMargin:'-30% 0px -30% 0px'});
    Object.keys(AUD).forEach(function(k){var s=document.getElementById(k);if(s)io.observe(s);});
  })();

  /* símbolo ao lado do nome, nos chips e nos títulos dos módulos */
  var SV='<svg class="jr-sim" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">';
  var SIMBOLO={
    'Copiloto':SV+'<path d="M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.500A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z"/><path d="M20 3v4M22 5h-4"/></svg>',
    'API pública e webhooks':SV+'<path d="M18 16.98h-5.990c-1.100 0-1.950.940-2.480 1.900A4 4 0 0 1 2 17c.010-.700.200-1.400.570-2"/><path d="m6 17 3.130-5.780c.530-.970.100-2.180-.500-3.100a4 4 0 1 1 6.890-4.060"/><path d="m12 6 3.130 5.730C15.660 12.700 16.900 13 18 13a4 4 0 0 1 0 8"/></svg>',
    'Transcrição de áudio':SV+'<path d="M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.400 1.400 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.400 1.400 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z"/><path d="M16 9a5 5 0 0 1 0 6M19.364 18.364a9 9 0 0 0 0-12.728"/></svg>',
    'MCP':'<svg class="jr-sim" viewBox="0 0 195 195" fill="none" stroke="currentColor" stroke-width="14" stroke-linecap="round" aria-hidden="true"><path d="M25 97.8528L92.8823 29.9706C102.255 20.598 117.451 20.598 126.823 29.9706V29.9706C136.196 39.3431 136.196 54.5391 126.823 63.9117L75.5581 115.177"/><path d="M76.2653 114.47L126.823 63.9117C136.196 54.5391 151.392 54.5391 160.765 63.9117L161.118 64.2652C170.491 73.6378 170.491 88.8338 161.118 98.2063L99.7248 159.6C96.6006 162.724 96.6006 167.789 99.7248 170.913L112.331 183.52"/><path d="M109.853 46.9411L59.6482 97.1457C50.2757 106.518 50.2757 121.714 59.6482 131.087V131.087C69.0208 140.459 84.2168 140.459 93.5894 131.087L143.794 80.8822"/></svg>'
  };
  var FAMILIAS=['Atendimento','Vendas e CRM','Automação e IA','Canais e integrações'];
  /* [nome, família, títulos dos módulos de cima que já cobrem o item] */
  var TODOS=[
    ['Setores e rodízio',0,['Setores e rodízio']],['Respostas rápidas',0,['Respostas rápidas']],['Mensagem de ausência',0,['Mensagem de ausência']],
    ['Tarefas e avaliações',0,['Tarefas e avaliações']],['Carteira de clientes',0,['Carteira de clientes']],['Tags automáticas',0,[]],
    ['Permissões por perfil',0,['Permissões por perfil']],['App no celular',0,[]],['Transcrição de áudio',0,[]],
    ['CRM com funis',1,['CRM Kanban','CRM com vários funis']],['Carrinho no WhatsApp',1,['Carrinho no WhatsApp']],['Campanhas e remarketing',1,['Campanhas e remarketing']],
    ['Leads de anúncio',1,[]],['Agendamentos',1,['Agendamentos']],['Follow-up por inatividade',1,['Follow-up por inatividade']],
    ['Flowbuilder',2,['Flowbuilder']],['IA treinada',2,['IA treinada no seu negócio']],['Análise de atendimento',2,['Análise de atendimento']],['MCP',2,['MCP']],['Copiloto',2,[]],
    ['Instagram "Eu quero"',3,['Instagram "Eu quero"']],['Web Chat',3,[]],['API pública e webhooks',3,['API pública e webhooks']],['Ligações PABX e VoIP',3,[]]
  ];
  var VISAO_PADRAO=1, visaoAtual=-2, trocas=[].slice.call(document.querySelectorAll('.jr-troca')), segs=[].slice.call(document.querySelectorAll('.jr-seg button'));
  function esc(t){return String(t).replace(/&/g,'&amp;').replace(/</g,'&lt;');}
  function pintarVisao(i){
    var v=VISOES[i<0?VISAO_PADRAO:i],$=function(id){return document.getElementById(id);};
    $('jrDor').textContent='\u201C'+v.dor+'\u201D';responder(v.sub);
    montarPratica(v.prat);
    $('jrModsH').textContent='O que entra primeiro para '+NOMES[i<0?VISAO_PADRAO:i]+'.';
    $('jrMods').innerHTML=v.mods.map(function(m){return '<div><h3>'+esc(m[0])+(SIMBOLO[m[0]]||'')+(m[2]?'<em>conforme o plano</em>':'')+'</h3><p>'+esc(m[1])+'</p></div>';}).join('');
    /* a lista completa aparece para todo porte, colorida por família; some só o que já está nos seis de cima */
    var tem=v.mods.map(function(m){return m[0];});
    $('jrExtras').innerHTML='<span>Também disponível:</span>'+TODOS.filter(function(t){return !t[2].some(function(x){return tem.indexOf(x)>=0;});}).map(function(t){return '<i data-f="'+t[1]+'">'+esc(t[0])+(SIMBOLO[t[0]]||'')+'</i>';}).join('')+
      '<p class="jr-leg">'+FAMILIAS.map(function(f,k){return '<b data-f="'+k+'">'+f+'</b>';}).join('')+'</p>';
    $('jrCustoH').textContent=v.custo;
    $('jrAviso').textContent=i<0?'Você ainda não escolheu um porte. Por enquanto a página mostra a leitura de média empresa.':'';
    segs.forEach(function(b,n){b.setAttribute('aria-pressed',n===i?'true':'false');});
  }
  function mostrarVisao(i){
    if(i===visaoAtual)return;var primeira=visaoAtual===-2;visaoAtual=i;if(somRever)somRever();
    if(primeira||reduz){pintarVisao(i);return;}
    trocas.forEach(function(t){t.classList.add('saindo');});
    setTimeout(function(){pintarVisao(visaoAtual);trocas.forEach(function(t){t.classList.remove('saindo');});},220);
  }
  mostrarVisao(-1);
  segs.forEach(function(b,n){b.addEventListener('click',function(){escolher(n);});});
  var fino=window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  ops.forEach(function(b,i){
    if(fino){b.addEventListener('pointerenter',function(){apontar(i);});}
    b.addEventListener('focus',function(){apontar(i);});
    b.addEventListener('click',function(){escolher(porte===i?-1:i);});
  });
  pm.querySelector('.pm-opcoes').addEventListener('pointerleave',function(){apontar(-1);});
  /* a cena 3D só é baixada quando o módulo está chegando na tela */
  var carregou=false;
  function carregar3d(){
    if(carregou)return;carregou=true;
    import(new URL('assets/3d/cena-porte.js?v=ab40432e',document.baseURI).href).then(function(m){cena3d=m.iniciar(document.getElementById('pmCanvas'));if(porte>=0)cena3d.escolher(porte);})
      .catch(function(){pm.classList.add('sem-3d');});
  }
  if('IntersectionObserver' in window){var io3=new IntersectionObserver(function(es){if(es[0].isIntersecting){carregar3d();io3.disconnect();}},{rootMargin:'700px'});io3.observe(pm);}
  else carregar3d();

  /* todo botão com data-agendar abre o agendamento */
  [].forEach.call(document.querySelectorAll('[data-agendar]'),function(ag){ag.addEventListener('click',function(){if(typeof window.toggleScheduler==='function')window.toggleScheduler();});});
})();
