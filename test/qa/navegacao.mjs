/* QA manual em navegador de verdade (não roda no CI). Uso:
     npm i --no-save playwright && npx playwright install chromium
     python3 -m http.server 8766 &            # na raiz do repositório
     node test/qa/navegacao.mjs
   Clica em menus, portes, abas, planos, agendamento, rodapé e áudios, em desktop, tablet, celular e movimento reduzido. */
import { chromium } from 'playwright';
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const URL=process.argv[2]||'http://localhost:8766/index.html';
async function roda(nome,w,h,opts={}){
  const p = await b.newPage({ viewport:{width:w,height:h}, isMobile:w<700, hasTouch:w<1100, reducedMotion:opts.rm?'reduce':'no-preference' });
  const falhas=[]; let n=0; const ok=(t,c,extra)=>{n++; if(!c)falhas.push(t+(extra!==undefined?' ['+extra+']':''));};
  p.on('pageerror', e => falhas.push('ERRO JS: '+e.message));
  await p.goto(URL); await p.waitForTimeout(1500);
  const topo=(id)=>p.evaluate((id)=>Math.round(document.getElementById(id).getBoundingClientRect().top),id);
  const aberto=()=>p.evaluate(()=>document.getElementById('agModal').classList.contains('open'));
  const fecha=async()=>{await p.keyboard.press('Escape');await p.waitForTimeout(250);};
  const clicaJS=(sel)=>p.evaluate((s)=>{const e=document.querySelector(s);if(!e)return false;e.scrollIntoView({block:'center'});e.click();return true;},sel);
  // navegacao do topo
  if(w>=1000){
    for(const [txt,id] of [['Como funciona','onboarding'],['Funcionalidades','modulos'],['Custos','modo-hibrido'],['Diferenciais','so-a-prisme'],['Planos','planos']]){
      await p.evaluate(()=>scrollTo(0,innerHeight*1.2)); await p.waitForTimeout(700);
      await p.click(`.hx-cap a:has-text("${txt}")`); await p.waitForTimeout(1400);
      const t=await topo(id); ok('nav '+txt, t>-10&&t<140, t);
    }
  }
  await p.evaluate(()=>scrollTo(0,innerHeight*1.2)); await p.waitForTimeout(700);
  await p.click('.hx-cap a:has-text("Ver Planos")'); await p.waitForTimeout(1400); { const t=await topo('planos'); ok('Ver Planos', t>-10&&t<140, t); }
  await p.evaluate(()=>scrollTo(0,0)); await p.waitForTimeout(400);
  await p.click('#topo [data-agendar]'); await p.waitForTimeout(400); ok('hero agendar abre', await aberto()); await fecha(); ok('esc fecha', !(await aberto()));
  ok('foco volta ao botao', await p.evaluate(()=>document.activeElement&&document.activeElement.hasAttribute('data-agendar')));
  await p.click('#topo a[href="#planos"]'); await p.waitForTimeout(1400); { const t=await topo('planos'); ok('hero escolher plano', t>-10&&t<140, t); }
  // porte
  await p.evaluate(()=>document.getElementById('pra-mim').scrollIntoView()); await p.waitForTimeout(1800);
  for(const i of [0,1,2]){
    await p.click(`#pra-mim button[data-i="${i}"]`); await p.waitForTimeout(700);
    const r=await p.evaluate(()=>({porte:document.getElementById('pra-mim').getAttribute('data-porte'),seg:[...document.querySelectorAll('.jr-seg button')].findIndex(x=>x.getAttribute('aria-pressed')==='true'||x.getAttribute('aria-selected')==='true'),h:document.getElementById('jrModsH').textContent}));
    ok('porte '+i, r.porte===String(i)&&r.seg===i&&/pequeno|média|grande/.test(r.h), JSON.stringify(r));
  }
  await p.click('#pra-mim button[data-i="2"]'); await p.waitForTimeout(500); ok('desmarca porte', await p.evaluate(()=>!document.getElementById('pra-mim').hasAttribute('data-porte')));
  for(const v of [0,2,1]){ await clicaJS(`.jr-seg button[data-v="${v}"]`); await p.waitForTimeout(500); ok('vendo como '+v, await p.evaluate((v)=>document.getElementById('pra-mim').getAttribute('data-porte')===String(v),v)); }
  // resposta da Eve na dor
  await p.evaluate(()=>document.getElementById('diferenciais').scrollIntoView()); await p.waitForTimeout(4500);
  ok('balao da dor preenchido', await p.evaluate(()=>document.getElementById('jrSub').textContent.trim().length>20), await p.evaluate(()=>document.getElementById('jrSub').textContent.slice(0,30)));
  await clicaJS('#onboarding [data-agendar]'); await p.waitForTimeout(400); ok('onboarding agendar', await aberto()); await fecha();
  for(const n of [2,3,1]){ await clicaJS(`#cfAbas button:nth-child(${n})`); await p.waitForTimeout(400); ok('aba pratica '+n, await p.evaluate((n)=>document.querySelector(`#cfAbas button:nth-child(${n})`).getAttribute('aria-selected')==='true',n)); }
  for(const n of [2,1]){ await clicaJS(`#csAbas button:nth-child(${n})`); await p.waitForTimeout(400); ok('aba custos '+n, await p.evaluate((n)=>document.querySelector(`#csAbas button:nth-child(${n})`).getAttribute('aria-selected')==='true',n)); }
  // diferenciais
  await p.evaluate(()=>document.getElementById('so-a-prisme').scrollIntoView()); await p.waitForTimeout(1200);
  for(const n of [2,3,4,1]){ await clicaJS(`#spSeg button:nth-child(${n})`); await p.waitForTimeout(700); ok('sp pilula '+n, await p.evaluate((n)=>document.querySelectorAll('.sp-cena')[n-1].classList.contains('on')&&document.querySelectorAll('.sp-cena.on').length===1,n)); }
  for(const n of [2,3,1]){ await clicaJS(`#flChips button:nth-child(${n})`); await p.waitForTimeout(500); ok('flow chip '+n, await p.evaluate((n)=>document.querySelector(`#flChips button:nth-child(${n})`).getAttribute('aria-selected')==='true',n)); }
  await clicaJS('#spSeg button:nth-child(2)'); await p.waitForTimeout(500);
  for(const n of [2,3]){ await clicaJS(`#supAbas button:nth-child(${n})`); await p.waitForTimeout(500); ok('sup aba '+n, await p.evaluate((n)=>document.querySelector(`#supAbas button:nth-child(${n})`).getAttribute('aria-selected')==='true',n)); }
  await clicaJS('#spProx'); await p.waitForTimeout(500); ok('prox vai ao relatorio', await p.evaluate(()=>document.querySelectorAll('.sp-cena')[2].classList.contains('on')));
  await clicaJS('#spProx'); await p.waitForTimeout(500); await clicaJS('#spProx'); await p.waitForTimeout(1600); { const t=await topo('planos'); ok('prox final vai aos planos', t>-10&&t<160, t); }
  // planos
  const nd=await p.evaluate(()=>document.querySelectorAll('.jr-plano [data-dica]').length); ok('itens com balao', nd>=20, nd);
  await p.mouse.move(3,3); await p.evaluate(()=>{const e=document.querySelector('.jr-plano li[data-link="#whatsapp-flows"]');e.scrollIntoView({block:'center',behavior:'instant'});e.click();if(!e.classList.contains('aberto'))e.click();}); await p.waitForTimeout(400);
  ok('balao abre no clique', await p.evaluate(()=>document.querySelector('.jr-plano li[data-link="#whatsapp-flows"]').classList.contains('aberto')));
  await p.evaluate(()=>document.querySelector('.jr-plano li[data-link="#whatsapp-flows"] .jr-dica a').click()); await p.waitForTimeout(1700);
  ok('link flows leva a secao', await p.evaluate(()=>{const r=document.getElementById('so-a-prisme').getBoundingClientRect();return r.top>-20&&r.top<160&&document.querySelector('#spSeg button').getAttribute('aria-selected')==='true';}));
  for(const pl of ['Essencial','Integrador','IA Power']){ await clicaJS(`.jr-plano button[data-plano="${pl}"]`); await p.waitForTimeout(350); ok('saber mais '+pl, await aberto()); await fecha(); }
  await p.evaluate(()=>{const e=document.querySelectorAll('.jr-impl')[1];e.scrollIntoView({block:'center'});e.click();}); await p.waitForTimeout(300);
  await p.evaluate(()=>document.querySelectorAll('.jr-impl')[1].querySelector('button').click()); await p.waitForTimeout(350); ok('call do balao a combinar', await aberto());
  // fluxo do agendamento + teclado
  ok('fundo inerte', await p.evaluate(()=>document.querySelector('section').hasAttribute('inert')));
  await p.click('.ag-op[data-v="sim"]'); await p.click('.ag-op[data-v="breve"]'); await p.click('.ag-op[data-v="sim"]'); await p.click('.ag-op[data-v="especialistas"]'); await p.waitForTimeout(300);
  ok('chega ao contato', await p.evaluate(()=>!document.querySelector('[data-p="contato"]').hidden));
  await p.click('#lead-submit'); await p.waitForTimeout(200); ok('valida vazio', await p.evaluate(()=>!document.getElementById('lead-error').hidden));
  await p.fill('#lead-nome','Teste'); await p.fill('#lead-whatsapp','123'); await p.fill('#lead-email','a@b.co'); await p.click('#lead-submit'); await p.waitForTimeout(200);
  ok('valida whatsapp', await p.evaluate(()=>document.getElementById('lead-whatsapp').getAttribute('aria-invalid')==='true'));
  await p.fill('#lead-whatsapp','32999990000'); await p.click('#lead-submit'); await p.waitForTimeout(600);
  ok('abre agenda', await p.evaluate(()=>!document.querySelector('[data-p="calendar"]').hidden&&/calendar\.google\.com/.test(document.getElementById('qual-iframe').getAttribute('src'))&&/calendar\.google/.test(document.getElementById('agFora').href)));
  await p.click('.ag-x'); await p.waitForTimeout(300); ok('x fecha', !(await aberto())&&await p.evaluate(()=>document.getElementById('qual-iframe').getAttribute('src')==='about:blank'&&!document.querySelector('[inert]')&&document.body.style.overflow===''));
  await clicaJS('.jr--fim [data-agendar]'); await p.waitForTimeout(350); ok('cta final agendar', await aberto()); await p.click('.ag-fundo',{position:{x:5,y:5}}); await p.waitForTimeout(300); ok('clique fora fecha', !(await aberto()));
  // rodape
  for(const [h,id] of [['#coex','coex'],['#na-pratica','na-pratica'],['#modulos','modulos'],['#topo','topo']]){ await p.evaluate(()=>document.getElementById('rodape').scrollIntoView({block:'end',behavior:'instant'})); await p.waitForTimeout(600); await p.evaluate((h)=>document.querySelector(`.rp a[href="${h}"]`).click(),h); await p.waitForTimeout(1700); const t=await topo(id); ok('rodape '+h, t>-10&&t<140, t); }
  ok('links externos com https', await p.evaluate(()=>[...document.querySelectorAll('a[target="_blank"]')].every(a=>/^https:\/\//.test(a.href))));
  // audios
  if(!opts.rm) for(const id of ['coex','na-pratica','modo-hibrido','planos']){
    await p.evaluate((id)=>document.getElementById(id).scrollIntoView({block:'center'}),id); await p.waitForTimeout(1300);
    const tem=await p.evaluate(()=>document.getElementById('eveDock').classList.contains('tem-audio')); ok('audio oferecido em '+id, tem);
    if(tem){ await p.click('#edSom',{force:true}); await p.waitForTimeout(1800); ok('audio toca em '+id, await p.evaluate(()=>document.getElementById('eveDock').classList.contains('tocando')&&document.querySelectorAll('#edFala u.dito').length>0)); await p.click('#edSom',{force:true}); await p.waitForTimeout(300); ok('audio pausa em '+id, await p.evaluate(()=>!document.getElementById('eveDock').classList.contains('tocando'))); }
  }
  ok('sem estouro horizontal', await p.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth));
  console.log(nome, n+' checagens,', falhas.length+' falhas', falhas.length?'\n  - '+falhas.join('\n  - '):'');
  await p.close();
}
await roda('desktop 1440',1440,900);
await roda('tablet 820',820,1180);
await roda('celular 390',390,844);
await roda('movimento reduzido 1280',1280,720,{rm:true});
await b.close();
