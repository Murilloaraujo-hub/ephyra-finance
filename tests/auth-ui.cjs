/* Browser integration against a simulated Supabase service. No real emails/accounts. */
const {chromium}=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/playwright');
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..');
 const server=require('node:http').createServer((req,res)=>{let name=decodeURIComponent(req.url.split('?')[0]);if(name==='/')name='/index.html';try{res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':name.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(path.join(root,name)));}catch{res.statusCode=404;res.end()}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const base=`http://127.0.0.1:${server.address().port}`;
 const browser=await chromium.launch({headless:true,...(process.env.EPHYRA_TEST_BROWSER?{executablePath:process.env.EPHYRA_TEST_BROWSER}:{})});
 try{
 const page=await browser.newPage({viewport:{width:390,height:950},locale:'pt-BR'}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/js/contact-config.js*',r=>r.fulfill({contentType:'text/javascript',body:"window.EPHYRA_CONTACT={recommendationsEmail:''};"}));
 for(const host of ['api.coingecko.com','*.currency-api.pages.dev','cdn.jsdelivr.net','open.er-api.com'])await page.route(`https://${host}/**`,r=>r.abort());
 let user={id:'10000000-0000-4000-8000-000000000001',email:'teste@example.com',aud:'authenticated',role:'authenticated',created_at:new Date().toISOString(),user_metadata:{nome:'Teste'},identities:[{id:'identity'}]};
 let password='Senha12345!',deleted=false,deleteFail=false,recoverFail=false,recoverCalls=0;
 const jwt=()=>[Buffer.from(JSON.stringify({alg:'HS256',typ:'JWT'})).toString('base64url'),Buffer.from(JSON.stringify({sub:user.id,aud:'authenticated',role:'authenticated',iat:Math.floor(Date.now()/1000),exp:Math.floor(Date.now()/1000)+3600})).toString('base64url'),'testsignature'].join('.');
 const session=()=>({access_token:jwt(),refresh_token:'refresh-test',expires_in:3600,token_type:'bearer',user});
 await page.route('https://test-project.supabase.co/**',async r=>{
 const req=r.request(),u=new URL(req.url()),body=req.postDataJSON?.()||{},method=req.method();
 const send=(data,status=200)=>r.fulfill({status,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*','X-Supabase-Api-Version':'2024-01-01','Access-Control-Expose-Headers':'X-Supabase-Api-Version'},body:JSON.stringify(data)});
 if(method==='OPTIONS')return send({});
 if(u.pathname.endsWith('/recover')){recoverCalls++;return recoverFail?send({code:'over_email_send_rate_limit',msg:'Limited'},429):send({});}
 if(u.pathname.endsWith('/signup')){password=body.password;user={...user,email:body.email,user_metadata:{nome:body.data.nome}};return send(user);}
 if(u.pathname.endsWith('/token'))return !deleted&&body.password===password?send(session()):send({code:'invalid_credentials',msg:'Invalid login credentials'},400);
 if(u.pathname.endsWith('/user')){
  if(deleted)return send({msg:'Unauthorized'},401);
  if(method==='PUT'){password=body.password;return send(user);}
  return send(user);
 }
 if(u.pathname.endsWith('/logout'))return send({});
 if(u.pathname.endsWith('/delete-account')){
  if(deleteFail||body.password!==password)return send({error:'Confirmation failed'},403);
  deleted=true;return send({deleted:true});
 }
 return send({});
 });
 await page.goto(base);await page.waitForSelector('#auth-setup:not([hidden])');
 assert.equal(await page.locator('#login-form [type=submit]').isDisabled(),true);
 await page.evaluate(async()=>{await EphyraStorage.upsertUser({email:'old@example.com',nome:'Antiga'});await EphyraStorage.saveUserData('old@example.com',{saldo:99});localStorage.setItem('ephyra_users','{"old@example.com":{"email":"old@example.com","senha":"oldpassword"}}');localStorage.setItem('unrelated','keep');});
 await page.route('**/js/auth-config.js*',r=>r.fulfill({contentType:'text/javascript',body:"window.EPHYRA_AUTH_CONFIG={url:'https://test-project.supabase.co',publicKey:'sb_publishable_test'};"}));
 await page.reload();await page.waitForSelector('#auth-screen:not(.hidden)');
 assert.deepEqual(await page.evaluate(async()=>({users:Object.keys(await EphyraStorage.getUsers()),old:await EphyraStorage.getUserData('old@example.com'),unrelated:localStorage.getItem('unrelated'),legacy:localStorage.getItem('ephyra_users')})),{users:[],old:null,unrelated:'keep',legacy:null});
 await page.locator('[data-on-click=forgotPassword]').click();await page.fill('#f-email',user.email);await page.locator('#recover-form [type=submit]').click();await page.waitForFunction(()=>document.querySelector('#recovery-status').textContent.includes('Se houver'));assert.equal(recoverCalls,1);
 await page.waitForSelector('#ldr',{state:'detached'});await page.screenshot({path:path.join(root,'../auth-recovery.png')});
 recoverFail=true;await page.locator('#recover-form [type=submit]').click();await page.waitForFunction(()=>document.querySelector('#f-email-err').textContent.includes('Muitas'));recoverFail=false;
 await page.locator('#panel-recover [data-on-click=h1]').click();
 await page.fill('#l-email',user.email);await page.fill('#l-pw','wrongpass');await page.locator('#login-form [type=submit]').click();await page.waitForFunction(()=>document.querySelector('#l-pw-err').textContent.includes('incorretos'));
 await page.fill('#l-pw',password);await page.locator('#login-form [type=submit]').click();await page.waitForSelector('#app.show');await page.evaluate(()=>EphyraOnboarding.hide());
 assert.equal(await page.evaluate(()=>App.user.id),user.id);
 await page.evaluate(()=>App.nav('configuracoes'));await page.locator('[data-on-click=recommendations]').click();
 assert.equal(await page.locator('#recommendation-form [type=submit]').isDisabled(),true);
 await page.locator('#modal [data-on-click=h28]').first().click();
 await page.evaluate(()=>{window.EPHYRA_CONTACT={recommendationsEmail:'sugestoes@example.com'};document.addEventListener('click',e=>{const a=e.target.closest('a');if(a?.href.startsWith('mailto:')){e.preventDefault();window.testMailto=a.href;}},true)});
 await page.locator('[data-on-click=recommendations]').click();await page.fill('#recommendation-title','Ideia & orçamento');await page.fill('#recommendation-description','Função nova: metas <seguras> & lembretes.');
 await page.locator('#recommendation-form [type=submit]').click();
 const mail=await page.evaluate(()=>window.testMailto);assert.ok(mail.startsWith('mailto:sugestoes%40example.com?'));assert.ok(new URL(mail).searchParams.get('body').includes('metas <seguras> & lembretes.'));assert.equal(mail.includes('Senha12345'),false);
 assert.ok((await page.locator('#recommendation-status').textContent()).includes('Continue'));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false);
 await page.locator('#modal [data-on-click=h28]').first().click();

 await page.evaluate(async()=>{App.data.saldo=123;await EphyraStorage.saveUserData(App.user.id,App.data)});
 await page.reload();await page.waitForSelector('#app.show');await page.evaluate(()=>EphyraOnboarding.hide());
 assert.equal(await page.evaluate(()=>App.data.saldo),123);
 await page.evaluate(()=>App.nav('configuracoes'));await page.locator('[data-on-click=h57]').click();
 await page.fill('#delete-password',password);await page.check('#delete-confirm');deleteFail=true;
 await page.locator('#rB').click();await page.waitForFunction(()=>document.querySelector('#delete-error').textContent.includes('Não foi possível'));
 assert.equal(await page.evaluate(async()=>!!await EphyraStorage.getUserData(App.user.id)),true);
 await page.screenshot({path:path.join(root,'../auth-delete.png')});
 await page.locator('#modal [data-on-click=h28]').first().click();await page.evaluate(()=>Auth.logout());await page.waitForFunction(()=>App.user===null);
 // Recovery link lands directly in reset form; survives reload and scrubs URL tokens.
 await page.goto(base+'/index.html#access_token='+jwt()+'&refresh_token=refresh-test&expires_in=3600&token_type=bearer&type=recovery');
 await page.waitForSelector('#panel-reset.active');assert.equal(new URL(page.url()).hash,'');
 await page.reload();await page.waitForSelector('#panel-reset.active');
 await page.fill('#new-pw','NovaSenha123!');await page.fill('#new-pw2','diferente123');await page.locator('#reset-form [type=submit]').click();await page.waitForFunction(()=>document.querySelector('#new-pw-err').textContent.includes('não coincidem'));
 await page.fill('#new-pw2','NovaSenha123!');await page.locator('#reset-form [type=submit]').click();await page.waitForSelector('#panel-login.active');assert.equal(password,'NovaSenha123!');
 await page.fill('#l-email',user.email);await page.fill('#l-pw',password);await page.locator('#login-form [type=submit]').click();await page.waitForSelector('#app.show');await page.evaluate(()=>{EphyraOnboarding.hide();App.nav('configuracoes')});
 deleteFail=false;await page.locator('[data-on-click=h57]').click();await page.fill('#delete-password',password);await page.check('#delete-confirm');await page.locator('#rB').click();await page.waitForFunction(()=>App.user===null);assert.equal(deleted,true);
 assert.equal(await page.evaluate(async id=>await EphyraStorage.getUser(id),user.id),null);
 assert.equal(await page.evaluate(async id=>await EphyraStorage.getUserData(id),user.id),null);
 // Same email + new auth UID cannot inherit the deleted profile/data.
 deleted=false;user={...user,id:'20000000-0000-4000-8000-000000000002'};
 await page.fill('#l-email',user.email);await page.fill('#l-pw',password);await page.locator('#login-form [type=submit]').click();await page.waitForSelector('#app.show');assert.equal(await page.evaluate(()=>App.data.saldo),0);await page.evaluate(()=>EphyraOnboarding.hide());
 await page.locator('#assistant-launcher').click();await page.fill('#assistant-input','me ajude a economizar');await page.locator('#assistant-send').click();await page.waitForFunction(()=>App.data.assistantHistory.some(m=>m.role==='assistant'&&m.text.toLowerCase().includes('econom')));
 await page.evaluate(()=>{EphyraAssistant.close();Auth._lastActive=Date.now()-1800001});await page.mouse.click(200,200);await page.waitForFunction(()=>App.user===null);
 await page.goto(base+'/#error=access_denied&error_description=expired');await page.waitForFunction(()=>document.querySelector('#toast-container').textContent.includes('expirou'));
 for(const width of [320,390,768,1440]){await page.setViewportSize({width,height:950});for(const tab of ['login','register','recover']){await page.evaluate(t=>Auth.switchTab(t),tab);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1),false,`${tab} overflow at ${width}`);}}
 user={...user,id:'30000000-0000-4000-8000-000000000003'};
 await page.evaluate(()=>Auth.switchTab('register'));await page.fill('#r-name','Nova Pessoa');await page.fill('#r-email','nova@example.com');await page.fill('#r-pw','SenhaCadastro123!');await page.fill('#r-pw2','SenhaCadastro123!');await page.fill('#r-salario','500');await page.locator('#register-form [type=submit]').click();await page.waitForSelector('#panel-login.active');assert.equal(await page.evaluate(()=>App.user),null);
 await page.fill('#l-pw',password);await page.locator('#login-form [type=submit]').click();await page.waitForSelector('#app.show');await page.evaluate(()=>EphyraOnboarding.hide());assert.equal(await page.evaluate(()=>App.data.saldo),500);
 await page.evaluate(()=>{const clock=JSON.parse(sessionStorage.getItem('ephyra_auth_activity'));clock.lastActive=Date.now()-1800001;sessionStorage.setItem('ephyra_auth_activity',JSON.stringify(clock));});await page.reload();await page.waitForSelector('#auth-screen:not(.hidden)');assert.equal(await page.evaluate(()=>App.user),null);
 assert.deepEqual(errors,[]);
 console.log('PASS: missing config, legacy purge, recovery/rate limit, wrong password, login/restore, failed delete preserving data, reset/reload/URL cleanup, confirmed delete, UID isolation, idle lock, expired link, responsive forms, confirmed registration, idle expiry across reload.');
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exit(1)});
