/**
 * Ephyra Finance — Mercado Favorites
 */
const MarketFavorites = (() => {
  async function toggle(email, assetId, assetType) {
    const data = await EphyraStorage.getUserData(email);
    if (!data) return false;
    if (!data.market) data.market = { favorites: [], alerts: [], defaultCurrency: 'BRL' };
    if (!data.market.favorites) data.market.favorites = [];

    const idx = data.market.favorites.findIndex(f => f.assetId === assetId);
    let isFav;
    if (idx >= 0) {
      data.market.favorites.splice(idx, 1);
      isFav = false;
    } else {
      data.market.favorites.push({ assetId, assetType, addedAt: new Date().toISOString() });
      isFav = true;
    }
    await EphyraStorage.saveUserData(email, data);
    return isFav;
  }

  function isFav(favorites, assetId) {
    return (favorites || []).some(f => f.assetId === assetId);
  }

  function sortByFav(list, favorites) {
    const favSet = new Set((favorites || []).map(f => f.assetId));
    return [...list].sort((a, b) => {
      const fa = favSet.has(a.code || a.ticker || a.id) ? 0 : 1;
      const fb = favSet.has(b.code || b.ticker || b.id) ? 0 : 1;
      return fa - fb;
    });
  }

  return { toggle, isFav, sortByFav };
})();
if(typeof window!=='undefined') window.MarketFavorites=MarketFavorites;
