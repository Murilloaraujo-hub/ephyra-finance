'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),{webcrypto}=require('node:crypto');
function fixture(){
 const local=new Map(),session=new Map(),db=new Map();
 const storage=map=>({getItem:key=>map.get(key)||null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key),key:i=>[...map.keys()][i],get length(){return map.size}});
 const EphyraDB={open:async()=>{},get:async(s,k)=>structuredClone(db.get(`${s}:${k}`)),put:async(s,v)=>{db.set(`${s}:${v.key||v.id||v.email}`,structuredClone(v));},remove:async(s,k)=>db.delete(`${s}:${k}`),metaGet:async k=>db.get(`meta:${k}`)?.value,metaSet:async(k,v)=>db.set(`meta:${k}`,{value:v}),getAllByIndex:async()=>[],putMany:async()=>{},clearAll:async()=>db.clear()};
 const ctx=vm.createContext({console,crypto:webcrypto,TextEncoder,Uint8Array,btoa,atob,Blob,structuredClone,localStorage:storage(local),sessionStorage:storage(session),EphyraDB});
 ctx.window=ctx;
 for(const name of ['security','storage'])vm.runInContext(fs.readFileSync(`${__dirname}/../js/${name}.js`,'utf8'),ctx);
 return {ctx,local,session,db,security:ctx.EphyraSecurity,store:ctx.EphyraStorage};
}
test('password hashing verifies correct password and rejects corrupt or excessive work factors',async()=>{
 const {security}=fixture();const hash=await security.hashPassword('Senha de teste!');assert.equal(hash.iterations,600000);assert.equal(await security.verifyPassword('Senha de teste!',hash),true);assert.equal(await security.verifyPassword('incorreta',hash),false);assert.equal(await security.verifyPassword('x',{...hash,iterations:1e12}),false);assert.equal(await security.verifyPassword('x',{...hash,salt:'invalid'}),false);
});
test('backup parser rejects prototype keys, oversized content and malformed collections',()=>{
 const {security}=fixture();for(const value of ['{"data":{"__proto__":{"polluted":true}}}','{"data":{"metas":{}}}','{"data":{"categorias":[null]}}','{"data":{"config":[]}}','{"data":[]}'])assert.throws(()=>security.parseBackup(value));assert.throws(()=>security.parseBackup(' '.repeat(5*1024*1024+1)));assert.equal(security.parseBackup('{"data":{"saldo":25,"metas":[]}}').data.saldo,25);assert.equal({}.polluted,undefined);
});
test('legacy passwords are hashed and old copies removed after migration',async()=>{
 const f=fixture();f.local.set('ephyra_users',JSON.stringify({'a@test.com':{email:'a@test.com',nome:'A',senha:'legado123'}}));await f.store.init();const user=await f.store.getUser('a@test.com');assert.equal(user.senha,undefined);assert.equal(await f.security.verifyPassword('legado123',user.senhaHash),true);assert.equal(f.local.has('ephyra_users'),false);
});
test('remember option stores only email; expired and malformed sessions do not restore',async()=>{
 const f=fixture();await f.store.upsertUser({email:'a@test.com',nome:'A'});await f.store.saveSession({email:'a@test.com',remember:true});assert.ok(await f.store.getSession());assert.equal(f.local.get('ephyra_remembered_email'),'a@test.com');assert.equal(f.db.has('sessions:current'),false);let session=JSON.parse(f.session.get('ephyra_temporary_session'));session.lastActive=Date.now()-1800001;f.session.set('ephyra_temporary_session',JSON.stringify(session));assert.equal(await f.store.getSession(),null);f.session.set('ephyra_temporary_session','{"email":"a@test.com"}');assert.equal(await f.store.getSession(),null);
});
test('import cannot replace password; categories and market alerts are normalized',async()=>{
 const f=fixture();await f.store.upsertUser({email:'a@test.com',nome:'A',senhaHash:{hash:'original'}});await f.store.importAll('a@test.com',{user:{senhaHash:{hash:'attacker'},email:'intruso@test.com'},data:{saldo:120,categorias:[{id:'x',nome:'Teste',cor:'red;position:fixed',icone:'fa-x" onerror="alert(1)'}],market:{alerts:[{id:"x');alert(1)//",assetId:'BTC',condition:'<img src=x>',value:'10',currency:'<script>'}]}}});const data=await f.store.getUserData('a@test.com');assert.equal((await f.store.getUser('a@test.com')).senhaHash.hash,'original');assert.equal(data.categorias[0].cor,'#64748b');assert.equal(data.categorias[0].icone,'fa-circle');assert.match(data.market.alerts[0].id,/^[\w-]+$/);assert.equal(data.market.alerts[0].condition,'<');assert.equal(data.market.alerts[0].currency,'BRL');
});
