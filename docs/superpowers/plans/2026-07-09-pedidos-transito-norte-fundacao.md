# Pedidos em Trânsito Norte — Plano 1: Fundação (dados + acesso)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ter o banco Supabase "BI NORTE" com as tabelas `pedidos` e `rca_acesso`, segurança RLS verificada, e um app React (Vite+Tailwind) onde um usuário faz login por e-mail/senha e cai numa tela autenticada.

**Architecture:** Supabase provê Auth + Postgres + RLS (o banco filtra o que cada usuário vê). O frontend é uma SPA React estática (compatível com GitHub Pages via HashRouter), usando apenas a chave publishable/anon. RLS é o coração da segurança e é testada por simulação de papéis via SQL.

**Tech Stack:** React 18, Vite 5, TailwindCSS 3.4, react-router-dom 6 (HashRouter), @supabase/supabase-js 2, Vitest + Testing Library. Postgres 17 (Supabase).

**Projeto Supabase:** BI NORTE — ref `vaooutyuwrrdkmhsgzpt` (org `dhyiqrwkckyfhmxtfyin`).

**Pasta do app:** `C:\Users\jean.savino\APP PEDIDO  EM TRANSITO`

---

## Mapa de arquivos (criados neste plano)

| Arquivo | Responsabilidade |
|---|---|
| (Supabase) migration `0001_tabelas` | cria `pedidos` e `rca_acesso` |
| (Supabase) migration `0002_rls` | funções `is_admin`/`my_vendedores` + policies + enable RLS |
| `package.json`, `vite.config.js`, `index.html` | scaffold Vite + config Vitest + `base` p/ GitHub Pages |
| `tailwind.config.js`, `postcss.config.js`, `src/index.css` | Tailwind + tokens preto/dourado base |
| `src/main.jsx`, `src/App.jsx` | bootstrap + rotas (HashRouter) |
| `src/lib/supabase.js` | cliente Supabase (anon key via env) |
| `src/lib/format.js` (+ `.test.js`) | utils puros de formatação (R$, kg) — unidade testável |
| `src/context/AuthProvider.jsx` | sessão/estado de auth, papel do usuário |
| `src/components/ProtectedRoute.jsx` | protege rotas autenticadas |
| `src/pages/Login.jsx` | tela de login e-mail/senha |
| `src/pages/Home.jsx` | shell autenticado (placeholder do dashboard) |
| `.env.local`, `.env.example`, `.gitignore` | env vars (URL + anon key) e ignores |

---

## Decisão de modelagem (registrada)

`rca_acesso.user_id` é `uuid` **sem** foreign key rígida para `auth.users`. Motivo: simplifica o seed e, principalmente, permite **testar a RLS por simulação de papéis via SQL** sem precisar criar usuários reais de auth. Trade-off aceito: se um usuário for deletado, pode sobrar linha órfã em `rca_acesso` (gestão manual, poucos usuários). Documentar na entrega final.

---

## Task 1: Reativar BI NORTE e criar as tabelas

**Files:**
- Migration Supabase: `0001_tabelas` (via MCP `apply_migration`)

- [ ] **Step 1: Reativar o projeto (está INACTIVE)**

Usar a tool MCP: `restore_project` com `project_id="vaooutyuwrrdkmhsgzpt"`.
Aguardar status ACTIVE_HEALTHY (checar com `list_projects` ou `get_project`).
Expected: projeto com `status: "ACTIVE_HEALTHY"`.

- [ ] **Step 2: Aplicar a migration das tabelas**

Usar MCP `apply_migration` com `project_id="vaooutyuwrrdkmhsgzpt"`, `name="0001_tabelas"`, `query`:

```sql
create table if not exists public.pedidos (
  chave text primary key,
  cnpj_cliente text,
  nome_cliente text,
  vendedor text not null,
  cidade text,
  estado text,
  regiao_brasil text,
  regiao text,
  filial text,
  numero_pedido text,
  pedido_salesforce text,
  pedido_cliente text,
  nf text,
  valor_faturado numeric,
  peso numeric,
  desc_tipo_saida text,
  operacao text,
  transportador text,
  data_faturamento date,
  data_prog_expedicao date,
  data_expedicao date,
  lead_time int,
  previsao_entrega date,
  data_real_chegada date,
  data_real_entrega date,
  recebimento text,
  data_agenda date,
  status_transito text,
  obs_transito text,
  updated_at timestamptz not null default now()
);

create index if not exists idx_pedidos_vendedor on public.pedidos (vendedor);
create index if not exists idx_pedidos_status on public.pedidos (status_transito);

create table if not exists public.rca_acesso (
  id bigint generated always as identity primary key,
  user_id uuid not null,
  vendedor text not null,
  papel text not null default 'rca' check (papel in ('rca','admin')),
  created_at timestamptz not null default now(),
  unique (user_id, vendedor)
);

create index if not exists idx_rca_acesso_user on public.rca_acesso (user_id);
```

- [ ] **Step 3: Verificar que as tabelas existem**

Usar MCP `list_tables` com `project_id="vaooutyuwrrdkmhsgzpt"`, `schemas=["public"]`.
Expected: aparecem `pedidos` e `rca_acesso`.

---

## Task 2: Segurança RLS (funções + policies) e teste de papéis

**Files:**
- Migration Supabase: `0002_rls` (via MCP `apply_migration`)

- [ ] **Step 1: Aplicar funções + policies + habilitar RLS**

MCP `apply_migration`, `name="0002_rls"`, `query`:

```sql
alter table public.pedidos enable row level security;
alter table public.rca_acesso enable row level security;

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.rca_acesso
    where user_id = auth.uid() and papel = 'admin'
  );
$$;

create or replace function public.my_vendedores()
returns setof text
language sql stable security definer
set search_path = public
as $$
  select vendedor from public.rca_acesso where user_id = auth.uid();
$$;

grant execute on function public.is_admin() to authenticated;
grant execute on function public.my_vendedores() to authenticated;

-- pedidos: leitura (admin vê tudo; RCA vê só seus vendedores)
drop policy if exists pedidos_select on public.pedidos;
create policy pedidos_select on public.pedidos
for select to authenticated
using ( public.is_admin() or vendedor in (select public.my_vendedores()) );

-- pedidos: escrita só admin
drop policy if exists pedidos_insert on public.pedidos;
create policy pedidos_insert on public.pedidos
for insert to authenticated
with check ( public.is_admin() );

drop policy if exists pedidos_update on public.pedidos;
create policy pedidos_update on public.pedidos
for update to authenticated
using ( public.is_admin() ) with check ( public.is_admin() );

-- rca_acesso: cada um lê as próprias linhas (admin lê todas)
drop policy if exists rca_acesso_select on public.rca_acesso;
create policy rca_acesso_select on public.rca_acesso
for select to authenticated
using ( user_id = auth.uid() or public.is_admin() );
```

- [ ] **Step 2: Testar a RLS por simulação de papéis (rollback no fim)**

MCP `execute_sql`, `project_id="vaooutyuwrrdkmhsgzpt"`, `query` (roda tudo e faz rollback; retorna as contagens para conferência):

```sql
begin;
insert into public.rca_acesso (user_id, vendedor, papel) values
  ('11111111-1111-1111-1111-111111111111','NAILSON F COSTA','rca'),
  ('22222222-2222-2222-2222-222222222222','DANIELA NASCIMENTO DA SILVA','rca'),
  ('33333333-3333-3333-3333-333333333333','ADMIN','admin');
insert into public.pedidos (chave, vendedor, status_transito) values
  ('t1','NAILSON F COSTA','Em trânsito'),
  ('t2','DANIELA NASCIMENTO DA SILVA','Atrasado'),
  ('t3','NAILSON F COSTA','Entregue no prazo');

-- RCA Nailson: deve ver 2
set local role authenticated;
select set_config('request.jwt.claims','{"sub":"11111111-1111-1111-1111-111111111111"}', true);
select 'nailson' as quem, count(*) as visiveis from public.pedidos;

-- RCA Daniela: deve ver 1
select set_config('request.jwt.claims','{"sub":"22222222-2222-2222-2222-222222222222"}', true);
select 'daniela' as quem, count(*) as visiveis from public.pedidos;

-- Admin: deve ver 3
select set_config('request.jwt.claims','{"sub":"33333333-3333-3333-3333-333333333333"}', true);
select 'admin' as quem, count(*) as visiveis from public.pedidos;

reset role;
rollback;
```

Expected: nailson=2, daniela=1, admin=3. Se qualquer contagem divergir, a RLS está errada — parar e corrigir a Task 2 Step 1 antes de seguir.

- [ ] **Step 3: Rodar o advisor de segurança**

MCP `get_advisors` com `type="security"`. Expected: sem alertas críticos de "RLS disabled" nas tabelas `pedidos`/`rca_acesso`.

- [ ] **Step 4: Capturar URL e anon key (para o frontend)**

MCP `get_project_url` e `get_publishable_keys` (`project_id="vaooutyuwrrdkmhsgzpt"`).
Guardar os dois valores — serão usados na Task 5 (`.env.local`).

---

## Task 3: Scaffold do app React (Vite + Tailwind)

**Files:**
- Create: `package.json`, `vite.config.js`, `index.html`, `postcss.config.js`, `tailwind.config.js`, `.gitignore`
- Create: `src/main.jsx`, `src/index.css`, `src/App.jsx`, `src/pages/Home.jsx`

- [ ] **Step 1: Escrever `package.json`**

```json
{
  "name": "pedidos-transito-norte",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest run"
  },
  "dependencies": {
    "@supabase/supabase-js": "^2.45.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "react-router-dom": "^6.26.0",
    "recharts": "^2.12.7",
    "xlsx": "^0.18.5"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.0",
    "@vitejs/plugin-react": "^4.3.1",
    "autoprefixer": "^10.4.20",
    "jsdom": "^24.1.1",
    "postcss": "^8.4.41",
    "tailwindcss": "^3.4.10",
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Escrever `vite.config.js`**

`base` fica `./` (relativo) para funcionar em GitHub Pages independentemente do nome do repositório com HashRouter.

```js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  base: './',
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test/setup.js',
  },
})
```

- [ ] **Step 3: Escrever `index.html`**

```html
<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Pedidos em Trânsito — Norte</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>
```

- [ ] **Step 4: Escrever `postcss.config.js` e `tailwind.config.js`**

`postcss.config.js`:
```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} },
}
```

`tailwind.config.js` (tokens preto/dourado base; polimento visual completo no Plano 4):
```js
/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        duty: {
          bg: '#0b0b0d',
          card: '#16161a',
          gold: '#d4af37',
          goldSoft: '#e9d18b',
        },
        status: {
          ok: '#22c55e',
          late: '#ef4444',
          transit: '#3b82f6',
          wait: '#f59e0b',
        },
      },
    },
  },
  plugins: [],
}
```

- [ ] **Step 5: Escrever `src/index.css`**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

html, body, #root { height: 100%; }
body {
  margin: 0;
  background: #0b0b0d;
  color: #f5f5f4;
  font-family: ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
}
```

- [ ] **Step 6: Escrever `.gitignore`**

```gitignore
node_modules
dist
.env.local
*.log
.DS_Store
```

- [ ] **Step 7: Escrever `src/main.jsx` e `src/App.jsx` (rotas mínimas) e `src/pages/Home.jsx`**

`src/main.jsx`:
```jsx
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
```

`src/pages/Home.jsx`:
```jsx
export default function Home() {
  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="bg-duty-card rounded-2xl p-8 text-center">
        <h1 className="text-duty-gold text-2xl font-semibold">Pedidos em Trânsito — Norte</h1>
        <p className="text-stone-400 mt-2">Você está autenticado. Dashboard vem no Plano 3.</p>
      </div>
    </div>
  )
}
```

`src/App.jsx` (rotas finais entram na Task 5; por ora, só Home):
```jsx
import { HashRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home.jsx'

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </HashRouter>
  )
}
```

- [ ] **Step 8: Instalar dependências**

Run (PowerShell, na pasta do app):
```
npm install
```
Expected: instala sem erros; cria `node_modules` e `package-lock.json`.

- [ ] **Step 9: Rodar o dev server e conferir**

Run: `npm run dev`
Expected: Vite sobe (ex.: `http://localhost:5173`); a página mostra o card "Pedidos em Trânsito — Norte". Encerrar (Ctrl+C) após conferir.

- [ ] **Step 10: Commit**

```
git add -A
git commit -m "feat: scaffold Vite+React+Tailwind com shell autenticado placeholder"
```

---

## Task 4: Util de formatação (TDD) + setup de testes

**Files:**
- Create: `src/test/setup.js`
- Create: `src/lib/format.js`
- Test: `src/lib/format.test.js`

- [ ] **Step 1: Escrever o setup de testes**

`src/test/setup.js`:
```js
import '@testing-library/jest-dom'
```

- [ ] **Step 2: Escrever o teste que falha**

`src/lib/format.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { formatBRL, formatKg } from './format.js'

describe('formatBRL', () => {
  it('formata número em reais', () => {
    expect(formatBRL(1234.5)).toBe('R$ 1.234,50')
  })
  it('trata nulo como zero', () => {
    expect(formatBRL(null)).toBe('R$ 0,00')
  })
})

describe('formatKg', () => {
  it('formata peso com kg', () => {
    expect(formatKg(1234.5)).toBe('1.234,5 kg')
  })
})
```

- [ ] **Step 3: Rodar o teste e ver falhar**

Run: `npm test`
Expected: FAIL (`format.js` não existe / export não definido).

- [ ] **Step 4: Implementar `src/lib/format.js`**

```js
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const kg = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

export function formatBRL(value) {
  return brl.format(Number(value) || 0)
}

export function formatKg(value) {
  return `${kg.format(Number(value) || 0)} kg`
}
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `npm test`
Expected: PASS (3 testes). Nota: `Intl` no Node usa espaço não-quebrável (` `) — os testes já esperam isso.

- [ ] **Step 6: Commit**

```
git add -A
git commit -m "test: utils de formatação R$/kg (TDD)"
```

---

## Task 5: Cliente Supabase, AuthProvider, login e rota protegida

**Files:**
- Create: `.env.local`, `.env.example`
- Create: `src/lib/supabase.js`
- Create: `src/context/AuthProvider.jsx`
- Create: `src/components/ProtectedRoute.jsx`
- Create: `src/pages/Login.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: Criar `.env.example` e `.env.local`**

`.env.example`:
```
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

`.env.local` (preencher com os valores capturados na Task 2 Step 4):
```
VITE_SUPABASE_URL=<url do get_project_url>
VITE_SUPABASE_ANON_KEY=<anon/publishable key do get_publishable_keys>
```

- [ ] **Step 2: Escrever `src/lib/supabase.js`**

```js
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  console.error('Supabase env vars ausentes. Confira o .env.local')
}

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
})
```

- [ ] **Step 3: Escrever `src/context/AuthProvider.jsx`**

Carrega a sessão, expõe `user`, `isAdmin`, `loading`, `signIn`, `signOut`. O papel vem de `rca_acesso` (RLS deixa o usuário ler as próprias linhas).

```jsx
import { createContext, useContext, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [isAdmin, setIsAdmin] = useState(false)
  const [loading, setLoading] = useState(true)

  async function loadRole(currentUser) {
    if (!currentUser) { setIsAdmin(false); return }
    const { data } = await supabase
      .from('rca_acesso')
      .select('papel')
      .eq('user_id', currentUser.id)
    setIsAdmin(Boolean(data?.some((r) => r.papel === 'admin')))
  }

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      const u = data.session?.user ?? null
      setUser(u)
      await loadRole(u)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange(async (_e, session) => {
      const u = session?.user ?? null
      setUser(u)
      await loadRole(u)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  const value = {
    user,
    isAdmin,
    loading,
    signIn: (email, password) => supabase.auth.signInWithPassword({ email, password }),
    signOut: () => supabase.auth.signOut(),
  }
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve estar dentro de AuthProvider')
  return ctx
}
```

- [ ] **Step 4: Escrever `src/components/ProtectedRoute.jsx`**

```jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider.jsx'

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()
  if (loading) {
    return <div className="min-h-full flex items-center justify-center text-stone-400">Carregando…</div>
  }
  if (!user) return <Navigate to="/login" replace />
  return children
}
```

- [ ] **Step 5: Escrever `src/pages/Login.jsx`**

```jsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider.jsx'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) { setError('E-mail ou senha inválidos.'); return }
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="bg-duty-card w-full max-w-sm rounded-2xl p-8 space-y-4">
        <h1 className="text-duty-gold text-xl font-semibold text-center">Pedidos em Trânsito — Norte</h1>
        <input
          type="email" required placeholder="E-mail" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg bg-black/40 border border-stone-700 px-3 py-2 outline-none focus:border-duty-gold"
        />
        <input
          type="password" required placeholder="Senha" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-black/40 border border-stone-700 px-3 py-2 outline-none focus:border-duty-gold"
        />
        {error && <p className="text-status-late text-sm">{error}</p>}
        <button
          type="submit" disabled={busy}
          className="w-full rounded-lg bg-duty-gold text-black font-semibold py-2 disabled:opacity-60"
        >
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
```

- [ ] **Step 6: Atualizar `src/App.jsx` com AuthProvider + rotas**

```jsx
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Home />
              </ProtectedRoute>
            }
          />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
```

- [ ] **Step 7: Verificar build e testes**

Run: `npm run build`
Expected: build conclui sem erros; gera `dist/`.

Run: `npm test`
Expected: testes continuam PASS.

- [ ] **Step 8: Verificação manual do login**

Pré-requisito: criar um usuário de teste no Supabase (MCP não cria usuário de auth diretamente — usar o painel Supabase → Authentication → Add user, ou deixar para a entrega final). Se ainda não houver usuário, verificar apenas que:
- `npm run dev` → acessar `/#/` redireciona para `/#/login` (rota protegida funciona).
- Enviar credenciais inválidas mostra "E-mail ou senha inválidos."

Expected: redirecionamento para login quando deslogado; mensagem de erro em credencial inválida.

- [ ] **Step 9: Commit**

```
git add -A
git commit -m "feat: auth Supabase (login, sessão, papel, rota protegida)"
```

---

## Definition of Done (Plano 1)

- BI NORTE ativo; `pedidos` e `rca_acesso` criadas.
- RLS habilitada e **verificada** por simulação (nailson=2, daniela=1, admin=3).
- `npm run build` e `npm test` passam.
- App redireciona para login quando deslogado; login válido leva ao shell autenticado.
- Tudo commitado.

## Self-review (feito)

- **Cobertura da spec (ssec. 4/5/6):** tabelas ✓, RLS SELECT admin/RCA ✓, INSERT/UPDATE só admin ✓, rca_acesso ✓. O *seed* do roster (sec. 6) depende de user_id reais → acontece na criação de logins (entrega final / Plano 4); a whitelist de vendedores é usada pelo parser no Plano 2. Sem lacuna de dados aqui.
- **Placeholders:** os únicos valores "a preencher" são URL/anon key (produzidos pela Task 2 Step 4) — valores reais de etapa anterior, não placeholders vagos.
- **Consistência de tipos/nomes:** `useAuth`, `supabase`, `is_admin()`, `my_vendedores()`, `formatBRL`/`formatKg` usados de forma consistente entre tasks.
