/* ===== js/storage.js ===== */
/**
 * Armazenamento local do Ephyra Finance.
 *
 * Modelo: um perfil por dispositivo + os dados financeiros no IndexedDB.
 * Não existe senha, sessão de servidor, token nem sincronização entre aparelhos:
 * tudo fica neste navegador e pode ser exportado/importado como backup JSON.
 *
 * Se o IndexedDB não estiver disponível (modo privado de alguns navegadores),
 * as operações caem automaticamente para localStorage.
 */
const EphyraStorage = (() => {
  'use strict';

  const PROFILE_ID = 'local';               // chave fixa: um perfil por navegador
  const PROFILE_POINTER = 'ephyra_profile_v1';
  const LEGACY_USERS = 'ephyra_users';
  const LEGACY_PREFIX = 'ephyra_data_';

  let _ready = null;
  let _useFallback = false;
  const _dataCache = new Map();
  const _writes = new Map();

  const _clone = value => typeof structuredClone === 'function'
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

  /* ---------------------------------------------------------------- IndexedDB */
  async function init() {
    if (_ready) return _ready;
    _ready = (async () => {
      try {
        await EphyraDB.open();
      } catch (err) {
        console.warn('[Storage] IndexedDB indisponível, usando localStorage:', err?.message || err);
        _useFallback = true;
      }
      await migrateLegacy();
    })().catch(err => { console.error('[Storage] init', err); _ready = null; throw err; });
    return _ready;
  }

  /* ------------------------------------------------------- dados legados */
  /**
   * Versões anteriores guardavam dados por e-mail. Se existir algum registro
   * antigo, ele é adotado como o perfil local para não perder o histórico.
   */
  async function migrateLegacy() {
    try {
      if (!_useFallback && await EphyraDB.get('meta', 'local_migrated_v2')) return;
      let profile = null, data = null;

      if (!_useFallback) {
        const legacyUser = await EphyraDB.get('users', 'local');
        if (!legacyUser) {
          const all = await EphyraDB.getAll('users').catch(() => []);
          const first = Array.isArray(all) ? all.find(u => u && (u.email || u.id)) : null;
          if (first) {
            const row = await EphyraDB.get('userdata', String(first.email || first.id).toLowerCase()).catch(() => null);
            profile = { nome: first.nome || 'Usuário', foto: first.foto || '', salario: first.salario || 0, dataCadastro: first.dataCadastro || new Date().toISOString() };
            data = row?.data || null;
          }
        }
        if (profile) await saveProfile(profile);
        if (data) await writeUserData(data);
        await EphyraDB.put('meta', { key: 'local_migrated_v2', value: true });
      } else {
        const raw = localStorage.getItem(LEGACY_USERS);
        if (raw) {
          const users = JSON.parse(raw) || {};
          const firstKey = Object.keys(users)[0];
          if (firstKey) {
            const first = users[firstKey];
            const legacyData = localStorage.getItem(LEGACY_PREFIX + firstKey.replace(/[^a-zA-Z0-9]/g, '_'));
            await saveProfile({ nome: first?.nome || 'Usuário', foto: first?.foto || '', salario: first?.salario || 0, dataCadastro: first?.dataCadastro || new Date().toISOString() });
            if (legacyData) await writeUserData(JSON.parse(legacyData));
          }
          localStorage.removeItem(LEGACY_USERS);
        }
      }
      localStorage.setItem('ephyra_migrated_v2', '1');
    } catch (err) {
      console.warn('[Storage] migração ignorada:', err?.message || err);
    }
  }

  /* --------------------------------------------------------------- perfil */
  async function getProfile() {
    await init();
    if (_useFallback) {
      try { return JSON.parse(localStorage.getItem(PROFILE_POINTER) || 'null'); } catch { return null; }
    }
    const row = await EphyraDB.get('users', PROFILE_ID).catch(() => null);
    if (!row) return null;
    const { email, ...profile } = row;
    return { id: PROFILE_ID, ...profile };
  }

  async function saveProfile(profile) {
    await init();
    const clean = {
      id: PROFILE_ID,
      nome: String(profile?.nome || 'Usuário').trim().slice(0, 80) || 'Usuário',
      foto: /^data:image\/(?:jpeg|png|webp);base64,/i.test(profile?.foto || '') ? profile.foto : '',
      salario: Number.isFinite(Number(profile?.salario)) ? Math.max(0, Number(profile.salario)) : 0,
      dataCadastro: profile?.dataCadastro || new Date().toISOString(),
      atualizadoEm: new Date().toISOString()
    };
    if (_useFallback) { localStorage.setItem(PROFILE_POINTER, JSON.stringify(clean)); return clean; }
    await EphyraDB.put('users', { ...clean, email: PROFILE_ID });
    localStorage.setItem(PROFILE_POINTER, JSON.stringify(clean));
    return clean;
  }

  async function clearProfile() {
    await init();
    localStorage.removeItem(PROFILE_POINTER);
    if (!_useFallback) await EphyraDB.remove('users', PROFILE_ID).catch(() => {});
  }

  /* ---------------------------------------------------------------- dados */
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

  async function getUserData() {
    await init();
    if (_useFallback) {
      try { const raw = localStorage.getItem('ephyra_data_' + PROFILE_ID); return raw ? sanitize(JSON.parse(raw)) : null; }
      catch { return null; }
    }
    if (_dataCache.has(PROFILE_ID)) return _clone(_dataCache.get(PROFILE_ID));
    const row = await EphyraDB.get('userdata', PROFILE_ID);
    if (!row) return null;
    const sanitized = sanitize(row.data);
    _dataCache.set(PROFILE_ID, sanitized);
    return _clone(sanitized);
  }

  async function writeUserData(data) {
    await init();
    const sanitized = sanitize(data);
    _dataCache.set(PROFILE_ID, sanitized);
    if (_useFallback) {
      localStorage.setItem('ephyra_data_' + PROFILE_ID, JSON.stringify(sanitized));
      return;
    }
    await EphyraDB.put('userdata', { email: PROFILE_ID, data: sanitized, updatedAt: new Date().toISOString() });
    try { await _syncSlices(sanitized); } catch (err) { console.warn('[Storage] slices', err?.message || err); }
  }

  /** Grava em fila: chamadas seguidas nunca se sobrescrevem. */
  function saveUserData(data) {
    const snapshot = _clone(data);
    const job = (_writes.get(PROFILE_ID) || Promise.resolve()).catch(() => {}).then(() => writeUserData(snapshot));
    _writes.set(PROFILE_ID, job);
    return job;
  }

  /** Aguarda todas as gravações pendentes (usado antes de exportar ou sair). */
  async function flush() {
    await Promise.allSettled([...( _writes.values())]);
  }

  async function removeUserData() {
    await init();
    _dataCache.delete(PROFILE_ID);
    if (_useFallback) { localStorage.removeItem('ephyra_data_' + PROFILE_ID); return; }
    await EphyraDB.remove('userdata', PROFILE_ID);
  }

  async function _syncSlices(data) {
    const email = PROFILE_ID;
    await EphyraDB.put('settings', { email, ...(data.config || {}) });
    await EphyraDB.put('xp', { email, xp: data.xp || 0, nivel: data.nivel || 1 });
    await EphyraDB.put('market_settings', { email, defaultCurrency: data.market?.defaultCurrency || data.config?.moeda || 'BRL', favorites: data.market?.favorites || [], updatedAt: new Date().toISOString() });
    await EphyraDB.put('statistics', { email, saldo: data.saldo || 0, receitasCount: (data.receitas || []).length, despesasCount: (data.despesas || []).length, metasCount: (data.metas || []).length, conquistasCount: (data.conquistas || []).length, updatedAt: new Date().toISOString() });
    const replace = async (storeName, items, mapFn) => {
      const exist = await EphyraDB.getAllByIndex(storeName, 'email', email);
      for (const row of exist) await EphyraDB.remove(storeName, row.id);
      if (items?.length) await EphyraDB.putMany(storeName, items.map(mapFn));
    };
    await replace('transactions', [...(data.receitas || []), ...(data.despesas || [])], t => ({ ...t, sourceId: t.id, id: `${email}__${t.id}`, email }));
    await replace('history', data.historico || [], t => ({ ...t, sourceId: t.id, id: `${email}__${t.id}`, email }));
    await replace('goals', data.metas || [], g => ({ ...g, sourceId: g.id, id: `${email}__${g.id}`, email }));
    await replace('categories', data.categorias || [], c => ({ ...c, categoryId: c.id, id: `${email}__${c.id}`, email }));
    await replace('achievements', data.conquistas || [], a => ({ ...a, id: `${email}__${a.id || Date.now()}`, achievementId: a.id, email }));
    await replace('market_favorites', data.market?.favorites || [], f => ({ id: `${email}__${f.assetId}`, email, assetId: f.assetId, assetType: f.assetType, addedAt: f.addedAt || new Date().toISOString() }));
    await replace('market_alerts', data.market?.alerts || [], al => ({ ...al, sourceId: al.id, id: `${email}__${al.id}`, email }));
    await replace('monthly_summaries', data.monthlySummaries || [], summary => ({ ...summary, id: `${email}__${summary.monthKey}`, email }));
  }

  /* --------------------------------------------------------------- backup */
  /** Backup completo (perfil + dados) em JSON. */
  async function exportAll() {
    await flush();
    const profile = await getProfile();
    const data = await getUserData();
    return JSON.stringify({
      app: 'Ephyra Finance',
      format: 'ephyra-backup',
      version: 2,
      exportedAt: new Date().toISOString(),
      user: profile ? { nome: profile.nome, foto: profile.foto, salario: profile.salario, dataCadastro: profile.dataCadastro } : null,
      data
    }, null, 2);
  }

  /**
   * Restaura um backup JSON. Aceita o formato novo e o antigo (com bloco "user").
   * Valida o conteúdo antes de gravar qualquer coisa.
   */
  async function importAll(payload) {
    let obj = payload;
    if (typeof payload === 'string') obj = EphyraSecurity.parseBackup(payload);
    if (!obj || typeof obj !== 'object' || !obj.data || typeof obj.data !== 'object') throw new Error('Arquivo de backup inválido');
    const profile = await getProfile();
    const incoming = obj.user || obj.data.user || {};
    const merged = {
      nome: String(incoming.nome || profile?.nome || 'Usuário').slice(0, 80),
      foto: incoming.foto || profile?.foto || '',
      salario: Number.isFinite(Number(incoming.salario)) ? Number(incoming.salario) : (profile?.salario || 0),
      dataCadastro: incoming.dataCadastro || profile?.dataCadastro || new Date().toISOString()
    };
    await saveProfile(merged);
    const imported = sanitize(obj.data);
    imported.user = { nome: merged.nome, foto: merged.foto, salario: merged.salario, dataCadastro: merged.dataCadastro };
    await writeUserData(imported);
    return imported;
  }

  /** Backup das transações em CSV (abre no Excel/Sheets). */
  async function exportCSV() {
    const data = await getUserData();
    const rows = [['Data', 'Tipo', 'Descrição', 'Categoria', 'Valor']];
    const money = v => (Math.round((Number(v) || 0) * 100) / 100).toFixed(2).replace('.', ',');
    (data?.historico || []).slice().sort((a, b) => String(a.data).localeCompare(String(b.data))).forEach(tx => {
      const cat = (data.categorias || []).find(c => c.id === tx.categoria);
      rows.push([
        String(tx.data || '').slice(0, 10).split('-').reverse().join('/'),
        tx.tipo === 'receita' ? 'Receita' : 'Despesa',
        String(tx.nome || '').replace(/;/g, ','),
        cat?.nome || 'Outros',
        money(tx.valor)
      ]);
    });
    return '\uFEFF' + rows.map(r => r.join(';')).join('\r\n');
  }

  /** Apaga perfil e dados deste navegador. */
  async function wipeEverything() {
    await init();
    _dataCache.clear();
    localStorage.removeItem(PROFILE_POINTER);
    try {
      if (!_useFallback) await EphyraDB.clearAll();
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('ephyra_')) keys.push(k);
      }
      keys.forEach(k => localStorage.removeItem(k));
    } catch (err) { console.warn('[Storage] wipe', err?.message || err); }
  }

  /* ------------------------------------------------- compatibilidade */
  return {
    init, getProfile, saveProfile, clearProfile,
    getUserData, saveUserData, removeUserData, flush,
    exportAll, importAll, exportCSV, wipeEverything,
    PROFILE_ID
  };
})();
if (typeof window !== 'undefined') window.EphyraStorage = EphyraStorage;
