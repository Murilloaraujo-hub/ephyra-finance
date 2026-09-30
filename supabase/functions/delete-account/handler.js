// Deploy only to Supabase Edge Functions, never execute in the browser.
// The caller cannot select a user ID. Identity comes from Auth's verified /user response.
Deno.serve(async (req) => {
  const origin = Deno.env.get('SITE_ORIGIN') || 'https://murilloaraujo-hub.github.io';
  const headers = {
    'Access-Control-Allow-Origin': origin || '',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type, x-client-info',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Vary': 'Origin', 'Content-Type': 'application/json', 'Cache-Control': 'no-store'
  };
  const reply = (status, body) => new Response(JSON.stringify(body), {status, headers});
  if (!origin || req.headers.get('origin') !== origin) return reply(403, {error: 'Forbidden'});
  if (req.method === 'OPTIONS') return new Response(null, {status: 204, headers});
  if (req.method !== 'POST') return reply(405, {error: 'Method not allowed'});
  const url = Deno.env.get('SUPABASE_URL');
  function environmentKey(name, legacy) {
    try { return JSON.parse(Deno.env.get(name) || '{}').default || Deno.env.get(legacy); } catch { return Deno.env.get(legacy); }
  }
  const anon = environmentKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY');
  const secret = environmentKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY');
  const adminHeaders = {apikey: secret, ...(secret?.startsWith('sb_secret_') ? {} : {Authorization: `Bearer ${secret}`})};
  if (!url || !anon || !secret) return reply(503, {error: 'Service unavailable'});
  const authorization = req.headers.get('authorization') || '';
  if (!/^Bearer \S+$/.test(authorization)) return reply(401, {error: 'Unauthorized'});
  const call = (path, options) => fetch(url + path, {...options, signal: AbortSignal.timeout(10000)});
  let freshToken;
  try {
    const verified = await call('/auth/v1/user', {headers: {apikey: anon, Authorization: authorization}});
    if (!verified.ok) return reply(401, {error: 'Unauthorized'});
    const user = await verified.json();
    if (!user.id || !user.email) return reply(401, {error: 'Unauthorized'});
    // Durable per-account throttle, enforced across all function instances.
    const budget = await call('/rest/v1/rpc/ephyra_allow_delete_attempt', {
      method: 'POST', headers: {...adminHeaders, 'Content-Type': 'application/json'},
      body: JSON.stringify({account_id: user.id})
    });
    if (!budget.ok) return reply(503, {error: 'Service unavailable'});
    if (await budget.json() !== true) return reply(429, {error: 'Try again later'});
    const raw = await req.text();
    if (raw.length > 4096) return reply(400, {error: 'Invalid request'});
    let body;
    try { body = JSON.parse(raw); } catch { return reply(400, {error: 'Invalid request'}); }
    if (typeof body.password !== 'string' || body.password.length < 8 || body.password.length > 256) return reply(400, {error: 'Invalid request'});
    const login = await call('/auth/v1/token?grant_type=password', {
      method: 'POST', headers: {apikey: anon, 'Content-Type': 'application/json'},
      body: JSON.stringify({email: user.email, password: body.password})
    });
    if (!login.ok) return reply(403, {error: 'Confirmation failed'});
    const confirmation = await login.json();
    freshToken = confirmation.access_token;
    if (confirmation.user?.id !== user.id) return reply(403, {error: 'Confirmation failed'});
    const signedOut = await call('/auth/v1/logout?scope=global', {method: 'POST', headers: {apikey: anon, Authorization: `Bearer ${freshToken}`}});
    if (!signedOut.ok) return reply(502, {error: 'Could not revoke sessions'});
    const deleted = await call('/auth/v1/admin/users/' + encodeURIComponent(user.id), {
      method: 'DELETE', headers: adminHeaders
    });
    if (!deleted.ok) return reply(502, {error: 'Deletion failed'});
    return reply(200, {deleted: true});
  } catch {
    return reply(503, {error: 'Service unavailable'});
  } finally {
    // Reauthentication must not leave an extra session behind after a failed deletion.
    if (freshToken) try { await call('/auth/v1/logout?scope=local', {method: 'POST', headers: {apikey: anon, Authorization: `Bearer ${freshToken}`}}); } catch {}
  }
});
