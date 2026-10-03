-- =====================================================================
-- Ephyra Finance — dados na nuvem (Supabase / PostgreSQL)
-- Pode ser executado mais de uma vez (idempotente). Não apaga dados.
-- Rode no Supabase: SQL Editor -> New query -> colar tudo -> Run.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Limite de tentativas de exclusão de conta (já existente no projeto;
--    repetido aqui para que um projeto novo também funcione).
-- ---------------------------------------------------------------------
create schema if not exists ephyra_private;
revoke all on schema ephyra_private from public, anon, authenticated;
create table if not exists ephyra_private.delete_attempts (
  account_id uuid primary key references auth.users(id) on delete cascade,
  window_start timestamptz not null,
  attempts integer not null
);
alter table ephyra_private.delete_attempts enable row level security;
revoke all on ephyra_private.delete_attempts from public, anon, authenticated;
grant usage on schema ephyra_private to service_role;
grant select, insert, update on ephyra_private.delete_attempts to service_role;

create or replace function public.ephyra_allow_delete_attempt(account_id uuid)
returns boolean language plpgsql security invoker set search_path = '' as $$
declare attempt_count integer;
begin
  insert into ephyra_private.delete_attempts as attempt_window (account_id, window_start, attempts)
  values (account_id, now(), 1)
  on conflict on constraint delete_attempts_pkey do update set
    window_start = case when attempt_window.window_start < now() - interval '15 minutes' then now() else attempt_window.window_start end,
    attempts = case when attempt_window.window_start < now() - interval '15 minutes' then 1 else attempt_window.attempts + 1 end
  returning attempts into attempt_count;
  return attempt_count <= 5;
end;
$$;
revoke all on function public.ephyra_allow_delete_attempt(uuid) from public, anon, authenticated;
grant execute on function public.ephyra_allow_delete_attempt(uuid) to service_role;

-- ---------------------------------------------------------------------
-- 1. Tabelas. Toda linha pertence a um usuário do Supabase Auth e é
--    apagada automaticamente quando a conta é excluída (on delete cascade).
-- ---------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null default '',
  foto text not null default '',
  salario numeric(18,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Cópia completa e fiel dos dados do app (fonte usada para restaurar a sessão
-- de qualquer dispositivo). "revision" detecta edições concorrentes.
create table if not exists public.user_data (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  revision bigint not null default 1,
  updated_at timestamptz not null default now()
);

create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

create table if not exists public.transactions (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  tipo text not null check (tipo in ('receita', 'despesa')),
  nome text not null default '',
  descricao text not null default '',
  valor numeric(24,8) not null default 0,
  categoria text not null default '',
  moeda_original text,
  ocorreu_em timestamptz,
  raw jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);
create index if not exists transactions_user_date_idx on public.transactions (user_id, ocorreu_em desc);

create table if not exists public.goals (
  user_id uuid not null references auth.users(id) on delete cascade,
  id text not null,
  nome text not null default '',
  valor_objetivo numeric(24,8) not null default 0,
  valor_guardado numeric(24,8) not null default 0,
  concluida boolean not null default false,
  raw jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- Catálogo de conquistas (somente leitura para os usuários).
create table if not exists public.achievements (
  id text primary key,
  nome text not null,
  descricao text not null default '',
  xp integer not null default 0,
  icone text not null default '',
  categoria text not null default ''
);

create table if not exists public.user_achievements (
  user_id uuid not null references auth.users(id) on delete cascade,
  achievement_id text not null,
  unlocked_at timestamptz,
  raw jsonb not null,
  primary key (user_id, achievement_id)
);

create table if not exists public.financial_summaries (
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null check (month_key ~ '^\d{4}-(0[1-9]|1[0-2])$'),
  summary jsonb not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, month_key)
);

insert into public.achievements (id, nome, descricao, xp, icone, categoria) values
  ('primeira_receita','Primeira Receita','Registre sua primeira receita',10,'💰','iniciante'),
  ('primeira_despesa','Primeira Despesa','Registre sua primeira despesa',10,'💳','iniciante'),
  ('primeira_meta','Sonhador','Crie sua primeira meta',15,'🎯','iniciante'),
  ('dez_transacoes','Organizando','Registre 10 transações',20,'📊','iniciante'),
  ('cem_transacoes','Contador','Registre 100 transações',50,'🧮','avancado'),
  ('milionario','Milionário','Tenha R$ 1.000 de saldo',25,'💎','intermediario'),
  ('economista','Economista','Tenha R$ 5.000 de saldo',50,'🪙','avancado'),
  ('meta_concluida','Objetivo Alcançado','Conclua sua primeira meta',30,'🏁','intermediario'),
  ('cinco_metas','Planejador','Crie 5 metas',35,'🗓️','intermediario'),
  ('sete_dias','Semana Firme','Use o app por 7 dias',25,'📅','intermediario'),
  ('trinta_dias','Mês Completo','Use o app por 30 dias',50,'🗓️','avancado'),
  ('nivel_5','Evoluindo','Alcance o nível 5',30,'⭐','intermediario'),
  ('nivel_10','Mestre Financeiro','Alcance o nível 10',100,'👑','avancado'),
  ('investidor','Investidor','Adicione receita de investimentos',20,'📈','intermediario'),
  ('mestre_dinheiro','Mestre do Dinheiro','Conquista secreta',500,'🏆','secreto')
on conflict (id) do nothing;

-- ---------------------------------------------------------------------
-- 2. Row Level Security: cada usuário só enxerga e altera as próprias linhas.
-- ---------------------------------------------------------------------
alter table public.profiles            enable row level security;
alter table public.user_data           enable row level security;
alter table public.settings            enable row level security;
alter table public.transactions        enable row level security;
alter table public.goals               enable row level security;
alter table public.achievements        enable row level security;
alter table public.user_achievements   enable row level security;
alter table public.financial_summaries enable row level security;

revoke all on public.profiles, public.user_data, public.settings, public.transactions,
  public.goals, public.achievements, public.user_achievements, public.financial_summaries from anon;
grant select, insert, update on public.profiles, public.user_data, public.settings to authenticated;
grant select, insert, update, delete on public.transactions, public.goals,
  public.user_achievements, public.financial_summaries to authenticated;
grant select on public.achievements to authenticated;

do $$
declare t text;
begin
  -- profiles usa "id"; as demais usam "user_id".
  drop policy if exists profiles_own_select on public.profiles;
  drop policy if exists profiles_own_insert on public.profiles;
  drop policy if exists profiles_own_update on public.profiles;
  create policy profiles_own_select on public.profiles for select to authenticated using (id = (select auth.uid()));
  create policy profiles_own_insert on public.profiles for insert to authenticated with check (id = (select auth.uid()));
  create policy profiles_own_update on public.profiles for update to authenticated
    using (id = (select auth.uid())) with check (id = (select auth.uid()));

  foreach t in array array['user_data','settings'] loop
    execute format('drop policy if exists %I on public.%I', t || '_own_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_own_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_own_update', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t || '_own_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t || '_own_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_own_update', t);
  end loop;

  foreach t in array array['transactions','goals','user_achievements','financial_summaries'] loop
    execute format('drop policy if exists %I on public.%I', t || '_own_select', t);
    execute format('drop policy if exists %I on public.%I', t || '_own_insert', t);
    execute format('drop policy if exists %I on public.%I', t || '_own_update', t);
    execute format('drop policy if exists %I on public.%I', t || '_own_delete', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t || '_own_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t || '_own_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_own_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t || '_own_delete', t);
  end loop;

  drop policy if exists achievements_read on public.achievements;
  create policy achievements_read on public.achievements for select to authenticated using (true);
end $$;

-- ---------------------------------------------------------------------
-- 3. Conversões seguras (um valor inválido nunca derruba o salvamento).
-- ---------------------------------------------------------------------
create or replace function public.ephyra_safe_num(v text)
returns numeric language plpgsql immutable security invoker set search_path = '' as $$
begin
  if v is null or v !~ '^-?[0-9]{1,16}(\.[0-9]{1,8})?$' then return null; end if;
  return v::numeric;
end;
$$;

create or replace function public.ephyra_safe_ts(v text)
returns timestamptz language plpgsql stable security invoker set search_path = '' as $$
begin
  if v is null or v = '' then return null; end if;
  return v::timestamptz;
exception when others then
  return null;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Salvamento atômico. Roda com a identidade do usuário (SECURITY INVOKER),
--    então o RLS vale em todas as linhas e o user_id vem de auth.uid() —
--    nunca de um valor enviado pelo navegador.
-- ---------------------------------------------------------------------
create or replace function public.ephyra_save_snapshot(p_data jsonb, p_base_revision bigint default null)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare
  uid uuid := auth.uid();
  v_data jsonb;
  cur bigint;
  new_rev bigint;
  v_tx jsonb;
  v_goals jsonb;
  v_ach jsonb;
  v_sum jsonb;
  v_user jsonb;
begin
  if uid is null then raise exception 'not authenticated' using errcode = '28000'; end if;
  if p_data is null or jsonb_typeof(p_data) <> 'object' then
    raise exception 'invalid data' using errcode = '22023';
  end if;

  select revision into cur from public.user_data where user_id = uid for update;
  if found and p_base_revision is not null and cur <> p_base_revision then
    return jsonb_build_object('conflict', true, 'revision', cur);
  end if;

  v_user := case when jsonb_typeof(p_data->'user') = 'object' then p_data->'user' else '{}'::jsonb end;
  -- A foto fica em profiles (e não duplicada dentro do JSON completo).
  v_data := p_data #- '{user,foto}';

  insert into public.user_data (user_id, data, revision) values (uid, v_data, 1)
  on conflict (user_id) do update
    set data = excluded.data, revision = public.user_data.revision + 1, updated_at = now()
  returning revision into new_rev;

  insert into public.profiles (id, nome, foto, salario)
  values (uid, left(coalesce(v_user->>'nome', ''), 120), coalesce(v_user->>'foto', ''),
          coalesce(public.ephyra_safe_num(v_user->>'salario'), 0))
  on conflict (id) do update
    set nome = excluded.nome, foto = excluded.foto, salario = excluded.salario, updated_at = now();

  insert into public.settings (user_id, config)
  values (uid, case when jsonb_typeof(v_data->'config') = 'object' then v_data->'config' else '{}'::jsonb end)
  on conflict (user_id) do update set config = excluded.config, updated_at = now();

  -- Transações: histórico + receitas + despesas, sem duplicar ids.
  select coalesce(jsonb_agg(e), '[]'::jsonb) into v_tx from (
    select distinct on (e->>'id') e
    from (
      select 1 as pr, e from jsonb_array_elements(case when jsonb_typeof(v_data->'historico') = 'array' then v_data->'historico' else '[]'::jsonb end) e
      union all
      select 2, e from jsonb_array_elements(case when jsonb_typeof(v_data->'receitas') = 'array' then v_data->'receitas' else '[]'::jsonb end) e
      union all
      select 2, e from jsonb_array_elements(case when jsonb_typeof(v_data->'despesas') = 'array' then v_data->'despesas' else '[]'::jsonb end) e
    ) s
    where jsonb_typeof(e) = 'object' and coalesce(e->>'id', '') <> ''
    order by e->>'id', pr
  ) d(e);

  insert into public.transactions (user_id, id, tipo, nome, descricao, valor, categoria, moeda_original, ocorreu_em, raw)
  select uid, left(e->>'id', 120),
         case when e->>'tipo' = 'receita' then 'receita' else 'despesa' end,
         left(coalesce(e->>'nome', ''), 200), left(coalesce(e->>'descricao', ''), 2000),
         coalesce(public.ephyra_safe_num(e->>'valor'), 0), left(coalesce(e->>'categoria', ''), 120),
         nullif(left(coalesce(e->>'moedaOriginal', ''), 12), ''),
         public.ephyra_safe_ts(coalesce(nullif(e->>'data', ''), e->>'dataCriacao')), e
  from jsonb_array_elements(v_tx) e
  on conflict (user_id, id) do update set
    tipo = excluded.tipo, nome = excluded.nome, descricao = excluded.descricao, valor = excluded.valor,
    categoria = excluded.categoria, moeda_original = excluded.moeda_original,
    ocorreu_em = excluded.ocorreu_em, raw = excluded.raw, updated_at = now();
  delete from public.transactions t
   where t.user_id = uid and not exists (select 1 from jsonb_array_elements(v_tx) e where left(e->>'id', 120) = t.id);

  -- Metas
  select coalesce(jsonb_agg(e), '[]'::jsonb) into v_goals from (
    select distinct on (e->>'id') e
    from jsonb_array_elements(case when jsonb_typeof(v_data->'metas') = 'array' then v_data->'metas' else '[]'::jsonb end) e
    where jsonb_typeof(e) = 'object' and coalesce(e->>'id', '') <> ''
    order by e->>'id'
  ) d(e);
  insert into public.goals (user_id, id, nome, valor_objetivo, valor_guardado, concluida, raw)
  select uid, left(e->>'id', 120), left(coalesce(e->>'nome', ''), 200),
         coalesce(public.ephyra_safe_num(e->>'valorObjetivo'), 0), coalesce(public.ephyra_safe_num(e->>'valorGuardado'), 0),
         coalesce(public.ephyra_safe_num(e->>'valorGuardado'), 0) >= coalesce(public.ephyra_safe_num(e->>'valorObjetivo'), 0)
           and coalesce(public.ephyra_safe_num(e->>'valorObjetivo'), 0) > 0, e
  from jsonb_array_elements(v_goals) e
  on conflict (user_id, id) do update set
    nome = excluded.nome, valor_objetivo = excluded.valor_objetivo, valor_guardado = excluded.valor_guardado,
    concluida = excluded.concluida, raw = excluded.raw, updated_at = now();
  delete from public.goals g
   where g.user_id = uid and not exists (select 1 from jsonb_array_elements(v_goals) e where left(e->>'id', 120) = g.id);

  -- Conquistas desbloqueadas
  select coalesce(jsonb_agg(e), '[]'::jsonb) into v_ach from (
    select distinct on (e->>'id') e
    from jsonb_array_elements(case when jsonb_typeof(v_data->'conquistas') = 'array' then v_data->'conquistas' else '[]'::jsonb end) e
    where jsonb_typeof(e) = 'object' and coalesce(e->>'id', '') <> ''
    order by e->>'id'
  ) d(e);
  insert into public.user_achievements (user_id, achievement_id, unlocked_at, raw)
  select uid, left(e->>'id', 120), public.ephyra_safe_ts(e->>'data'), e
  from jsonb_array_elements(v_ach) e
  on conflict (user_id, achievement_id) do update set unlocked_at = excluded.unlocked_at, raw = excluded.raw;
  delete from public.user_achievements a
   where a.user_id = uid and not exists (select 1 from jsonb_array_elements(v_ach) e where left(e->>'id', 120) = a.achievement_id);

  -- Resumos mensais
  select coalesce(jsonb_agg(e), '[]'::jsonb) into v_sum from (
    select distinct on (e->>'monthKey') e
    from jsonb_array_elements(case when jsonb_typeof(v_data->'monthlySummaries') = 'array' then v_data->'monthlySummaries' else '[]'::jsonb end) e
    where jsonb_typeof(e) = 'object' and (e->>'monthKey') ~ '^\d{4}-(0[1-9]|1[0-2])$'
    order by e->>'monthKey'
  ) d(e);
  insert into public.financial_summaries (user_id, month_key, summary)
  select uid, e->>'monthKey', e from jsonb_array_elements(v_sum) e
  on conflict (user_id, month_key) do update set summary = excluded.summary, updated_at = now();
  delete from public.financial_summaries f
   where f.user_id = uid and not exists (select 1 from jsonb_array_elements(v_sum) e where e->>'monthKey' = f.month_key);

  return jsonb_build_object('conflict', false, 'revision', new_rev);
end;
$$;
revoke all on function public.ephyra_save_snapshot(jsonb, bigint) from public, anon;
grant execute on function public.ephyra_save_snapshot(jsonb, bigint) to authenticated;
grant execute on function public.ephyra_safe_num(text), public.ephyra_safe_ts(text) to authenticated;
