# Ephyra Finance

Aplicativo de finanças pessoais: **suas finanças, de forma simples e inteligente** — transações, metas, investimentos e acompanhamento financeiro.

```
Navegador (index.html)  ->  API Python (Vercel, /api)  ->  Supabase (Auth + PostgreSQL com RLS)
```

## Estrutura
- `index.html` — todo o frontend (HTML + CSS + JS, bibliotecas, fontes e imagens embutidos).
- `api/config.py` — entrega a URL e a chave PÚBLICA do Supabase ao navegador.
- `api/data.py` — lê/grava os dados do usuário autenticado (usa o token dele; o RLS protege).
- `api/account.py` — exclui a conta (única que usa a Service Role Key, só no servidor).
- `api/health.py` — diagnóstico: diz quais variáveis de ambiente existem (sem mostrar valores).
- `api/_lib.py` — funções comuns (não vira endpoint).
- `supabase/migrations/202610030001_ephyra_cloud_data.sql` — tabelas, RLS e função de salvamento.

## Colocar no ar
1. **Supabase → SQL Editor:** cole e execute `supabase/migrations/202610030001_ephyra_cloud_data.sql`.
2. **Supabase → Authentication → URL Configuration:** Site URL = URL do Vercel; em Redirect URLs adicione a mesma URL (e `https://SEU-DOMINIO/**`).
3. **Supabase → Authentication → SMTP:** configure um SMTP próprio (o padrão só envia para a equipe).
4. **Vercel → Settings → Environment Variables:** `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Production, Preview e Development). Faça **Redeploy** depois.
5. Envie esta pasta ao GitHub e importe no Vercel (Framework Preset: *Other*; sem build command).
6. Abra `https://SEU-DOMINIO/api/health` — deve mostrar `"ok": true`.
