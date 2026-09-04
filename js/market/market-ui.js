const MarketUI=(()=>{
  'use strict';
  const esc=value=>String(value??'').replace(/[&<>"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[char]));

  function fmtMoney(value,currency='BRL'){
    if(value===null||value===undefined)return'Indisponível';
    const number=Number(value);
    if(!Number.isFinite(number))return'Indisponível';
    try{return number.toLocaleString('pt-BR',{style:'currency',currency,maximumFractionDigits:number>0&&number<.01?8:2})}
    catch{return`${number.toLocaleString('pt-BR',{maximumFractionDigits:8})} ${currency}`}
  }

  function compact(value){const number=Number(value);return Number.isFinite(number)?number.toLocaleString('pt-BR',{notation:'compact',maximumFractionDigits:2}):'—'}
  function time(value){const date=new Date(value||Date.now());return Number.isNaN(date.getTime())?'—':date.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}
  function variation(value){const number=Number(value)||0;return`<strong style="color:${number>=0?'var(--cg)':'var(--cr)'}">${number>=0?'+':''}${number.toFixed(2)}%</strong>`}

  function sparkline(values,isUp=true){
    const clean=(values||[]).map(Number).filter(Number.isFinite);
    if(clean.length<2)return'';
    const sampled=clean.length>30?clean.filter((_,index)=>index%Math.ceil(clean.length/30)===0):clean;
    const min=Math.min(...sampled),max=Math.max(...sampled),range=max-min||1;
    const points=sampled.map((value,index)=>`${(index/(sampled.length-1)*100).toFixed(2)},${(38-(value-min)/range*34).toFixed(2)}`).join(' ');
    return`<svg class="market-sparkline" viewBox="0 0 100 40" preserveAspectRatio="none" aria-hidden="true"><path d="M ${points.replace(/ /g,' L ')}" stroke="${isUp?'#10b981':'#ef4444'}"></path></svg>`;
  }

  function assetHeader({name,symbol,flag,icon,image}){
    const visual=image?`<img class="market-asset-icon" src="${esc(image)}" alt="">`:`<span class="market-asset-icon">${flag||icon||'●'}</span>`;
    return`<div class="market-asset-head">${visual}<div class="market-asset-copy"><div class="market-asset-name" title="${esc(name)}">${esc(name)}</div><div class="market-asset-symbol">${esc(symbol)}</div></div></div>`;
  }

  function cardCurrency(asset,localCurrency,favorites,cache){
    const fav=(favorites||[]).some(item=>item.assetId===asset.code);
    const converted=MarketAPI.convert(1,asset.code,localCurrency,cache);
    const change=Number(asset.change)||0,isUp=change>=0;
    return`<article class="card market-card">
      <div class="flx jb aic gs">${assetHeader({name:asset.name,symbol:asset.code,flag:asset.flag})}<button type="button" class="market-card-fav ${fav?'active':''}" aria-label="${fav?'Remover':'Adicionar'} ${asset.code} dos favoritos" onclick="Market.toggleFav('${asset.code}','fiat')"><i class="fas fa-star"></i></button></div>
      <div class="market-card-value"><div class="market-price">${fmtMoney(converted,localCurrency)}</div><div class="market-card-change ${isUp?'up':'down'}"><i class="fas fa-arrow-${isUp?'up':'down'}"></i> ${Math.abs(change).toFixed(2)}%</div></div>
      ${sparkline(asset.sparkline,isUp)}
      <div class="market-card-meta"><span>Atualizado ${time(cache?.timestamp)}</span><span>${asset.code}/${localCurrency}</span></div>
      <button type="button" class="btn btn-ghost btn-sm market-card-open" onclick="Market.showDetail('${asset.code}','fiat')">Ver detalhes <i class="fas fa-arrow-right"></i></button>
    </article>`;
  }

  function cardCrypto(asset,localCurrency,favorites,cache){
    const fav=(favorites||[]).some(item=>item.assetId===asset.ticker),priceLocal=MarketAPI.convert(1,asset.ticker,localCurrency,cache),change=Number(asset.change)||0,isUp=change>=0,ratio=asset.priceUSD?priceLocal/asset.priceUSD:1;
    return`<article class="card market-card">
      <div class="flx jb aic gs">${assetHeader({name:asset.name,symbol:asset.ticker,icon:asset.icon,image:asset.image})}<button type="button" class="market-card-fav ${fav?'active':''}" aria-label="${fav?'Remover':'Adicionar'} ${asset.ticker} dos favoritos" onclick="Market.toggleFav('${asset.ticker}','crypto')"><i class="fas fa-star"></i></button></div>
      <div class="market-card-value"><div class="market-price">${fmtMoney(priceLocal,localCurrency)}</div><div class="market-card-change ${isUp?'up':'down'}"><i class="fas fa-arrow-${isUp?'up':'down'}"></i> ${Math.abs(change).toFixed(2)}% 24h</div></div>
      ${sparkline(asset.sparkline,isUp)}
      <div class="market-card-meta market-card-data"><span>Máx. ${fmtMoney((asset.high||0)*ratio,localCurrency)}</span><span>Mín. ${fmtMoney((asset.low||0)*ratio,localCurrency)}</span><span>Vol. ${compact(asset.volume)}</span><span>Cap. ${compact(asset.marketCap)}</span></div>
      <div class="market-card-meta"><span>Atualizado ${time(asset.lastUpdated||cache?.timestamp)}</span></div>
      <button type="button" class="btn btn-ghost btn-sm market-card-open" onclick="Market.showDetail('${asset.ticker}','crypto')">Ver detalhes <i class="fas fa-arrow-right"></i></button>
    </article>`;
  }

  function converterTab(cache,localCurrency){
    const options=[...MarketAPI.fiatAssets(cache).map(item=>({code:item.code,name:item.name})),...MarketAPI.cryptoAssets(cache).map(item=>({code:item.ticker,name:item.name}))].sort((a,b)=>a.code.localeCompare(b.code)).map(item=>`<option value="${item.code}">${item.code} — ${esc(item.name)}</option>`).join('');
    return`<div class="card"><div class="market-section-heading"><div><h3><i class="fas fa-exchange-alt"></i> Conversor universal</h3><p>Moedas e criptomoedas com atualização automática</p></div></div><div class="converter-grid"><div class="fg"><label class="fl" for="conv-from-amount">De</label><div class="converter-fields"><input id="conv-from-amount" type="number" value="100" min="0" class="form-input" oninput="Market.convertLive()" aria-label="Valor de origem"><select id="conv-from" class="form-input" onchange="Market.convertLive()" aria-label="Moeda de origem">${options}</select></div></div><button type="button" class="converter-swap" onclick="Market.swapConverter()" aria-label="Inverter moedas"><i class="fas fa-exchange-alt"></i></button><div class="fg"><label class="fl" for="conv-to-amount">Para</label><div class="converter-fields"><input id="conv-to-amount" type="number" min="0" class="form-input" oninput="Market.convertReverse()" aria-label="Valor convertido"><select id="conv-to" class="form-input" onchange="Market.convertLive()" aria-label="Moeda de destino">${options}</select></div></div></div><div class="tc2" style="margin-top:1rem"><span id="conv-rate-info" class="txs tm">Aguardando cotação</span></div><div id="conv-result" class="converter-result" style="margin-top:1rem;text-align:center;font-weight:850"></div></div>`;
  }

  function trendPanel(title,subtitle,assets,localCurrency,cache,positive){
    return`<section class="market-trend-panel"><div class="market-section-heading"><div><h3>${title}</h3><p>${subtitle}</p></div></div><div class="market-trend-list">${assets.slice(0,10).map(asset=>{const type=asset.assetType||'crypto',code=type==='fiat'?asset.code:asset.ticker,price=MarketAPI.convert(1,code,localCurrency,cache),change=Number(asset.change)||0;return`<button class="market-trend-item" onclick="Market.showDetail('${code}','${type}')"><strong>${code}</strong><span style="color:${positive?'var(--cg)':'var(--cr)'}">${positive?'+':''}${change.toFixed(2)}%</span><span>${fmtMoney(price,localCurrency)}</span></button>`}).join('')}</div></section>`;
  }

  function favoritesTab(fiat,crypto,favorites,localCurrency,cache){
    const ids=new Set((favorites||[]).map(item=>item.assetId)),favFiat=fiat.filter(item=>ids.has(item.code)),favCrypto=crypto.filter(item=>ids.has(item.ticker));
    if(!favFiat.length&&!favCrypto.length)return`<div class="es"><div class="ei">⭐</div><h3>Nenhum favorito</h3><p>Marque moedas e criptomoedas para vê-las primeiro.</p></div>`;
    return`<div class="ga">${favFiat.map(item=>cardCurrency(item,localCurrency,favorites,cache)).join('')}${favCrypto.map(item=>cardCrypto(item,localCurrency,favorites,cache)).join('')}</div>`;
  }

  function detailModal(assetId,assetType,info,localCurrency,cache){
    const price=MarketAPI.convert(1,assetId,localCurrency,cache),ratio=assetType==='crypto'&&info.priceUSD?price/info.priceUSD:1,high=assetType==='crypto'?(info.high||info.priceUSD)*ratio:price*1.01,low=assetType==='crypto'?(info.low||info.priceUSD)*ratio:price*.99,ath=assetType==='crypto'?(info.ath||info.priceUSD*1.8)*ratio:price*1.15,atl=assetType==='crypto'?(info.atl||info.priceUSD*.4)*ratio:price*.85;
    return`<div class="market-detail">
      <div class="flx aic gs" style="margin-bottom:1rem">${assetHeader({name:info.name||assetId,symbol:assetId,flag:info.flag,icon:info.icon,image:info.image})}</div>
      <div class="market-price market-detail-price">${fmtMoney(price,localCurrency)}</div>
      <div class="market-detail-stats"><div class="card"><span class="txs tm">Mínima do dia</span><strong>${fmtMoney(low,localCurrency)}</strong></div><div class="card"><span class="txs tm">Máxima do dia</span><strong>${fmtMoney(high,localCurrency)}</strong></div><div class="card"><span class="txs tm">Volume</span><strong>${assetType==='crypto'?compact(info.volume):'—'}</strong></div><div class="card"><span class="txs tm">Capitalização</span><strong>${assetType==='crypto'?compact(info.marketCap):'—'}</strong></div><div class="card"><span class="txs tm">Variação semanal</span>${variation(info.change7d)}</div><div class="card"><span class="txs tm">Variação mensal</span>${variation(info.change30d)}</div></div>
      <div class="market-periods"><button class="btn btn-outline btn-sm" onclick="Market.setPeriod('24h')">24h</button><button class="btn btn-outline btn-sm" onclick="Market.setPeriod('7d')">7d</button><button class="btn btn-outline btn-sm" onclick="Market.setPeriod('30d')">30d</button><button class="btn btn-outline btn-sm" onclick="Market.setPeriod('90d')">90d</button><button class="btn btn-outline btn-sm" onclick="Market.setPeriod('6m')">6m</button><button class="btn btn-outline btn-sm" onclick="Market.setPeriod('1y')">1a</button></div>
      <div class="cw market-detail-chart"><canvas id="market-history-chart"></canvas></div>
      <div class="g2" style="margin-top:1rem"><div class="card"><div class="txs tm">Máxima histórica</div><div class="f7 market-price">${fmtMoney(ath,localCurrency)}</div></div><div class="card"><div class="txs tm">Mínima histórica</div><div class="f7 market-price">${fmtMoney(atl,localCurrency)}</div></div></div>
      <div class="card market-quick-convert"><div class="market-section-heading"><div><h3>Conversão rápida</h3><p>Converta ${assetId} para ${localCurrency}</p></div></div><div class="converter-fields"><input id="detail-quick-amount" type="number" min="0" value="1" class="form-input" oninput="Market.quickConvert('${assetId}')"><input id="detail-quick-result" class="form-input" readonly></div></div>
      <h3 class="f7" style="margin:.9rem 0 .5rem"><i class="fas fa-bell"></i> Criar alerta</h3><div class="market-alert-form"><select id="alert-cond" class="form-input"><option value=">">Maior que</option><option value="<">Menor que</option></select><input id="alert-value" type="number" step="0.01" placeholder="Valor em ${localCurrency}" class="form-input"><button class="btn btn-primary btn-sm" onclick="Market.createAlert('${assetId}','${assetType}')"><i class="fas fa-plus"></i> Alerta</button></div><div id="alerts-list" style="margin-top:1rem"></div>
    </div>`;
  }

  return{fmtMoney,cardCurrency,cardCrypto,converterTab,trendPanel,favoritesTab,detailModal};
})();
if(typeof window!=='undefined')window.MarketUI=MarketUI;
