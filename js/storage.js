const EphyraStorage = (() => {
  'use strict';
  const LEGACY_USERS='ephyra_users', LEGACY_SESSION='ephyra_session', LEGACY_PREFIX='ephyra_data_', FLAG='migrated_from_localstorage_v1', TEMP_SESSION='ephyra_temporary_session';
  let _ready=null, _usersCache=null, _sessionCache=null;
  const _dataCache=new Map(), _writes=new Map(), _deleted=new Set();
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
      await EphyraDB.remove('sessions','current');
      _sessionCache=null;
      for(const user of Object.values(_usersCache)){
        if(typeof user.senha==='string'){if(!user.senhaHash)user.senhaHash=await EphyraSecurity.hashPassword(user.senha);delete user.senha;}
      }
      await EphyraDB.put('meta',{key:'users_map',value:_usersCache});
      for(const [email,user] of Object.entries(_usersCache))await EphyraDB.put('users',{...user,email:_k(email)});
      localStorage.removeItem(LEGACY_USERS);localStorage.removeItem(LEGACY_SESSION);
      for(const email of Object.keys(_usersCache))if(await EphyraDB.get('userdata',_k(email)))localStorage.removeItem(LEGACY_PREFIX+email.replace(/[^a-zA-Z0-9]/g,'_'));
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
    }catch(err){console.error('[migrate]',err);throw err;}
  }

  async function getUsers(){await init();if(_usersCache) return {..._usersCache};const row=await EphyraDB.get('meta','users_map');_usersCache=row?.value||{};return {..._usersCache};}
  async function saveUsers(users){await init();_usersCache={...users};await EphyraDB.put('meta',{key:'users_map',value:_usersCache});for(const [email,user] of Object.entries(_usersCache)){await EphyraDB.put('users',{...user,email:_k(email)});}}
  async function getUser(email){const users=await getUsers();return users[_k(email)]||users[email]||null;}
  async function upsertUser(user){const users=await getUsers();const id=_k(user.id||user.email);if(_deleted.has(id)||await EphyraDB.metaGet('deleted_uid:'+id,false))throw new Error('Conta excluída');users[id]={...user};await saveUsers(users);return users[id];}
  function getTemporarySession(){try{const value=JSON.parse(sessionStorage.getItem(TEMP_SESSION)||'null');return value?.email?value:null}catch{return null}}
  async function getSession(){
    await init();const session=getTemporarySession(),now=Date.now();
    if(!session||!Number.isFinite(session.createdAt)||!Number.isFinite(session.lastActive)||now-session.createdAt>8*60*60*1000||now-session.lastActive>30*60*1000||session.createdAt>now||session.lastActive>now){await clearSession();return null;}
    if(!await getUser(session.email)){await clearSession();return null;}
    return {...session,id:'current',remember:false};
  }
  async function saveSession(sess){
    await init();const email=_k(sess?.email),now=Date.now();
    if(!email||!await getUser(email))throw new Error('Sessão inválida');
    const payload={email,createdAt:now,lastActive:now};
    sessionStorage.setItem(TEMP_SESSION,JSON.stringify(payload));
    if(sess?.remember)localStorage.setItem('ephyra_remembered_email',email);
    else localStorage.removeItem('ephyra_remembered_email');
    _sessionCache=null;await EphyraDB.remove('sessions','current');
  }
  async function touchSession(){const session=await getSession();if(!session)return false;session.lastActive=Date.now();sessionStorage.setItem(TEMP_SESSION,JSON.stringify(session));return true;}
  async function clearSession(){await init();_sessionCache=null;try{sessionStorage.removeItem(TEMP_SESSION)}catch{}await EphyraDB.remove('sessions','current');}
  function sanitize(d) {
    if (!d || typeof d !== 'object' || Array.isArray(d)) throw new Error('Dados inválidos');
    const generatedIds=new Map();
    const safeId=(value,prefix,fingerprint='')=>{
      const id=String(value||'');
      if(/^[a-zA-Z0-9_-]{1,120}$/.test(id)) return id;
      const key=`${prefix}:${id||fingerprint||Math.random().toString(36)}`;
      if(!generatedIds.has(key)) generatedIds.set(key,`${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,8)}`);
      return generatedIds.get(key);
    };
    d.saldo = Number.isFinite(Number(d.saldo)) ? Number(d.saldo) : 0;
    const cleanMoney=value=>Number.isFinite(Number(value))?Math.max(0,Number(value)):0;
    const cleanTransaction=item=>{
      const cleaned={...item,valor:cleanMoney(item?.valor),nome:String(item?.nome||'Movimentação').slice(0,200),descricao:String(item?.descricao||'').slice(0,2000),tipo:item?.tipo==='receita'?'receita':'despesa'};
      cleaned.categoria=/^[a-zA-Z0-9_-]{1,120}$/.test(item?.categoria||'')?item.categoria:'outros_desp';
      if(!/^[A-Z0-9]{2,12}$/.test(cleaned.moedaOriginal||''))delete cleaned.moedaOriginal;
      if(cleaned.moedaOriginal){cleaned.valorOriginal=cleanMoney(cleaned.valorOriginal);cleaned.taxaConversao=cleanMoney(cleaned.taxaConversao);}
      if(!cleaned.moedaOriginal){delete cleaned.valorOriginal;delete cleaned.taxaConversao;delete cleaned.valorConvertido;}
      return cleaned;
    };
    const txFingerprint=item=>`${item?.dataCriacao||item?.DataCriacao||item?.data||''}_${item?.nome||''}_${item?.valor||0}`;
    d.receitas = Array.isArray(d.receitas) ? d.receitas.map(item=>({...cleanTransaction(item),id:safeId(item?.id,'tx',txFingerprint(item)),tipo:'receita'})) : [];
    d.despesas = Array.isArray(d.despesas) ? d.despesas.map(item=>({...cleanTransaction(item),id:safeId(item?.id,'tx',txFingerprint(item)),tipo:'despesa'})) : [];
    let refundedGoalExcess=0;
    d.metas = Array.isArray(d.metas) ? d.metas.map(item=>{const valorObjetivo=Math.max(.01,cleanMoney(item?.valorObjetivo)),saved=cleanMoney(item?.valorGuardado),valorGuardado=Math.min(saved,valorObjetivo),completed=valorGuardado>=valorObjetivo;refundedGoalExcess+=Math.max(0,saved-valorObjetivo);const goal={...item,id:safeId(item?.id,'goal',`${item?.dataCriacao||''}_${item?.nome||''}`),valorObjetivo,valorGuardado,status:completed?'concluida':'ativa',cor:/^#[0-9a-f]{6}$/i.test(item?.cor)?item.cor:'#3b82f6'};if(completed)goal.dataConclusao=goal.dataConclusao||new Date().toISOString();else delete goal.dataConclusao;return goal}) : [];
    if(refundedGoalExcess)d.saldo+=refundedGoalExcess;
    d.historico = Array.isArray(d.historico) ? d.historico.map(item=>({...cleanTransaction(item),id:safeId(item?.id,'tx',txFingerprint(item))})) : [];
    d.conquistas = Array.isArray(d.conquistas) ? d.conquistas : [];
    d.categorias = Array.isArray(d.categorias) ? d.categorias.filter(item=>item&&typeof item==='object').slice(0,500).map(item=>({id:safeId(item.id,'cat'),nome:String(item.nome||'Outros').slice(0,120),tipo:item.tipo==='receita'?'receita':'despesa',cor:/^#[0-9a-f]{6}$/i.test(item.cor||'')?item.cor:'#64748b',icone:/^fa-[a-z0-9-]{1,60}$/.test(item.icone||'')?item.icone:'fa-circle'})) : [];
    d.xp = Number.isFinite(Number(d.xp)) ? Number(d.xp) : 0;
    d.nivel = Number.isFinite(Number(d.nivel)) ? Number(d.nivel) : 1;
    d.config = d.config || {};
    d.config.tema = d.config.tema==='light'?'light':'dark';
    d.config.moeda = /^[A-Z]{3}$/.test(d.config.moeda||'')?d.config.moeda:'BRL';
    d.config.baseCurrency = /^[A-Z]{3}$/.test(d.config.baseCurrency||'')?d.config.baseCurrency:'BRL';
    d.config.diasUsando = Number(d.config.diasUsando) || 1;
    d.config.ultimoLogin = d.config.ultimoLogin || new Date().toISOString();
    d.market = d.market || {};
    d.market.favorites = Array.isArray(d.market.favorites) ? d.market.favorites : [];
    d.market.alerts = Array.isArray(d.market.alerts) ? d.market.alerts.filter(item=>item&&/^[A-Z0-9]{2,12}$/.test(item.assetId||'')).slice(0,500).map(item=>({...item,id:safeId(item.id,'alert'),condition:item.condition==='>'?'>':'<',value:cleanMoney(item.value),currency:/^[A-Z]{3}$/.test(item.currency||'')?item.currency:'BRL',assetType:item.assetType==='fiat'?'fiat':'crypto',active:!!item.active})) : [];
    d.market.defaultCurrency = /^[A-Z]{3}$/.test(d.market.defaultCurrency||'')?d.market.defaultCurrency:d.config.moeda;
    d.monthlySummaries = Array.isArray(d.monthlySummaries) ? d.monthlySummaries : [];
    const assistantPages=new Set(['dashboard','transacoes','metas','mercado','conquistas','perfil','configuracoes','resumo']);
    d.assistantHistory = Array.isArray(d.assistantHistory) ? d.assistantHistory.slice(-40).map(item=>{const filter=item?.action?.filter&&typeof item.action.filter==='object'?{tipo:['todos','receita','despesa'].includes(item.action.filter.tipo)?item.action.filter.tipo:'todos',categoria:/^[a-zA-Z0-9_-]{1,120}$/.test(item.action.filter.categoria||'')?item.action.filter.categoria:''}:undefined,action=item?.action&&typeof item.action==='object'?{label:String(item.action.label||'').slice(0,80),page:assistantPages.has(item.action.page)?item.action.page:undefined,command:item.action.command==='receita'?'receita':undefined,filter}:null;return{role:item?.role==='user'?'user':'assistant',text:String(item?.text||'').slice(0,2000),time:item?.time||new Date().toISOString(),action:action&&(action.page||action.command)?action:null}}) : [];
    return d;
  }

  async function getUserData(email){await init();const key=_k(email);if(_dataCache.has(key)) return _clone(_dataCache.get(key));const row=await EphyraDB.get('userdata',key);if(!row) return null;const sanitized = sanitize(row.data);_dataCache.set(key,sanitized);return _clone(sanitized);}
  async function writeUserData(email,data){await init();const key=_k(email);const sanitized=sanitize(data);_dataCache.set(key,sanitized);await EphyraDB.put('userdata',{email:key,data:sanitized,updatedAt:new Date().toISOString()});try{await _syncSlices(key,sanitized);}catch(e){console.warn('[syncSlices]',e);}}
  function saveUserData(email,data){
    const id=_k(email),snapshot=_clone(data);
    const job=(_writes.get(id)||Promise.resolve()).catch(()=>{}).then(async()=>{
      await init();if(_deleted.has(id)||await EphyraDB.metaGet('deleted_uid:'+id,false))return;
      await writeUserData(id,snapshot);
    });
    _writes.set(id,job);return job;
  }
  async function resetLegacyAccounts(){
    await EphyraDB.open();
    if(await EphyraDB.metaGet('remote_auth_v1',false))return false;
    // Owner-authorized, one-time removal of the old browser-only accounts.
    await EphyraDB.clearAll();
    for(const storage of [localStorage,sessionStorage]){
      const keys=[];for(let i=0;i<storage.length;i++){const key=storage.key(i);if(key?.startsWith('ephyra_'))keys.push(key);}
      keys.forEach(key=>storage.removeItem(key));
    }
    _usersCache={};_sessionCache=null;_dataCache.clear();_ready=null;
    await EphyraDB.metaSet('migrated_from_localstorage_v1',true);
    await EphyraDB.metaSet('remote_auth_v1',true);
    return true;
  }
  async function removeAccount(id){
    await init();id=_k(id);_deleted.add(id);
    await EphyraDB.metaSet('deleted_uid:'+id,true);
    await (_writes.get(id)||Promise.resolve()).catch(()=>{});
    const users=await getUsers(),email=users[id]?.email;delete users[id];
    await saveUsers(users);await EphyraDB.remove('users',id);await removeUserData(id);
    const suffix=id.replace(/[^a-z0-9]/gi,'_');
    localStorage.removeItem('ephyra_monthly_summaries_'+suffix);
    localStorage.removeItem('ephyra_market_favorites_'+suffix);
    localStorage.removeItem('ephyra_tutorial_completed_'+suffix);
    if(localStorage.getItem('ephyra_remembered_email')===email)localStorage.removeItem('ephyra_remembered_email');
    localStorage.setItem('ephyra_deleted_account',JSON.stringify({id,time:Date.now()}));
  }
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
    await replace('transactions',[...(data.receitas||[]),...(data.despesas||[])],t=>({...t,sourceId:t.id,id:`${email}__${t.id}`,email}));
    await replace('history',data.historico||[],t=>({...t,sourceId:t.id,id:`${email}__${t.id}`,email}));
    await replace('goals',data.metas||[],g=>({...g,sourceId:g.id,id:`${email}__${g.id}`,email}));
    await replace('categories',data.categorias||[],c=>({...c,categoryId:c.id,id:`${email}__${c.id}`,email}));
    await replace('achievements',data.conquistas||[],a=>({...a,id:a.id?`${email}__${a.id}`:`${email}_a_${Date.now()}`,achievementId:a.id,email}));
    await replace('market_favorites',data.market?.favorites||[],f=>({id:`${email}__${f.assetId}`,email,assetId:f.assetId,assetType:f.assetType,addedAt:f.addedAt||new Date().toISOString()}));
    await replace('market_alerts',data.market?.alerts||[],al=>({...al,sourceId:al.id,id:`${email}__${al.id}`,email}));
    await replace('monthly_summaries',data.monthlySummaries||[],summary=>({...summary,id:`${email}__${summary.monthKey}`,email}));
  }
  async function exportAll(email){
    const user=await getUser(email);
    const data=await getUserData(email);
    const {senha,senhaHash,...safeUser}=user||{};
    return JSON.stringify({user:safeUser,data,exportedAt:new Date().toISOString()},null,2);
  }
  async function importAll(email,payload){
    let obj=payload;
    if(typeof payload==='string') obj=EphyraSecurity.parseBackup(payload);
    EphyraSecurity.validateBackup(obj);
    if(!obj?.data || typeof obj.data!=='object') throw new Error('Formato inválido');
    const targetEmail=_k(email||obj.user?.email);
    if(!targetEmail||!await getUser(targetEmail)) throw new Error('Conta inválida');
    if(obj.user){
      const current=await getUser(targetEmail)||{};
      const safeProfile={
        nome:String(obj.user.nome||current.nome||'Usuário').slice(0,120),
        foto:/^data:image\/(?:jpeg|png|webp);base64,/i.test(obj.user.foto||'')?obj.user.foto:(current.foto||''),
        salario:Number.isFinite(Number(obj.user.salario))?Math.max(0,Number(obj.user.salario)):Number(current.salario)||0,
        dataCadastro:obj.user.dataCadastro||current.dataCadastro||new Date().toISOString()
      };
      await upsertUser({...current,...safeProfile});
    }
    const current=await getUser(targetEmail);
    const imported=sanitize(obj.data);imported.user={nome:current.nome,email:current.email,foto:current.foto,salario:current.salario,dataCadastro:current.dataCadastro};
    await saveUserData(targetEmail,imported);
    return {...obj,user:obj.user?{...obj.user,senha:undefined,senhaHash:undefined}:undefined};
  }
  async function wipeEverything(){await init();await EphyraDB.clearAll();_usersCache={};_sessionCache=null;_dataCache.clear();_deleted.clear();sessionStorage.removeItem(TEMP_SESSION);try{const ks=[];for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(k&&k.startsWith('ephyra_')) ks.push(k);}ks.forEach(k=>localStorage.removeItem(k));}catch{}await EphyraDB.metaSet('remote_auth_v1',true);await EphyraDB.metaSet('migrated_from_localstorage_v1',true);}
  return{init,resetLegacyAccounts,removeAccount,getUsers,saveUsers,getUser,upsertUser,getSession,saveSession,touchSession,clearSession,getUserData,saveUserData,removeUserData,exportAll,importAll,wipeEverything,migrate};
})();
if(typeof window!=='undefined') window.EphyraStorage=EphyraStorage;
