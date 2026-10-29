/* ===== js/market/market-api.js ===== */
/**
 * Catálogo de moedas e criptomoedas com valores FIXOS de demonstração.
 *
 * Não há nenhuma chamada de rede: os preços são constantes definidas neste arquivo
 * e servem apenas para demonstrar a interface. Eles NÃO representam cotações reais
 * e nunca são atualizados. O selo da tela de Mercado informa isso ao usuário.
 */
const MarketAPI=(()=>{
'use strict';
const FIAT_CATALOG={BRL:['Real Brasileiro','🇧🇷',5.10],USD:['Dólar Americano','🇺🇸',1],EUR:['Euro','🇪🇺',.87],GBP:['Libra Esterlina','🇬🇧',.75],CHF:['Franco Suíço','🇨🇭',.81],JPY:['Iene Japonês','🇯🇵',157],CNY:['Yuan Chinês','🇨🇳',6.76],CAD:['Dólar Canadense','🇨🇦',1.40],AUD:['Dólar Australiano','🇦🇺',1.43],ARS:['Peso Argentino','🇦🇷',1490],MXN:['Peso Mexicano','🇲🇽',17.3],CLP:['Peso Chileno','🇨🇱',925],COP:['Peso Colombiano','🇨🇴',3238],PEN:['Sol Peruano','🇵🇪',3.38],PYG:['Guarani Paraguaio','🇵🇾',5972],UYU:['Peso Uruguaio','🇺🇾',40.3],BOB:['Boliviano','🇧🇴',6.91],RUB:['Rublo Russo','🇷🇺',80.4],INR:['Rupia Indiana','🇮🇳',95.4],KRW:['Won Sul-Coreano','🇰🇷',1428],SGD:['Dólar de Singapura','🇸🇬',1.28],SEK:['Coroa Sueca','🇸🇪',9.56],NOK:['Coroa Norueguesa','🇳🇴',9.54],DKK:['Coroa Dinamarquesa','🇩🇰',6.49],ZAR:['Rand Sul-Africano','🇿🇦',16.5],TRY:['Lira Turca','🇹🇷',47.5],AED:['Dirham dos Emirados','🇦🇪',3.67],SAR:['Riyal Saudita','🇸🇦',3.75],THB:['Baht Tailandês','🇹🇭',33.4],MYR:['Ringgit Malaio','🇲🇾',4.10],HKD:['Dólar de Hong Kong','🇭🇰',7.84],NZD:['Dólar Neozelandês','🇳🇿',1.70],IDR:['Rupia Indonésia','🇮🇩',18035],PHP:['Peso Filipino','🇵🇭',61],VND:['Dong Vietnamita','🇻🇳',26278],TWD:['Novo Dólar Taiwanês','🇹🇼',32.4],ILS:['Novo Shekel Israelense','🇮🇱',3.04],PLN:['Zloty Polonês','🇵🇱',3.75],CZK:['Coroa Tcheca','🇨🇿',21],HUF:['Forint Húngaro','🇭🇺',316],RON:['Leu Romeno','🇷🇴',4.56],BGN:['Lev Búlgaro','🇧🇬',1.70],ISK:['Coroa Islandesa','🇮🇸',123],EGP:['Libra Egípcia','🇪🇬',50],NGN:['Naira Nigeriana','🇳🇬',1364],KES:['Xelim Queniano','🇰🇪',129],MAD:['Dirham Marroquino','🇲🇦',9.34],QAR:['Riyal Catariano','🇶🇦',3.64],KWD:['Dinar Kuwaitiano','🇰🇼',.31],BHD:['Dinar do Bahrein','🇧🇭',.376],OMR:['Rial Omanense','🇴🇲',.385],PKR:['Rupia Paquistanesa','🇵🇰',278],BDT:['Taka de Bangladesh','🇧🇩',124],LKR:['Rupia do Sri Lanka','🇱🇰',336],UAH:['Hryvnia Ucraniana','🇺🇦',44.8]};
const REQUIRED_CRYPTO={BTC:['bitcoin','Bitcoin','₿',64000],ETH:['ethereum','Ethereum','Ξ',1870],SOL:['solana','Solana','◎',74],BNB:['binancecoin','BNB','B',593],XRP:['ripple','XRP','✕',1.08],ADA:['cardano','Cardano','₳',.19],DOGE:['dogecoin','Dogecoin','Ð',.07],TRX:['tron','TRON','T',.33],DOT:['polkadot','Polkadot','●',1.45],LINK:['chainlink','Chainlink','⬡',8.2],LTC:['litecoin','Litecoin','Ł',44.6],AVAX:['avalanche-2','Avalanche','A',6.9],XLM:['stellar','Stellar','✦',.17],XMR:['monero','Monero','ɱ',363],TON:['the-open-network','Toncoin','◇',1.65],SHIB:['shiba-inu','Shiba Inu','S',.000005],SUI:['sui','Sui','S',.68],APT:['aptos','Aptos','A',1.9],ATOM:['cosmos','Cosmos','⚛',2.1],HBAR:['hedera-hashgraph','Hedera','H',.075],ICP:['internet-computer','Internet Computer','∞',3.1],NEAR:['near','NEAR Protocol','N',1.75],ARB:['arbitrum','Arbitrum','A',.09],OP:['optimism','Optimism','O',.09],PEPE:['pepe','Pepe','P',.000003]};
const EXTRA_FIAT_CODES='AFN ALL AMD ANG AOA AWG AZN BAM BBD BDT BGN BIF BMD BND BOB BSD BTN BWP BYN BZD CDF CRC CUP CVE DJF DOP DZD ETB FJD FKP GEL GHS GIP GMD GNF GTQ GYD HNL HRK HTG IQD IRR JMD JOD KGS KHR KMF KYD KZT LAK LBP LRD LSL LYD MDL MGA MKD MMK MNT MOP MRU MUR MVR MWK MZN NAD NIO NPR PAB PGK RSD RWF SBD SCR SDG SHP SLE SLL SOS SRD SSP STN SVC SZL TJS TMT TND TOP TTD TZS UGX UZS VES VUV WST XAF XCD XOF XPF YER ZMW ZWL'.split(' ');
const ALL_FIAT_CODES=[...new Set([...Object.keys(FIAT_CATALOG),...EXTRA_FIAT_CODES])];
const currencyNames=typeof Intl.DisplayNames==='function'?new Intl.DisplayNames(['pt-BR'],{type:'currency'}):null;
function fiatMeta(code){return FIAT_CATALOG[code]?{name:FIAT_CATALOG[code][0],flag:FIAT_CATALOG[code][1]}:{name:currencyNames?.of(code)||code,flag:'💱'}}
function makeSparkline(base,change=0,points=24){const values=[],start=base/(1+change/100||1);for(let i=0;i<points;i++){const p=i/(points-1||1),wave=Math.sin(i*.85)*base*.004+Math.cos(i*.31)*base*.002;values.push(Math.max(0,start+(base-start)*p+wave))}values[values.length-1]=base;return values}
const CRYPTO_MOCK=Object.fromEntries(Object.entries(REQUIRED_CRYPTO).map(([ticker,[id,name,icon,price]],index)=>[ticker,{id,name,ticker,icon,priceUSD:price,change:((index%7)-3)*.72,change7d:((index%9)-4)*1.18,change30d:((index%11)-5)*2.15,high:price*1.025,low:price*.975,volume:Math.max(25e6,price*1.2e6),marketCap:Math.max(1e9,price*18e6),sparkline:makeSparkline(price,((index%7)-3)*.72,24),lastUpdated:new Date().toISOString()}]));
const FIAT_MOCK_BASE=Object.fromEntries(Object.entries(FIAT_CATALOG).map(([code,[name,flag,rate]])=>[code,{name,flag,rate}]));

/**
 * "Busca" as taxas de câmbio locais. Mantém o nome antigo para compatibilidade,
 * mas resolve imediatamente com o catálogo embutido (nenhuma requisição é feita).
 */
async function fetchFiat(base='USD'){
  const baseRate=Number(FIAT_CATALOG[base]?.[2])||1;
  const rates={},changes={},sparklines={};
  for(const [code,meta] of Object.entries(FIAT_CATALOG)){
    const value=Number(meta[2])/baseRate;
    rates[code]=Number(value.toFixed(6));
    changes[code]=0;
    sparklines[code]=makeSparkline(value,0);
  }
  return {rates,changes,sparklines,simulated:true};
}

/** Devolve a lista fixa de criptomoedas de demonstração. */
async function fetchCrypto(){
  return Object.values(CRYPTO_MOCK).map(item=>({...item,simulated:true}));
}

/** Monta o "cache" do mercado a partir dos dados locais. */
async function fetchAll(base='USD'){
  const[fiat,crypto]=await Promise.all([fetchFiat(base),fetchCrypto()]);
  const payload={key:'market_cache',fiat:fiat.rates,fiatChanges:fiat.changes,fiatSparklines:fiat.sparklines,
    crypto:Object.fromEntries(crypto.map(item=>[item.ticker,item])),simulated:true,updatedAt:new Date().toISOString()};
  try{await EphyraDB.put('market_cache',payload)}catch{}
  return payload;
}

/** Cache persistido (IndexedDB) ou, na primeira execução, os dados locais. */
async function getCache(){
  try{const cached=await EphyraDB.get('market_cache','market_cache');if(cached)return cached}catch{}
  return fetchAll('USD');
}

function convert(amount,from,to,cache){const value=Number(amount);if(!Number.isFinite(value)||value<0)return null;const fiat=cache?.fiat||Object.fromEntries(Object.entries(FIAT_CATALOG).map(([code,meta])=>[code,meta[2]])),crypto=cache?.crypto||CRYPTO_MOCK,source=String(from||'').toUpperCase(),target=String(to||'').toUpperCase();let usd;if(Number.isFinite(fiat[source])&&fiat[source]>0)usd=value/fiat[source];else if(crypto[source]?.priceUSD>0)usd=value*crypto[source].priceUSD;else return null;if(Number.isFinite(fiat[target])&&fiat[target]>0)return usd*fiat[target];if(crypto[target]?.priceUSD>0)return usd/crypto[target].priceUSD;return null}

/**
 * Histórico ilustrativo gerado localmente a partir do preço fixo do ativo.
 * O resultado é determinístico (mesmo ativo + período = mesma curva).
 */
async function fetchHistory(assetId,assetType,period,localCurrency,cache){
  const points={"24h":24,"7d":28,"30d":30,"90d":30,"6m":30,"1y":30}[period]||30;
  let base=1;
  if(assetType==='crypto'){
    const info=Object.values(cache?.crypto||CRYPTO_MOCK).find(item=>item.id===assetId||item.ticker===assetId);
    base=convert(info?.priceUSD||1,'USD',localCurrency,cache)||1;
  }else{
    base=convert(1,assetId,localCurrency,cache)||1;
  }
  const series=[];
  const noise=i=>Math.sin(i*.7)*0.012+Math.cos(i*.23)*0.008+Math.sin(i*1.9)*0.004;
  for(let i=0;i<points;i++){series.push(Number((base*(1+noise(i)*(1+i/points))).toFixed(base<1?6:2)))}
  return series;
}

function fiatAssets(cache){const rates=cache?.fiat||{},codes=new Set([...Object.keys(FIAT_CATALOG),...Object.keys(rates)]);return[...codes].filter(code=>ALL_FIAT_CODES.includes(code)).map(code=>{const meta=fiatMeta(code),rate=Number(rates[code])||FIAT_CATALOG[code]?.[2];return{code,name:meta.name,flag:meta.flag,rate,change:cache?.fiatChanges?.[code]||0,sparkline:cache?.fiatSparklines?.[code]||makeSparkline(rate||1,0,20)}}).filter(item=>Number.isFinite(item.rate)&&item.rate>0)}
function cryptoAssets(cache){const merged={...CRYPTO_MOCK,...(cache?.crypto||{})};return Object.entries(merged).map(([ticker,info])=>({ticker,...info})).filter(item=>Number.isFinite(item.priceUSD)&&item.priceUSD>0).sort((a,b)=>(b.marketCap||0)-(a.marketCap||0))}

return{fetchFiat,fetchCrypto,fetchAll,getCache,convert,fetchHistory,fiatAssets,cryptoAssets,makeSparkline,fiatMeta,
  FIAT_MOCK:FIAT_MOCK_BASE,FIAT_CATALOG,CRYPTO_MOCK,REQUIRED_CRYPTO};
})();
if(typeof window!=='undefined')window.MarketAPI=MarketAPI;
