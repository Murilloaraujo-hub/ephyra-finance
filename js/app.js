const U={
id:()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8),
baseCurrency:()=>typeof App!=='undefined'&&App.data?.config?.baseCurrency||'BRL',
displayCurrency:()=>typeof App!=='undefined'&&(App.data?.config?.moeda||App.data?.market?.defaultCurrency)||'BRL',
convert:(value,from,to)=>{const number=Number(value);if(!Number.isFinite(number))return 0;if(from===to)return number;const converted=typeof MarketAPI!=='undefined'?MarketAPI.convert(number,from,to,typeof Market!=='undefined'?Market.cache:null):null;return Number.isFinite(converted)?converted:number},
toBase:(value,currency)=>U.convert(value,currency||U.displayCurrency(),U.baseCurrency()),
fromBase:(value,currency)=>U.convert(value,U.baseCurrency(),currency||U.displayCurrency()),
money:(value,currency)=>U.moneyC(U.fromBase(value,currency),currency||U.displayCurrency()),
moneyC:(value,currency)=>{const number=Number(value),safe=Number.isFinite(number)?number:0;try{return safe.toLocaleString('pt-BR',{style:'currency',currency:currency||'BRL',maximumFractionDigits:Math.abs(safe)>0&&Math.abs(safe)<.01?8:2})}catch{return`${safe.toLocaleString('pt-BR',{maximumFractionDigits:8})} ${currency||'BRL'}`}},
date:value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'':date.toLocaleDateString('pt-BR')},
dI:value=>{const date=value?new Date(value):new Date();return Number.isNaN(date.getTime())?new Date().toISOString().split('T')[0]:date.toISOString().split('T')[0]},
pct:(value,total)=>Number(total)>0?Math.max(0,Math.min(Number(value||0)/Number(total)*100,100)):0,
qs:selector=>document.querySelector(selector),qsa:selector=>document.querySelectorAll(selector),on:(element,event,handler)=>element&&element.addEventListener(event,handler),
sameDay:(a,b)=>{const first=new Date(a),second=new Date(b);return!Number.isNaN(first.getTime())&&!Number.isNaN(second.getTime())&&first.toDateString()===second.toDateString()},
trunc:(value,length=30)=>{const text=String(value||'');return text.length>length?`${text.slice(0,length)}…`:text},
esc:value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char])),
getInitials:name=>name?name.trim().split(' ').filter(Boolean).map(word=>word[0]).join('').toUpperCase().slice(0,2):'?'
};
const Toast={c:null,init(){this.c=U.qs('#toast-container')},show(m,t='i',d=4000){if(!this.c)this.init();const ic={s:'fa-check-circle',e:'fa-times-circle',w:'fa-exclamation-triangle',i:'fa-info-circle'};const e=document.createElement('div');e.className=`toast ${t}`;const icon=document.createElement('i');icon.className=`fas ${ic[t]||ic.i}`;const message=document.createElement('span');message.textContent=String(m);e.append(icon,message);this.c.appendChild(e);setTimeout(()=>{e.classList.add('out');setTimeout(()=>e.remove(),300)},d)},s(m){this.show(m,'s')},e(m){this.show(m,'e')},w(m){this.show(m,'w')},i(m){this.show(m,'i')}};

const Auth={
async getUsers(){return EphyraStorage.getUsers()},
async clearSession(){await EphyraAuth.logout();await EphyraStorage.clearSession()},
switchTab(tab){
if(EphyraAuth.isRecovery()&&tab!=='reset'){this.cancelRecovery();return;}
U.qsa('.auth-tab').forEach(t=>{const active=t.dataset.tab===tab;t.classList.toggle('active',active);t.setAttribute('aria-selected',String(active))});
U.qsa('.auth-panel').forEach(panel=>panel.classList.toggle('active',panel.id==='panel-'+tab));
U.qs('#auth-subtitle').textContent=({login:'Entre na sua conta',register:'Crie sua conta gratuita',recover:'Recupere seu acesso',reset:'Escolha uma nova senha'})[tab];
this.clearErrors();requestAnimationFrame(()=>U.qs(({login:'#l-email',register:'#r-name',recover:'#f-email',reset:'#new-pw'})[tab])?.focus());
},
clearErrors(){U.qsa('.form-error').forEach(e=>{e.classList.remove('show');e.textContent=''});U.qsa('.form-input').forEach(i=>i.classList.remove('err'))},
showErr(id,msg){const el=U.qs('#'+id);if(el){el.textContent=msg;el.classList.add('show')}const input=U.qs('#'+id.replace('-err',''));if(input)input.classList.add('err')},
togglePw(id,control){const inp=U.qs('#'+id),icon=control.querySelector('i')||control,visible=inp.type==='password';inp.type=visible?'text':'password';icon.classList.toggle('fa-eye',!visible);icon.classList.toggle('fa-eye-slash',visible);control.setAttribute('aria-label',visible?'Ocultar senha':'Mostrar senha')},
handleAvatarUpload(input,prefix){
const file=input.files[0];if(!file)return;
if(!['image/jpeg','image/jpg','image/png','image/webp'].includes(file.type)){Toast.e('Formato inválido. Use JPG, PNG ou WEBP.');input.value='';return}
if(file.size>5*1024*1024){Toast.e('Imagem muito grande. Máximo: 5MB.');input.value='';return}
const reader=new FileReader();
reader.onerror=()=>Toast.e('Não foi possível ler a imagem');
reader.onload=ev=>{
const img=new Image();
img.onload=async()=>{
const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
const ctx=canvas.getContext('2d');const minDim=Math.min(img.width,img.height);
ctx.drawImage(img,(img.width-minDim)/2,(img.height-minDim)/2,minDim,minDim,0,0,256,256);
const dataUrl=canvas.toDataURL('image/jpeg',0.7);
const preview=U.qs(`#${prefix}-avatar-img`);const initials=U.qs(`#${prefix}-avatar-text`);
preview.src=dataUrl;preview.style.display='block';initials.style.display='none';
U.qs(`#${prefix}-avatar-remove`).style.display='inline-flex';
input.dataset.img=dataUrl;
};
img.onerror=()=>Toast.e('A imagem selecionada é inválida');
img.src=ev.target.result;
};
reader.readAsDataURL(file);
},
removeAvatar(prefix){const preview=U.qs(`#${prefix}-avatar-img`),initials=U.qs(`#${prefix}-avatar-text`),remove=U.qs(`#${prefix}-avatar-remove`),input=U.qs(`#${prefix}-avatar-input`);if(preview){preview.style.display='none';preview.src=''}if(initials)initials.style.display='flex';if(remove)remove.style.display='none';if(input){input.value='';input.dataset.img=''}},
updateInitials(name){const ini=U.getInitials(name)||'?';const el=U.qs('#reg-avatar-text');if(el) el.textContent=ini;},
getAvatarHtml(user,size='av'){if(user&&user.foto){return`<img src="${U.esc(user.foto)}" class="${U.esc(size)}" alt="" style="cursor:pointer;border-radius:50%;object-fit:cover">`;}const ini=user?U.getInitials(user.nome):'?';const sz=size.includes('xl')?'110px':size.includes('lg')?'80px':size.includes('sm')?'36px':'48px';const fs=size.includes('xl')?'2.5rem':size.includes('lg')?'1.8rem':size.includes('sm')?'.75rem':'1rem';return`<div class="${U.esc(size)}" style="width:${sz};height:${sz};border-radius:50%;background:linear-gradient(135deg,var(--cp),var(--cs));display:flex;align-items:center;justify-content:center;font-size:${fs};font-weight:800;color:#fff;border:3px solid var(--cp);flex-shrink:0">${U.esc(ini)}</div>`;},
validEmail(e){return/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)},
async handleRegister(e){
e.preventDefault();this.clearErrors();
const nome=U.qs('#r-name').value.trim();const email=U.qs('#r-email').value.trim().toLowerCase();
const pw=U.qs('#r-pw').value;const pw2=U.qs('#r-pw2').value;const salario=parseFloat(U.qs('#r-salario').value);
const foto=U.qs('#reg-avatar-input')?.dataset.img||'';
let valid=true;
if(!nome){this.showErr('r-name-err','Nome é obrigatório');valid=false}
else if(nome.length<2){this.showErr('r-name-err','Nome muito curto');valid=false}
if(!email){this.showErr('r-email-err','E-mail é obrigatório');valid=false}
else if(!this.validEmail(email)){this.showErr('r-email-err','E-mail inválido');valid=false}
if(!pw){this.showErr('r-pw-err','Senha é obrigatória');valid=false}
else if(pw.length<8||pw.length>256){this.showErr('r-pw-err','Senha precisa de no mínimo 8 caracteres');valid=false}
if(!pw2){this.showErr('r-pw2-err','Confirme a senha');valid=false}
else if(pw!==pw2){this.showErr('r-pw2-err','As senhas não coincidem');valid=false}
if(!Number.isFinite(salario)||salario<=0){this.showErr('r-salario-err','Informe um salário maior que zero');valid=false}
if(!valid) return;
if(this._registerBusy)return;
this._registerBusy=true;const button=e.target.querySelector('[type=submit]');button.disabled=true;
try{
const result=await EphyraAuth.register(email,pw,nome);
if(result.session){await this.acceptUser(result.user,{foto,salario});Toast.s('Conta criada!');}
else {if(result.user?.id&&result.user.identities?.length)await EphyraStorage.upsertUser({id:result.user.id,email,nome,foto,salario});this.switchTab('login');U.qs('#l-email').value=email;Toast.show('Confira seu e-mail para confirmar o cadastro e entrar.','i',9000);}
U.qs('#register-form').reset();this.removeAvatar('reg');
}catch(err){this.showErr('r-email-err',this.errorMessage(err));}
finally{this._registerBusy=false;button.disabled=false;}

},
createUserData(user,salario){
const data={saldo:0,receitas:[],despesas:[],metas:[],historico:[],conquistas:[],categorias:[
{id:'salario',nome:'Salário',icone:'fa-briefcase',tipo:'receita',cor:'#22c55e'},
{id:'freelance',nome:'Freelance',icone:'fa-laptop-code',tipo:'receita',cor:'#14b8a6'},
{id:'investimentos',nome:'Investimentos',icone:'fa-chart-line',tipo:'receita',cor:'#3b82f6'},
{id:'presente',nome:'Presente',icone:'fa-gift',tipo:'receita',cor:'#ec4899'},
{id:'outros_rec',nome:'Outros',icone:'fa-plus-circle',tipo:'receita',cor:'#64748b'},
{id:'alimentacao',nome:'Alimentação',icone:'fa-utensils',tipo:'despesa',cor:'#f97316'},
{id:'transporte',nome:'Transporte',icone:'fa-car',tipo:'despesa',cor:'#3b82f6'},
{id:'moradia',nome:'Moradia',icone:'fa-home',tipo:'despesa',cor:'#10b981'},
{id:'saude',nome:'Saúde',icone:'fa-heartbeat',tipo:'despesa',cor:'#ef4444'},
{id:'educacao',nome:'Educação',icone:'fa-graduation-cap',tipo:'despesa',cor:'#64748b'},
{id:'lazer',nome:'Lazer',icone:'fa-gamepad',tipo:'despesa',cor:'#f43f5e'},
{id:'compras',nome:'Compras',icone:'fa-shopping-bag',tipo:'despesa',cor:'#f59e0b'},
{id:'contas',nome:'Contas',icone:'fa-file-invoice-dollar',tipo:'despesa',cor:'#6366f1'},
{id:'outros_desp',nome:'Outros',icone:'fa-ellipsis-h',tipo:'despesa',cor:'#64748b'}],
xp:0,nivel:1,config:{tema:'dark',diasUsando:1,ultimoLogin:new Date().toISOString(),moeda:this.detectCurrency(),baseCurrency:'BRL'},
market:{favorites:[],alerts:[],defaultCurrency:this.detectCurrency(),cache:null},
monthlySummaries:[],
assistantHistory:[],
user:{nome:user.nome,email:user.email,foto:user.foto,salario:user.salario,dataCadastro:user.dataCadastro}
};
if(salario>0){
const tx={id:U.id(),tipo:'receita',nome:'Salário',categoria:'salario',valor:salario,data:new Date().toISOString(),descricao:'Salário inicial',dataCriacao:new Date().toISOString(),categoriaObj:data.categorias.find(c=>c.id==='salario')};
data.saldo+=salario;data.receitas.push(tx);data.historico.push(tx);
}
return data;
},
detectCurrency(){
try{
const lang=navigator.language||'en-US';
const region=new Intl.Locale(lang).region||'US';
const map={BR:'BRL',US:'USD',GB:'GBP',JP:'JPY',CH:'CHF',CA:'CAD',AU:'AUD',CN:'CNY',KR:'KRW',AR:'ARS',DE:'EUR',FR:'EUR',IT:'EUR',ES:'EUR',PT:'EUR',MX:'MXN'};
return map[region]||(lang.startsWith('pt')?'BRL':'USD');
}catch{return'BRL'}
},
errorMessage(err){
if(err?.status===429||err?.code==='over_email_send_rate_limit')return 'Muitas tentativas. Aguarde alguns minutos e tente novamente.';
if(err?.code==='email_not_confirmed')return 'Confirme seu e-mail antes de entrar.';
if(err?.code==='invalid_credentials'||err?.message==='Invalid login credentials')return 'E-mail ou senha incorretos.';
if(err?.code==='weak_password')return 'Escolha uma senha mais forte, com pelo menos 8 caracteres.';
if(!EphyraAuth.configured())return 'O acesso por e-mail ainda não foi ativado neste site.';
return 'Não foi possível concluir. Verifique os dados e sua conexão e tente novamente.';
},
async acceptUser(remote,initial={},restoring=false){
if(!remote?.id||!remote?.email)throw new Error('Conta inválida');
let clock;try{clock=JSON.parse(sessionStorage.getItem('ephyra_auth_activity')||'null')}catch{}
const now=Date.now();
if(restoring&&clock?.id===remote.id&&(!Number.isFinite(clock.createdAt)||!Number.isFinite(clock.lastActive)||now-clock.createdAt>=28800000||now-clock.lastActive>=1800000||clock.createdAt>now||clock.lastActive>now)){
await EphyraAuth.logout();throw new Error('Sua sessão expirou. Entre novamente.');
}
this._createdAt=restoring&&clock?.id===remote.id?clock.createdAt:now;this._lastActive=now;
sessionStorage.setItem('ephyra_auth_activity',JSON.stringify({id:remote.id,createdAt:this._createdAt,lastActive:now}));
const cached=await EphyraStorage.getUser(remote.id);
const user={nome:String(remote.user_metadata?.nome||remote.email.split('@')[0]).slice(0,120),foto:'',salario:0,...cached,...initial,id:remote.id,email:remote.email,dataCadastro:remote.created_at};
delete user.senha;delete user.senhaHash;
await EphyraStorage.upsertUser(user);
let data=await EphyraStorage.getUserData(user.id);
if(!data)data=this.createUserData(user,user.salario||0);
data.user={nome:user.nome,email:user.email,foto:user.foto,salario:user.salario,dataCadastro:user.dataCadastro};
this.checkDailyLogin(data);await EphyraStorage.saveUserData(user.id,data);
this.enterApp(user,data);
},
async handleLogin(e){
e.preventDefault();this.clearErrors();if(this._loginBusy)return;
const email=U.qs('#l-email').value.trim().toLowerCase(),pw=U.qs('#l-pw').value;
this._loginBusy=true;const button=e.target.querySelector('[type=submit]');button.disabled=true;
try{
const user=await EphyraAuth.login(email,pw);
if(U.qs('#l-remember').checked)localStorage.setItem('ephyra_remembered_email',email);else localStorage.removeItem('ephyra_remembered_email');
await this.acceptUser(user);U.qs('#l-pw').value='';Toast.s('Bem-vindo de volta!');
}catch(err){this.showErr('l-pw-err',this.errorMessage(err));}
finally{this._loginBusy=false;button.disabled=false;}
},
async handleRecover(e){
e.preventDefault();this.clearErrors();if(this._recoverBusy)return;
const email=U.qs('#f-email').value.trim().toLowerCase();if(!this.validEmail(email))return this.showErr('f-email-err','Informe um e-mail válido.');
this._recoverBusy=true;const button=e.target.querySelector('[type=submit]');button.disabled=true;
try{await EphyraAuth.recover(email);U.qs('#recovery-status').textContent='Se houver uma conta com esse e-mail, você receberá um link para redefinir a senha. Confira também o spam.';}
catch(err){this.showErr('f-email-err',this.errorMessage(err));}
finally{this._recoverBusy=false;button.disabled=false;}
},
async handleReset(e){
e.preventDefault();this.clearErrors();if(this._resetBusy)return;
const pw=U.qs('#new-pw').value,pw2=U.qs('#new-pw2').value;
if(pw.length<8||pw.length>256)return this.showErr('new-pw-err','Use entre 8 e 256 caracteres.');
if(pw!==pw2)return this.showErr('new-pw-err','As senhas não coincidem.');
this._resetBusy=true;const button=e.target.querySelector('[type=submit]');button.disabled=true;
try{await EphyraAuth.reset(pw);e.target.reset();this.switchTab('login');Toast.s('Senha redefinida. Entre com sua nova senha.');}
catch(err){this.showErr('new-pw-err',this.errorMessage(err));}
finally{this._resetBusy=false;button.disabled=false;}
},
async cancelRecovery(){await EphyraAuth.logout();U.qs('#reset-form').reset();this.switchTab('login')},

checkDailyLogin(data){if(!data.config)data.config={diasUsando:1,ultimoLogin:new Date().toISOString()};if(!U.sameDay(data.config.ultimoLogin,new Date())){data.config.diasUsando=(data.config.diasUsando||0)+1;data.config.ultimoLogin=new Date().toISOString();}},
enterApp(user,data){U.qs('#auth-screen').classList.add('hidden');U.qs('#app').classList.add('show');App.user=user;App.data=data;App.processLogin();App.setupNav();App.appTheme();App.updProf();App.nav('dashboard');if(typeof Sidebar!=='undefined')Sidebar.init();if(typeof EphyraAssistant!=='undefined')EphyraAssistant.init();if(typeof Market!=='undefined')Market.init(data).catch(()=>Toast.w('Mercado iniciado com dados simulados'));if(typeof MonthlySummary!=='undefined')MonthlySummary.init(data,user).catch(()=>Toast.w('Resumo mensal indisponível'));if(typeof EphyraOnboarding!=='undefined')EphyraOnboarding.init(data,user).catch(()=>{})},
async logout(){if(this._loggingOut)return;this._loggingOut=true;if(typeof Market!=='undefined')Market.destroy();if(typeof MonthlySummary!=='undefined')MonthlySummary.destroy();if(typeof EphyraOnboarding!=='undefined')EphyraOnboarding.hide();if(typeof EphyraAssistant!=='undefined')EphyraAssistant.destroy();App.closeSecret();App.destroyCharts();App.cMo();App.tsb(false);document.body.classList.remove('ui-locked');await this.clearSession();App.data=null;App.user=null;U.qs('#app').classList.remove('show');U.qs('#auth-screen').classList.remove('hidden');U.qs('#login-form')?.reset();U.qs('#register-form')?.reset();this.switchTab('login');this._loggingOut=false;Toast.i('Você saiu da sua conta');},
async autoLogin(){
if(!await EphyraAuth.init())return false;
const user=await EphyraAuth.user();
if(EphyraAuth.isRecovery()){
if(!user){await EphyraAuth.logout();Toast.e('Solicite um novo link de recuperação.');return false;}
this.switchTab('reset');return false;
}
if(!user)return false;
await this.acceptUser(user,{},true);return true;
},
async updateUser(updated){if(!App.user)return;const {nome,foto,salario}=updated;App.user={...App.user,...(nome!==undefined?{nome}:{}),...(foto!==undefined?{foto}:{}),...(salario!==undefined?{salario}:{})};await EphyraStorage.upsertUser(App.user)}

};

const App={
data:null,user:null,cp:'dashboard',charts:{},_navReady:false,_lastFocus:null,_numberFrame:0,_secretTimer:0,_secretOverlay:null,
async init(){
Toast.init();
try{
if(EphyraAuth.configured())await EphyraStorage.resetLegacyAccounts();
await EphyraStorage.init();
App.enhanceAccessibility(document);
if(!EphyraAuth.configured()){U.qs('#auth-setup').hidden=false;U.qsa('#auth-screen button[type=submit]').forEach(b=>b.disabled=true);}
const ok=await Auth.autoLogin();
if(!ok){U.qs('#auth-screen').classList.remove('hidden');const email=localStorage.getItem('ephyra_remembered_email');if(email){U.qs('#l-email').value=email;U.qs('#l-remember').checked=true;}}
}catch(err){console.error('[App.init]',err);U.qs('#auth-screen').classList.remove('hidden');Toast.e(err.message||'Falha ao iniciar');}
},
processLogin(){if(!this.data.config)this.data.config={diasUsando:1,ultimoLogin:new Date().toISOString(),moeda:'BRL',baseCurrency:'BRL'};this.data.config.baseCurrency=this.data.config.baseCurrency||'BRL';this.data.config.moeda=this.data.config.moeda||this.data.market?.defaultCurrency||'BRL';this.reconcileData();this.checkAchievements();this.saveData();},
reconcileData(){
const entries=new Map();
[...(this.data.historico||[]),...(this.data.receitas||[]),...(this.data.despesas||[])].forEach(tx=>{if(!tx?.id)return;const tipo=tx.tipo==='receita'?'receita':'despesa',valor=Math.max(0,Number(tx.valor)||0);entries.set(tx.id,{...tx,tipo,valor})});
if(entries.size){
this.data.historico=[...entries.values()];
this.data.receitas=this.data.historico.filter(tx=>tx.tipo==='receita').map(tx=>({...tx}));
this.data.despesas=this.data.historico.filter(tx=>tx.tipo==='despesa').map(tx=>({...tx}));
const ledger=this.data.historico.reduce((sum,tx)=>sum+(tx.tipo==='receita'?tx.valor:-tx.valor),0);
const reserved=(this.data.metas||[]).reduce((sum,meta)=>sum+Math.max(0,Number(meta.valorGuardado)||0),0);
this.data.saldo=ledger-reserved;
}
this.data.saldo=Number.isFinite(Number(this.data.saldo))?Number(this.data.saldo):0;
},
saveData(){if(!this.user||this._deleting) return;EphyraStorage.saveUserData(this.user.id,this.data).catch(e=>console.error('[saveData]',e));},
appTheme(){const dk=this.data?.config?.tema!=='light';document.body.classList.toggle('light',!dk);document.body.classList.toggle('dark',dk);},
toggleTheme(){const l=document.body.classList.toggle('light');document.body.classList.toggle('dark',!l);if(this.data){this.data.config.tema=l?'light':'dark';this.saveData()}Toast.i(l?'☀️ Modo claro':'🌙 Modo escuro');if(this.cp==='dashboard')setTimeout(()=>this.updCharts(),200);if(this.cp==='configuracoes')setTimeout(()=>this.rConfig(),120)},
setupNav(){if(this._navReady)return;this._navReady=true;this.enhanceAccessibility(document);U.on(U.qs('#modal'),'mousedown',event=>{if(event.target===event.currentTarget)this.cMo()});document.addEventListener('keydown',event=>{if(event.key==='Escape'){if(this._secretOverlay)this.closeSecret();else if(U.qs('#photo-viewer')?.classList.contains('a'))this.closePhotoViewer();else if(U.qs('#modal')?.classList.contains('a'))this.cMo();else if(U.qs('#sidebar')?.classList.contains('o'))this.tsb(false)}if(event.key==='Tab'){const dialog=U.qs('.mo.a [tabindex="-1"]');if(dialog)this.trapFocus(event,dialog)}});},
enhanceAccessibility(root){root.querySelectorAll('.fg,.form-group').forEach((group,index)=>{const control=group.querySelector('input:not([type="hidden"]),select,textarea'),label=group.querySelector('label');if(!control||!label)return;if(!control.id)control.id=`field-${Date.now()}-${index}`;label.htmlFor=control.id});},
trapFocus(event,root){const items=[...root.querySelectorAll('button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')].filter(item=>item.offsetParent!==null);if(!items.length){event.preventDefault();root.focus();return}const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}},
tsb(force){const sb=U.qs('#sidebar'),button=U.qs('#menu-btn');if(!sb)return;const open=force!==undefined?Boolean(force):!sb.classList.contains('o');if(typeof Sidebar!=='undefined')Sidebar.toggle(open);else{sb.classList.toggle('o',open);sb.classList.toggle('expanded',open);U.qs('.sov')?.classList.toggle('a',open)}sb.setAttribute('aria-expanded',String(open));button?.setAttribute('aria-expanded',String(open));button?.setAttribute('aria-label',open?'Fechar menu':'Abrir menu');document.body.classList.toggle('ui-locked',open&&window.innerWidth<=1024);},
updProf(){if(!this.user)return;U.qs('#sb-name').textContent=this.user.nome;U.qs('#sb-level').textContent=`Nível ${this.data.nivel||1} • ${this.data.xp||0} XP`;const wrap=U.qs('#sb-avatar-wrap');if(wrap)wrap.innerHTML=EphyraSecurity.html(Auth.getAvatarHtml(this.user,'av-sm'));},
viewPhoto(src){if(!src){Toast.i('Nenhuma foto adicionada');return}this._lastFocus=document.activeElement;U.qs('#pv-img').src=src;const viewer=U.qs('#photo-viewer');viewer.classList.add('a');viewer.setAttribute('aria-hidden','false');document.body.classList.add('ui-locked');requestAnimationFrame(()=>viewer.querySelector('.photo-dialog')?.focus())},
closePhotoViewer(){const viewer=U.qs('#photo-viewer');viewer.classList.remove('a');viewer.setAttribute('aria-hidden','true');if(!U.qs('#modal')?.classList.contains('a')&&!U.qs('#sidebar')?.classList.contains('o'))document.body.classList.remove('ui-locked');this._lastFocus?.focus?.()},
nav(pg){
if(this.cp==='resumo'&&pg!=='resumo'&&typeof MonthlySummary!=='undefined')MonthlySummary.destroy();
if(this.cp==='mercado'&&pg!=='mercado'&&typeof Market!=='undefined')Market.leavePage();
if(this.cp==='dashboard'&&pg!=='dashboard')this.destroyCharts();
this.cp=pg;U.qsa('.page').forEach(p=>p.classList.remove('a'));const t=U.qs(`#pg-${pg}`);if(t)t.classList.add('a');
U.qsa('.ni[data-nav],.sb-gear[data-nav],.sp[data-nav]').forEach(el=>{const active=el.dataset.nav===pg;el.classList.toggle('a',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')});
U.qsa('.bni[data-nav]').forEach(el=>{const active=el.dataset.nav===pg;el.classList.toggle('a',active);if(active)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current')});
const titles={dashboard:'Dashboard',transacoes:'Transações',metas:'Metas',mercado:'Mercado',conquistas:'Conquistas',perfil:'Perfil',configuracoes:'Configurações',resumo:'Resumo Financeiro'};
U.qs('#tb-title').textContent=titles[pg]||'';
switch(pg){
case'dashboard':this.rDash();break;
case'transacoes':this.rTx();break;
case'metas':this.rMt();break;
case'mercado':Market.render();break;
case'conquistas':this.rCQ();break;
case'perfil':this.rPerfil();break;
case'configuracoes':this.rConfig();break;
case'resumo':MonthlySummary.renderPage();break;
}
this.tsb(false);
window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
},
rDash(){
const d=this.data;const t=this.totals();const rec=this.filterTx().slice(0,6);const ms=this.mtStats();
U.qs('#pg-dashboard').innerHTML=EphyraSecurity.html(`
<div class="ph"><div><h2 class="pt">Dashboard</h2><p class="psub">Visão geral das suas finanças</p></div></div>
<div class="bh aSu"><p class="bl2">Saldo Disponível (${U.displayCurrency()})</p><h2 class="ba" data-count-base="${d.saldo}">${U.money(d.saldo)}</h2>
<div class="bsu"><span class="bsi tg"><i class="fas fa-arrow-up"></i> ${U.money(t.rec)}</span><span class="bsi td"><i class="fas fa-arrow-down"></i> ${U.money(t.des)}</span><span class="bsi tc"><i class="fas fa-piggy-bank"></i> ${U.money(t.gua)}</span></div></div>
<div style="margin-top:1rem">${this.xpBar()}</div>
<div class="sg aSu" style="margin-top:1.5rem">
<div class="sc"><div class="si" style="background:rgba(16,185,129,.12);color:#10b981"><i class="fas fa-arrow-up"></i></div><div><div class="sv tg" data-count-base="${t.rec}">${U.money(t.rec)}</div><div class="sl">Receitas</div></div></div>
<div class="sc"><div class="si" style="background:rgba(239,68,68,.12);color:#ef4444"><i class="fas fa-arrow-down"></i></div><div><div class="sv td" data-count-base="${t.des}">${U.money(t.des)}</div><div class="sl">Despesas</div></div></div>
<div class="sc"><div class="si" style="background:rgba(59,130,246,.12);color:#3b82f6"><i class="fas fa-chart-line"></i></div><div><div class="sv" data-count-base="${t.rec-t.des}">${U.money(t.rec-t.des)}</div><div class="sl">Economia</div></div></div>
<div class="sc"><div class="si" style="background:rgba(15,118,110,.12);color:#0f766e"><i class="fas fa-bullseye"></i></div><div><div class="sv">${ms.total}</div><div class="sl">Metas</div></div></div>
<div class="sc"><div class="si" style="background:rgba(245,158,11,.12);color:#f59e0b"><i class="fas fa-trophy"></i></div><div><div class="sv">${(d.conquistas||[]).length}</div><div class="sl">Conquistas</div></div></div>
<div class="sc"><div class="si" style="background:rgba(236,72,153,.12);color:#ec4899"><i class="fas fa-exchange-alt"></i></div><div><div class="sv">${(d.historico||[]).length}</div><div class="sl">Transações</div></div></div>
</div>
${this.renderBudget503020()}
<div class="cg" style="margin-top:1.5rem">
<div class="cc aFi"><h3 class="ct2"><i class="fas fa-chart-pie"></i> Receitas vs Despesas</h3><div class="cw"><canvas id="c-pie"></canvas></div></div>
<div class="cc aFi"><h3 class="ct2"><i class="fas fa-chart-line"></i> Evolução Mensal</h3><div class="cw"><canvas id="c-mon"></canvas></div></div>
<div class="cc aFi"><h3 class="ct2"><i class="fas fa-chart-bar"></i> Despesas por Categoria</h3><div class="cw"><canvas id="c-cat"></canvas></div></div>
</div>
<div class="card" style="margin-top:1.5rem"><div class="flx jb aic" style="margin-bottom:1rem"><h3 class="f7">Últimas Movimentações</h3><button class="btn btn-ghost btn-sm" data-on-click="h14">Ver todas <i class="fas fa-arrow-right"></i></button></div>
<div class="tl2">${rec.length?rec.map(tx=>this.txItem(tx)).join(''):'<div class="es"><div class="ei">📊</div><h3>Sem movimentações</h3></div>'}</div></div>`);
this.animateNumbers(U.qs('#pg-dashboard'));setTimeout(()=>this.updCharts(),100);
},
budget503020(){const income=(this.data.receitas||[]).reduce((sum,tx)=>sum+Number(tx.valor||0),0),needsIds=new Set(['alimentacao','transporte','moradia','saude','educacao','contas']),expenses=this.data.despesas||[],necessidades=expenses.filter(tx=>needsIds.has(tx.categoria)).reduce((sum,tx)=>sum+Number(tx.valor||0),0),desejos=expenses.filter(tx=>!needsIds.has(tx.categoria)).reduce((sum,tx)=>sum+Number(tx.valor||0),0),economia=income-necessidades-desejos;return{income,necessidades,desejos,economia,needsPct:income>0?necessidades/income*100:0,wantsPct:income>0?desejos/income*100:0,savingsPct:income>0?economia/income*100:0}},
renderBudget503020(){const budget=this.budget503020();if(!budget.income)return`<section class="card budget-rule" aria-labelledby="budget-title"><div class="budget-head"><div><h3 id="budget-title">Análise 50/30/20</h3><p>Registre uma receita para comparar necessidades, desejos e economia.</p></div><span class="badge bdp">Planejamento</span></div></section>`;const item=(label,value,pct,target,color,icon)=>`<div class="budget-item"><div class="budget-item-head"><span><i class="fas ${icon}" style="color:${color}"></i> ${label}</span><strong>${U.money(value)} · ${pct.toFixed(1)}%</strong></div><div class="budget-track" role="progressbar" aria-label="${label}: ${pct.toFixed(1)}% da renda" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${Math.max(0,Math.min(100,pct)).toFixed(1)}"><span style="width:${Math.max(0,Math.min(100,pct))}%;background:${color}"></span><i style="left:${target}%" aria-hidden="true"></i></div><small>Referência: ${target}% da renda</small></div>`;return`<section class="card budget-rule" aria-labelledby="budget-title"><div class="budget-head"><div><h3 id="budget-title">Análise 50/30/20</h3><p>Distribuição calculada sobre todas as movimentações registradas.</p></div><span class="badge bdp">Renda ${U.money(budget.income)}</span></div><div class="budget-grid">${item('Necessidades',budget.necessidades,budget.needsPct,50,'#3b82f6','fa-house')}${item('Desejos',budget.desejos,budget.wantsPct,30,'#b08938','fa-bag-shopping')}${item('Economia',budget.economia,budget.savingsPct,20,budget.economia>=0?'#10b981':'#ef4444','fa-piggy-bank')}</div></section>`},
animateNumbers(root){cancelAnimationFrame(this._numberFrame);if(!root||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;const nodes=[...root.querySelectorAll('[data-count-base]')],start=performance.now(),duration=650;const tick=now=>{const progress=Math.min(1,(now-start)/duration),eased=1-Math.pow(1-progress,3);nodes.forEach(node=>{node.textContent=U.money(Number(node.dataset.countBase||0)*eased)});if(progress<1)this._numberFrame=requestAnimationFrame(tick)};this._numberFrame=requestAnimationFrame(tick)},
destroyCharts(){Object.values(this.charts).forEach(chart=>{try{chart?.destroy()}catch{}});this.charts={}},
updCharts(){
this.destroyCharts();
const canvases={pie:U.qs('#c-pie'),monthly:U.qs('#c-mon'),categories:U.qs('#c-cat')};
if(!canvases.pie&&!canvases.monthly&&!canvases.categories)return;
if(typeof Chart==='undefined'){Object.values(canvases).forEach(canvas=>{if(canvas?.parentElement)canvas.parentElement.innerHTML=EphyraSecurity.html('<div class="chart-fallback"><span>📊</span><p>Gráfico indisponível. Os valores continuam acessíveis nos cards.</p></div>')});return}
const textColor=document.body.classList.contains('light')?'#475569':'#94a3b8',gridColor=document.body.classList.contains('light')?'rgba(15,23,42,.08)':'rgba(148,163,184,.12)',reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches,t=this.totals(),baseOptions={responsive:true,maintainAspectRatio:false,animation:{duration:reduced?0:700},plugins:{legend:{labels:{color:textColor,usePointStyle:true}}}};
try{this.charts.pie=new Chart(canvases.pie,{type:'doughnut',data:{labels:t.rec||t.des?['Receitas','Despesas']:['Sem dados'],datasets:[{data:t.rec||t.des?[t.rec,t.des]:[1],backgroundColor:t.rec||t.des?['#10b981','#ef4444']:['#334155'],borderWidth:0,hoverOffset:8}]},options:{...baseOptions,cutout:'68%',plugins:{legend:{position:'bottom',labels:{color:textColor,usePointStyle:true}}}}})}catch(error){console.error('[dashboard-chart-pie]',error)}
const months=new Map();(this.data.historico||[]).forEach(tx=>{const date=new Date(tx.data);if(Number.isNaN(date.getTime()))return;const key=`${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}`,row=months.get(key)||{rec:0,des:0};row[tx.tipo==='receita'?'rec':'des']+=Number(tx.valor||0);months.set(key,row)});const monthRows=[...months.entries()].sort(([a],[b])=>a.localeCompare(b)).slice(-6);
try{this.charts.monthly=new Chart(canvases.monthly,{type:'line',data:{labels:monthRows.map(([key])=>{const[year,month]=key.split('-');return new Date(Number(year),Number(month)-1).toLocaleDateString('pt-BR',{month:'short',year:'2-digit'})}),datasets:[{label:'Receitas',data:monthRows.map(([,row])=>row.rec),borderColor:'#10b981',backgroundColor:'rgba(16,185,129,.12)',tension:.35,fill:true},{label:'Despesas',data:monthRows.map(([,row])=>row.des),borderColor:'#ef4444',backgroundColor:'rgba(239,68,68,.08)',tension:.35,fill:true}]},options:{...baseOptions,scales:{x:{grid:{display:false},ticks:{color:textColor}},y:{grid:{color:gridColor},ticks:{color:textColor,callback:value=>U.money(value)}}}}})}catch(error){console.error('[dashboard-chart-monthly]',error)}
const categories=new Map();(this.data.despesas||[]).forEach(tx=>{const cat=(this.data.categorias||[]).find(item=>item.id===tx.categoria)||{nome:'Outros',cor:'#64748b'},row=categories.get(cat.nome)||{value:0,color:cat.cor};row.value+=Number(tx.valor||0);categories.set(cat.nome,row)});const categoryRows=[...categories.entries()].sort((a,b)=>b[1].value-a[1].value).slice(0,7);
try{this.charts.categories=new Chart(canvases.categories,{type:'bar',data:{labels:categoryRows.map(([name])=>name),datasets:[{label:'Despesas',data:categoryRows.map(([,row])=>row.value),backgroundColor:categoryRows.map(([,row])=>row.color),borderRadius:7}]},options:{...baseOptions,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{color:textColor}},y:{beginAtZero:true,grid:{color:gridColor},ticks:{color:textColor,callback:value=>U.money(value)}}}}})}catch(error){console.error('[dashboard-chart-categories]',error)}
},
xpBar(){const d=this.data;const n=d.nivel||1;const xp=d.xp||0;const need=n*100;const pct=U.pct(xp,need);return`<div class="xpbc"><div class="flx jb aic gs" style="margin-bottom:.3rem"><span class="badge bdp"><i class="fas fa-star"></i> Nível ${n}</span><span class="txs tm">${xp} / ${need} XP</span></div><div class="prog"><div class="prog-fill" style="width:${pct}%"></div></div></div>`;},
totals(){return{rec:this.data.receitas.reduce((s,t)=>s+t.valor,0),des:this.data.despesas.reduce((s,t)=>s+t.valor,0),gua:this.data.metas.reduce((s,m)=>s+(m.valorGuardado||0),0)}},
filterTx(f={}){let l=[...(this.data.historico||[])];if(f.tipo&&f.tipo!=='todos')l=l.filter(t=>t.tipo===f.tipo);if(f.categoria)l=l.filter(t=>t.categoria===f.categoria);if(f.search){const s=f.search.toLowerCase();l=l.filter(t=>t.nome.toLowerCase().includes(s)||(t.descricao||'').toLowerCase().includes(s))}l.sort((a,b)=>new Date(b.data)-new Date(a.data));return l;},
txItem(tx){
const cats=this.data.categorias||[];const cat=cats.find(c=>c.id===tx.categoria)||{icone:'fa-circle',cor:'#64748b',nome:'Outros'};
const r=tx.tipo==='receita';
let orig='';
if(tx.moedaOriginal&&tx.moedaOriginal!== (this.data.market?.defaultCurrency||'BRL')){
orig=`<div class="txs tm">Original: ${U.esc(tx.valorOriginal)} ${U.esc(tx.moedaOriginal)} • Taxa: ${U.esc(tx.taxaConversao?.toFixed ? tx.taxaConversao.toFixed(4) : tx.taxaConversao)}</div>`;
}
return`<div class="ti2"><div class="tic" style="background:${cat.cor}22;color:${cat.cor}"><i class="fas ${cat.icone}"></i></div>
<div class="tin"><div class="tnm">${U.esc(U.trunc(tx.nome,35))}</div><div class="tmt">${U.esc(cat.nome)} • ${U.date(tx.data)}</div>${orig}</div>
<div class="ta2 ${r?'tg':'td'}">${r?'+':'-'} ${U.money(tx.valor)}</div>
<div class="tac"><button type="button" class="bi2" data-on-click="h31" data-arg-0="${EphyraSecurity.escapeHTML(tx.id)}" aria-label="Editar ${U.esc(tx.nome)}"><i class="fas fa-pen"></i></button><button type="button" class="bi2" data-on-click="h32" data-arg-0="${EphyraSecurity.escapeHTML(tx.id)}" aria-label="Excluir ${U.esc(tx.nome)}"><i class="fas fa-trash"></i></button></div></div>`;
},
rTx(){
const txs=this.filterTx();const cats=this.data.categorias||[];
U.qs('#pg-transacoes').innerHTML=EphyraSecurity.html(`
<div class="ph"><div><h2 class="pt">Transações</h2><p class="psub">Gerencie receitas e despesas</p></div>
<div class="flx gs"><button class="btn btn-success btn-sm" data-on-click="h23"><i class="fas fa-plus"></i> Receita</button><button class="btn btn-danger btn-sm" data-on-click="h24"><i class="fas fa-minus"></i> Despesa</button></div></div>
<div class="card" style="margin-bottom:1rem"><div class="flx gs aic" style="flex-wrap:wrap">
<input class="form-input" id="txs" placeholder="Pesquisar..." style="max-width:220px" data-on-input="h33">
<select class="form-input" id="txft" style="max-width:140px" data-on-change="h34" aria-label="Filtrar por tipo"><option value="todos">Todos</option><option value="receita">Receitas</option><option value="despesa">Despesas</option></select>
<select class="form-input" id="txfc" style="max-width:180px" data-on-change="h35" aria-label="Filtrar por categoria"></select>
</div></div>
<div id="txl" class="tl2">${txs.length?txs.map(tx=>this.txItem(tx)).join(''):'<div class="es"><div class="ei">💰</div><h3>Nenhuma transação</h3></div>'}</div>`);
this.updateTxCategoryFilter();
},
onTxTypeFilter(){this.updateTxCategoryFilter();this.fTx()},
updateTxCategoryFilter(){const select=U.qs('#txfc');if(!select)return;const current=select.value,type=U.qs('#txft')?.value||'todos',categories=(this.data.categorias||[]).filter(category=>type==='todos'||category.tipo===type);const groups=type==='todos'?['receita','despesa'].map(group=>{const label=group==='receita'?'Receitas':'Despesas',options=categories.filter(category=>category.tipo===group).map(category=>`<option value="${U.esc(category.id)}">${U.esc(category.nome)}</option>`).join('');return options?`<optgroup label="${label}">${options}</optgroup>`:''}).join(''):categories.map(category=>`<option value="${U.esc(category.id)}">${U.esc(category.nome)}</option>`).join('');select.innerHTML=EphyraSecurity.html(`<option value="">Todas as categorias</option>${groups}`);if([...select.options].some(option=>option.value===current))select.value=current},
fTx(){
const s=U.qs('#txs')?.value||'',t=U.qs('#txft')?.value||'todos',c=U.qs('#txfc')?.value||'';
const txs=this.filterTx({search:s,tipo:t,categoria:c||undefined});
U.qs('#txl').innerHTML=EphyraSecurity.html(txs.length?txs.map(tx=>this.txItem(tx)).join(''):'<div class="es"><div class="ei">🔍</div><h3>Nenhum resultado</h3></div>');
},
showTxModal(tipo,editId){
const existing=editId?[...this.data.receitas,...this.data.despesas].find(t=>t.id===editId):null;
if(!tipo)tipo=existing?.tipo||'receita';
const isE=!!existing;
const cats=this.data.categorias||[];
const localCurr=this.data.market?.defaultCurrency||this.data.config?.moeda||'BRL';
const marketCodes=Market?.cache ? [...Object.keys(Market.cache.fiat||{}),...Object.keys(Market.cache.crypto||{})] : ['USD','EUR','GBP','BTC','ETH'];
this.oM(`${isE?'Editar':'Nova'} ${tipo==='receita'?'Receita':'Despesa'}`,`
<form id="txf" class="fc gm">
<div class="fg"><label class="form-label">Nome *</label><input class="form-input" id="txn" required value="${U.esc(existing?.nome||'')}"></div>
<div class="fg"><label class="form-label">Categoria</label><select class="form-input" id="txc">${cats.filter(c=>c.tipo===tipo).map(c=>`<option value="${U.esc(c.id)}" ${existing?.categoria===c.id?'selected':''}>${U.esc(c.nome)}</option>`).join('')}</select></div>
<div class="fg"><label class="form-label">Valor (${localCurr}) *</label><input class="form-input" id="txv" type="number" step="0.01" min="0.01" inputmode="decimal" required value="${existing?U.fromBase(existing.valor,localCurr).toFixed(2):''}"></div>
<div class="fg"><label class="form-label" style="display:flex;align-items:center;gap:.5rem"><input type="checkbox" id="tx-intl" ${existing?.moedaOriginal?'checked':''} data-on-change="h36" style="accent-color:var(--cp)"> Compra internacional?</label></div>
<div id="tx-intl-fields" style="${existing?.moedaOriginal?'':'display:none'};border:1px dashed var(--bc);padding:1rem;border-radius:var(--rm)">
<div class="fg"><label class="form-label">Moeda original</label><select class="form-input" id="tx-orig-cur" data-on-change="h37"><option value="">Selecione</option>${marketCodes.map(code=>`<option value="${code}" ${existing?.moedaOriginal===code?'selected':''}>${code}</option>`).join('')}</select></div>
<div class="fg"><label class="form-label">Valor original</label><input class="form-input" id="tx-orig-val" type="number" step="0.01" value="${existing?.valorOriginal||''}" data-on-input="h38"></div>
<div class="txs tm" id="tx-intl-preview" style="margin-top:.5rem">${existing?.moedaOriginal?`Original: ${existing.valorOriginal} ${existing.moedaOriginal}`:''}</div>
</div>
<div class="fg"><label class="form-label">Data</label><input class="form-input" id="txd" type="date" value="${existing?U.dI(existing.data):U.dI()}"></div>
<div class="fg"><label class="form-label">Descrição</label><input class="form-input" id="txds" value="${U.esc(existing?.descricao||'')}"></div>
<button type="submit" class="btn btn-primary bb">${isE?'Salvar':'Adicionar'}</button>
</form>`);
U.on(U.qs('#txf'),'submit',e=>{
e.preventDefault();
const isIntl=U.qs('#tx-intl').checked;
let nome=U.qs('#txn').value.trim(),categoria=U.qs('#txc').value,displayValue=parseFloat(U.qs('#txv').value),valor=U.toBase(displayValue,localCurr),data=U.qs('#txd').value,desc=U.qs('#txds').value;
if(!nome||!Number.isFinite(displayValue)||displayValue<=0||!Number.isFinite(valor)||valor<=0){Toast.e('Preencha o nome e valor corretamente');return}
const parsedDate = data ? new Date(data + 'T12:00:00.000Z') : new Date();
if (Number.isNaN(parsedDate.getTime())) { Toast.e('Data inválida'); return; }
const dtIso = parsedDate.toISOString();
const cat=(this.data.categorias||[]).find(c=>c.id===categoria);
let extra={};
if(isIntl){
const origCur=U.qs('#tx-orig-cur').value;
const origVal=parseFloat(U.qs('#tx-orig-val').value);
if(!origCur||!Number.isFinite(origVal)||origVal<=0){Toast.e('Preencha a moeda e o valor original corretamente');return}
const converted=MarketAPI.convert(origVal,origCur,U.baseCurrency(),Market?.cache);
if(converted===null){Toast.e('Conversão indisponível');return}
valor=converted;
extra={moedaOriginal:origCur,valorOriginal:origVal,taxaConversao:converted/origVal,valorConvertido:converted};
}
if(isE){
const old=(this.data.historico||[]).find(tx=>tx.id===editId)||[...(this.data.receitas||[]),...(this.data.despesas||[])].find(tx=>tx.id===editId);
if(!old){Toast.e('Transação não encontrada');return}
const updated={...old,tipo,nome,categoria,valor,data:dtIso,descricao:desc,categoriaObj:cat,...extra};
if(!isIntl){delete updated.moedaOriginal;delete updated.valorOriginal;delete updated.taxaConversao;delete updated.valorConvertido}
this.data.historico=(this.data.historico||[]).map(tx=>tx.id===editId?{...updated}:tx);
this.data.receitas=(this.data.receitas||[]).filter(tx=>tx.id!==editId);
this.data.despesas=(this.data.despesas||[]).filter(tx=>tx.id!==editId);
this.data[tipo==='receita'?'receitas':'despesas'].push({...updated});
Toast.s('Atualizada!');
}else{
const tx={id:U.id(),tipo,nome,categoria,categoriaObj:cat,valor,data:dtIso,descricao:desc,dataCriacao:new Date().toISOString(),...extra};
if(tipo==='receita')this.data.receitas.push(tx);else this.data.despesas.push(tx);
this.data.historico.push(tx);
this.addXP(5);
Toast.s(`${tipo==='receita'?'Receita':'Despesa'} adicionada!${extra.moedaOriginal?` (${extra.valorOriginal} ${extra.moedaOriginal} → ${U.money(extra.valorConvertido)})`:''}`);
}
this.reconcileData();this.saveData();this.checkAchievements();this.cMo();this.nav(this.cp);
});
},
toggleIntl(cb){
U.qs('#tx-intl-fields').style.display=cb.checked?'block':'none';
if(cb.checked)this.updateIntlPreview();else{const currency=U.qs('#tx-orig-cur'),value=U.qs('#tx-orig-val'),preview=U.qs('#tx-intl-preview');if(currency)currency.value='';if(value)value.value='';if(preview)preview.textContent=''}
},
updateIntlPreview(){
const origCur=U.qs('#tx-orig-cur')?.value;
const origVal=parseFloat(U.qs('#tx-orig-val')?.value);
const localCurr=this.data.market?.defaultCurrency||this.data.config?.moeda||'BRL';
const preview=U.qs('#tx-intl-preview');
const valInput=U.qs('#txv');
if(!origCur||!origVal||!preview) return;
const converted=MarketAPI.convert(origVal,origCur,U.baseCurrency(),Market?.cache);
if(converted!==null){
const displayed=U.fromBase(converted,localCurr);
preview.textContent=`≈ ${U.moneyC(displayed,localCurr)} • Taxa na moeda-base: 1 ${origCur} = ${(converted/origVal).toFixed(4)} ${U.baseCurrency()}`;
if(valInput) valInput.value=displayed.toFixed(2);
}else{
preview.textContent='Conversão indisponível offline — usando última cotação';
}
},
confirmDelTx(id){
this.oM('Confirmar Exclusão',`<p class="ts2">Tem certeza que deseja excluir esta transação?</p>
<div class="mf2"><button class="btn btn-ghost" data-on-click="h28">Cancelar</button><button class="btn btn-danger" id="cDel">Excluir</button></div>`);
U.on(U.qs('#cDel'),'click',()=>{
this.data.receitas=(this.data.receitas||[]).filter(t=>t.id!==id);
this.data.despesas=(this.data.despesas||[]).filter(t=>t.id!==id);
this.data.historico=(this.data.historico||[]).filter(t=>t.id!==id);
this.reconcileData();this.saveData();Toast.s('Excluída');this.cMo();this.nav(this.cp);
});
},
mtStats(){const m=this.data.metas||[];return{total:m.length,con:m.filter(x=>x.status==='concluida').length,ati:m.filter(x=>x.status==='ativa').length}},
rMt(){
const mt=this.data.metas||[];
U.qs('#pg-metas').innerHTML=EphyraSecurity.html(`<div class="ph"><div><h2 class="pt">Metas</h2><p class="psub">Seus objetivos financeiros</p></div>
<button class="btn btn-primary btn-sm" data-on-click="h39"><i class="fas fa-plus"></i> Nova Meta</button></div>
<div class="ga">${mt.length?mt.map(m=>this.mCard(m)).join(''):'<div class="es" style="grid-column:1/-1"><div class="ei">🎯</div><h3>Nenhuma meta</h3><p>Crie metas para organizar seus objetivos</p><button class="btn btn-primary" data-on-click="h39">Criar primeira meta</button></div>'}</div>`);
},
mCard(m){
const p=U.pct(m.valorGuardado||0,m.valorObjetivo);const dn=m.status==='concluida';
return`<div class="card" style="border-left:4px solid ${m.cor||'#3b82f6'}">
<div class="flx jb aic" style="margin-bottom:.75rem"><h3 class="f7">${U.esc(m.icone||'🎯')} ${U.esc(U.trunc(m.nome,25))}</h3>${dn?'<span class="badge bds">Concluída ✅</span>':`<span class="badge bdp">${p.toFixed(0)}%</span>`}</div>
<p class="txm ts2" style="margin-bottom:.75rem">${U.esc(U.trunc(m.descricao||'Sem descrição',60))}</p>
<div class="prog" style="margin-bottom:.5rem"><div class="prog-fill" style="width:${p}%;${dn?'background:linear-gradient(90deg,#10b981,#059669)':''}"></div></div>
<div class="flx jb txs tm" style="margin-bottom:.75rem"><span>${U.money(m.valorGuardado||0)}</span><span>${U.money(m.valorObjetivo)}</span></div>
<div class="flx gs">${!dn?`<button class="btn btn-primary btn-sm" data-on-click="h40" data-arg-0="${EphyraSecurity.escapeHTML(m.id)}"><i class="fas fa-piggy-bank"></i> Guardar</button>`:''}
<button class="btn btn-ghost btn-sm" data-on-click="h41" data-arg-0="${EphyraSecurity.escapeHTML(m.id)}" aria-label="Editar meta ${U.esc(m.nome)}"><i class="fas fa-pen"></i></button>
<button class="btn btn-ghost btn-sm" data-on-click="h42" data-arg-0="${EphyraSecurity.escapeHTML(m.id)}" aria-label="Excluir meta ${U.esc(m.nome)}"><i class="fas fa-trash"></i></button></div></div>`;
},
showMetaModal(eid){
const ex=eid?this.data.metas.find(m=>m.id===eid):null;const isE=!!ex;
this.oM(`${isE?'Editar':'Nova'} Meta`,`
<form id="mf2" class="fc gm">
<div class="fg"><label class="form-label">Nome *</label><input class="form-input" id="mn" required value="${U.esc(ex?.nome||'')}"></div>
<div class="fg"><label class="form-label">Descrição</label><input class="form-input" id="md" value="${U.esc(ex?.descricao||'')}"></div>
<div class="fg"><label class="form-label">Valor Objetivo (${U.displayCurrency()}) *</label><input class="form-input" id="mv" type="number" step="0.01" min="0.01" inputmode="decimal" required value="${ex?U.fromBase(ex.valorObjetivo).toFixed(2):''}"></div>
<div class="fg"><label class="form-label">Data Limite</label><input class="form-input" id="mdate" type="date" value="${ex?.dataLimite?U.dI(ex.dataLimite):''}"></div>
<div class="g2"><div class="fg"><label class="form-label">Cor</label><input type="color" id="mcor" value="${ex?.cor||'#3b82f6'}" style="width:100%;height:40px;border:none;border-radius:var(--rm);cursor:pointer"></div>
<div class="fg"><label class="form-label">Prioridade</label><select class="form-input" id="mpri"><option value="baixa" ${ex?.prioridade==='baixa'?'selected':''}>Baixa</option><option value="media" ${!ex||ex?.prioridade==='media'?'selected':''}>Média</option><option value="alta" ${ex?.prioridade==='alta'?'selected':''}>Alta</option></select></div></div>
<button type="submit" class="btn btn-primary bb">${isE?'Salvar':'Criar Meta'}</button>
</form>`);
U.on(U.qs('#mf2'),'submit',e=>{
e.preventDefault();
const displayTarget=parseFloat(U.qs('#mv').value),v={nome:U.qs('#mn').value.trim(),descricao:U.qs('#md').value,valorObjetivo:U.toBase(displayTarget),dataLimite:U.qs('#mdate').value||null,cor:U.qs('#mcor').value,prioridade:U.qs('#mpri').value};
if(!v.nome||!Number.isFinite(displayTarget)||displayTarget<=0||!Number.isFinite(v.valorObjetivo)||v.valorObjetivo<=0){Toast.e('Preencha os dados da meta corretamente');return}
if(isE){const m=this.data.metas.find(x=>x.id===eid);if(m){const saved=Math.max(0,Number(m.valorGuardado)||0),refund=Math.max(0,saved-v.valorObjetivo);if(refund>0){this.data.saldo+=refund;m.valorGuardado=v.valorObjetivo;Toast.i(`${U.money(refund)} excedente voltou ao saldo`)}Object.assign(m,v);if(Number(m.valorGuardado||0)>=m.valorObjetivo){m.valorGuardado=m.valorObjetivo;m.status='concluida';m.dataConclusao=m.dataConclusao||new Date().toISOString()}else{m.status='ativa';delete m.dataConclusao}}Toast.s('Meta atualizada!')}
else{const meta={id:U.id(),...v,valorGuardado:0,status:'ativa',dataCriacao:new Date().toISOString()};this.data.metas.push(meta);this.addXP(5);Toast.s('Meta criada!')}
this.saveData();this.checkAchievements();this.cMo();this.nav('metas');
});
},
depMeta(id){
const m=this.data.metas.find(x=>x.id===id);if(!m)return;
const remaining=Math.max(0,Number(m.valorObjetivo||0)-Number(m.valorGuardado||0));
this.oM('Guardar Dinheiro',`<p class="ts2" style="margin-bottom:1rem">Saldo: <strong class="tg">${U.money(this.data.saldo)}</strong> · Falta: <strong>${U.money(remaining)}</strong></p>
<div class="fg"><label class="form-label">Valor (${U.displayCurrency()})</label><input class="form-input" id="dv" type="number" step="0.01" min="0.01" max="${U.fromBase(remaining).toFixed(2)}" inputmode="decimal"></div>
<button class="btn btn-primary bb" id="dBtn" style="margin-top:1rem"><i class="fas fa-piggy-bank"></i> Guardar</button>`);
U.on(U.qs('#dBtn'),'click',()=>{
const requestedDisplay=parseFloat(U.qs('#dv').value),requested=U.toBase(requestedDisplay),remainingNow=Math.max(0,m.valorObjetivo-(m.valorGuardado||0)),val=Math.min(requested,remainingNow);
if(!Number.isFinite(requestedDisplay)||requestedDisplay<=0||!Number.isFinite(requested)||requested<=0){Toast.e('Valor inválido');return}
if(requested>remainingNow+1e-8)Toast.i(`O depósito foi limitado ao valor restante de ${U.money(remainingNow)}`);
if(val>this.data.saldo){Toast.e('Saldo insuficiente!');return}
this.data.saldo-=val;m.valorGuardado=(m.valorGuardado||0)+val;
if(m.valorGuardado>=m.valorObjetivo){m.valorGuardado=m.valorObjetivo;m.status='concluida';m.dataConclusao=new Date().toISOString();Toast.s(`🎉 Meta "${m.nome}" concluída!`);this.addXP(30)}
else Toast.s(`${U.money(val)} guardado em "${m.nome}"`);
this.addXP(3);this.saveData();this.checkAchievements();this.cMo();this.nav(this.cp);
});
},
delMeta(id){
const meta=this.data.metas.find(item=>item.id===id);if(!meta)return;const refund=Math.max(0,Number(meta.valorGuardado)||0);
this.oM('Excluir meta',`<p class="ts2">Tem certeza que deseja excluir <strong>${U.esc(meta.nome)}</strong>?</p><p class="goal-refund">${refund>0?`${U.money(refund)} guardados serão devolvidos ao saldo.`:'Esta meta ainda não possui dinheiro guardado.'}</p><div class="mf2"><button class="btn btn-ghost" data-on-click="h28">Cancelar</button><button class="btn btn-danger" id="dmB">Excluir e devolver</button></div>`);
U.on(U.qs('#dmB'),'click',()=>{this.data.saldo+=refund;this.data.metas=this.data.metas.filter(item=>item.id!==id);this.reconcileData();this.saveData();Toast.s(refund>0?`Meta excluída e ${U.money(refund)} devolvidos`:'Meta excluída');this.cMo();this.nav('metas')});
},
ACH_DEF:[
{id:'primeira_receita',nome:'Primeira Receita',desc:'Registre sua primeira receita',xp:10,icone:'💰',cat:'iniciante'},
{id:'primeira_despesa',nome:'Primeira Despesa',desc:'Registre sua primeira despesa',xp:10,icone:'💳',cat:'iniciante'},
{id:'primeira_meta',nome:'Sonhador',desc:'Crie sua primeira meta',xp:15,icone:'🎯',cat:'iniciante'},
{id:'dez_transacoes',nome:'Organizando',desc:'Registre 10 transações',xp:20,icone:'📊',cat:'iniciante'},
{id:'cem_transacoes',nome:'Contador',desc:'Registre 100 transações',xp:50,icone:'🧮',cat:'avancado'},
{id:'milionario',nome:'Milionário',desc:'Tenha R$ 1.000 de saldo',xp:25,icone:'💎',cat:'intermediario'},
{id:'economista',nome:'Economista',desc:'Tenha R$ 5.000 de saldo',xp:50,icone:'🪙',cat:'avancado'},
{id:'meta_concluida',nome:'Objetivo Alcançado',desc:'Conclua sua primeira meta',xp:30,icone:'🏁',cat:'intermediario'},
{id:'cinco_metas',nome:'Planejador',desc:'Crie 5 metas',xp:35,icone:'🗓️',cat:'intermediario'},
{id:'sete_dias',nome:'Semana Firme',desc:'Use o app por 7 dias',xp:25,icone:'📅',cat:'intermediario'},
{id:'trinta_dias',nome:'Mês Completo',desc:'Use o app por 30 dias',xp:50,icone:'🗓️',cat:'avancado'},
{id:'nivel_5',nome:'Evoluindo',desc:'Alcance o nível 5',xp:30,icone:'⭐',cat:'intermediario'},
{id:'nivel_10',nome:'Mestre Financeiro',desc:'Alcance o nível 10',xp:100,icone:'👑',cat:'avancado'},
{id:'investidor',nome:'Investidor',desc:'Adicione receita de investimentos',xp:20,icone:'📈',cat:'intermediario'}],
checkAchievements(){
const d=this.data;const unlock=def=>{if(d.conquistas.some(c=>c.id===def.id))return;d.conquistas.push({...def,data:new Date().toISOString(),desbloqueada:true});this.addXP(def.xp);Toast.s(`🏆 ${def.nome}!`)};
const h=d.historico||[],r=d.receitas||[],ds=d.despesas||[],m=d.metas||[],dia=d.config?.diasUsando||1;
if(r.length>=1)unlock(this.ACH_DEF[0]);if(ds.length>=1)unlock(this.ACH_DEF[1]);if(m.length>=1)unlock(this.ACH_DEF[2]);
if(h.length>=10)unlock(this.ACH_DEF[3]);if(h.length>=100)unlock(this.ACH_DEF[4]);
if(d.saldo>=1000)unlock(this.ACH_DEF[5]);if(d.saldo>=5000)unlock(this.ACH_DEF[6]);
if(m.some(x=>x.valorGuardado>=x.valorObjetivo))unlock(this.ACH_DEF[7]);if(m.length>=5)unlock(this.ACH_DEF[8]);
if(dia>=7)unlock(this.ACH_DEF[9]);if(dia>=30)unlock(this.ACH_DEF[10]);
if((d.nivel||1)>=5)unlock(this.ACH_DEF[11]);if((d.nivel||1)>=10)unlock(this.ACH_DEF[12]);
if(r.some(x=>x.categoria==='investimentos'))unlock(this.ACH_DEF[13]);
},
addXP(amount){const gain=Number(amount);this.data.xp=Math.max(0,Number(this.data.xp)||0)+(Number.isFinite(gain)?Math.max(0,gain):0);this.data.nivel=Math.max(1,Math.floor(Number(this.data.nivel)||1));let levels=0;while(this.data.xp>=this.data.nivel*100&&levels<10000){this.data.xp-=this.data.nivel*100;this.data.nivel++;levels++}if(levels){Toast.s(levels===1?`🎉 Nível ${this.data.nivel}!`:`🎉 ${levels} níveis conquistados! Agora você está no nível ${this.data.nivel}.`);const el=U.qs('.xpbc');if(el){el.classList.add('aL');setTimeout(()=>el.classList.remove('aL'),900)}}this.saveData();return levels},
rCQ(){
const all=this.ACH_DEF,ul=this.data.conquistas||[],secretUnlocked=ul.some(item=>item.id==='mestre_dinheiro'),visibleTotal=all.length+(secretUnlocked?1:0),visibleUnlocked=ul.filter(item=>all.some(def=>def.id===item.id)||item.id==='mestre_dinheiro').length;
U.qs('#pg-conquistas').innerHTML=EphyraSecurity.html(`
<div class="ph"><div><h2 class="pt">Conquistas</h2><p class="psub">${visibleUnlocked} de ${visibleTotal} desbloqueadas</p></div></div>
<div class="card tc2" style="margin-bottom:1.5rem"><div style="font-size:3rem;margin-bottom:.5rem">🏆</div><h3 class="f7">Sua Coleção</h3><p class="tm2">Nível ${this.data.nivel||1} • ${this.data.xp||0} XP</p>
<div style="max-width:300px;margin:1rem auto 0">${this.xpBar()}</div></div>
<div class="ga">${all.map(a=>{const u=ul.some(x=>x.id===a.id);return`<div class="card tc2" style="opacity:${u?1:.4}"><div style="font-size:2.2rem;margin-bottom:.5rem">${u?a.icone:'🔒'}</div><p class="f6 txm">${a.nome}</p><p class="txs tm">${a.xp} XP</p></div>`}).join('')}</div>
<div class="card tc2" style="margin-top:1.5rem"><h3 class="f7" style="margin-bottom:1rem">🔐 Código Secreto</h3>
<div class="flx gs jc aic"><input class="form-input" id="secI" placeholder="Digite o código" style="max-width:200px">
<button class="btn btn-primary btn-sm" data-on-click="h43">Desbloquear</button></div></div>`);
},
trySecret(){
const code=U.qs('#secI').value;
if(code!=='6767'){Toast.e('Código incorreto!');return}
if(this.data.conquistas.some(c=>c.id==='mestre_dinheiro')){Toast.w('Já desbloqueada!');return}
this.data.conquistas.push({id:'mestre_dinheiro',nome:'Mestre do Dinheiro',desc:'+99999 de Aura',xp:500,icone:'🏆',cat:'secreto',data:new Date().toISOString(),desbloqueada:true});
this.addXP(500);Toast.s('🏆 CONQUISTA SECRETA: Mestre do Dinheiro!');
this.closeSecret();const o=document.createElement('div');o.className='secret-achievement';o.setAttribute('role','dialog');o.setAttribute('aria-modal','true');o.setAttribute('aria-labelledby','secret-title');
o.innerHTML=EphyraSecurity.html('<div class="secret-achievement-card" tabindex="-1"><button class="mc" type="button" data-on-click="h44" aria-label="Fechar conquista"><i class="fas fa-times"></i></button><div class="secret-trophy">🏆</div><h2 id="secret-title">Mestre do Dinheiro!</h2><p>+99999 de Aura</p><small>+500 XP</small></div>');
document.body.appendChild(o);this._secretOverlay=o;document.body.classList.add('ui-locked');requestAnimationFrame(()=>o.querySelector('.secret-achievement-card')?.focus());this._secretTimer=setTimeout(()=>this.closeSecret(),5000);
},
closeSecret(){clearTimeout(this._secretTimer);this._secretTimer=0;this._secretOverlay?.remove();this._secretOverlay=null;if(!U.qs('#modal')?.classList.contains('a')&&!U.qs('#photo-viewer')?.classList.contains('a')&&!U.qs('#sidebar')?.classList.contains('o'))document.body.classList.remove('ui-locked')},
checkLevelUp(){return this.addXP(0)},
rPerfil(){
const d=this.data;const u=this.user;const t=this.totals();const ms=this.mtStats();const dia=d.config?.diasUsando||1;
U.qs('#pg-perfil').innerHTML=EphyraSecurity.html(`
<div class="ph"><div><h2 class="pt">Perfil</h2><p class="psub">Suas informações</p></div><button class="btn btn-outline btn-sm" data-on-click="h45"><i class="fas fa-pen"></i> Editar</button></div>
<div class="pf-cover">
<div class="flx gl aic" style="flex-wrap:wrap">
<div class="pf-avatar-wrap">
${Auth.getAvatarHtml(u,'av-xl')}
<button type="button" class="pf-avatar-edit" data-on-click="h46" aria-label="Alterar foto"><i class="fas fa-camera"></i></button>
<input type="file" id="prof-avatar-input" accept="image/jpeg,image/jpg,image/png,image/webp" style="display:none" data-on-change="h47">
</div>
<div style="flex:1;min-width:200px">
<h2 class="txx f8">${U.esc(u.nome)}</h2><p class="ts2">${U.esc(u.email)}</p>
<p class="txs tm2" style="margin-top:.3rem"><i class="fas fa-calendar-alt"></i> Membro desde ${U.date(u.dataCadastro)}</p>
<div style="margin-top:.75rem">${this.xpBar()}</div>
<div style="margin-top:1rem;display:flex;gap:.5rem;flex-wrap:wrap">
<button class="btn btn-ghost btn-sm" data-on-click="h48" ${!u.foto?'disabled':''}><i class="fas fa-eye"></i> Ver foto</button>
<button class="btn btn-ghost btn-sm" data-on-click="h49" ${!u.foto?'disabled':''}><i class="fas fa-trash"></i> Remover foto</button>
</div>
</div></div></div>
<div class="sg aSu" style="margin-top:1.5rem">
<div class="sc"><div class="si" style="background:rgba(16,185,129,.12);color:#10b981"><i class="fas fa-wallet"></i></div><div><div class="sv">${U.money(d.saldo)}</div><div class="sl">Saldo</div></div></div>
<div class="sc"><div class="si" style="background:rgba(16,185,129,.12);color:#10b981"><i class="fas fa-arrow-up"></i></div><div><div class="sv">${U.money(t.rec)}</div><div class="sl">Receitas</div></div></div>
<div class="sc"><div class="si" style="background:rgba(239,68,68,.12);color:#ef4444"><i class="fas fa-arrow-down"></i></div><div><div class="sv">${U.money(t.des)}</div><div class="sl">Despesas</div></div></div>
<div class="sc"><div class="si" style="background:rgba(59,130,246,.12);color:#3b82f6"><i class="fas fa-exchange-alt"></i></div><div><div class="sv">${U.money(t.rec+t.des)}</div><div class="sl">Total Mov.</div></div></div>
<div class="sc"><div class="si" style="background:rgba(15,118,110,.12);color:#0f766e"><i class="fas fa-bullseye"></i></div><div><div class="sv">${ms.con}/${ms.total}</div><div class="sl">Metas</div></div></div>
<div class="sc"><div class="si" style="background:rgba(245,158,11,.12);color:#f59e0b"><i class="fas fa-trophy"></i></div><div><div class="sv">${(d.conquistas||[]).length}</div><div class="sl">Conquistas</div></div></div>
<div class="sc"><div class="si" style="background:rgba(236,72,153,.12);color:#ec4899"><i class="fas fa-calendar-check"></i></div><div><div class="sv">${dia}</div><div class="sl">Dias Usando</div></div></div>
<div class="sc"><div class="si" style="background:rgba(251,191,36,.12);color:#fbbf24"><i class="fas fa-star"></i></div><div><div class="sv">Nv. ${d.nivel||1}</div><div class="sl">Nível</div></div></div>
</div>`);
},
async changeProfilePhoto(input){
const file=input.files[0];if(!file)return;
if(!['image/jpeg','image/jpg','image/png','image/webp'].includes(file.type)){Toast.e('Formato inválido. Use JPG, PNG ou WEBP.');return}
if(file.size>5*1024*1024){Toast.e('Máximo: 5MB');return}
const reader=new FileReader();
reader.onerror=()=>Toast.e('Não foi possível ler a imagem');reader.onload=ev=>{
const img=new Image();
img.onload=async()=>{
const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
const ctx=canvas.getContext('2d');const minD=Math.min(img.width,img.height);
ctx.drawImage(img,(img.width-minD)/2,(img.height-minD)/2,minD,minD,0,0,256,256);
const dataUrl=canvas.toDataURL('image/jpeg',0.7);
this.user.foto=dataUrl;this.data.user.foto=dataUrl;
await Auth.updateUser({foto:dataUrl});this.saveData();this.updProf();
Toast.s('Foto atualizada!');this.nav('perfil');
};img.onerror=()=>Toast.e('A imagem selecionada é inválida');img.src=ev.target.result;
};reader.readAsDataURL(file);
},
async removeProfilePhoto(){if(!this.user?.foto)return;await Auth.updateUser({foto:''});this.user.foto='';if(!this.data.user)this.data.user={};this.data.user.foto='';this.saveData();this.updProf();Toast.s('Foto removida');this.rPerfil()},
editProf(){
this.oM('Editar Perfil',`
<form id="pf" class="fc gm">
<div class="fg"><label class="form-label">Nome</label><input class="form-input" id="pn" value="${U.esc(this.user.nome)}"></div>
<div class="fg"><label class="form-label">Email</label><input class="form-input" id="pe" type="email" readonly aria-readonly="true" value="${U.esc(this.user.email)}"></div>
<button type="submit" class="btn btn-primary bb">Salvar</button>
</form>`);
U.on(U.qs('#pf'),'submit',async e=>{
e.preventDefault();
const nome=U.qs('#pn').value.trim();const email=U.qs('#pe').value.trim().toLowerCase();
if(!nome){Toast.e('Nome obrigatório');return}
if(!email||!Auth.validEmail(email)){Toast.e('Email inválido');return}
try{
await Auth.updateUser({nome,email});
this.user.nome=nome;this.user.email=email;this.data.user.nome=nome;this.data.user.email=email;
this.saveData();Toast.s('Perfil atualizado!');this.cMo();this.updProf();
if(this.cp==='perfil') this.rPerfil();
}catch(err){console.error(err);Toast.e('Erro ao atualizar perfil')}
});
},
rConfig(){
const isD=!document.body.classList.contains('light');
const marketCurr=this.data.market?.defaultCurrency||this.data.config?.moeda||'BRL';
U.qs('#pg-configuracoes').innerHTML=EphyraSecurity.html(`
<div class="ph"><div><h2 class="pt">Configurações</h2><p class="psub">Personalize sua experiência</p></div></div>
<div class="card" style="margin-bottom:1rem"><h3 class="f7" style="margin-bottom:1rem"><i class="fas fa-palette"></i> Aparência</h3>
<div class="flx aic jb" style="padding:.75rem 0;border-bottom:1px solid var(--bc)">
<div><p class="f6">Modo Escuro</p><p class="txs tm2">Interface escura e elegante</p></div>
<label class="theme-switch">
<input type="checkbox" id="theme-tog" ${isD?'checked':''} data-on-change="h50" aria-label="Ativar modo escuro">
<span class="theme-track"></span>
<span class="theme-thumb" style="left:${isD?'27px':'5px'}"></span>
</label></div>
<div class="flx aic jb" style="padding:.75rem 0">
<div><p class="f6">Moeda de exibição</p><p class="txs tm2">Os dados permanecem em ${this.data.config.baseCurrency||'BRL'} e são convertidos somente na tela. Atual: ${marketCurr}</p></div>
<select id="cfg-currency" class="form-input" style="max-width:120px" data-on-change="h51">
<option value="BRL" ${marketCurr==='BRL'?'selected':''}>BRL</option>
<option value="USD" ${marketCurr==='USD'?'selected':''}>USD</option>
<option value="EUR" ${marketCurr==='EUR'?'selected':''}>EUR</option>
<option value="GBP" ${marketCurr==='GBP'?'selected':''}>GBP</option>
<option value="JPY" ${marketCurr==='JPY'?'selected':''}>JPY</option>
<option value="CHF" ${marketCurr==='CHF'?'selected':''}>CHF</option>
<option value="CAD" ${marketCurr==='CAD'?'selected':''}>CAD</option>
<option value="AUD" ${marketCurr==='AUD'?'selected':''}>AUD</option>
<option value="CNY" ${marketCurr==='CNY'?'selected':''}>CNY</option>
<option value="KRW" ${marketCurr==='KRW'?'selected':''}>KRW</option>
<option value="ARS" ${marketCurr==='ARS'?'selected':''}>ARS</option>
</select>
</div>
</div>
<div class="card" style="margin-bottom:1rem"><h3 class="f7" style="margin-bottom:1rem"><i class="fas fa-database"></i> Dados</h3>
<div class="flx gm" style="flex-wrap:wrap">
<button class="btn btn-outline btn-sm" data-on-click="h52"><i class="fas fa-download"></i> Exportar JSON</button>
<button class="btn btn-outline btn-sm" data-on-click="h53"><i class="fas fa-upload"></i> Importar JSON</button>
<input type="file" id="imp-f" accept=".json" style="display:none" data-on-change="h54"></div></div>
<div class="card" style="margin-bottom:1rem"><h3 class="f7" style="margin-bottom:1rem"><i class="fas fa-user-edit"></i> Conta</h3>
<div class="flx gm" style="flex-wrap:wrap">
<button class="btn btn-outline btn-sm" data-on-click="h45"><i class="fas fa-user"></i> Editar Perfil</button>
<button class="btn btn-ghost btn-sm" data-on-click="h55"><i class="fas fa-sign-out-alt"></i> Sair</button></div></div>
<div class="card" style="margin-bottom:1rem"><h3 class="f7" style="margin-bottom:1rem"><i class="fas fa-circle-question"></i> Ajuda &amp; Suporte</h3>
<div class="flx gm" style="flex-wrap:wrap">
<button class="btn btn-outline btn-sm" data-on-click="h56"><i class="fas fa-book-open"></i> Ver tutorial novamente</button>
</div></div>
<div class="card" style="margin-bottom:1rem"><h3 class="f7" style="margin-bottom:1rem"><i class="fas fa-lightbulb"></i> Recomendações</h3>
<p class="auth-help">Sugira uma atualização ou uma função nova para o Ephyra Finance.</p>
<button type="button" class="btn btn-outline btn-sm" data-on-click="recommendations"><i class="fas fa-envelope"></i> Enviar sugestão</button></div>
<div class="card"><h3 class="f7 td" style="margin-bottom:1rem"><i class="fas fa-exclamation-triangle"></i> Zona Perigosa</h3>
<p class="txs tm2" style="margin-bottom:1rem">Resetar tudo exclui sua conta e os dados financeiros deste navegador.</p><button class="btn btn-danger btn-sm" data-on-click="h57"><i class="fas fa-trash-alt"></i> Resetar Tudo</button></div>`);
},
setCurrency(cur){
if(!this.data.market) this.data.market={favorites:[],alerts:[],defaultCurrency:cur};
this.data.market.defaultCurrency=cur;
this.data.config.moeda=cur;
this.saveData();
if(typeof Market!=='undefined'){Market.setDefaultCurrency(cur);}
Toast.s(`Moeda de exibição: ${cur}`);
if(this.cp!=='mercado')this.nav(this.cp);
},
expData(){
(async()=>{
try{
const j=await EphyraStorage.exportAll(this.user.id);
const b=new Blob([j],{type:'application/json'});
const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download='ephyra-backup.json';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);Toast.s('Dados exportados!');
}catch(err){Toast.e('Erro ao exportar')}
})();
},
impData(e){
const f=e.target.files[0];if(!f)return;if(f.size>5*1024*1024){Toast.e('O backup deve ter até 5 MB.');e.target.value='';return;}
const r=new FileReader();
r.onload=async(ev)=>{
try{
const obj=EphyraSecurity.parseBackup(ev.target.result);
if(obj.data){
await EphyraStorage.importAll(this.user.id,obj);
this.data=await EphyraStorage.getUserData(this.user.id);
this.user=await EphyraStorage.getUser(this.user.id)||this.user;
this.processLogin();this.appTheme();this.updProf();if(typeof Market!=='undefined'){Market.destroy();await Market.init(this.data)}if(typeof MonthlySummary!=='undefined')await MonthlySummary.init(this.data,this.user);this.nav(this.cp);Toast.s('Dados importados!');
}else Toast.e('Formato inválido');
}catch(err){console.error(err);Toast.e(err.message||'Erro na importação')}
};r.onerror=()=>Toast.e('Não foi possível ler o arquivo');r.readAsText(f);e.target.value='';
},
cReset(){
this.oM('Excluir conta e resetar tudo',`<p class="ts2">Sua conta será excluída definitivamente e seus dados financeiros serão apagados deste navegador. Exporte um backup antes, se desejar. Cópias em outros dispositivos não podem ser apagadas daqui.</p>
<form id="delete-account-form"><div class="fg"><label class="form-label" for="delete-password">Confirme sua senha</label><input class="form-input" id="delete-password" type="password" autocomplete="current-password" maxlength="256" required></div>
<div class="fg"><label class="remember-option"><input id="delete-confirm" type="checkbox" required> Entendo que minha conta será excluída.</label></div>
<p id="delete-error" class="td" role="alert"></p><div class="mf2"><button type="button" class="btn btn-ghost" data-on-click="h28">Cancelar</button><button type="submit" class="btn btn-danger" id="rB">Excluir minha conta</button></div></form>`);
U.on(U.qs('#delete-account-form'),'submit',async e=>{
e.preventDefault();if(this._deleting)return;
const id=this.user?.id;if(!id)return;
const password=U.qs('#delete-password').value,button=U.qs('#rB'),error=U.qs('#delete-error');
this._deleting=true;button.disabled=true;button.textContent='Excluindo…';error.textContent='';
let deleted=false;
try{
await EphyraAuth.deleteAccount(password);deleted=true;
if(typeof Market!=='undefined')Market.destroy();if(typeof MonthlySummary!=='undefined')MonthlySummary.destroy();
await EphyraStorage.removeAccount(id);
await Auth.logout();Toast.s('Conta excluída e dados deste navegador apagados.');
}catch(err){
if(deleted){await Auth.logout();Toast.w('Conta excluída. Não foi possível limpar todos os dados locais; limpe os dados deste site no navegador.');}
else error.textContent=err.message||'Não foi possível excluir. Tente novamente.';
}finally{this._deleting=false;button.disabled=false;button.textContent='Excluir minha conta';}
});
},
oM(title,body){const modal=U.qs('#modal');this._lastFocus=document.activeElement;U.qs('#m-title').textContent=title;U.qs('#m-body').innerHTML=EphyraSecurity.html(body);this.enhanceAccessibility(modal);modal.classList.add('a');modal.setAttribute('aria-hidden','false');document.body.classList.add('ui-locked');requestAnimationFrame(()=>{const target=modal.querySelector('input:not([type="hidden"]),select,textarea,button:not(.mc)')||modal.querySelector('.md');target?.focus()})},
cMo(){const modal=U.qs('#modal');if(!modal)return;modal.classList.remove('a');modal.setAttribute('aria-hidden','true');if(!U.qs('#photo-viewer')?.classList.contains('a')&&!U.qs('#sidebar')?.classList.contains('o'))document.body.classList.remove('ui-locked');this._lastFocus?.focus?.()}
};
window.App=App;

document.addEventListener('DOMContentLoaded',()=>{
const iconProbe=document.createElement('i');iconProbe.className='fas fa-check';document.body.appendChild(iconProbe);const iconContent=getComputedStyle(iconProbe,'::before').content;iconProbe.remove();document.body.classList.toggle('fa-fallback',!iconContent||iconContent==='none'||iconContent==='normal'||iconContent==='""');
if(typeof Sidebar!=='undefined') Sidebar.init();
App.init();
const l=U.qs('#ldr');setTimeout(()=>{l.classList.add('fo');setTimeout(()=>l.remove(),500)},600);
});

// Local screen lock supplements the server-validated session.
(()=>{
let closing=false,lastValidation=0;
async function check(event){
if(!App.user||closing||App._deleting)return;
const now=Date.now();
if(now-Auth._lastActive>=1800000||now-Auth._createdAt>=28800000){
event?.preventDefault();event?.stopImmediatePropagation();closing=true;
try{await Auth.logout();}finally{closing=false;}return;
}
if(event?.isTrusted){Auth._lastActive=now;sessionStorage.setItem('ephyra_auth_activity',JSON.stringify({id:App.user.id,createdAt:Auth._createdAt,lastActive:now}));}
if(now-lastValidation>60000){lastValidation=now;try{if(!await EphyraAuth.user())await Auth.logout();}catch{if(App.user)await Auth.logout();}}
}
for(const type of ['pointerdown','keydown','click','submit'])document.addEventListener(type,check,true);
setInterval(()=>check(),15000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)check()});
window.addEventListener('storage',event=>{if(event.key==='ephyra_deleted_account'&&App.user){try{if(JSON.parse(event.newValue)?.id===App.user.id)Auth.logout()}catch{}}});
window.addEventListener('ephyra-signed-out',()=>{if(App.user&&!Auth._loggingOut&&!App._deleting)Auth.logout()});
})();
