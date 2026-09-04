
const MarketAlerts = (() => {
  async function add(email, { assetId, assetType, condition, value, currency }) {
    const data = await EphyraStorage.getUserData(email);
    if (!data.market) data.market = { favorites: [], alerts: [], defaultCurrency: 'BRL' };
    if (!data.market.alerts) data.market.alerts = [];
    const alert = {
      id: `al_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      assetId, assetType, condition, value: parseFloat(value), currency: currency || 'BRL',
      active: true, createdAt: new Date().toISOString()
    };
    data.market.alerts.push(alert);
    await EphyraStorage.saveUserData(email, data);
    return alert;
  }

  async function remove(email, alertId) {
    const data = await EphyraStorage.getUserData(email);
    if (!data?.market?.alerts) return false;
    data.market.alerts = data.market.alerts.filter(a => a.id !== alertId);
    await EphyraStorage.saveUserData(email, data);
    return true;
  }

  async function list(email) {
    const data = await EphyraStorage.getUserData(email);
    return data?.market?.alerts || [];
  }

  function check(alerts, cache, localCurrency) {
    const triggered = [];
    (alerts || []).forEach(alert => {
      if (!alert.active) return;
      let current = null;
      if (alert.assetType === 'fiat' || alert.assetId.length === 3) {
        current = MarketAPI.convert(1, alert.assetId, localCurrency || 'BRL', cache);
      } else {
        const crypto = cache?.crypto?.[alert.assetId] || MarketAPI.CRYPTO_MOCK[alert.assetId];
        if (crypto) {
          current = MarketAPI.convert(1, alert.assetId, localCurrency || 'BRL', cache) || crypto.priceUSD;
        }
      }
      if (current === null) return;
      const cond = alert.condition === '>' ? current > alert.value : current < alert.value;
      if (cond) triggered.push({ alert, current });
    });
    return triggered;
  }

  return { add, remove, list, check };
})();
if(typeof window!=='undefined') window.MarketAlerts=MarketAlerts;
