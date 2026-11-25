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
      if(m.print)return '<span class="md md-print"><span class="pt"><i></i><i></i><i></i>Conexões</span><span class="pc"><i class="cf-ic" data-c="wa">{{IC_WA}}</i><span><b>Loja Centro</b><small>WhatsApp por QR code</small></span><em>Desconectado</em></span><span class="pc ok"><i class="cf-ic" data-c="ig">{{IC_IG}}</i><span><b>Instagram da loja</b><small>Direct e comentários</small></span><em>Conectado</em></span></span>';
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

