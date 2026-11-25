/* QA manual em navegador de verdade (não roda no CI). Uso:
     npm i --no-save playwright && npx playwright install chromium
     python3 -m http.server 8766 &            # na raiz do repositório
     node test/qa/layout.mjs
   Em seis tamanhos de tela: erros de script, estouro horizontal, texto cortado, áreas de toque pequenas e altura da página estável. Salva capturas em test/qa/capturas/. */
import { chromium } from 'playwright';
const VP={d:[1440,900],l:[1280,720],tl:[1024,768],tp:[820,1180],m:[390,844],s:[360,640]};
const so=process.argv[2]?process.argv[2].split(','):Object.keys(VP);
const SEC=['topo','pra-mim','diferenciais','onboarding','coex','na-pratica','modulos','modo-hibrido','so-a-prisme','planos','fim','rodape'];
const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
for (const k of so) {
  const [w,h]=VP[k], toque=w<1100;
  const p = await b.newPage({ viewport: { width: w, height: h }, isMobile: w<700, hasTouch: toque, deviceScaleFactor: 1 });
  const erros=[]; p.on('pageerror', e => erros.push(e.message)); p.on('console', m => { if (m.type()==='error'&&!/ERR_TUNNEL|404|Failed to load resource/.test(m.text())) erros.push('console: '+m.text().slice(0,140)); });
  await p.goto(process.env.QA_URL||'http://localhost:8766/index.html'); await p.waitForTimeout(1500);
  await p.evaluate(()=>{const f=document.querySelector('.jr--fim');if(f&&!f.id)f.id='fim';});
  const rel={vp:k+' '+w+'x'+h,erros,estouro:[],cortes:[],toques:[],alturas:{}};
  const H0=await p.evaluate(()=>document.documentElement.scrollHeight);
  for (const s of SEC) {
    await p.evaluate((s)=>{const e=document.getElementById(s);e.scrollIntoView({block:'start'});},s);
    await p.waitForTimeout(s==='pra-mim'?5500:2600);
    const r=await p.evaluate((s)=>{
      const sec=document.getElementById(s),vw=document.documentElement.clientWidth,R=sec.getBoundingClientRect();
      const vis=e=>{const c=getComputedStyle(e);if(c.visibility==='hidden'||c.display==='none'||+c.opacity===0)return false;const r=e.getBoundingClientRect();return r.width>1&&r.height>1;};
      const cortado=e=>{let a=e.parentElement;while(a&&a!==document.body){const c=getComputedStyle(a);if(/hidden|clip|auto|scroll/.test(c.overflowX+c.overflow))return true;a=a.parentElement;}return false;};
      const nome=e=>(e.id?'#'+e.id:e.tagName.toLowerCase()+(e.className&&e.className.baseVal===undefined?'.'+String(e.className).trim().split(/\s+/).slice(0,2).join('.'):''))+' "'+(e.textContent||'').trim().replace(/\s+/g,' ').slice(0,28)+'"';
      const est=[],cor=[],toq=[];
      sec.querySelectorAll('*').forEach(e=>{
        if(!vis(e))return;const r=e.getBoundingClientRect();
        if((r.right>vw+2||r.left<-2)&&!cortado(e)&&e.tagName!=='CANVAS')est.push(nome(e)+' ['+Math.round(r.left)+','+Math.round(r.right)+']');
        const c=getComputedStyle(e);
        if(e.children.length===0&&e.textContent.trim()&&e.scrollWidth>e.clientWidth+2&&/hidden|clip/.test(c.overflowX)&&c.textOverflow!=='ellipsis'&&c.whiteSpace==='nowrap')cor.push(nome(e));
        if((e.tagName==='A'||e.tagName==='BUTTON')&&(r.height<40||r.width<40))toq.push(nome(e)+' '+Math.round(r.width)+'x'+Math.round(r.height));
      });
      return {h:Math.round(R.height),est:est.slice(0,6),cor:cor.slice(0,6),toq:toq.slice(0,8),sw:document.documentElement.scrollWidth,vw};
    },s);
    rel.alturas[s]=r.h; if(r.sw>r.vw)rel.estouro.push(s+': pagina '+r.sw+'>'+r.vw); r.est.forEach(x=>rel.estouro.push(s+': '+x)); r.cor.forEach(x=>rel.cortes.push(s+': '+x)); if(toque)r.toq.forEach(x=>rel.toques.push(s+': '+x));
    await p.screenshot({path:`test/qa/capturas/${k}-${s}.png`});
    if(r.h>h*1.15){await p.evaluate((d)=>scrollBy(0,d),Math.min(r.h-h,h*.9));await p.waitForTimeout(900);await p.screenshot({path:`test/qa/capturas/${k}-${s}-2.png`});}
  }
  rel.H=[H0,await p.evaluate(()=>document.documentElement.scrollHeight)];
  console.log(JSON.stringify(rel,null,1));
  await p.close();
}
await b.close();
