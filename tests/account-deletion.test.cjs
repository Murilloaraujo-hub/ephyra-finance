const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(__dirname+'/../supabase/functions/delete-account/handler.js','utf8');
function fixture(options={}){
 let handler;const calls=[];
 const env={SITE_ORIGIN:'https://example.com',SUPABASE_URL:'https://test.supabase.co',SUPABASE_ANON_KEY:'public-test',SUPABASE_SERVICE_ROLE_KEY:'server-test'};
 const response=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json'}});
 const context={Deno:{serve:fn=>handler=fn,env:{get:key=>env[key]}},Response,AbortSignal,fetch:async(url,init)=>{
  calls.push({url,...init});
  if(url.endsWith('/user'))return options.unauthorized?response({},401):response({id:'verified-user',email:'verified@example.com'});
  if(url.includes('/rpc/'))return response(!options.rateLimit);
  if(url.includes('/token?'))return options.wrongPassword?response({},400):response({access_token:'fresh',user:{id:options.mismatch?'other-user':'verified-user'}});
  if(init.method==='DELETE')return response({},options.deleteFail?500:200);
  return response({});
 }};
 vm.runInNewContext(source,context);
 return {calls,run:(body={password:'Password123',userId:'victim'},origin='https://example.com')=>handler(new Request('https://test.supabase.co/functions/v1/delete-account',{method:'POST',headers:{origin,Authorization:'Bearer caller','Content-Type':'application/json'},body:JSON.stringify(body)}))};
}
test('server deletes only verified caller, ignores supplied target and never sends admin secret to login',async()=>{
 const f=fixture(),result=await f.run();assert.equal(result.status,200);assert.deepEqual(await result.json(),{deleted:true});
 const deletion=f.calls.find(x=>x.method==='DELETE');assert.ok(deletion.url.endsWith('/verified-user'));assert.equal(deletion.headers.apikey,'server-test');
 const login=f.calls.find(x=>x.url.includes('/token?'));assert.equal(login.headers.apikey,'public-test');assert.equal(JSON.parse(login.body).email,'verified@example.com');assert.ok(f.calls.some(x=>x.url.includes('/logout?scope=local')));
});
for(const [name,options,status] of [['invalid session',{unauthorized:true},401],['wrong password',{wrongPassword:true},403],['mismatched reauthentication',{mismatch:true},403],['exhausted attempt budget',{rateLimit:true},429]])test(name+' never deletes',async()=>{const f=fixture(options);assert.equal((await f.run()).status,status);assert.equal(f.calls.some(x=>x.method==='DELETE'),false)});
test('failed server deletion is not reported as success',async()=>{const f=fixture({deleteFail:true});assert.equal((await f.run()).status,502);assert.ok(f.calls.some(x=>x.url.includes('/logout?scope=local')))});
test('foreign origin and malformed requests fail closed',async()=>{const f=fixture();assert.equal((await f.run({},'https://attacker.test')).status,403);assert.equal(f.calls.length,0);assert.equal((await f.run({password:3})).status,400);assert.equal(f.calls.some(x=>x.method==='DELETE'),false)});
