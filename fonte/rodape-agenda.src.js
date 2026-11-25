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

