// Explicit event handlers: no inline JavaScript and no runtime evaluation.
(()=>{
'use strict';
const handlers={
h1:function(event){Auth.switchTab('login')},
h2:function(event){Auth.switchTab('register')},
h3:function(event){Auth.handleLogin(event)},
h4:function(event){Auth.togglePw('l-pw',this)},
h5:function(event){Auth.handleRegister(event)},
h6:function(event){document.getElementById('reg-avatar-input').click()},
h7:function(event){Auth.removeAvatar('reg')},
h8:function(event){Auth.handleAvatarUpload(this,'reg')},
h9:function(event){Auth.updateInitials(this.value)},
h10:function(event){Auth.togglePw('r-pw',this)},
h11:function(event){Auth.togglePw('r-pw2',this)},
h12:function(event){App.tsb(false)},
h13:function(event){App.nav('dashboard')},
h14:function(event){App.nav('transacoes')},
h15:function(event){App.nav('metas')},
h16:function(event){App.nav('mercado')},
h17:function(event){App.nav('conquistas')},
h18:function(event){App.nav('perfil')},
h19:function(event){EphyraAssistant.open()},
h20:function(event){App.nav('resumo')},
h21:function(event){App.nav('configuracoes')},
h22:function(event){App.tsb()},
h23:function(event){App.showTxModal('receita')},
h24:function(event){App.showTxModal('despesa')},
h25:function(event){EphyraAssistant.backdrop(event)},
h26:function(event){EphyraAssistant.clearHistory()},
h27:function(event){EphyraAssistant.close()},
h28:function(event){App.cMo()},
h29:function(event){App.closePhotoViewer()},
h30:function(event){event.stopPropagation()},
h31:function(event){App.showTxModal(null,this.getAttribute("data-arg-0"))},
h32:function(event){App.confirmDelTx(this.getAttribute("data-arg-0"))},
h33:function(event){App.fTx()},
h34:function(event){App.onTxTypeFilter()},
h35:function(event){App.fTx()},
h36:function(event){App.toggleIntl(this)},
h37:function(event){App.updateIntlPreview()},
h38:function(event){App.updateIntlPreview()},
h39:function(event){App.showMetaModal()},
h40:function(event){App.depMeta(this.getAttribute("data-arg-0"))},
h41:function(event){App.showMetaModal(this.getAttribute("data-arg-0"))},
h42:function(event){App.delMeta(this.getAttribute("data-arg-0"))},
h43:function(event){App.trySecret()},
h44:function(event){App.closeSecret()},
h45:function(event){App.editProf()},
h46:function(event){document.getElementById('prof-avatar-input').click()},
h47:function(event){App.changeProfilePhoto(this)},
h48:function(event){App.viewPhoto(App.user.foto)},
h49:function(event){App.removeProfilePhoto()},
h50:function(event){App.toggleTheme()},
h51:function(event){App.setCurrency(this.value)},
h52:function(event){App.expData()},
h53:function(event){document.getElementById('imp-f').click()},
h54:function(event){App.impData(event)},
h55:function(event){Auth.logout()},
h56:function(event){if(typeof EphyraOnboarding!=='undefined') EphyraOnboarding.reset()},
h57:function(event){App.cReset()},
h58:function(event){Market.toggleFav(this.getAttribute("data-arg-0"),'fiat')},
h59:function(event){Market.showDetail(this.getAttribute("data-arg-0"),'fiat')},
h60:function(event){Market.toggleFav(this.getAttribute("data-arg-0"),'crypto')},
h61:function(event){Market.showDetail(this.getAttribute("data-arg-0"),'crypto')},
h62:function(event){Market.convertLive()},
h63:function(event){Market.convertLive()},
h64:function(event){Market.swapConverter()},
h65:function(event){Market.convertReverse()},
h66:function(event){Market.showDetail(this.getAttribute("data-arg-0"),this.getAttribute("data-arg-1"))},
h67:function(event){Market.setPeriod('24h')},
h68:function(event){Market.setPeriod('7d')},
h69:function(event){Market.setPeriod('30d')},
h70:function(event){Market.setPeriod('90d')},
h71:function(event){Market.setPeriod('6m')},
h72:function(event){Market.setPeriod('1y')},
h73:function(event){Market.quickConvert(this.getAttribute("data-arg-0"))},
h74:function(event){Market.createAlert(this.getAttribute("data-arg-0"),this.getAttribute("data-arg-1"))},
h75:function(event){Market.refresh()},
h76:function(event){Market.search(this.value)},
h77:function(event){Market.switchTab('moedas')},
h78:function(event){Market.switchTab('cripto')},
h79:function(event){Market.switchTab('conversor')},
h80:function(event){Market.switchTab('favoritos')},
h81:function(event){Market.backToMarket()},
h82:function(event){Market.removeAlert(this.getAttribute("data-arg-0"))},
h83:function(event){MonthlySummary.scrollToMonth(this.getAttribute("data-arg-0"))},
h84:function(event){EphyraOnboarding.prev()},
h85:function(event){EphyraOnboarding.skip()},
h86:function(event){EphyraOnboarding.next()},
h87:function(event){EphyraOnboarding.finish()},
h88:function(event){this.classList.add('is-loaded');},
h89:function(event){this.classList.remove('is-loaded'); this.style.display='none';},
};
document.addEventListener('click',event=>{
let element=event.target;
while(element instanceof Element){
const name=element.getAttribute('data-on-click');
if(name&&Object.hasOwn(handlers,name))handlers[name].call(element,event);
if(event.cancelBubble)break;
element=element.parentElement;
}
},false);
document.addEventListener('submit',event=>{
let element=event.target;
while(element instanceof Element){
const name=element.getAttribute('data-on-submit');
if(name&&Object.hasOwn(handlers,name))handlers[name].call(element,event);
if(event.cancelBubble)break;
element=element.parentElement;
}
},false);
document.addEventListener('change',event=>{
let element=event.target;
while(element instanceof Element){
const name=element.getAttribute('data-on-change');
if(name&&Object.hasOwn(handlers,name))handlers[name].call(element,event);
if(event.cancelBubble)break;
element=element.parentElement;
}
},false);
document.addEventListener('input',event=>{
let element=event.target;
while(element instanceof Element){
const name=element.getAttribute('data-on-input');
if(name&&Object.hasOwn(handlers,name))handlers[name].call(element,event);
if(event.cancelBubble)break;
element=element.parentElement;
}
},false);
document.addEventListener('load',event=>{
let element=event.target;
while(element instanceof Element){
const name=element.getAttribute('data-on-load');
if(name&&Object.hasOwn(handlers,name))handlers[name].call(element,event);
if(event.cancelBubble)break;
element=element.parentElement;
}
},true);
document.addEventListener('error',event=>{
let element=event.target;
while(element instanceof Element){
const name=element.getAttribute('data-on-error');
if(name&&Object.hasOwn(handlers,name))handlers[name].call(element,event);
if(event.cancelBubble)break;
element=element.parentElement;
}
},true);
})();
