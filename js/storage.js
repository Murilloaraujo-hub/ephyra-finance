/**
 * Ephyra Finance vNEXT — High-level Storage (IndexedDB only)
 * Migração automática de LocalStorage legado → IndexedDB
 */
const EphyraStorage = (() => {
  'use strict';
  const LEGACY_USERS='ephyra_users', LEGACY_SESSION='ephyra_session', LEGACY_PREFIX='ephyra_data_', FLAG='migrated_from_localstorage_v1';
  let _ready=null, _usersCache=null, _sessionCache=null;
  const _dataCache=new Map();
  const _k = e => String(e||'').toLowerCase();
  const _clone = value => typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

  async function init(){
    if(_ready) return _ready;
    _ready=(async()=>{
      await EphyraDB.open();
      await migrate();
      const users=await EphyraDB.get('meta','users_map');
      _usersCache=users?.value||{};
      const sess=await EphyraDB.get('sessions','current');
      _sessionCache=sess||null;
    })().catch(err=>{console.error('[Storage] init',err);_ready=null;throw err;});
    return _ready;
  }

  async function migrate(){
    try{
      const done=await EphyraDB.metaGet(FLAG,false);
      if(done) return;
      let users={};
      try{users=JSON.parse(localStorage.getItem(LEGACY_USERS)||'{}')||{};}catch{users={};}
      if(users && Object.keys(users).length){
        await EphyraDB.put('meta',{key:'users_map',value:users});
        for(const [email,user] of Object.entries(users)){
          await EphyraDB.put('users',{...user,email:email.toLowerCase()});
          const lKey=LEGACY_PREFIX+email.replace(/[^a-zA-Z0-9]/g,'_');
          let raw=localStorage.getItem(lKey);
          if(raw){
            try{const data=JSON.parse(raw);await EphyraDB.put('userdata',{email:_k(email),data,updatedAt:new Date().toISOString()});}catch{}
          }
        }
      }
      try{
        const sess=JSON.parse(localStorage.getItem(LEGACY_SESSION)||'null');
        if(sess?.email) await EphyraDB.put('sessions',{id:'current',...sess});
      }catch{}
      await EphyraDB.metaSet(FLAG,true);
    }catch(err){console.error('[migrate]',err);try{await EphyraDB.metaSet(FLAG,true)}catch{}}
  }

  async function getUsers(){await init();if(_usersCache) return {..._usersCache};const row=await EphyraDB.get('meta','users_map');_usersCache=row?.value||{};return {..._usersCache};}
  async function saveUsers(users){await init();_usersCache={...users};await EphyraDB.put('meta',{key:'users_map',value:_usersCache});for(const [email,user] of Object.entries(_usersCache)){await EphyraDB.put('users',{...user,email:_k(email)});}}
  async function getUser(email){const users=await getUsers();return users[_k(email)]||users[email]||null;}
  async function upsertUser(user){const users=await getUsers();const email=_k(user.email);users[email]={...user,email};await saveUsers(users);return users[email];}
  async function getSession(){await init();if(_sessionCache) return {..._sessionCache};const row=await EphyraDB.get('sessions','current');_sessionCache=row||null;return _sessionCache?{..._sessionCache}:null;}
  async function saveSession(sess){await init();const payload={id:'current',...sess};_sessionCache=payload;await EphyraDB.put('sessions',payload);}
  async function clearSession(){await init();_sessionCache=null;await EphyraDB.remove('sessions','current');}
  async function getUserData(email){await init();const key=_k(email);if(_dataCache.has(key)) return _clone(_dataCache.get(key));const row=await EphyraDB.get('userdata',key);if(!row) return null;_dataCache.set(key,row.data);return _clone(row.data);}
  async function saveUserData(email,data){await init();const key=_k(email);_dataCache.set(key,data);await EphyraDB.put('userdata',{email:key,data,updatedAt:new Date().toISOString()});try{await _syncSlices(key,data);}catch(e){console.warn('[syncSlices]',e);}}
  async function removeUserData(email){await init();const key=_k(email);_dataCache.delete(key);await EphyraDB.remove('userdata',key);await _clearSlices(key);}
  async function _clearSlices(email){const stores=['transactions','goals','categories','achievements','history','notifications','market_favorites','market_alerts','monthly_summaries'];for(const s of stores){const rows=await EphyraDB.getAllByIndex(s,'email',email);for(const r of rows) await EphyraDB.remove(s,r.id);}await EphyraDB.remove('settings',email);await EphyraDB.remove('xp',email);await EphyraDB.remove('statistics',email);await EphyraDB.remove('market_settings',email);}
  async function _syncSlices(email,data){
    await EphyraDB.put('settings',{email,...(data.config||{})});
    await EphyraDB.put('xp',{email,xp:data.xp||0,nivel:data.nivel||1});
    await EphyraDB.put('market_settings',{email,defaultCurrency:data.market?.defaultCurrency||data.config?.moeda||'BRL',favorites:data.market?.favorites||[],updatedAt:new Date().toISOString()});
    await EphyraDB.put('statistics',{email,saldo:data.saldo||0,receitasCount:(data.receitas||[]).length,despesasCount:(data.despesas||[]).length,metasCount:(data.metas||[]).length,conquistasCount:(data.conquistas||[]).length,updatedAt:new Date().toISOString()});
    const replace=async(storeName,items,mapFn)=>{
      const exist=await EphyraDB.getAllByIndex(storeName,'email',email);
      for(const row of exist) await EphyraDB.remove(storeName,row.id);
      if(items?.length) await EphyraDB.putMany(storeName,items.map(mapFn));
    };
    await replace('transactions',[...(data.receitas||[]),...(data.despesas||[])],t=>({...t,id:t.id||`${email}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,email}));
    await replace('history',data.historico||[],t=>({...t,id:t.id||`${email}_h_${Date.now()}`,email}));
    await replace('goals',data.metas||[],g=>({...g,id:g.id||`${email}_g_${Date.now()}`,email}));
    await replace('categories',data.categorias||[],c=>({...c,id:c.id||`${email}_c_${Date.now()}`,email}));
    await replace('achievements',data.conquistas||[],a=>({...a,id:a.id?`${email}__${a.id}`:`${email}_a_${Date.now()}`,achievementId:a.id,email}));
    await replace('market_favorites',data.market?.favorites||[],f=>({id:`${email}__${f.assetId}`,email,assetId:f.assetId,assetType:f.assetType,addedAt:f.addedAt||new Date().toISOString()}));
    await replace('market_alerts',data.market?.alerts||[],al=>({id:al.id||`${email}_al_${Date.now()}`,email,...al}));
    await replace('monthly_summaries',data.monthlySummaries||[],summary=>({...summary,id:summary.id||`${email}__${summary.monthKey}`,email}));
  }
  async function exportAll(email){const user=await getUser(email);const data=await getUserData(email);return JSON.stringify({user,data,exp:new Date().toISOString(),version:'idb-v2'},null,2);}
  async function importAll(email,payload){let obj=payload;if(typeof payload==='string') obj=JSON.parse(payload);if(!obj?.data) throw new Error('Formato inválido');if(obj.user) await upsertUser({...obj.user,email:email||obj.user.email});await saveUserData(email||obj.user?.email,obj.data);return obj;}
  async function wipeEverything(){await init();await EphyraDB.clearAll();_usersCache={};_sessionCache=null;_dataCache.clear();try{const ks=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('ephyra_')) ks.push(k);}ks.forEach(k=>localStorage.removeItem(k));}catch{}}
  return{init,getUsers,saveUsers,getUser,upsertUser,getSession,saveSession,clearSession,getUserData,saveUserData,removeUserData,exportAll,importAll,wipeEverything,migrate};
})();
if(typeof window!=='undefined') window.EphyraStorage=EphyraStorage;
