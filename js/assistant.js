(function(global){
'use strict';

const EphyraAssistant={
initialized:false,
isOpen:false,
typingTimer:0,
lastFocus:null,
maxHistory:40,

init(){
if(this.initialized){this.renderHistory();return}
const form=document.getElementById('assistant-form');
if(!form)return;
this.initialized=true;
form.addEventListener('submit',event=>{event.preventDefault();this.send()});
document.getElementById('assistant-input')?.addEventListener('keydown',event=>{
if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();form.requestSubmit()}
});
document.addEventListener('keydown',event=>{
if(!this.isOpen)return;
if(event.key==='Escape'){event.preventDefault();this.close();return}
if(event.key==='Tab')this.trapFocus(event);
});
this.renderHistory();
},

data(){return global.App?.data||{}},
num(value){const number=Number(value);return Number.isFinite(number)?number:0},
normalize(value){return String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9$%.,\s]/g,' ').replace(/\s+/g,' ').trim()},
transactions(){return Array.isArray(this.data().historico)?this.data().historico.filter(item=>item&&item.id):[]},
categories(){return Array.isArray(this.data().categorias)?this.data().categorias:[]},

monthBounds(offset=0){
const now=new Date(),start=new Date(now.getFullYear(),now.getMonth()+offset,1),end=new Date(now.getFullYear(),now.getMonth()+offset+1,1);
return{start,end};
},

periodFor(question){
const text=this.normalize(question),now=new Date();
if(/\bhoje\b/.test(text)){const start=new Date(now.getFullYear(),now.getMonth(),now.getDate()),end=new Date(start);end.setDate(end.getDate()+1);return{start,end,label:'hoje'}}
if(/mes passado|ultimo mes|mês passado/.test(text)){return{...this.monthBounds(-1),label:'no mês passado'}}
if(/este mes|nesse mes|mes atual|mês atual/.test(text)){return{...this.monthBounds(0),label:'neste mês'}}
const days=text.match(/ultimos?\s+(7|15|30|60|90)\s+dias?/);
if(days){const amount=Number(days[1]),start=new Date(now);start.setHours(0,0,0,0);start.setDate(start.getDate()-amount+1);return{start,end:new Date(now.getTime()+1),label:`nos últimos ${amount} dias`}}
return{start:null,end:null,label:'em todo o período'};
},

inPeriod(items,period){
if(!period.start)return items.slice();
return items.filter(item=>{const date=new Date(item.data);return!Number.isNaN(date.getTime())&&date>=period.start&&date<period.end});
},

categoryFor(question){
const text=this.normalize(question),aliases={
alimentacao:['alimentacao','comida','mercado','restaurante','delivery'],
transporte:['transporte','uber','onibus','gasolina','combustivel'],
moradia:['moradia','aluguel','casa'],
saude:['saude','farmacia','remedio'],
educacao:['educacao','escola','curso','livro'],
lazer:['lazer','jogo','cinema','passeio'],
compras:['compras','shopping','roupa'],
contas:['contas','energia','luz','agua','internet'],
salario:['salario','pagamento'],
freelance:['freelance','freela'],
investimentos:['investimento','dividendo'],
presente:['presente']
};
return this.categories().find(category=>{
const terms=[this.normalize(category.nome),category.id,...(aliases[category.id]||[])];
return terms.some(term=>term&&new RegExp(`\\b${term.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}s?\\b`).test(text));
})||null;
},

extractAmount(question){
const text=String(question||''),match=text.match(/(?:r\$\s*)?([0-9][0-9.,]*)/i);
if(!match)return null;
let raw=match[1];
if(raw.includes(',')&&raw.includes('.'))raw=raw.replace(/\./g,'').replace(',','.');
else if(raw.includes(','))raw=raw.replace(',','.');
else if(/^\d{1,3}(?:\.\d{3})+$/.test(raw))raw=raw.replace(/\./g,'');
const value=Number(raw);return Number.isFinite(value)?value:null;
},

sum(items){return items.reduce((total,item)=>total+this.num(item.valor),0)},
money(value){return global.U?.money?global.U.money(value):this.num(value).toLocaleString('pt-BR',{style:'currency',currency:'BRL'})},
percent(value){return `${this.num(value).toFixed(1).replace('.',',')}%`},

budget(){
if(global.App?.budget503020)return global.App.budget503020();
const income=this.sum(this.transactions().filter(item=>item.tipo==='receita')),expenses=this.transactions().filter(item=>item.tipo==='despesa'),needs=new Set(['alimentacao','transporte','moradia','saude','educacao','contas']),necessidades=this.sum(expenses.filter(item=>needs.has(item.categoria))),desejos=this.sum(expenses.filter(item=>!needs.has(item.categoria))),economia=income-necessidades-desejos;
return{income,necessidades,desejos,economia,needsPct:income?necessidades/income*100:0,wantsPct:income?desejos/income*100:0,savingsPct:income?economia/income*100:0};
},

answer(question){
const text=this.normalize(question),period=this.periodFor(question),all=this.inPeriod(this.transactions(),period),receitas=all.filter(item=>item.tipo==='receita'),despesas=all.filter(item=>item.tipo==='despesa'),category=this.categoryFor(question);
if(!text)return{text:'Digite uma pergunta para eu analisar seus dados.'};
if(/^(oi|ola|bom dia|boa tarde|boa noite)\b/.test(text))return{text:`Olá, ${global.App?.user?.nome?.split(' ')[0]||'tudo bem'}! Posso analisar seus gastos, receitas, saldo, metas e a regra 50/30/20.`,suggestions:this.defaultSuggestions()};
if(/o que voce faz|como funciona|ajuda|perguntas|comandos/.test(text))return{text:'Eu analiso somente os dados salvos neste dispositivo. Você pode perguntar sobre saldo, receitas, despesas, categorias, metas, movimentações recentes, comparação mensal e regra 50/30/20.',suggestions:this.defaultSuggestions()};

if(/compar|diferenca|evolucao/.test(text)&&/mes|mensal/.test(text)){
const current=this.inPeriod(this.transactions(),{...this.monthBounds(0),label:'neste mês'}),previous=this.inPeriod(this.transactions(),{...this.monthBounds(-1),label:'no mês passado'}),currentIncome=this.sum(current.filter(item=>item.tipo==='receita')),previousIncome=this.sum(previous.filter(item=>item.tipo==='receita')),currentExpense=this.sum(current.filter(item=>item.tipo==='despesa')),previousExpense=this.sum(previous.filter(item=>item.tipo==='despesa')),difference=currentExpense-previousExpense;
return{text:`Comparação mensal:\n• Receitas: ${this.money(currentIncome)} neste mês e ${this.money(previousIncome)} no anterior.\n• Despesas: ${this.money(currentExpense)} neste mês e ${this.money(previousExpense)} no anterior.\n${difference===0?'As despesas ficaram no mesmo valor.':difference>0?`Você gastou ${this.money(difference)} a mais neste mês.`:`Você gastou ${this.money(Math.abs(difference))} a menos neste mês.`}`,action:{label:'Abrir resumo financeiro',page:'resumo'}};
}

if(/50\s*[/.-]\s*30\s*[/.-]\s*20|\b50\s+30\s+20\b|necessidades|desejos/.test(text)||(/economia/.test(text)&&/regra|renda|porcent/.test(text))){
const value=this.budget();
if(!value.income)return{text:'Ainda não há receitas suficientes para calcular a regra 50/30/20.',action:{label:'Adicionar receita',command:'receita'}};
const needsState=value.needsPct<=50?'dentro da referência':'acima da referência',wantsState=value.wantsPct<=30?'dentro da referência':'acima da referência',savingState=value.savingsPct>=20?'atingiu a referência':'ainda não atingiu a referência';
return{text:`Análise 50/30/20:\n• Necessidades: ${this.money(value.necessidades)} (${this.percent(value.needsPct)}), ${needsState} de 50%.\n• Desejos: ${this.money(value.desejos)} (${this.percent(value.wantsPct)}), ${wantsState} de 30%.\n• Economia: ${this.money(value.economia)} (${this.percent(value.savingsPct)}), ${savingState} de 20%.`,action:{label:'Ver análise no Dashboard',page:'dashboard'}};
}

if(/posso|consigo|da para|daria para/.test(text)&&/(guardar|economizar|depositar)/.test(text)){
const amount=this.extractAmount(question);
if(amount===null||amount<=0)return{text:'Informe um valor maior que zero. Exemplo: “Posso guardar R$ 200?”'};
const balance=this.num(this.data().saldo),remaining=balance-amount;
if(balance>=amount)return{text:`Sim. Guardando ${this.money(amount)}, seu saldo disponível ficaria em ${this.money(remaining)}. Confira suas despesas previstas antes de confirmar qualquer depósito.`,action:{label:'Abrir metas',page:'metas'}};
return{text:`Seu saldo disponível é ${this.money(balance)}, então faltam ${this.money(amount-balance)} para guardar ${this.money(amount)} sem deixar o saldo negativo.`,action:{label:'Ver transações',page:'transacoes'}};
}

if(/meta|objetivo/.test(text)){
const goals=Array.isArray(this.data().metas)?this.data().metas:[];
if(!goals.length)return{text:'Você ainda não criou metas financeiras.',action:{label:'Criar uma meta',page:'metas'}};
if(/falta|restante|terminar|concluir/.test(text)){const named=goals.find(goal=>text.includes(this.normalize(goal.nome))),goal=named||goals.find(item=>item.status!=='concluida')||goals[0],remaining=Math.max(0,this.num(goal.valorObjetivo)-this.num(goal.valorGuardado));return{text:remaining>0?`Faltam ${this.money(remaining)} para concluir a meta “${goal.nome}”. Você já guardou ${this.money(goal.valorGuardado)} de ${this.money(goal.valorObjetivo)}.`:`A meta “${goal.nome}” já foi concluída.`,action:{label:'Abrir metas',page:'metas'}}}
const open=goals.filter(goal=>goal.status!=='concluida'),completed=goals.length-open.length,lines=goals.slice(0,4).map(goal=>{const saved=this.num(goal.valorGuardado),target=this.num(goal.valorObjetivo),pct=target>0?Math.min(100,saved/target*100):0;return`• ${goal.nome}: ${this.money(saved)} de ${this.money(target)} (${this.percent(pct)})`});
return{text:`Você tem ${goals.length} ${goals.length===1?'meta':'metas'}: ${completed} concluída${completed===1?'':'s'} e ${open.length} em andamento.\n${lines.join('\n')}`,action:{label:'Abrir metas',page:'metas'}};
}

if(/categoria/.test(text)&&/(mais|maior|principal)/.test(text)&&/(gast|despesa|consumo)/.test(text)){
const totals=new Map();despesas.forEach(item=>totals.set(item.categoria,(totals.get(item.categoria)||0)+this.num(item.valor)));const top=[...totals.entries()].sort((a,b)=>b[1]-a[1])[0];if(!top)return{text:`Não encontrei despesas ${period.label}.`};const cat=this.categories().find(item=>item.id===top[0]),total=this.sum(despesas),share=total>0?top[1]/total*100:0;return{text:`A categoria com maior gasto ${period.label} é ${cat?.nome||'Outros'}, com ${this.money(top[1])}, equivalente a ${this.percent(share)} das despesas do período.`,action:{label:'Ver essa categoria',page:'transacoes',filter:{tipo:'despesa',categoria:top[0]}}};
}

if(/maior|mais alta|mais caro/.test(text)&&/(despesa|gasto|compra)/.test(text)){
const largest=despesas.slice().sort((a,b)=>this.num(b.valor)-this.num(a.valor))[0];
if(!largest)return{text:`Não encontrei despesas ${period.label}.`};
const cat=this.categories().find(item=>item.id===largest.categoria);
return{text:`Sua maior despesa ${period.label} foi “${largest.nome}”, no valor de ${this.money(largest.valor)}${cat?` em ${cat.nome}`:''}, registrada em ${global.U?.date?global.U.date(largest.data):''}.`,action:{label:'Ver transações',page:'transacoes'}};
}

if(/recent|ultimas moviment|ultimas transa/.test(text)){
const recent=this.transactions().slice().sort((a,b)=>new Date(b.data)-new Date(a.data)).slice(0,5);
if(!recent.length)return{text:'Você ainda não registrou movimentações.'};
return{text:`Movimentações mais recentes:\n${recent.map(item=>`• ${item.tipo==='receita'?'+':'−'} ${this.money(item.valor)} — ${item.nome}`).join('\n')}`,action:{label:'Ver todas',page:'transacoes'}};
}

if(/quantas? transa|total de transa/.test(text))return{text:`Você registrou ${all.length} ${all.length===1?'transação':'transações'} ${period.label}: ${receitas.length} ${receitas.length===1?'receita':'receitas'} e ${despesas.length} ${despesas.length===1?'despesa':'despesas'}.`,action:{label:'Abrir transações',page:'transacoes'}};

if(/economizei|quanto sobrou|resultado|balanco/.test(text)){const result=this.sum(receitas)-this.sum(despesas);return{text:result>=0?`O resultado ${period.label} é positivo em ${this.money(result)}: ${this.money(this.sum(receitas))} de receitas menos ${this.money(this.sum(despesas))} de despesas.`:`O resultado ${period.label} é negativo em ${this.money(Math.abs(result))}: as despesas superaram as receitas.`,action:{label:'Ver resumo financeiro',page:'resumo'}}}

if(category&&/(gastei|gasto|despesa|recebi|receita|quanto|total)/.test(text)){
const type=category.tipo||(/recebi|receita/.test(text)?'receita':'despesa'),matches=all.filter(item=>item.tipo===type&&item.categoria===category.id),total=this.sum(matches);
return{text:`${type==='receita'?'Você recebeu':'Você gastou'} ${this.money(total)} em ${category.nome} ${period.label}, em ${matches.length} ${matches.length===1?'movimentação':'movimentações'}.`,action:{label:'Filtrar transações',page:'transacoes',filter:{tipo:type,categoria:category.id}}};
}

if(/saldo|quanto tenho|dinheiro disponivel/.test(text))return{text:`Seu saldo disponível é ${this.money(this.data().saldo)}. Esse valor já considera o dinheiro reservado nas metas.`,action:{label:'Ver Dashboard',page:'dashboard'}};

if(/receita|recebi|ganhei|entrada/.test(text))return{text:`Suas receitas somam ${this.money(this.sum(receitas))} ${period.label}, em ${receitas.length} ${receitas.length===1?'registro':'registros'}.`,action:{label:'Ver receitas',page:'transacoes',filter:{tipo:'receita'}}};

if(/despesa|gastei|gasto|saida|compras?/.test(text))return{text:`Suas despesas somam ${this.money(this.sum(despesas))} ${period.label}, em ${despesas.length} ${despesas.length===1?'registro':'registros'}.`,action:{label:'Ver despesas',page:'transacoes',filter:{tipo:'despesa'}}};

return{text:'Não consegui relacionar essa pergunta aos seus dados. Tente perguntar sobre saldo, gastos, receitas, categorias, metas, comparação mensal ou regra 50/30/20.',suggestions:this.defaultSuggestions()};
},

defaultSuggestions(){return['Qual é meu saldo?','Quanto gastei este mês?','Como está minha regra 50/30/20?','Como estão minhas metas?']},

history(){
const history=this.data().assistantHistory;
return Array.isArray(history)?history.filter(item=>item&&['user','assistant'].includes(item.role)&&typeof item.text==='string').slice(-this.maxHistory):[];
},

persist(messages){
const data=this.data();if(!global.App?.user||!data)return;
data.assistantHistory=messages.slice(-this.maxHistory).map(item=>({role:item.role,text:String(item.text).slice(0,2000),time:item.time||new Date().toISOString(),action:item.action||null}));
global.App.saveData();
},

createMessage(item){
const wrapper=document.createElement('div');wrapper.className=`assistant-message ${item.role}`;
const avatar=document.createElement('span');avatar.className='assistant-message-avatar';avatar.setAttribute('aria-hidden','true');avatar.textContent=item.role==='assistant'?'E':'V';
const content=document.createElement('div');content.className='assistant-message-content';
const bubble=document.createElement('div');bubble.className='assistant-bubble';bubble.textContent=item.text;content.appendChild(bubble);
if(item.action){const action=document.createElement('button');action.type='button';action.className='assistant-action';action.textContent=item.action.label;action.addEventListener('click',()=>this.runAction(item.action));content.appendChild(action)}
wrapper.append(avatar,content);return wrapper;
},

renderHistory(){
const list=document.getElementById('assistant-messages');if(!list)return;
list.innerHTML='';const history=this.history();
if(!history.length){list.appendChild(this.createMessage({role:'assistant',text:'Olá! Eu sou o assistente local da Ephyra. Posso analisar seus dados financeiros sem enviá-los para a internet.'}))}
else history.forEach(item=>list.appendChild(this.createMessage(item)));
this.renderSuggestions();this.scrollEnd();
},

renderSuggestions(items){
const container=document.getElementById('assistant-suggestions');if(!container)return;
container.innerHTML='';(items||this.defaultSuggestions()).slice(0,4).forEach(text=>{const button=document.createElement('button');button.type='button';button.className='assistant-suggestion';button.textContent=text;button.addEventListener('click',()=>{const input=document.getElementById('assistant-input');if(input){input.value=text;this.send()}});container.appendChild(button)});
},

send(){
const input=document.getElementById('assistant-input'),button=document.getElementById('assistant-send'),value=input?.value.trim();if(!value)return;
const history=this.history(),userMessage={role:'user',text:value,time:new Date().toISOString()};history.push(userMessage);this.persist(history);document.getElementById('assistant-messages')?.appendChild(this.createMessage(userMessage));input.value='';input.disabled=true;if(button)button.disabled=true;this.showTyping();this.scrollEnd();
clearTimeout(this.typingTimer);this.typingTimer=setTimeout(()=>{const response=this.answer(value),assistantMessage={role:'assistant',text:response.text,time:new Date().toISOString(),action:response.action||null};this.hideTyping();const updated=this.history();updated.push(assistantMessage);this.persist(updated);document.getElementById('assistant-messages')?.appendChild(this.createMessage(assistantMessage));this.renderSuggestions(response.suggestions);input.disabled=false;if(button)button.disabled=false;if(this.isOpen)input.focus();this.scrollEnd()},window.matchMedia('(prefers-reduced-motion: reduce)').matches?0:420);
},

showTyping(){document.getElementById('assistant-typing')?.classList.add('show')},
hideTyping(){document.getElementById('assistant-typing')?.classList.remove('show')},
scrollEnd(){requestAnimationFrame(()=>{const list=document.getElementById('assistant-messages');if(list)list.scrollTop=list.scrollHeight})},

runAction(action){
this.close();
if(action.page){global.App?.nav(action.page);if(action.page==='transacoes'&&action.filter)setTimeout(()=>{const type=document.getElementById('txft'),category=document.getElementById('txfc');if(type&&['todos','receita','despesa'].includes(action.filter.tipo))type.value=action.filter.tipo;global.App?.updateTxCategoryFilter();if(category&&[...category.options].some(option=>option.value===action.filter.categoria))category.value=action.filter.categoria||'';global.App?.fTx()},0)}
else if(action.command==='receita')global.App?.showTxModal('receita');
},

open(){
if(!global.App?.data)return;
this.init();const source=document.activeElement;this.lastFocus=source?.id==='assistant-menu-button'&&window.innerWidth<=1024?document.getElementById('assistant-launcher'):source;global.App?.tsb(false);this.isOpen=true;const backdrop=document.getElementById('assistant-backdrop'),panel=document.getElementById('assistant-panel');backdrop?.classList.add('open');backdrop?.setAttribute('aria-hidden','false');document.getElementById('assistant-launcher')?.setAttribute('aria-expanded','true');document.getElementById('assistant-menu-button')?.setAttribute('aria-expanded','true');document.getElementById('assistant-menu-button')?.classList.add('a');document.body.classList.add('ui-locked');this.renderHistory();requestAnimationFrame(()=>panel?.querySelector('#assistant-input')?.focus());
},

close(){
if(!this.isOpen)return;this.isOpen=false;const backdrop=document.getElementById('assistant-backdrop');backdrop?.classList.remove('open');backdrop?.setAttribute('aria-hidden','true');document.getElementById('assistant-launcher')?.setAttribute('aria-expanded','false');document.getElementById('assistant-menu-button')?.setAttribute('aria-expanded','false');document.getElementById('assistant-menu-button')?.classList.remove('a');if(!document.querySelector('.mo.a')&&!document.getElementById('sidebar')?.classList.contains('o'))document.body.classList.remove('ui-locked');this.lastFocus?.focus?.();
},

backdrop(event){if(event.target===event.currentTarget)this.close()},

clearHistory(){
if(!global.confirm('Apagar o histórico de conversa deste dispositivo?'))return;
this.data().assistantHistory=[];global.App?.saveData();this.renderHistory();
},

trapFocus(event){
const panel=document.getElementById('assistant-panel'),items=[...(panel?.querySelectorAll('button:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])')||[])].filter(item=>item.offsetParent!==null);if(!items.length)return;const first=items[0],last=items[items.length-1];if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus()}else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus()}
},

destroy(){clearTimeout(this.typingTimer);this.hideTyping();const input=document.getElementById('assistant-input'),send=document.getElementById('assistant-send');if(input)input.disabled=false;if(send)send.disabled=false;this.close()}
};

global.EphyraAssistant=EphyraAssistant;
})(window);
