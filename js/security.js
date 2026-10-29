/* ===== js/security.js ===== */
/**
 * Utilitários de segurança do lado do cliente:
 *  - escape/sanitização de HTML antes de inserir conteúdo dinâmico no DOM;
 *  - validação estrutural de arquivos de backup importados.
 *
 * Não há criptografia de senha porque o aplicativo não usa senhas: o perfil é
 * local e os dados ficam neste navegador (ver README, seção "Limitações").
 */
const EphyraSecurity = (() => {
  'use strict';
  /** Escapa texto para inserção segura em HTML. */
  const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));

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
  return { escapeHTML, html, parseBackup, validateBackup };
})();

if (typeof window !== 'undefined') window.EphyraSecurity = EphyraSecurity;
