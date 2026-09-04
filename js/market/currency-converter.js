
const CurrencyConverter = (() => {
  function getAllCodes(cache) {
    const fiat = Object.keys(cache?.fiat || MarketAPI.FIAT_MOCK);
    const crypto = Object.keys(cache?.crypto || MarketAPI.CRYPTO_MOCK);
    return [...fiat, ...crypto].sort();
  }

  function optionsHTML(selected, cache) {
    const codes = getAllCodes(cache);
    return codes.map(code => {
      const fiat = cache?.fiat?.[code] !== undefined || MarketAPI.FIAT_MOCK[code];
      const type = fiat ? 'Moeda' : 'Cripto';
      return `<option value="${code}" ${code===selected?'selected':''}>${code} — ${type}</option>`;
    }).join('');
  }

  function convertLive() {
    const from = document.getElementById('conv-from')?.value;
    const to = document.getElementById('conv-to')?.value;
    const amountEl = document.getElementById('conv-from-amount');
    const toEl = document.getElementById('conv-to-amount');
    const rateEl = document.getElementById('conv-rate-info');
    const cache = Market?.cache || {};

    if (!from || !to || !amountEl) return;

    const amount = parseFloat(amountEl.value) || 0;
    const result = MarketAPI.convert(amount, from, to, cache);

    if (result !== null && toEl) {
      toEl.value = result.toFixed(result < 1 ? 6 : 2);
    }

    if (rateEl && from && to) {
      const one = MarketAPI.convert(1, from, to, cache);
      if (one !== null) {
        rateEl.textContent = `1 ${from} = ${one.toFixed(one < 1 ? 6 : 4)} ${to}`;
      }
    }
  }

  function swap() {
    const fromSel = document.getElementById('conv-from');
    const toSel = document.getElementById('conv-to');
    const fromAmt = document.getElementById('conv-from-amount');
    const toAmt = document.getElementById('conv-to-amount');
    if (!fromSel || !toSel) return;
    const tmp = fromSel.value;
    fromSel.value = toSel.value;
    toSel.value = tmp;
    const tmpAmt = fromAmt.value;
    fromAmt.value = toAmt.value || tmpAmt;
    convertLive();
  }

  return { convertLive, swap, optionsHTML, getAllCodes };
})();
if(typeof window!=='undefined') window.CurrencyConverter=CurrencyConverter;
