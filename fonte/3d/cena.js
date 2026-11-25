/* Cena 3D "Foi feito pra mim?": três portes de empresa lado a lado, um personagem que anda
   entre eles e troca de roupa, nuvens e pedras de caminho. O cenário é geometria gerada aqui;
   as pessoas usam dois modelos com esqueleto (boneco-dados.js e mulher-dados.js). API: iniciar(el) -> { apontar(i|-1), escolher(i|-1), destruir() } */
import {
  Scene, PerspectiveCamera, WebGLRenderer, HemisphereLight, DirectionalLight, Group, Mesh,
  MeshStandardMaterial, BoxGeometry, CylinderGeometry, SphereGeometry, CapsuleGeometry, ConeGeometry,
  RingGeometry, PlaneGeometry, ShadowMaterial, Color, Vector3, PCFSoftShadowMap, SRGBColorSpace, MathUtils, AnimationMixer, LoopOnce, Box3,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as clonarEsqueleto } from 'three/examples/jsm/utils/SkeletonUtils.js';

const COR = {
  parede: 0xffffff, creme: 0xf6f1e7, nevoa: 0xe6ebe8, verde: 0x16c172, verdeClaro: 0xa9e8c8, verdeFundo: 0x0e8a52,
  azul: 0x22b3e0, azulFundo: 0x1766d8, vidro: 0xbfe3f5, tinta: 0x23272b, madeira: 0xdcb98f, piso: 0xecdcc4,
  ilha: 0xf4f9f5, ilhaLado: 0xd3e6da, folha: 0x57c491, folhaClara: 0x8fdcb6, tronco: 0xb98d62, pele: 0xf0c9a4,
  cabelo: 0x3a2a20, jeans: 0x2f5488, cinza: 0x5b6770, luz: 0xffe7a6, pedra: 0xe3e9e5, nuvem: 0xffffff,
};
const X = [-9.6, 0, 9.6];          // centro de cada porte
const Z_CAMINHO = 3.0;

const mats = new Map();
function mat(cor, extra) {
  const k = cor + JSON.stringify(extra || {});
  if (!mats.has(k)) mats.set(k, new MeshStandardMaterial({ color: cor, roughness: 0.82, metalness: 0, ...extra }));
  return mats.get(k);
}
function peca(geo, m, x, y, z, pai, sombra = true) {
  const o = new Mesh(geo, m); o.position.set(x, y, z); o.castShadow = sombra; o.receiveShadow = true; pai.add(o); return o;
}
const caixa = (w, h, d, m, x, y, z, pai, s) => peca(new BoxGeometry(w, h, d), m, x, y, z, pai, s);
const cil = (r, h, m, x, y, z, pai, seg = 20, s) => peca(new CylinderGeometry(r, r, h, seg), m, x, y, z, pai, s);
const bola = (r, m, x, y, z, pai, s) => peca(new SphereGeometry(r, 20, 14), m, x, y, z, pai, s);

function arvore(pai, x, z, e = 1) {
  const g = new Group(); g.position.set(x, 0, z); g.scale.setScalar(e); pai.add(g);
  cil(0.1, 0.7, mat(COR.tronco), 0, 0.35, 0, g, 8);
  bola(0.55, mat(COR.folha), 0, 1.05, 0, g);
  bola(0.4, mat(COR.folhaClara), 0.18, 1.5, 0.05, g);
  g.userData.arvore = x * 1.7 + z;
  return g;
}
const figurantes = [];
/* papel: tipo 'h' (modelo de terno) ou 'm' (modelo feminino), o que carrega e como circula */
function gente(pai, x, z, corRoupa, e = 0.62, papel = {}) {
  const g = new Group(); g.position.set(x, 0, z); g.scale.setScalar(e); pai.add(g); figurantes.push({ g, cor: corRoupa, papel });
  peca(new CapsuleGeometry(0.26, 0.5, 4, 10), mat(corRoupa), 0, 0.75, 0, g);
  bola(0.24, mat(COR.pele), 0, 1.38, 0, g);
  return g;
}
/* o que as pessoas carregam: fica pendurado na mão, sempre na vertical */
function sacola(cor, alca) {
  const g = new Group();
  caixa(0.25, 0.29, 0.11, mat(cor), 0, -0.24, 0, g);
  caixa(0.25, 0.035, 0.115, mat(alca), 0, -0.13, 0, g, false);
  caixa(0.012, 0.1, 0.012, mat(alca), -0.06, -0.05, 0, g, false); caixa(0.012, 0.1, 0.012, mat(alca), 0.06, -0.05, 0, g, false);
  return g;
}
function pasta() {
  const g = new Group();
  caixa(0.34, 0.23, 0.08, mat(0x3b2f2a), 0, -0.2, 0, g);
  caixa(0.1, 0.03, 0.085, mat(0xd8b46a, { metalness: 0.3, roughness: 0.5 }), 0, -0.12, 0, g, false);
  caixa(0.12, 0.022, 0.022, mat(COR.tinta), 0, -0.065, 0, g, false);
  return g;
}
function cachorro() {
  const g = new Group(), pelo = mat(0xd9a05b), escuro = mat(0x9a6a3c), parte = (pai, x, y, z) => { const p = new Group(); p.position.set(x, y, z); pai.add(p); return p; };
  caixa(0.2, 0.2, 0.46, pelo, 0, 0.31, 0, g);
  caixa(0.205, 0.045, 0.05, mat(COR.verde), 0, 0.37, 0.19, g, false);
  const cabeca = parte(g, 0, 0.46, 0.27);
  caixa(0.19, 0.18, 0.2, pelo, 0, 0, 0, cabeca); caixa(0.1, 0.085, 0.1, escuro, 0, -0.04, 0.14, cabeca, false); caixa(0.045, 0.04, 0.03, mat(COR.tinta), 0, -0.01, 0.195, cabeca, false);
  caixa(0.05, 0.12, 0.07, escuro, -0.105, 0.03, -0.03, cabeca, false); caixa(0.05, 0.12, 0.07, escuro, 0.105, 0.03, -0.03, cabeca, false);
  caixa(0.025, 0.03, 0.01, mat(COR.tinta), -0.05, 0.03, 0.101, cabeca, false); caixa(0.025, 0.03, 0.01, mat(COR.tinta), 0.05, 0.03, 0.101, cabeca, false);
  const patas = [[-0.07, 0.17], [0.07, 0.17], [-0.07, -0.17], [0.07, -0.17]].map(([x, z]) => { const p = parte(g, x, 0.22, z); caixa(0.06, 0.22, 0.06, pelo, 0, -0.11, 0, p); return p; });
  const rabo = parte(g, 0, 0.39, -0.22); caixa(0.04, 0.04, 0.2, pelo, 0, 0.06, -0.07, rabo, false).rotation.x = 0.7;
  return { g, cabeca, patas, rabo };
}
function ilha(pai) {
  cil(4.3, 0.5, mat(COR.ilha), 0, -0.25, 0, pai, 56, false);
  cil(3.9, 0.5, mat(COR.ilhaLado), 0, -0.7, 0, pai, 56, false);
  const anel = new Mesh(new RingGeometry(3.95, 4.3, 64), new MeshStandardMaterial({ color: COR.verdeClaro, transparent: true, opacity: 0, roughness: 1 }));
  anel.rotation.x = -Math.PI / 2; anel.position.y = 0.012; anel.userData.fixo = true; pai.add(anel);
  return anel;
}

/* ---------- pequeno: sala em corte, só mesa, cadeira e computador ---------- */
function pequeno(g) {
  caixa(3.8, 0.12, 3.1, mat(COR.piso), 0, 0.06, -0.2, g);
  caixa(3.8, 2.5, 0.14, mat(COR.parede), 0, 1.25, -1.75, g);
  caixa(0.14, 2.5, 3.1, mat(COR.creme), -1.9, 1.25, -0.2, g);
  caixa(1.1, 0.8, 0.05, mat(COR.vidro, { roughness: 0.2 }), 1.0, 1.6, -1.66, g, false);
  caixa(1.0, 0.07, 0.26, mat(COR.madeira), -0.95, 1.7, -1.56, g);
  caixa(0.12, 0.3, 0.2, mat(COR.verde), -1.25, 1.88, -1.56, g);
  caixa(0.1, 0.24, 0.2, mat(COR.azul), -1.1, 1.85, -1.56, g);
  caixa(0.12, 0.28, 0.2, mat(COR.luz), -0.95, 1.87, -1.56, g);
  cil(0.95, 0.02, mat(COR.nevoa), 0.25, 0.13, 0.0, g, 28, false);
  caixa(1.7, 0.08, 0.8, mat(COR.madeira), 0.25, 0.8, -0.85, g);
  for (const [dx, dz] of [[-0.78, -0.33], [0.78, -0.33], [-0.78, 0.33], [0.78, 0.33]]) caixa(0.06, 0.74, 0.06, mat(COR.madeira), 0.25 + dx, 0.41, -0.85 + dz, g);
  caixa(0.78, 0.5, 0.05, mat(COR.tinta), 0.25, 1.26, -1.05, g);
  caixa(0.7, 0.42, 0.02, mat(COR.azul, { emissive: new Color(COR.azul), emissiveIntensity: 0.35 }), 0.25, 1.26, -1.02, g, false);
  caixa(0.08, 0.2, 0.08, mat(COR.tinta), 0.25, 0.94, -1.05, g);
  caixa(0.52, 0.03, 0.18, mat(COR.nevoa), 0.25, 0.86, -0.66, g);
  caixa(0.5, 0.08, 0.5, mat(COR.azulFundo), 0.25, 0.52, 0.0, g);
  caixa(0.5, 0.56, 0.08, mat(COR.azulFundo), 0.25, 0.84, 0.25, g);
  cil(0.04, 0.4, mat(COR.tinta), 0.25, 0.3, 0.0, g, 8);
  cil(0.24, 0.04, mat(COR.tinta), 0.25, 0.14, 0.0, g, 12);
  cil(0.2, 0.34, mat(COR.creme), -1.35, 0.29, -1.2, g, 14);
  bola(0.38, mat(COR.folha), -1.35, 0.78, -1.2, g);
  arvore(g, 2.9, -1.4, 0.95);
}

/* ---------- médio: farmácia / loja de rua ---------- */
function medio(g) {
  caixa(5.2, 2.8, 3.2, mat(COR.parede), 0, 1.4, -0.4, g);
  caixa(5.5, 0.18, 3.5, mat(COR.nevoa), 0, 2.89, -0.4, g);
  caixa(3.4, 0.78, 0.14, mat(COR.parede), 0, 3.38, 1.1, g);
  caixa(3.6, 0.1, 0.2, mat(COR.verde), 0, 2.99, 1.1, g);
  cil(0.3, 0.06, mat(COR.verde), -1.2, 3.4, 1.19, g, 24).rotation.x = Math.PI / 2;
  caixa(0.34, 0.11, 0.05, mat(COR.parede), -1.2, 3.4, 1.23, g, false);
  caixa(0.11, 0.34, 0.05, mat(COR.parede), -1.2, 3.4, 1.23, g, false);
  caixa(1.5, 0.12, 0.04, mat(COR.tinta), 0.35, 3.47, 1.19, g, false);
  caixa(1.0, 0.09, 0.04, mat(COR.nevoa), 0.1, 3.27, 1.19, g, false);
  for (let i = 0; i < 6; i++) {
    const f = caixa(5.2 / 6, 0.06, 1.0, mat(i % 2 ? COR.parede : COR.verde), -2.6 + (i + 0.5) * (5.2 / 6), 2.38, 1.62, g);
    f.rotation.x = 0.42; f.userData.toldo = i;
  }
  caixa(2.4, 1.4, 0.06, mat(COR.vidro, { roughness: 0.15, transparent: true, opacity: 0.8 }), -1.0, 1.25, 1.22, g, false);
  caixa(2.5, 0.08, 0.12, mat(COR.nevoa), -1.0, 0.5, 1.24, g);
  for (let i = 0; i < 5; i++) caixa(0.26, 0.3 + (i % 2) * 0.12, 0.2, mat([COR.verde, COR.azul, COR.luz, COR.verdeFundo, COR.azulFundo][i]), -1.85 + i * 0.42, 0.75 + (i % 2) * 0.06, 1.05, g, false);
  caixa(2.2, 0.05, 0.3, mat(COR.parede), -1.0, 1.25, 1.05, g, false);
  for (let i = 0; i < 4; i++) caixa(0.2, 0.26, 0.2, mat([COR.azul, COR.verde, COR.parede, COR.luz][i]), -1.7 + i * 0.5, 1.42, 1.05, g, false);
  caixa(1.05, 2.0, 0.06, mat(COR.vidro, { roughness: 0.15, transparent: true, opacity: 0.85 }), 1.5, 1.0, 1.22, g, false);
  caixa(0.05, 0.4, 0.05, mat(COR.tinta), 1.12, 1.05, 1.27, g, false);
  caixa(1.2, 0.36, 0.4, mat(COR.creme), -3.05, 0.18, 1.7, g);
  bola(0.3, mat(COR.folha), -3.3, 0.55, 1.7, g); bola(0.26, mat(COR.folhaClara), -2.85, 0.52, 1.7, g);
  cil(0.05, 2.3, mat(COR.tinta), 3.2, 1.15, 1.9, g, 8); bola(0.16, mat(COR.luz, { emissive: new Color(COR.luz), emissiveIntensity: 0.5 }), 3.2, 2.36, 1.9, g, false);
  /* rua de comércio: quem saiu das compras e quem passeia com o cachorro */
  gente(g, 2.3, 2.3, 0xff8f6b, 0.6, { tipo: 'm', item: 'sacolas', passeio: 1, calca: 0x3f6aa8, cabelo: 0x5a3b28, pele: 0xe7b48c, sapato: 0xffffff });
  gente(g, -1.6, 2.75, 0xf5c451, 0.6, { tipo: 'm', item: 'cao', passeio: 1, calca: 0x5b6770, cabelo: 0x2a2320, pele: 0xc68a5c, sapato: 0xf2f2f2 });
  gente(g, 0.2, 2.5, COR.azul, 0.6, { tipo: 'm', item: 'sacola', passeio: 1, calca: 0xf1f1ee, cabelo: 0xd1c270, pele: 0xf2cba6, sapato: 0x16c172 });
  gente(g, -2.4, 2.3, 0xe4ebe7, 0.6, { tipo: 'h', item: 'sacola', passeio: 1, calca: 0x2f5488, gravata: 0xffffff, pele: 0x9c6b44 });
  arvore(g, -3.1, -1.6, 1.1);
}

/* ---------- grande: prédio com várias pessoas ---------- */
function grande(g) {
  caixa(4.6, 1.2, 3.6, mat(COR.nevoa), 0.3, 0.6, -0.5, g);
  caixa(3.2, 5.3, 3.0, mat(0xf4f7f9), 0.6, 3.85, -0.6, g);
  caixa(1.9, 3.3, 2.4, mat(COR.parede), -1.7, 2.85, -0.7, g);
  caixa(3.4, 0.16, 3.2, mat(COR.nevoa), 0.6, 6.58, -0.6, g);
  caixa(0.8, 0.4, 0.7, mat(COR.nevoa), 1.3, 6.86, -0.9, g); caixa(0.5, 0.3, 0.5, mat(COR.cinza), 0.1, 6.81, -0.2, g);
  cil(0.03, 1.0, mat(COR.tinta), 1.7, 7.15, -1.6, g, 6); bola(0.07, mat(COR.verde, { emissive: new Color(COR.verde), emissiveIntensity: 0.8 }), 1.7, 7.66, -1.6, g, false);
  const acesa = (i, j) => ((i * 7 + j * 13) % 5 === 0);
  for (let j = 0; j < 7; j++) for (let i = 0; i < 4; i++)
    caixa(0.5, 0.48, 0.05, acesa(i, j) ? mat(COR.luz, { emissive: new Color(COR.luz), emissiveIntensity: 0.45 }) : mat(COR.vidro, { roughness: 0.2 }), 0.6 - 1.05 + i * 0.7, 1.75 + j * 0.66, 0.91, g, false);
  for (let j = 0; j < 7; j++) for (let i = 0; i < 3; i++)
    caixa(0.05, 0.48, 0.5, mat(COR.vidro, { roughness: 0.2 }), -1.01, 1.75 + j * 0.66, -1.4 + i * 0.8, g, false);
  for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++)
    caixa(0.5, 0.46, 0.05, acesa(i + 2, j + 1) ? mat(COR.luz, { emissive: new Color(COR.luz), emissiveIntensity: 0.45 }) : mat(COR.vidro, { roughness: 0.2 }), -2.05 + i * 0.7, 1.75 + j * 0.66, 0.51, g, false);
  caixa(1.5, 0.95, 0.06, mat(COR.vidro, { roughness: 0.15, transparent: true, opacity: 0.85 }), 0.6, 0.5, 1.31, g, false);
  caixa(2.1, 0.1, 0.9, mat(COR.verde), 0.6, 1.3, 1.7, g);
  cil(0.05, 1.25, mat(COR.cinza), -0.3, 0.63, 2.05, g, 8); cil(0.05, 1.25, mat(COR.cinza), 1.5, 0.63, 2.05, g, 8);
  /* entrada corporativa: terno, blazer e pasta na mão */
  gente(g, 2.4, 2.3, 0x23272b, 0.6, { tipo: 'h', item: 'pasta', calca: 0x23272b, gravata: COR.verde, pele: 0xe7b48c });
  gente(g, -1.3, 2.6, 0x23272b, 0.6, { tipo: 'm', item: 'pasta', calca: 0x23272b, cabelo: 0x4a3024, pele: 0xf2cba6, sapato: 0x141516 });
  gente(g, 0.9, 2.8, 0x27364f, 0.6, { tipo: 'h', item: 'pasta', calca: 0x27364f, gravata: COR.azul, pele: 0x9c6b44 });
  gente(g, -2.3, 2.3, 0xf4f4f1, 0.6, { tipo: 'm', item: 'pasta', calca: 0x27364f, cabelo: 0x231c19, pele: 0xc68a5c, sapato: 0x141516 });
  gente(g, 1.7, 2.5, 0x6c757d, 0.6, { tipo: 'h', calca: 0x6c757d, gravata: 0x23272b, pele: 0xf2cba6 });
  arvore(g, -3.3, -1.3, 1.0); arvore(g, 3.4, -1.0, 0.8);
}

/* ---------- personagem ---------- */
function personagem() {
  const g = new Group(), corpo = new Group(); g.add(corpo);
  const mCorpo = new MeshStandardMaterial({ color: COR.azul, roughness: 0.8 }), mPerna = new MeshStandardMaterial({ color: COR.jeans, roughness: 0.85 });
  const perna = (x) => { const p = new Group(); p.position.set(x, 0.56, 0); corpo.add(p); peca(new CapsuleGeometry(0.11, 0.34, 4, 8), mPerna, 0, -0.28, 0, p); return p; };
  const braco = (x) => { const p = new Group(); p.position.set(x, 1.06, 0); corpo.add(p); peca(new CapsuleGeometry(0.085, 0.3, 4, 8), mCorpo, 0, -0.22, 0, p); return p; };
  const pe = perna(-0.14), pd = perna(0.14), be = braco(-0.37), bd = braco(0.37);
  peca(new CapsuleGeometry(0.27, 0.34, 4, 12), mCorpo, 0, 0.84, 0, corpo);
  bola(0.25, mat(COR.pele), 0, 1.44, 0, corpo);
  const cab = peca(new SphereGeometry(0.265, 20, 12, 0, Math.PI * 2, 0, Math.PI * 0.55), mat(COR.cabelo), 0, 1.47, -0.02, corpo);
  cab.rotation.x = -0.25;
  bola(0.034, mat(COR.tinta), -0.09, 1.46, 0.225, corpo, false); bola(0.034, mat(COR.tinta), 0.09, 1.46, 0.225, corpo, false);
  /* acessórios por traje */
  const jaleco = new Group(); corpo.add(jaleco);
  peca(new CylinderGeometry(0.29, 0.34, 0.3, 16), mat(COR.parede), 0, 0.55, 0, jaleco);
  caixa(0.13, 0.045, 0.03, mat(COR.verde), 0.12, 0.98, 0.265, jaleco, false); caixa(0.045, 0.13, 0.03, mat(COR.verde), 0.12, 0.98, 0.265, jaleco, false);
  const terno = new Group(); corpo.add(terno);
  caixa(0.14, 0.26, 0.03, mat(COR.parede), 0, 0.98, 0.262, terno, false);
  caixa(0.05, 0.24, 0.03, mat(COR.verde), 0, 0.96, 0.275, terno, false);
  const pasta = caixa(0.3, 0.22, 0.09, mat(COR.madeira), 0, -0.5, 0.02, bd);
  const TRAJES = [
    { corpo: COR.azul, perna: COR.jeans, jaleco: false, terno: false },
    { corpo: COR.parede, perna: COR.cinza, jaleco: true, terno: false },
    { corpo: COR.tinta, perna: COR.tinta, jaleco: false, terno: true },
  ];
  function vestir(i) {
    const t = TRAJES[i]; mCorpo.color.setHex(t.corpo); mPerna.color.setHex(t.perna);
    jaleco.visible = t.jaleco; terno.visible = t.terno; pasta.visible = t.terno;
  }
  vestir(0);
  return { g, corpo, pe, pd, be, bd, vestir };
}

/* ---------- ator: personagem com esqueleto e animações (Quaternius, CC0) ---------- */
const TRAJES_ATOR = [
  { Suit: 0x22b3e0, Calca: 0x2f5488, White: 0xffffff, Tie: 0xffffff, Black: 0xf2f2f2 },
  { Suit: 0xffffff, Calca: 0x8a949b, White: 0xd9f5e6, Tie: 0x16c172, Black: 0x3b4046 },
  { Suit: 0x23272b, Calca: 0x23272b, White: 0xffffff, Tie: 0x16c172, Black: 0x141516 },
];
function prepararModelo(cena, altura) {
  const mats = {};
  cena.traverse((o) => {
    if (!o.isMesh) return;
    o.castShadow = true; o.receiveShadow = false; o.frustumCulled = false;
    const lista = Array.isArray(o.material) ? o.material : [o.material];
    const novos = lista.map((m) => {
      const nome = o.name.indexOf('Legs') >= 0 && m.name === 'Suit' ? 'Calca' : m.name;
      if (!mats[nome]) { mats[nome] = m.clone(); mats[nome].name = nome; mats[nome].roughness = 0.78; mats[nome].metalness = 0; }
      return mats[nome];
    });
    o.material = Array.isArray(o.material) ? novos : novos[0];
  });
  /* mede já com o esqueleto aplicado: numa cópia recém-clonada os ossos ainda não foram calculados */
  cena.updateMatrixWorld(true); cena.traverse((o) => { if (o.isSkinnedMesh) { o.skeleton.update(); o.computeBoundingBox(); } });
  const cx = new Box3().setFromObject(cena), h = cx.max.y - cx.min.y || 1;
  cena.scale.multiplyScalar(altura / h); cena.position.y = -cx.min.y * (altura / h);
  return mats;
}
function criarAtor(gltf, altura) {
  const g = new Group(), corpo = new Group(); g.add(corpo); corpo.add(gltf.scene);
  const mats = prepararModelo(gltf.scene, altura);
  if (mats.Skin) mats.Skin.color.setHex(0xe7b48c);
  const mixer = new AnimationMixer(gltf.scene), acoes = {};
  for (const c of gltf.animations) acoes[c.name] = mixer.clipAction(c);
  let atual = null;
  function tocar(nome, { uma = false, fade = 0.22 } = {}) {
    const a = acoes[nome]; if (!a || a === atual) return;
    a.reset(); a.setLoop(uma ? LoopOnce : 2201, uma ? 1 : Infinity); a.clampWhenFinished = uma; a.fadeIn(fade).play();
    if (atual) atual.fadeOut(fade); atual = a;
  }
  function vestir(i) { const t = TRAJES_ATOR[i]; for (const k in t) if (mats[k]) mats[k].color.setHex(t[k]); }
  vestir(0); tocar('Idle', { fade: 0 });
  return { g, corpo, mixer, tocar, vestir, acoes, nomeAtual: () => (atual ? atual.getClip().name : ''), tocando: () => atual && atual.isRunning() };
}

/* quem cruza o céu de tempos em tempos */
function aviao() {
  const g = new Group(), branco = mat(0xffffff), verde = mat(COR.verde);
  const corpo = peca(new CapsuleGeometry(0.17, 1.0, 4, 12), verde, 0, 0, 0, g, false); corpo.rotation.z = Math.PI / 2;
  const bico = peca(new ConeGeometry(0.1, 0.16, 12), branco, 0.74, 0, 0, g, false); bico.rotation.z = -Math.PI / 2;
  caixa(0.36, 0.04, 1.9, branco, 0.08, -0.03, 0, g, false); caixa(0.2, 0.045, 0.3, verde, 0.08, -0.03, 0.82, g, false); caixa(0.2, 0.045, 0.3, verde, 0.08, -0.03, -0.82, g, false);
  caixa(0.2, 0.035, 0.66, branco, -0.58, 0.04, 0, g, false);
  const leme = caixa(0.26, 0.3, 0.04, verde, -0.6, 0.2, 0, g, false); leme.rotation.z = 0.35;
  caixa(0.3, 0.09, 0.345, mat(COR.vidro, { roughness: 0.2 }), 0.34, 0.09, 0, g, false);
  const helice = new Group(); helice.position.set(0.83, 0, 0); g.add(helice); caixa(0.02, 0.5, 0.05, mat(COR.cinza), 0, 0, 0, helice, false);
  g.traverse((o) => { o.receiveShadow = false; });
  return { g, helice };
}
function balao() {
  const g = new Group();
  for (let i = 0; i < 10; i++) { const gomo = peca(new SphereGeometry(0.95, 3, 14, (i / 10) * Math.PI * 2, Math.PI / 5), mat(i % 2 ? 0xffffff : COR.verde), 0, 1.5, 0, g, false); gomo.scale.y = 1.14; }
  const boca = peca(new CylinderGeometry(0.34, 0.2, 0.3, 14, 1, true), mat(COR.verdeFundo), 0, 0.42, 0, g, false); boca.material.side = 2;
  for (const [x, z] of [[-0.15, -0.15], [0.15, -0.15], [-0.15, 0.15], [0.15, 0.15]]) cil(0.008, 0.5, mat(COR.cinza), x, 0.05, z, g, 4, false);
  caixa(0.34, 0.24, 0.34, mat(COR.madeira), 0, -0.3, 0, g, false); caixa(0.37, 0.05, 0.37, mat(COR.tronco), 0, -0.18, 0, g, false);
  g.traverse((o) => { o.receiveShadow = false; });
  return { g };
}
function nuvem(pai, x, y, z, e) {
  const g = new Group(); g.position.set(x, y, z); g.scale.setScalar(e); pai.add(g);
  const m = new MeshStandardMaterial({ color: COR.nuvem, roughness: 1, transparent: true, opacity: 0.96 });
  for (const [dx, dy, r] of [[0, 0, 1], [1.0, -0.1, 0.78], [-1.05, -0.15, 0.7], [0.4, 0.42, 0.72], [-0.45, 0.3, 0.6]]) { const b = bola(r, m, dx, dy, 0, g, false); b.receiveShadow = false; b.scale.y = 0.72; }
  return g;
}

/* Cada lote tem os próprios materiais, guardados com a cor original e a versão em cinza:
   sem foco o lote fica monocromático e parado; com foco ganha cor e movimento. */
function tingir(lista, obj, clonar) {
  const feitos = new Map();
  obj.traverse((o) => {
    if (!o.isMesh || o.userData.fixo) return;
    const troca = (m) => {
      if (!feitos.has(m)) {
        const n = clonar ? m.clone() : m, c = n.color, l = Math.min(1, (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) * 0.86 + 0.1);
        feitos.set(m, n); lista.push({ m: n, cor: c.clone(), cinza: new Color(l, l, l), ei: n.emissiveIntensity || 0, fase: lista.length });
      }
      return feitos.get(m);
    };
    o.material = Array.isArray(o.material) ? o.material.map(troca) : troca(o.material);
  });
}

export function iniciar(el) {
  const reduz = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const renderer = new WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
  renderer.outputColorSpace = SRGBColorSpace; renderer.shadowMap.enabled = true; renderer.shadowMap.type = PCFSoftShadowMap;
  renderer.domElement.style.cssText = 'display:block;width:100%;height:100%';
  el.appendChild(renderer.domElement);
  const cena = new Scene(), cam = new PerspectiveCamera(28, 2, 0.1, 200);
  cena.add(new HemisphereLight(0xffffff, 0xdcebe2, 1.75));
  const sol = new DirectionalLight(0xfff3df, 2.5); sol.position.set(-9, 16, 12); sol.castShadow = true;
  sol.shadow.mapSize.set(window.innerWidth < 800 ? 1024 : 2048, window.innerWidth < 800 ? 1024 : 2048);
  Object.assign(sol.shadow.camera, { left: -18, right: 18, top: 14, bottom: -8, near: 1, far: 50 }); sol.shadow.bias = -0.0006; sol.shadow.radius = 5;
  cena.add(sol);
  const chao = new Mesh(new PlaneGeometry(60, 30), new ShadowMaterial({ opacity: 0.06 })); chao.rotation.x = -Math.PI / 2; chao.position.y = -0.96; chao.receiveShadow = true; cena.add(chao);

  const lotes = [], aneis = [], tintas = [], vivos = [], cor = [0, 0, 0];
  [pequeno, medio, grande].forEach((monta, i) => {
    const g = new Group(); g.position.x = X[i]; cena.add(g); aneis.push(ilha(g)); monta(g); lotes.push(g);
    tintas.push([]); tingir(tintas[i], g, true);
    const arv = [], toldo = []; g.traverse((o) => { if (o.userData.arvore !== undefined) arv.push(o); if (o.userData.toldo !== undefined) toldo.push(o); }); vivos.push({ arv, toldo });
  });
  /* pedras do caminho: é nelas que o destaque verde aparece */
  const pedras = [];
  for (let x = -12.4; x <= 12.41; x += 0.8) {
    const m = new MeshStandardMaterial({ color: COR.pedra, roughness: 0.9 });
    const p = peca(new CylinderGeometry(0.19, 0.19, 0.07, 18), m, x, 0.035, Z_CAMINHO, cena, false);
    const naIlha = X.some((c) => Math.abs(x - c) < 4.0);
    if (!naIlha) { p.position.y = -0.2; p.scale.set(1.7, 4, 1.7); }
    pedras.push({ p, m, x, alvo: new Color(COR.pedra) });
  }
  const pino = new Group(); pino.visible = false; cena.add(pino);
  bola(0.34, mat(COR.verde, { emissive: new Color(COR.verde), emissiveIntensity: 0.35 }), 0, 0.5, 0, pino, false);
  peca(new ConeGeometry(0.22, 0.5, 16), mat(COR.verde), 0, 0.05, 0, pino, false).rotation.x = Math.PI;

  const nuvens = [[-11, 7.4, -5, 1.1, 0.22], [-3.5, 8.0, -7, 1.35, 0.14], [4.2, 7.0, -4, 0.9, 0.26], [15, 8.1, -8, 1.2, 0.17], [-17, 6.6, -3, 0.8, 0.3], [-6.2, 6.0, -2.5, 0.58, 0.34]]
    .map(([x, y, z, e, v]) => ({ g: nuvem(cena, x, y, z, e), v }));

  /* céu: um avião ou um balão por vez, com intervalo entre as passagens */
  const voo = { av: aviao(), ba: balao(), quem: null, espera: 2.5, dir: 1, vez: 0, y: 8, t: 0 };
  voo.av.g.visible = false; voo.ba.g.visible = false; cena.add(voo.av.g, voo.ba.g);

  const boneco = personagem(); boneco.g.position.set(X[0] + 1.2, 0, Z_CAMINHO); cena.add(boneco.g);
  boneco.g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  /* o modelo animado entra por cima do boneco simples assim que carrega */
  let ator = null, gesto = 0, festa = -1; const extras = [];
  /* na prévia o modelo vem embutido num módulo; no site pode ser o arquivo boneco.glb direto */
  const ler = (m) => new Promise((ok, erro) => { const bin = Uint8Array.from(atob(m.default), (c) => c.charCodeAt(0)); new GLTFLoader().parse(bin.buffer, '', ok, erro); });
  const v3 = new Vector3(), v3b = new Vector3();
  Promise.all([import('./boneco-dados.js').then(ler), import('./mulher-dados.js').then(ler).catch(() => null)]).then(([gltf, dama]) => {
    if (!vivo) return;
    const estreito = (el.clientWidth || 0) < 760, porLote = [0, 0, 0], teto = estreito ? [0, 2, 3] : [9, 9, 9];
    figurantes.forEach((f, i) => {
      f.g.clear();
      const lote = lotes.indexOf(f.g.parent), pp = f.papel; if (lote < 0 || porLote[lote]++ >= teto[lote]) return;
      const ela = pp.tipo === 'm' && dama, base = ela ? dama : gltf, copia = clonarEsqueleto(base.scene), m = prepararModelo(copia, ela ? 1.5 : 1.58);
      if (ela) {
        m.Blusa.color.setHex(f.cor); m.Calca.color.setHex(pp.calca); m.Cabelo.color.setHex(pp.cabelo); m.Pele.color.setHex(pp.pele); m.Sapato.color.setHex(pp.sapato); m.Olho.color.setHex(0x2a2320);
      } else {
        if (m.Suit) m.Suit.color.setHex(f.cor); if (m.Calca) m.Calca.color.setHex(pp.calca || 0x2f5488);
        if (m.Tie) m.Tie.color.setHex(pp.gravata === undefined ? 0xffffff : pp.gravata); if (m.White) m.White.color.setHex(0xffffff); if (m.Skin) m.Skin.color.setHex(pp.pele || 0xe7b48c);
      }
      f.g.scale.setScalar(1); f.g.add(copia);
      const mx2 = new AnimationMixer(copia), ac = {};
      for (const c of base.animations) { const n = c.name === 'Walking' ? 'Walk' : c.name; if (n === 'Idle' || n === 'Walk' || n === 'Wave' || n === 'Interact') ac[n] = mx2.clipAction(c); }
      ac.Idle.time = i * 0.7; ac.Idle.play(); mx2.update(0);
      /* o que cada um leva: o objeto segue o osso da mão, mas fica solto do esqueleto para pender reto */
      const osso = (lado) => { let o = null; copia.traverse((n) => { if (!o && n.isBone && (ela ? n.name === lado + 'Hand' : new RegExp('^Wrist.?' + lado[0] + '$').test(n.name))) o = n; }); return o; };
      const itens = [], leva = (obj, lado) => { const b = osso(lado); if (!b) return; f.g.add(obj); itens.push({ o: obj, b, fase: itens.length * 1.7 + i }); };
      if (pp.item === 'sacolas') { leva(sacola(COR.verde, 0xffffff), 'Right'); leva(sacola(0xffffff, COR.verde), 'Left'); }
      if (pp.item === 'sacola') leva(sacola(i % 2 ? 0xffffff : COR.verde, i % 2 ? COR.azul : 0xffffff), 'Right');
      if (pp.item === 'pasta') leva(pasta(), ela ? 'Left' : 'Right');
      let cao = null;
      if (pp.item === 'cao') {
        cao = cachorro(); cao.g.position.set(f.g.position.x + 0.7, 0, f.g.position.z + 0.15); cao.g.rotation.y = 1.2; f.g.parent.add(cao.g);
        const geo = new CylinderGeometry(0.011, 0.011, 1, 5); geo.rotateX(Math.PI / 2);
        cao.guia = new Mesh(geo, mat(COR.verdeFundo)); f.g.parent.add(cao.guia); cao.mao = osso('Right'); cao.passo = 0;
        tingir(tintas[lote], cao.g, true); tingir(tintas[lote], cao.guia, true);
      }
      tingir(tintas[lote], f.g, true);
      extras.push({ g: f.g, copia, mx: mx2, ac, lote, itens, cao, passeio: !!pp.passeio, faixa: f.g.position.z, vel: pp.item === 'cao' ? 1.0 : pp.passeio ? 1.15 : 1.3, atual: 'Idle', x0: f.g.position.x, z0: f.g.position.z, alvoX: f.g.position.x, alvoZ: f.g.position.z, espera: 0.4 + i * 0.5, giro: [0.5, -0.7, 0.2, -0.3, 0.9, -1.0, 0.1][i % 7] });
      copia.rotation.y = extras[extras.length - 1].giro;
    });
    ator = criarAtor(gltf, 2.35); ator.g.position.copy(boneco.g.position); ator.vestir(traje); cena.add(ator.g); boneco.g.visible = false; desenhar();
  }).catch(() => {});

  let alvo = -1, escolhido = -1, traje = 0, giro = -1, trajePend = -1, passo = 0, virar = 0, w = 1, h = 1, vivo = true, rodando = false, raf = 0, t0 = performance.now(), ultimo = t0;
  let mx = 0, camX = 0, olharX = 0, sobra = 1, borda = 22, chegou = true, ociosoT = 0, alvoAnt = -1;
  const escala = [1, 1, 1];
  const destinoX = (i) => X[i] + (i === 0 ? 1.9 : i === 1 ? 0.6 : -0.5);

  function medir() {
    w = el.clientWidth || 1; h = el.clientHeight || 1;
    /* a tela vai de ponta a ponta da janela; o enquadramento continua medido pela coluna de conteúdo */
    sobra = Math.max(1, w / ((el.parentElement && el.parentElement.clientWidth) || w)); borda = (w < 760 ? 7.6 : 14.4) * sobra * 1.3 + 4;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, w < 800 ? 1.5 : 2)); renderer.setSize(w, h, false);
    cam.aspect = w / h; cam.updateProjectionMatrix(); desenhar();
  }
  function enquadrar() {
    const estreito = w < 760, metade = (estreito ? 7.6 : 14.4) * sobra, d = metade / (Math.tan(MathUtils.degToRad(14)) * cam.aspect), elev = MathUtils.degToRad(17);
    cam.position.set(camX, 3.0 + Math.sin(elev) * d, Math.cos(elev) * d); cam.lookAt(olharX, 3.0, 0);
  }
  function desenhar() { enquadrar(); renderer.render(cena, cam); }

  function quadro(agora) {
    if (!vivo || !rodando) return;
    raf = requestAnimationFrame(quadro);
    const dt = Math.min(0.05, (agora - ultimo) / 1000), t = (agora - t0) / 1000; ultimo = agora;
    const foco = alvo >= 0 ? alvo : escolhido, vitrine = w < 760 && foco < 0 ? 1 : -1;
    /* personagem: anda até o porte em foco, vira para o lado que anda e troca de roupa ao chegar */
    const b = ator ? ator.g : boneco.g, dest = escolhido >= 0 ? destinoX(escolhido) : b.position.x, dx = dest - b.position.x, andando = Math.abs(dx) > 0.04;
    const correndo = Math.abs(dx) > 2.2;
    if (andando) {
      const v = Math.sign(dx) * Math.min(Math.abs(dx) / dt, ator ? (correndo ? 8.2 : 3.2) : 7.5); b.position.x += v * dt; passo += dt * 11; chegou = false;
      virar = MathUtils.damp(virar, Math.sign(dx) * 1.35, 10, dt);
    } else {
      virar = MathUtils.damp(virar, alvo >= 0 && Math.abs(X[alvo] - b.position.x) > 3 ? Math.sign(X[alvo] - b.position.x) * 0.75 : 0, 8, dt);   // olha para o lote sob o mouse
      if (escolhido >= 0 && escolhido !== traje && giro < 0) { giro = 0; trajePend = escolhido; }
      if (!chegou) { chegou = true; if (escolhido >= 0) gesto = 1; }
      if (alvo !== alvoAnt) { alvoAnt = alvo; if (alvo >= 0 && giro < 0 && festa < 0) gesto = 1; }
    }
    const balanco = andando ? Math.sin(passo) : 0;
    boneco.pe.rotation.x = balanco * 0.75; boneco.pd.rotation.x = -balanco * 0.75;
    boneco.be.rotation.x = -balanco * 0.6; boneco.bd.rotation.x = balanco * 0.6;
    let pulo = andando ? Math.abs(Math.sin(passo)) * 0.07 : Math.sin(t * 2.2) * 0.012, rot = virar;
    if (giro >= 0) {
      giro += dt / 0.5;
      if (giro >= 0.5 && trajePend >= 0) { traje = trajePend; boneco.vestir(traje); if (ator) ator.vestir(traje); trajePend = -1; }
      rot += Math.min(giro, 1) * Math.PI * 2; pulo += Math.sin(Math.min(giro, 1) * Math.PI) * 0.34;
      if (giro >= 1) giro = -1;
    }
    if (festa >= 0) { festa += dt; pulo += Math.abs(Math.sin(festa * 7.5)) * 0.42 * Math.max(0, 1 - festa / 1.7); if (festa > 1.7) festa = -1; }
    boneco.corpo.rotation.y = rot; boneco.corpo.position.y = pulo;
    if (ator) {
      ator.corpo.rotation.y = rot; ator.corpo.position.y = andando ? 0 : pulo - Math.sin(t * 2.2) * 0.012;
      if (andando) { ator.tocar(correndo ? 'Run' : 'Walk'); gesto = 0; }
      else if (gesto === 1 && giro < 0) { ator.tocar('Wave', { uma: true }); gesto = 2; ociosoT = 0; }
      else if (ator.nomeAtual() === 'Run' || ator.nomeAtual() === 'Walk' || (!ator.tocando() && gesto !== 1)) { ator.tocar('Idle'); ociosoT = 0; }
      else if (ator.nomeAtual() === 'Idle') { ociosoT += dt; if (ociosoT > 5.5) { ator.tocar(escolhido >= 0 ? 'Interact' : 'Idle_Neutral', { uma: true }); ociosoT = 0; } }
      ator.mixer.update(dt);
      for (const e of extras) {
        const vida = cor[e.lote];
        if (vida >= 0.5) {                                             // lote sem foco: figurante congelado
          const troca = (n, uma) => { if (e.atual === n || !e.ac[n]) return; const a = e.ac[n]; a.reset(); a.setLoop(uma ? LoopOnce : 2201, uma ? 1 : Infinity); a.clampWhenFinished = !!uma; a.fadeIn(0.25).play(); e.ac[e.atual].fadeOut(0.25); e.atual = n; };
          const ex = e.alvoX - e.g.position.x, ez = e.alvoZ - e.g.position.z, dist = Math.hypot(ex, ez);
          if (dist > 0.06) {
            const v = Math.min(dist / dt, e.vel); e.g.position.x += (ex / dist) * v * dt; e.g.position.z += (ez / dist) * v * dt;
            e.copia.rotation.y = MathUtils.damp(e.copia.rotation.y, Math.atan2(ex, ez), 9, dt); troca('Walk'); e.andou = true;
          } else {
            if (e.andou) {
              e.andou = false; const sorte = Math.random(), gesto2 = sorte < 0.4 ? 'Wave' : sorte < 0.7 ? 'Interact' : 'Idle';
              troca(e.ac[gesto2] && !e.passeio ? gesto2 : 'Idle', gesto2 !== 'Idle' && !e.passeio); e.espera = e.passeio ? 0.5 + Math.random() * 1.1 : 1.6 + Math.random() * 2.2;
            }
            if (!e.passeio) e.copia.rotation.y = MathUtils.damp(e.copia.rotation.y, e.giro, 4, dt);
            e.espera -= dt;
            if (e.espera <= 0) {
              /* a calçada acompanha a borda redonda da ilha: quanto mais à frente, mais estreita */
              const beira = (z) => Math.sqrt(Math.max(0.6, 14.4 - z * z)) - 0.2;
              if (e.passeio) { e.alvoZ = MathUtils.clamp(e.faixa + (Math.random() - 0.5) * 0.16, 2.2, 2.9); e.alvoX = (e.g.position.x > 0 ? -1 : 1) * beira(e.alvoZ) * (0.6 + Math.random() * 0.4); }
              else { e.alvoZ = MathUtils.clamp(e.z0 + (Math.random() * 2 - 1) * 0.3, 2.2, 2.9); const b2 = beira(e.alvoZ); e.alvoX = MathUtils.clamp(e.x0 + (Math.random() * 2 - 1) * 1.9, -b2, b2); }
              e.espera = 0;
            }
          }
          e.mx.update(dt);
        }
        const anda = vida >= 0.5 && e.atual === 'Walk';
        for (const it of e.itens) {
          it.b.getWorldPosition(v3); e.g.worldToLocal(v3); it.o.position.copy(v3);
          it.o.rotation.y = e.copia.rotation.y + Math.PI / 2; it.o.rotation.x = anda ? Math.sin(t * 7 + it.fase) * 0.16 : 0;
        }
        if (e.cao) {
          const c = e.cao, lote = lotes[e.lote], ry = e.copia.rotation.y;
          if (vida >= 0.5) {
            const tx = e.g.position.x + Math.sin(ry) * 0.85 + Math.cos(ry) * 0.32, tz = e.g.position.z + Math.cos(ry) * 0.85 - Math.sin(ry) * 0.32;
            const cx = tx - c.g.position.x, cz = tz - c.g.position.z, cd = Math.hypot(cx, cz), corre = cd > 0.12;
            if (corre) { const v = Math.min(cd / dt, 1.7); c.g.position.x += (cx / cd) * v * dt; c.g.position.z += (cz / cd) * v * dt; c.g.rotation.y = MathUtils.damp(c.g.rotation.y, Math.atan2(cx, cz), 8, dt); c.passo += dt * 15; }
            const bal = corre ? Math.sin(c.passo) * 0.6 : 0;
            c.patas[0].rotation.x = bal; c.patas[3].rotation.x = bal; c.patas[1].rotation.x = -bal; c.patas[2].rotation.x = -bal;
            c.g.position.y = corre ? Math.abs(Math.sin(c.passo)) * 0.025 : 0;
            c.rabo.rotation.y = Math.sin(t * 13) * 0.55; c.cabeca.rotation.z = corre ? 0 : Math.sin(t * 1.3) * 0.22; c.cabeca.rotation.x = corre ? 0 : -0.12;
          }
          if (c.mao) {
            c.mao.getWorldPosition(v3); lote.worldToLocal(v3);
            v3b.set(c.g.position.x + Math.sin(c.g.rotation.y) * 0.19, c.g.position.y + 0.4, c.g.position.z + Math.cos(c.g.rotation.y) * 0.19);
            c.guia.position.copy(v3).add(v3b).multiplyScalar(0.5); c.guia.scale.z = v3.distanceTo(v3b);
            c.guia.lookAt(lote.localToWorld(v3b));
          }
        }
      }
    }
    /* pedras: quando há foco as outras ficam verde-claro; o trecho já percorrido fica verde forte */
    for (const s of pedras) {
      const entre = escolhido >= 0 && ((s.x - b.position.x) * (s.x - dest) <= 0 || Math.abs(s.x - b.position.x) < 0.5 || Math.abs(s.x - X[escolhido]) < 3.9);
      s.alvo.setHex(foco < 0 ? COR.pedra : entre ? COR.verde : COR.verdeClaro);
      s.m.color.lerp(s.alvo, 1 - Math.exp(-dt * 7));
    }
    lotes.forEach((g, i) => {
      /* cor e vida do lote: 0 = monocromático e parado, 1 = colorido e em movimento */
      cor[i] = MathUtils.damp(cor[i], i === alvo || i === escolhido || i === vitrine ? 1 : 0, 6, dt);
      const f = cor[i];
      for (const k of tintas[i]) { k.m.color.copy(k.cinza).lerp(k.cor, f); if (k.ei) k.m.emissiveIntensity = k.ei * f * (0.8 + 0.2 * Math.sin(t * 3.1 + k.fase)); }
      for (const a of vivos[i].arv) a.rotation.z = Math.sin(t * 1.5 + a.userData.arvore) * 0.05 * f;
      for (const a of vivos[i].toldo) a.rotation.x = 0.42 + Math.sin(t * 2.4 + a.userData.toldo * 0.9) * 0.035 * f;
      const e = foco < 0 ? 1 : i === foco ? 1.07 : 0.95; escala[i] = MathUtils.damp(escala[i], e, 7, dt);
      g.scale.setScalar(escala[i]); g.position.y = (escala[i] - 1) * 2.2;
      aneis[i].material.opacity = MathUtils.damp(aneis[i].material.opacity, i === foco ? 0.95 : 0, 8, dt);
      aneis[i].material.color.setHex(i === escolhido ? COR.verde : COR.verdeClaro);
    });
    pino.visible = escolhido >= 0;
    if (escolhido >= 0) { pino.position.set(X[escolhido] + (escolhido === 2 ? 0.6 : 0), [3.3, 4.5, 8.0][escolhido] * escala[escolhido] + 0.5 + Math.sin(t * 2.4) * 0.18, escolhido === 2 ? -0.6 : -0.4); pino.rotation.y = t * 1.2; }
    for (const n of nuvens) { n.g.position.x += n.v * dt; if (n.g.position.x > borda) n.g.position.x = -borda; n.g.position.y += Math.sin(t * 0.4 + n.v * 20) * 0.0012; }
    if (!voo.quem) {
      voo.espera -= dt;
      if (voo.espera <= 0) {
        const bal = voo.vez++ % 3 === 1; voo.quem = bal ? voo.ba : voo.av; voo.balao = bal; voo.dir = Math.random() < 0.5 ? -1 : 1; voo.t = 0;
        voo.y = bal ? 3.7 + Math.random() * 0.5 : 5.7 + Math.random() * 0.8;
        voo.quem.g.position.set(-voo.dir * (borda + 2), voo.y, bal ? -9 : -6); voo.quem.g.scale.setScalar(bal ? 1.25 : 1.5); voo.quem.g.rotation.set(0, voo.dir < 0 && !bal ? Math.PI : 0, 0); voo.quem.g.visible = true;
      }
    } else {
      const o = voo.quem.g; voo.t += dt; o.position.x += voo.dir * (voo.balao ? 0.85 : 3.1) * dt;
      if (voo.balao) { o.position.y = voo.y + Math.sin(voo.t * 0.55) * 0.3 + voo.t * 0.012; o.rotation.z = Math.sin(voo.t * 0.7) * 0.035; o.rotation.y += dt * 0.12; }
      else { o.position.y = voo.y + Math.sin(voo.t * 0.8) * 0.16; o.rotation.z = Math.sin(voo.t * 0.8 + 1.2) * 0.05 + 0.04; o.rotation.x = Math.sin(voo.t * 0.5) * 0.12; voo.av.helice.rotation.x += dt * 38; }
      if (o.position.x * voo.dir > borda + 2) { o.visible = false; voo.quem = null; voo.espera = 7 + Math.random() * 7; }
    }
    const pan = w < 760;
    camX = MathUtils.damp(camX, pan ? (foco >= 0 ? X[foco] : 0) : (foco >= 0 ? X[foco] * 0.1 : 0) + mx * 0.9, 3, dt);
    olharX = MathUtils.damp(olharX, pan ? (foco >= 0 ? X[foco] : 0) : (foco >= 0 ? X[foco] * 0.05 : 0), 3, dt);
    desenhar();
  }
  function ligar(sim) {
    if (sim === rodando) return; rodando = sim;
    if (sim) { ultimo = performance.now(); raf = requestAnimationFrame(quadro); } else cancelAnimationFrame(raf);
  }
  function aoMover(e) { const r = el.getBoundingClientRect(); mx = ((e.clientX - r.left) / r.width - 0.5) * 2; }
  if (!reduz) el.addEventListener('pointermove', aoMover, { passive: true });
  el.addEventListener('pointerleave', () => { mx = 0; });
  const ro = 'ResizeObserver' in window ? new ResizeObserver(medir) : null; if (ro) ro.observe(el); else window.addEventListener('resize', medir);
  const io = 'IntersectionObserver' in window ? new IntersectionObserver((es) => ligar(es[0].isIntersecting && !document.hidden), { rootMargin: '120px' }) : null;
  if (io) io.observe(el); else ligar(true);
  const aoVis = () => ligar(!document.hidden && (!io || el.getBoundingClientRect().top < window.innerHeight)); document.addEventListener('visibilitychange', aoVis);
  medir();

  return {
    apontar(i) { alvo = i; if (reduz && i >= 0) { (ator ? ator.g : boneco.g).position.x = destinoX(i); traje = i; boneco.vestir(i); if (ator) ator.vestir(i); desenhar(); } },
    escolher(i) { escolhido = i; if (i >= 0) { alvo = -1; festa = 0; gesto = 1; } if (reduz) { if (i >= 0) { boneco.g.position.x = destinoX(i); traje = i; boneco.vestir(i); } desenhar(); } },
    destruir() { vivo = false; ligar(false); if (ro) ro.disconnect(); if (io) io.disconnect(); document.removeEventListener('visibilitychange', aoVis); renderer.dispose(); el.removeChild(renderer.domElement); },
  };
}
