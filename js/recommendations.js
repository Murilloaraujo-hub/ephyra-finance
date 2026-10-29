/* ===== js/recommendations.js ===== */
/**
 * Caixa de sugestões totalmente local.
 *
 * Não envia nada para servidor algum: o texto é montado no navegador e copiado
 * para a área de transferência, para que a pessoa envie pelo canal que preferir
 * (ou guarde a ideia em um arquivo). Nenhum endereço de e-mail fica embutido.
 */
window.EphyraRecommendations = (() => {
  'use strict';

  const TYPES = ['Nova função', 'Melhoria', 'Outro'];

  function message() {
    const form = document.getElementById('recommendation-form');
    if (!form.reportValidity()) return null;
    const type = document.getElementById('recommendation-type').value;
    const title = document.getElementById('recommendation-title').value.trim();
    const description = document.getElementById('recommendation-description').value.trim();
    const status = document.getElementById('recommendation-status');
    if (!TYPES.includes(type) || !title || !description) {
      status.textContent = 'Preencha o título e descreva sua sugestão.';
      return null;
    }
    return {
      subject: `[Ephyra Finance] ${type}: ${title.slice(0, 80).replace(/[\r\n]/g, ' ')}`,
      body: `Tipo: ${type}\nTítulo: ${title.slice(0, 80)}\n\n${description.slice(0, 1200)}`
    };
  }

  function open() {
    App.oM('Recomendações', `
      <p class="auth-help">Tem uma ideia para o Ephyra Finance? Sugira uma melhoria ou uma função nova.</p>
      <form id="recommendation-form">
        <div class="fg"><label class="form-label" for="recommendation-type">Tipo de sugestão</label>
          <select class="form-input" id="recommendation-type">${TYPES.map(t => `<option>${t}</option>`).join('')}</select></div>
        <div class="fg"><label class="form-label" for="recommendation-title">Título</label>
          <input class="form-input" id="recommendation-title" maxlength="80" required placeholder="Ex.: lembrete de contas a pagar"></div>
        <div class="fg"><label class="form-label" for="recommendation-description">Sua sugestão</label>
          <textarea class="form-input" id="recommendation-description" rows="5" maxlength="1200" required placeholder="Descreva a ideia com detalhes"></textarea></div>
        <p class="auth-help">A sugestão é apenas copiada para a área de transferência. Nada é enviado pela internet e seus dados financeiros não são incluídos.</p>
        <p id="recommendation-status" class="auth-help" role="status" aria-live="polite"></p>
        <div class="mf2"><button type="submit" class="btn btn-primary">Copiar sugestão</button></div>
      </form>`);

    document.getElementById('recommendation-form').addEventListener('submit', async event => {
      event.preventDefault();
      const content = message();
      if (!content) return;
      const status = document.getElementById('recommendation-status');
      const text = `Assunto: ${content.subject}\n\n${content.body}`;
      try {
        await navigator.clipboard.writeText(text);
        status.textContent = 'Sugestão copiada. Cole onde preferir para guardar ou compartilhar.';
      } catch {
        status.textContent = 'Não foi possível copiar automaticamente. O texto está abaixo para seleção manual.';
        let fallback = document.getElementById('recommendation-copy-text');
        if (!fallback) {
          fallback = document.createElement('textarea');
          fallback.id = 'recommendation-copy-text';
          fallback.className = 'form-input';
          fallback.rows = 6;
          fallback.readOnly = true;
          document.getElementById('recommendation-form').appendChild(fallback);
        }
        fallback.value = text;
        fallback.focus();
        fallback.select();
      }
    });
  }

  return { open };
})();
