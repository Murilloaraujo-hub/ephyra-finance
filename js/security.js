
const EphyraSecurity = (() => {
  'use strict';

  const ITERATIONS = 600000;
  const encoder = new TextEncoder();

  function bytesToBase64(bytes) {
    let binary = '';
    bytes.forEach(byte => { binary += String.fromCharCode(byte); });
    return btoa(binary);
  }

  function base64ToBytes(value) {
    const binary = atob(value);
    return Uint8Array.from(binary, char => char.charCodeAt(0));
  }

  async function derive(password, salt, iterations) {
    if (!globalThis.crypto?.subtle) {
      throw new Error('Este navegador não oferece a proteção de senha necessária.');
    }

    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(String(password)),
      'PBKDF2',
      false,
      ['deriveBits']
    );

    const bits = await crypto.subtle.deriveBits(
      {
        name: 'PBKDF2',
        hash: 'SHA-256',
        salt,
        iterations
      },
      key,
      256
    );

    return new Uint8Array(bits);
  }

  async function hashPassword(password) {
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const hash = await derive(password, salt, ITERATIONS);
    return {
      algorithm: 'PBKDF2-SHA256',
      iterations: ITERATIONS,
      salt: bytesToBase64(salt),
      hash: bytesToBase64(hash)
    };
  }

  async function verifyPassword(password, stored) {
    if (typeof stored === 'string') return password === stored;
    if (stored?.algorithm !== 'PBKDF2-SHA256' || !/^[A-Za-z0-9+/]{22}==$/.test(stored.salt||'') || !/^[A-Za-z0-9+/]{43}=$/.test(stored.hash||'')) return false;
    const iterations = Number(stored.iterations);
    if(!Number.isInteger(iterations)||iterations<100000||iterations>1000000)return false;
    const actual = await derive(password, base64ToBytes(stored.salt), iterations);
    const expected = base64ToBytes(stored.hash);

    if (actual.length !== expected.length) return false;
    let difference = 0;
    for (let index = 0; index < actual.length; index++) {
      difference |= actual[index] ^ expected[index];
    }
    return difference === 0;
  }

  const escapeHTML=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  function html(value){
    if(!globalThis.DOMPurify)throw new Error('Proteção de conteúdo indisponível. Recarregue a página.');
    return DOMPurify.sanitize(String(value??''),{USE_PROFILES:{html:true,svg:true},FORBID_TAGS:['script','iframe','object','embed','base','link','meta','foreignObject','style'],FORBID_ATTR:['srcdoc','formaction'],ALLOW_DATA_ATTR:true});
  }
  function parseBackup(text){
    if(typeof text!=='string'||new Blob([text]).size>5*1024*1024)throw new Error('Backup deve ter até 5 MB.');
    const parsed=JSON.parse(text,(key,value)=>{
      if(['__proto__','constructor','prototype'].includes(key))throw new Error('Backup contém uma propriedade inválida.');
      return value;
    });
    validateBackup(parsed);
    return parsed;
  }
  function validateBackup(value){
    if(!value||typeof value!=='object'||Array.isArray(value)||!value.data||typeof value.data!=='object'||Array.isArray(value.data))throw new Error('Formato de backup inválido.');
    let nodes=0;
    function walk(node,depth=0){
      if(++nodes>150000||depth>16)throw new Error('Backup muito complexo.');
      if(typeof node==='string'&&node.length>1500000)throw new Error('Campo do backup muito grande.');
      if(node&&typeof node==='object')for(const [key,child] of Object.entries(node)){
        if(['__proto__','constructor','prototype'].includes(key))throw new Error('Propriedade inválida.');
        walk(child,depth+1);
      }
    }
    walk(value);
    for(const name of ['receitas','despesas','historico','metas','categorias','conquistas','monthlySummaries','assistantHistory']){
      const list=value.data[name];
      if(list!==undefined&&(!Array.isArray(list)||list.length>10000||list.some(item=>!item||typeof item!=='object'||Array.isArray(item))))throw new Error(`Lista inválida: ${name}`);
    }
    for(const name of ['config','market','user'])if(value.data[name]!==undefined&&(!value.data[name]||typeof value.data[name]!=='object'||Array.isArray(value.data[name])))throw new Error(`Campo inválido: ${name}`);
    return value;
  }
  const attempts=new Map();
  function loginWait(email){return Math.max(0,(attempts.get(email)?.until||0)-Date.now())}
  function loginFailed(email){const entry=attempts.get(email)||{count:0,until:0};entry.count++;if(entry.count>=5)entry.until=Date.now()+60000;attempts.set(email,entry)}
  function loginSucceeded(email){attempts.delete(email)}
  return { hashPassword, verifyPassword, escapeHTML, html, parseBackup, validateBackup, loginWait, loginFailed, loginSucceeded, ITERATIONS };
})();

if (typeof window !== 'undefined') window.EphyraSecurity = EphyraSecurity;
