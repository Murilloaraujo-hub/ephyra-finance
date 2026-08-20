/**
 * Ephyra Finance vNEXT — IndexedDB Database Layer
 * Único ponto de acesso ao IndexedDB. Nenhum outro módulo acessa IndexedDB diretamente.
 * Stores: users, sessions, userdata, transactions, goals, categories, achievements, settings, history, xp, notifications, statistics, market_favorites, market_alerts, market_cache, market_settings
 */
const EphyraDB = (() => {
  'use strict';
  const DB_NAME = 'EphyraFinanceDB';
  const DB_VERSION = 3; // monthly financial summaries
  let _db = null;
  let _opening = null;

  const STORES = {
    meta: { keyPath: 'key' },
    users: { keyPath: 'email', indexes: [{ name: 'nome', keyPath: 'nome' }] },
    sessions: { keyPath: 'id' },
    userdata: { keyPath: 'email' },
    transactions: { keyPath: 'id', indexes: [{ name: 'email', keyPath: 'email' }, { name: 'tipo', keyPath: 'tipo' }, { name: 'data', keyPath: 'data' }, { name: 'categoria', keyPath: 'categoria' }] },
    goals: { keyPath: 'id', indexes: [{ name: 'email', keyPath: 'email' }, { name: 'status', keyPath: 'status' }] },
    categories: { keyPath: 'id', indexes: [{ name: 'email', keyPath: 'email' }] },
    achievements: { keyPath: 'id', indexes: [{ name: 'email', keyPath: 'email' }] },
    settings: { keyPath: 'email' },
    history: { keyPath: 'id', indexes: [{ name: 'email', keyPath: 'email' }, { name: 'data', keyPath: 'data' }] },
    xp: { keyPath: 'email' },
    notifications: { keyPath: 'id', indexes: [{ name: 'email', keyPath: 'email' }] },
    statistics: { keyPath: 'email' },
    market_favorites: { keyPath: 'id', indexes: [{ name: 'email', keyPath: 'email' }] },
    market_alerts: { keyPath: 'id', indexes: [{ name: 'email', keyPath: 'email' }, { name: 'assetId', keyPath: 'assetId' }] },
    market_cache: { keyPath: 'key' },
    market_settings: { keyPath: 'email' },
    monthly_summaries: {
      keyPath: 'id',
      indexes: [
        { name: 'email', keyPath: 'email' },
        { name: 'monthKey', keyPath: 'monthKey' }
      ]
    }
  };

  function _req(r){return new Promise((res,rej)=>{r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error)});}
  function _txDone(tx){return new Promise((res,rej)=>{tx.oncomplete=()=>res();tx.onerror=()=>rej(tx.error);tx.onabort=()=>rej(tx.error)});}
  async function open(){
    if(_db) return _db;
    if(_opening) return _opening;
    _opening = new Promise((resolve,reject)=>{
      if(!('indexedDB' in window)){reject(new Error('IndexedDB não suportado'));return;}
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (ev)=>{
        const db = req.result;
        Object.entries(STORES).forEach(([name,cfg])=>{
          let store;
          if(!db.objectStoreNames.contains(name)){
            store = db.createObjectStore(name,{keyPath:cfg.keyPath});
          }else if(req.transaction){
            store = req.transaction.objectStore(name);
          }
          if(store && cfg.indexes){
            cfg.indexes.forEach(idx=>{
              if(!store.indexNames.contains(idx.name)){
                store.createIndex(idx.name, idx.keyPath, {unique: !!idx.unique});
              }
            });
          }
        });
      };
      req.onsuccess = ()=>{_db=req.result;_db.onversionchange=()=>{try{_db.close()}catch{}_db=null};_opening=null;resolve(_db);};
      req.onerror=()=>{_opening=null;reject(req.error)};
    });
    return _opening;
  }
  async function _store(name,mode='readonly'){const db=await open();const tx=db.transaction(name,mode);return{tx,store:tx.objectStore(name)};}
  async function put(s,v){const {tx,store}=await _store(s,'readwrite');store.put(v);await _txDone(tx);return v;}
  async function putMany(s,vals){const {tx,store}=await _store(s,'readwrite');vals.forEach(v=>store.put(v));await _txDone(tx);return vals;}
  async function get(s,k){const {store}=await _store(s,'readonly');return _req(store.get(k));}
  async function getAll(s){const {store}=await _store(s,'readonly');return _req(store.getAll());}
  async function getAllByIndex(s,idx,val){const {store}=await _store(s,'readonly');return _req(store.index(idx).getAll(val));}
  async function remove(s,k){const {tx,store}=await _store(s,'readwrite');store.delete(k);await _txDone(tx);}
  async function clear(s){const {tx,store}=await _store(s,'readwrite');store.clear();await _txDone(tx);}
  async function clearAll(){const db=await open();const names=Array.from(db.objectStoreNames);const tx=db.transaction(names,'readwrite');names.forEach(n=>tx.objectStore(n).clear());await _txDone(tx);}
  async function metaGet(k,fb=null){const r=await get('meta',k);return r?r.value:fb;}
  async function metaSet(k,v){return put('meta',{key:k,value:v});}
  async function close(){if(_db){try{_db.close()}catch{}_db=null;}}
  return{open,close,put,putMany,get,getAll,getAllByIndex,remove,clear,clearAll,metaGet,metaSet,STORES:Object.keys(STORES),DB_NAME,DB_VERSION};
})();
if(typeof window!=='undefined') window.EphyraDB=EphyraDB;
