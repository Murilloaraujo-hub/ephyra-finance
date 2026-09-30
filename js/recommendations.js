window.EphyraRecommendations = (() => {
  'use strict';
  const types = ['Nova função', 'Melhoria', 'Outro'];
  function recipient() {
    const value = String(window.EPHYRA_CONTACT?.recommendationsEmail || '').trim();
    return /^[A-Za-z0-9.!#$%&'*+/=^_`{|}~-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)+$/.test(value) ? value : '';
  }
  function message() {
    const form = document.getElementById('recommendation-form');
    if (!form.reportValidity()) return null;
    const type = document.getElementById('recommendation-type').value;
    const title = document.getElementById('recommendation-title').value.trim();
    const description = document.getElementById('recommendation-description').value.trim();
    if (!types.includes(type) || !title || !description) {
      document.getElementById('recommendation-status').textContent = 'Preencha o título e descreva sua sugestão.';
      return null;
    }
    return {subject: `[Ephyra Finance] ${type}: ${title.slice(0, 80).replace(/[\r\n]/g, ' ')}`,
      body: `Tipo: ${type}\nTítulo: ${title.slice(0, 80)}\n\n${description.slice(0, 1200)}\n\nEnviado pela opção Recomendações do Ephyra Finance.`};
  }
  function open() {
    App.oM('Recomendações', `<p class="auth-help">Tem uma ideia para o Ephyra Finance? Sugira uma atualização ou uma função nova.</p>
      <form id="recommendation-form">
      <div class="fg"><label class="form-label" for="recommendation-type">Tipo de sugestão</label><select class="form-input" id="recommendation-type"><option>Nova função</option><option>Melhoria</option><option>Outro</option></select></div>
      <div class="fg"><label class="form-label" for="recommendation-title">Título</label><input class="form-input" id="recommendation-title" maxlength="80" required placeholder="Ex.: lembrete de contas a pagar"></div>
      <div class="fg"><label class="form-label" for="recommendation-description">Sua sugestão</label><textarea class="form-input" id="recommendation-description" rows="5" maxlength="1200" required placeholder="Conte como essa ideia ajudaria você."></textarea></div>
      <p class="auth-help">O aplicativo de e-mail será aberto com sua mensagem. Revise e confirme o envio por lá. Seus dados financeiros e sua senha não são incluídos.</p>
      ${recipient() ? `<p class="auth-help">Para: ${U.esc(recipient())}</p>` : '<p class="auth-help">O endereço para receber sugestões ainda está sendo definido. Você pode copiar sua mensagem.</p>'}
      <p id="recommendation-status" class="auth-help" role="status" aria-live="polite"></p>
      <div class="mf2"><button type="button" class="btn btn-outline" id="recommendation-copy">Copiar mensagem</button><button type="submit" class="btn btn-primary" ${recipient() ? '' : 'disabled'}>Abrir aplicativo de e-mail</button></div>
      </form>`);
    document.getElementById('recommendation-form').addEventListener('submit', event => {
      event.preventDefault(); const content = message(), email = recipient();
      if (!content || !email) return;
      const link = document.createElement('a');
      link.href = `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(content.subject)}&body=${encodeURIComponent(content.body)}`;
      document.body.appendChild(link); link.click(); link.remove();
      document.getElementById('recommendation-status').textContent = 'Continue no seu aplicativo de e-mail para enviar. Se ele não abrir, use “Copiar mensagem”.';
    });
    document.getElementById('recommendation-copy').addEventListener('click', async () => {
      const content = message(); if (!content) return;
      const status = document.getElementById('recommendation-status');
      try {
        await navigator.clipboard.writeText(`${recipient() ? `Para: ${recipient()}\n` : ''}Assunto: ${content.subject}\n\n${content.body}`);
        status.textContent = 'Mensagem copiada. Cole no seu aplicativo de e-mail para enviar.';
      } catch {
        status.textContent = 'Não foi possível copiar automaticamente. Selecione e copie o texto abaixo.';
        let fallback = document.getElementById('recommendation-copy-text');
        if (!fallback) { fallback = document.createElement('textarea'); fallback.id = 'recommendation-copy-text'; fallback.className = 'form-input'; fallback.rows = 6; fallback.readOnly = true; fallback.setAttribute('aria-label', 'Mensagem para copiar'); status.after(fallback); }
        fallback.value = `Assunto: ${content.subject}\n\n${content.body}`; fallback.focus(); fallback.select();
      }
    });
  }
  return {open};
})();
