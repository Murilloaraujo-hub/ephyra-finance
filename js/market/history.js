/**
 * Ephyra Finance — Market History (graph data generator)
 */
const MarketHistory = (() => {
  function generate(assetId, type, cache, points = 30) {
    let price = 1;
    if (type === 'fiat') {
      const local = cache?.defaultCurrency || 'BRL';
      price = MarketAPI.convert(1, assetId, local, cache) || 1;
    } else {
      const c = cache?.crypto?.[assetId] || MarketAPI.CRYPTO_MOCK[assetId];
      price = c ? MarketAPI.convert(1, assetId, cache?.defaultCurrency || 'BRL', cache) || c.priceUSD : 1;
    }
    return MarketAPI.generateHistory(price, points);
  }

  function getLabels(period) {
    const map = {
      '24h': { points: 24, label: '24 horas' },
      '7d': { points: 7, label: '7 dias' },
      '30d': { points: 30, label: '30 dias' },
      '90d': { points: 90, label: '90 dias' },
      '6m': { points: 180, label: '6 meses' },
      '1y': { points: 365, label: '1 ano' }
    };
    return map[period] || map['30d'];
  }

  return { generate, getLabels };
})();
if(typeof window!=='undefined') window.MarketHistory=MarketHistory;
