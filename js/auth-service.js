/* Supabase Auth: password verification and email delivery happen on the server. */
window.EphyraAuth = (() => {
  'use strict';
  const key = 'ephyra_auth_session_v1', recoveryKey = 'ephyra_password_recovery';
  let client, initializing, recovering = false;
  function configured() {
    const c = window.EPHYRA_AUTH_CONFIG || {};
    if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/.test(c.url || '') || !c.publicKey) return false;
    if (c.publicKey.startsWith('sb_secret_')) return false;
    if (c.publicKey.startsWith('sb_publishable_')) return true;
    try { return JSON.parse(atob(c.publicKey.split('.')[1])).role === 'anon'; } catch { return false; }
  }
  function required() {
    if (!client) throw new Error('O acesso por e-mail ainda não foi ativado. Tente novamente após a configuração do site.');
    return client;
  }
  const redirectTo = () => location.origin + location.pathname;
  async function init() {
    if (initializing) return initializing;
    if (!configured()) return false;
    initializing = (async () => {
      const hash = new URLSearchParams(location.hash.slice(1));
      recovering = hash.get('type') === 'recovery' || sessionStorage.getItem(recoveryKey) === 'true';
      const invalidLink = hash.has('error');
      if (invalidLink) {
        history.replaceState(null, '', redirectTo());
        sessionStorage.removeItem(recoveryKey);
        recovering = false;
      }
      const c = window.EPHYRA_AUTH_CONFIG;
      client = window.supabase.createClient(c.url, c.publicKey, {auth: {
        storage: sessionStorage, storageKey: key, persistSession: true,
        autoRefreshToken: true, detectSessionInUrl: true, flowType: 'implicit'
      }});
      client.auth.onAuthStateChange((event) => {
        if (event === 'PASSWORD_RECOVERY') {
          recovering = true;
          sessionStorage.setItem(recoveryKey, 'true');
        }
        // Do not await another auth call inside the SDK's auth lock.
        if (event === 'SIGNED_OUT') setTimeout(() => window.dispatchEvent(new Event('ephyra-signed-out')), 0);
      });
      const {error} = await client.auth.initialize();
      if (hash.has('access_token') || hash.has('refresh_token')) history.replaceState(null, '', redirectTo());
      if (error) { recovering = false; sessionStorage.removeItem(recoveryKey); throw new Error('Link inválido ou expirado. Solicite outro e-mail.'); }
      if (recovering) sessionStorage.setItem(recoveryKey, 'true');
      if (invalidLink) throw new Error('Este link expirou ou já foi usado. Solicite outro e-mail de recuperação.');
      return true;
    })();
    return initializing;
  }
  function check(result) { if (result.error) throw result.error; return result.data; }
  async function user() {
    const {data: {session}} = await required().auth.getSession();
    if (!session) return null;
    const {data, error} = await required().auth.getUser();
    if (error) throw new Error('Não foi possível validar sua sessão. Entre novamente.');
    return data.user;
  }
  async function login(email, password) {
    const data = check(await required().auth.signInWithPassword({email, password}));
    recovering = false; sessionStorage.removeItem(recoveryKey);
    sessionStorage.removeItem('ephyra_auth_activity');
    return data.user;
  }
  async function register(email, password, nome) {
    return check(await required().auth.signUp({email, password, options: {emailRedirectTo: redirectTo(), data: {nome}}}));
  }
  async function recover(email) {
    check(await required().auth.resetPasswordForEmail(email, {redirectTo: redirectTo()}));
  }
  async function reset(password) {
    if (!recovering || !await user()) throw new Error('Abra um link válido recebido por e-mail para redefinir a senha.');
    check(await required().auth.updateUser({password}));
    await logout();
  }
  async function logout() {
    recovering = false; sessionStorage.removeItem(recoveryKey);
    sessionStorage.removeItem('ephyra_auth_activity');
    if (client) { try { await client.auth.signOut({scope: 'local'}); } finally { sessionStorage.removeItem(key); } }
  }
  async function deleteAccount(password) {
    const {data: {session}, error} = await required().auth.getSession();
    if (error || !session) throw new Error('Entre novamente antes de excluir a conta.');
    const result = await required().functions.invoke('delete-account', {
      headers: {Authorization: `Bearer ${session.access_token}`}, body: {password}
    });
    if (result.error?.context?.status === 429) throw new Error('Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.');
    if (result.error || result.data?.deleted !== true) throw new Error('Não foi possível excluir a conta. Verifique sua senha e tente novamente.');
  }
  return {configured, init, user, login, register, recover, reset, logout, deleteAccount, isRecovery: () => recovering};
})();
