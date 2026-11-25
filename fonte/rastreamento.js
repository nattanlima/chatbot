/* ===== Rastreamento de conversão (GA4/Meta: sem efeito até serem configurados; OpenAI Ads: ativo) =====
   Mapa: evento interno -> evento padrão do OpenAI Ads Pixel (oaiq).
   Eventos fora do mapa (ex.: abrir_agendamento) não vão para a OpenAI de propósito,
   para não poluir a otimização da campanha com sinais fracos de topo de funil. */
(function () {
  var OAI_EVENTS = {
    /* conversão principal (mesmo evento configurado no Ads Manager): cadastro preenchido para agendar a call */
    cadastro_concluido:      { name: 'checkout_started',      data: { type: 'contents' } },
    agendamento_qualificado: { name: 'appointment_scheduled', data: { type: 'customer_action' } },
    contato_whatsapp:        { name: 'lead_created',          data: { type: 'customer_action' } }
  };
  window.trackEvent = function (name, params) {
    if (typeof gtag === 'function') gtag('event', name, params || {});
    if (typeof fbq === 'function') fbq('trackCustom', name, params || {});
    var oai = (typeof oaiq === 'function') ? OAI_EVENTS[name] : null;
    if (oai) {
      /* event_id permite deduplicar com o mesmo evento enviado pelo Worker (CAPI) */
      if (params && params.event_id) oaiq('measure', oai.name, oai.data, { event_id: params.event_id });
      else oaiq('measure', oai.name, oai.data);
    }
  };
  /* clique em qualquer botão de WhatsApp */
  document.addEventListener('click', function (e) {
    var wa = e.target && e.target.closest ? e.target.closest('a[href*="wa.me"]') : null;
    if (wa) {
      var m = wa.href.match(/Plano%20([^&]+)/);
      window.trackEvent('contato_whatsapp', { plano: m ? decodeURIComponent(m[1]).trim() : 'geral' });
    }
  });
})();
