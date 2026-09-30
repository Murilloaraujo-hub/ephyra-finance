const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs'),vm=require('node:vm');
function fixture(configured=true){
 const button={disabled:false,innerHTML:'Criar Conta',setAttribute(){},removeAttribute(){}};
 const fields={};for(const [id,value] of Object.entries({'r-name':'Pessoa Teste','r-email':'test@example.com','r-pw':'TestPassword123!','r-pw2':'TestPassword123!','r-salario':'149.97'}))fields['#'+id]={value};
 fields['#auth-setup']={hidden:false};fields['#register-form']={reset(){}};
 const errors=[];let calls=0;
 const auth={configured:()=>configured,init:async()=>configured,register:async()=>{calls++;throw {code:'unexpected_failure',message:'Error sending confirmation email'}}};
 const ctx=vm.createContext({document:{querySelector:s=>fields[s]},EphyraAuth:auth,console});
 const source=fs.readFileSync(__dirname+'/../js/app.js','utf8').split('const App=')[0];
 vm.runInContext(source+'\nthis.Auth=Auth;',ctx);
 ctx.Auth.clearErrors=()=>{};ctx.Auth.showErr=(id,msg)=>errors.push({id,msg});
 return {Auth:ctx.Auth,auth,button,errors,fields,ctx,calls:()=>calls,event:{preventDefault(){},target:{querySelector:()=>button}}};
}
test('missing configuration gives feedback and releases the signup button',async()=>{const f=fixture(false);await f.Auth.handleRegister(f.event);assert.equal(f.calls(),0);assert.match(f.errors[0].msg,/ativado/);assert.equal(f.button.disabled,false);assert.equal(f.Auth._registerBusy,false)});
test('SMTP failure appears near submit and allows another attempt',async()=>{const f=fixture();await f.Auth.handleRegister(f.event);assert.equal(f.errors[0].id,'register-err');assert.match(f.errors[0].msg,/SMTP/);assert.equal(f.button.disabled,false);await f.Auth.handleRegister(f.event);assert.equal(f.calls(),2)});
test('pending signup shows progress and prevents duplicate requests',async()=>{const f=fixture();let reject;f.auth.register=()=>new Promise((_,r)=>{reject=r});const request=f.Auth.handleRegister(f.event);await new Promise(setImmediate);assert.equal(f.button.disabled,true);assert.equal(f.button.textContent,'Criando conta…');await f.Auth.handleRegister(f.event);reject(new Error('network'));await request;assert.equal(f.button.disabled,false);assert.equal(f.button.innerHTML,'Criar Conta')});
test('Brazilian decimal salary is preserved and malformed values rejected',()=>{const f=fixture();for(const [value,expected] of [['149,97',149.97],['1.234,56',1234.56],['149.97',149.97],['500',500]])assert.equal(f.Auth.parseSalary(value),expected);for(const value of ['149abc','1,2,3','Infinity',''])assert.ok(Number.isNaN(f.Auth.parseSalary(value)))});
test('server timeout explains failure without claiming account creation',async()=>{const f=fixture();f.auth.register=async()=>{throw {status:504,code:'request_timeout'}};await f.Auth.handleRegister(f.event);assert.match(f.errors[0].msg,/demorou/);assert.equal(f.button.disabled,false)});

test('confirmation response keeps a visible status and does not log in early',async()=>{const f=fixture();f.fields['#l-email']={value:''};f.fields['#registration-status']={textContent:''};f.ctx.EphyraStorage={upsertUser:async()=>{}};let tab;f.Auth.switchTab=t=>tab=t;f.Auth.removeAvatar=()=>{};f.auth.register=async()=>({user:{id:'test-user',identities:[{}]},session:null});await f.Auth.handleRegister(f.event);assert.equal(tab,'login');assert.match(f.fields['#registration-status'].textContent,/confirmar a conta/);assert.equal(f.button.disabled,false);assert.equal(f.errors.length,0)});
