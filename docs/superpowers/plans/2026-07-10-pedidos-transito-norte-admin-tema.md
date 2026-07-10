# Pedidos em Trânsito Norte — Plano 4: Admin (comparativo) + Tema + Docs

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps `- [ ]`.

**Goal:** Fechar o MVP: tela de comparativo entre RCAs (admin), filtro por RCA no dashboard, refino do tema preto/dourado, e o guia de como criar os logins dos RCAs. Depois, redeploy no GitHub Pages.

**Architecture:** Reaproveita `kpis.js` (puro) com uma nova função `kpisPorVendedor` (TDD). Nova página `Comparativo` (admin). Filtro por vendedor no `Dashboard` (só admin). Nomes curtos dos vendedores para exibição. Ajustes de tema em `index.css`/classes. Docs em `docs/`.

**Tech Stack:** React, Recharts, Vitest. Node no PATH: `C:\Users\jean.savino\nodejs\node-v24.18.0-win-x64` (PowerShell).

---

## Mapa de arquivos

| Arquivo | Ação |
|---|---|
| `src/lib/kpis.js` (+ test) | + `kpisPorVendedor`, `NOME_CURTO`, `nomeCurtoVendedor` |
| `src/pages/Comparativo.jsx` | Nova página admin: tabela + barras por RCA |
| `src/components/RcaFilter.jsx` | Dropdown de vendedor (nomes curtos) |
| `src/pages/Dashboard.jsx` | Filtro por RCA (admin) |
| `src/components/AppShell.jsx` | Aba "Comparativo" (admin) |
| `src/App.jsx` | Rota `/comparativo` (AdminRoute) |
| `src/pages/Login.jsx`, `index.css` | Refino do tema preto/dourado |
| `docs/guia-logins-rca.md` | Guia de criação de logins |

---

## Task 1: `kpisPorVendedor` + nomes curtos (TDD)

**Files:** `src/lib/kpis.js`, `src/lib/kpis.test.js`

- [ ] **Step 1: Testes (falham)** — acrescentar em `kpis.test.js`:
```js
import { kpisPorVendedor, nomeCurtoVendedor } from './kpis.js'

describe('kpisPorVendedor', () => {
  it('agrupa métricas por vendedor', () => {
    const pedidos = [
      { vendedor: 'NAILSON F COSTA', status_transito: 'Entregue no prazo', valor_faturado: 100 },
      { vendedor: 'NAILSON F COSTA', status_transito: 'Atrasado', valor_faturado: 50 },
      { vendedor: 'DANIELA NASCIMENTO DA SILVA', status_transito: 'Entregue em atraso', valor_faturado: 30 },
    ]
    const r = kpisPorVendedor(pedidos)
    const nailson = r.find((x) => x.vendedor === 'NAILSON F COSTA')
    expect(nailson.total).toBe(2)
    expect(nailson.atrasados).toBe(1)
    expect(nailson.otd).toBe(1) // 1 no prazo / 1 entregue
    expect(nailson.valor).toBe(150)
    const daniela = r.find((x) => x.vendedor === 'DANIELA NASCIMENTO DA SILVA')
    expect(daniela.atrasados).toBe(1)
    expect(daniela.otd).toBe(0) // 0 no prazo / 1 entregue
  })
})

describe('nomeCurtoVendedor', () => {
  it('encurta os nomes conhecidos', () => {
    expect(nomeCurtoVendedor('FURTADO E GEMAQUE LTDA (FREDERICSON)')).toBe('Fredericson')
    expect(nomeCurtoVendedor('NAILSON F COSTA')).toBe('Nailson')
  })
  it('mantém desconhecido', () => {
    expect(nomeCurtoVendedor('OUTRO')).toBe('OUTRO')
  })
})
```

- [ ] **Step 2: Rodar → falhar** (`npm test`).

- [ ] **Step 3: Implementar em `kpis.js`** (acrescentar):
```js
export const NOME_CURTO = {
  'FURTADO E GEMAQUE LTDA (FREDERICSON)': 'Fredericson',
  'NAILSON F COSTA': 'Nailson',
  'OREN REPRESENTACOES (ROSIMARA)': 'Rosimara',
  'DANIELA NASCIMENTO DA SILVA': 'Daniela',
  'FURTADO E GEMAQUE LTDA (ANA GEMAQUE)': 'Ana Gemaque',
  'ORTIZ E OLIVEIRA REP E COM (SCARLETTY)': 'Scarletty',
  'ES ANDRADE REPRESENTACOES (EDUARDO)': 'Eduardo',
}

export function nomeCurtoVendedor(v) {
  return NOME_CURTO[v] ?? v
}

export function kpisPorVendedor(pedidos) {
  const grupos = new Map()
  for (const p of pedidos) {
    const v = p.vendedor || '—'
    if (!grupos.has(v)) grupos.set(v, [])
    grupos.get(v).push(p)
  }
  const out = []
  for (const [vendedor, lista] of grupos) {
    const k = computeKpis(lista)
    out.push({
      vendedor,
      nome: nomeCurtoVendedor(vendedor),
      total: k.total,
      otd: k.otd,
      atrasados: k.atrasados,
      emTransito: k.emTransito,
      valor: k.valorTotal,
    })
  }
  return out.sort((a, b) => a.nome.localeCompare(b.nome))
}
```

- [ ] **Step 4: Rodar → passar** (`npm test`).
- [ ] **Step 5: Commit** — `git add -A && git commit -m "feat: kpisPorVendedor + nomes curtos (TDD)"`

---

## Task 2: Página Comparativo (admin)

**Files:** `src/pages/Comparativo.jsx`

- [ ] **Step 1: Criar `src/pages/Comparativo.jsx`**
```jsx
import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import AppShell from '../components/AppShell.jsx'
import { usePedidos } from '../hooks/usePedidos.js'
import { kpisPorVendedor } from '../lib/kpis.js'
import { formatBRL } from '../lib/format.js'

export default function Comparativo() {
  const { pedidos, loading, error } = usePedidos()
  const dados = useMemo(() => kpisPorVendedor(pedidos), [pedidos])
  const barras = dados.map((d) => ({ nome: d.nome, atrasados: d.atrasados, otd: d.otd == null ? 0 : Math.round(d.otd * 100) }))

  return (
    <AppShell>
      <div className="p-4 space-y-5">
        <h1 className="text-duty-gold text-lg font-semibold">Comparativo por RCA</h1>
        {loading && <p className="text-stone-400">Carregando…</p>}
        {error && <p className="text-status-late">Erro: {error}</p>}
        {!loading && !error && (
          <>
            <div className="bg-duty-card rounded-2xl p-3">
              <p className="text-stone-300 text-sm font-medium mb-2">Atrasados por RCA</p>
              <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barras} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="nome" tick={{ fill: '#a8a29e', fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis allowDecimals={false} tick={{ fill: '#a8a29e', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#16161a', border: '1px solid #333', borderRadius: 8, color: '#eee' }} />
                    <Bar dataKey="atrasados" radius={[4, 4, 0, 0]}>
                      {barras.map((b) => <Cell key={b.nome} fill={b.atrasados > 0 ? '#ef4444' : '#3b82f6'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-duty-card rounded-2xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-stone-400 text-left">
                    <th className="p-3">RCA</th>
                    <th className="p-3 text-right">Pedidos</th>
                    <th className="p-3 text-right">OTD</th>
                    <th className="p-3 text-right">Atras.</th>
                    <th className="p-3 text-right">Trâns.</th>
                    <th className="p-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map((d) => (
                    <tr key={d.vendedor} className="border-t border-stone-800">
                      <td className="p-3 text-stone-100">{d.nome}</td>
                      <td className="p-3 text-right text-stone-300">{d.total}</td>
                      <td className="p-3 text-right text-stone-300">{d.otd == null ? '—' : `${Math.round(d.otd * 100)}%`}</td>
                      <td className={`p-3 text-right ${d.atrasados > 0 ? 'text-status-late' : 'text-stone-300'}`}>{d.atrasados}</td>
                      <td className="p-3 text-right text-stone-300">{d.emTransito}</td>
                      <td className="p-3 text-right text-stone-300">{formatBRL(d.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 2: Commit** — `git add -A && git commit -m "feat: pagina Comparativo por RCA (tabela + barras)"`

---

## Task 3: Filtro por RCA no Dashboard + aba Comparativo + rota

**Files:** `src/components/RcaFilter.jsx`, `src/pages/Dashboard.jsx`, `src/components/AppShell.jsx`, `src/App.jsx`

- [ ] **Step 1: `src/components/RcaFilter.jsx`**
```jsx
import { nomeCurtoVendedor } from '../lib/kpis.js'

export default function RcaFilter({ vendedores, value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg bg-black/40 border border-stone-700 px-3 py-2 text-sm focus:border-duty-gold outline-none"
    >
      <option value="">Todos os RCAs</option>
      {vendedores.map((v) => <option key={v} value={v}>{nomeCurtoVendedor(v)}</option>)}
    </select>
  )
}
```

- [ ] **Step 2: `Dashboard.jsx` — filtro por RCA (só admin)**

Substituir o conteúdo por (adiciona `useAuth`, estado `rca`, filtro e o `RcaFilter`):
```jsx
import { useMemo, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import KpiCard from '../components/KpiCard.jsx'
import StatusChart from '../components/StatusChart.jsx'
import AlertList from '../components/AlertList.jsx'
import RcaFilter from '../components/RcaFilter.jsx'
import { usePedidos } from '../hooks/usePedidos.js'
import { useAuth } from '../context/AuthProvider.jsx'
import { computeKpis, statusCounts, getAlertas, statusColor } from '../lib/kpis.js'
import { formatBRL, formatKg } from '../lib/format.js'

export default function Dashboard() {
  const { pedidos, loading, error } = usePedidos()
  const { isAdmin } = useAuth()
  const [rca, setRca] = useState('')

  const vendedores = useMemo(
    () => [...new Set(pedidos.map((p) => p.vendedor).filter(Boolean))].sort(),
    [pedidos],
  )
  const base = useMemo(() => (rca ? pedidos.filter((p) => p.vendedor === rca) : pedidos), [pedidos, rca])
  const kpis = useMemo(() => computeKpis(base), [base])
  const counts = useMemo(() => statusCounts(base), [base])
  const alertas = useMemo(() => getAlertas(base), [base])

  return (
    <AppShell>
      <div className="p-4 space-y-5">
        {loading && <p className="text-stone-400">Carregando…</p>}
        {error && <p className="text-status-late">Erro ao carregar: {error}</p>}
        {!loading && !error && (
          <>
            {isAdmin && vendedores.length > 1 && (
              <RcaFilter vendedores={vendedores} value={rca} onChange={setRca} />
            )}
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="OTD (no prazo)" value={kpis.otd === null ? '—' : `${Math.round(kpis.otd * 100)}%`} />
              <KpiCard label="Em trânsito" value={kpis.emTransito} />
              <KpiCard label="Atrasados" value={kpis.atrasados} danger={kpis.atrasados > 0} />
              <KpiCard label="Aguard. expedição" value={kpis.aguardandoExpedicao} />
              <KpiCard label="Valor faturado" value={formatBRL(kpis.valorTotal)} />
              <KpiCard label="Peso total" value={formatKg(kpis.pesoTotal)} />
            </div>

            <section>
              <h2 className="text-stone-300 text-sm font-medium mb-2">Por status</h2>
              <div className="bg-duty-card rounded-2xl p-3">
                <StatusChart data={counts} />
                <ul className="mt-3 grid grid-cols-2 gap-1">
                  {counts.map((c) => (
                    <li key={c.status} className="flex items-center gap-2 text-xs text-stone-400">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: statusColor(c.status) }} />
                      <span className="truncate">{c.status}</span>
                      <span className="ml-auto text-stone-200">{c.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-stone-300 text-sm font-medium mb-2">Alertas ({alertas.length})</h2>
              <AlertList pedidos={alertas} />
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 3: `AppShell.jsx` — aba "Comparativo" (admin)**

No `<nav>`, quando `isAdmin`, incluir a aba:
```jsx
      <nav className="flex border-t border-stone-800 bg-duty-bg">
        {tab('/', 'Dashboard')}
        {tab('/pedidos', 'Pedidos')}
        {isAdmin && tab('/comparativo', 'Comparativo')}
      </nav>
```

- [ ] **Step 4: `App.jsx` — rota `/comparativo` (AdminRoute)**

Adicionar import `import Comparativo from './pages/Comparativo.jsx'` e a rota:
```jsx
          <Route path="/comparativo" element={<AdminRoute><Comparativo /></AdminRoute>} />
```

- [ ] **Step 5: Build + testes** — `npm run build` e `npm test` → ok.
- [ ] **Step 6: Commit** — `git add -A && git commit -m "feat: filtro por RCA no dashboard + aba/rota Comparativo"`

---

## Task 4: Refino do tema preto/dourado

**Files:** `src/index.css`, `src/pages/Login.jsx`

- [ ] **Step 1: `index.css` — wordmark + toques**

Acrescentar ao final:
```css
.wordmark { letter-spacing: .35em; font-weight: 700; }
.gold-line { height: 2px; background: linear-gradient(90deg, #d4af37, transparent); }
::selection { background: #d4af37; color: #000; }
input, select { color-scheme: dark; }
```

- [ ] **Step 2: `Login.jsx` — cabeçalho com marca DUTY**

Substituir o `<h1>` do formulário por:
```jsx
        <div className="text-center">
          <p className="wordmark text-duty-gold text-2xl">DUTY</p>
          <p className="text-stone-400 text-sm mt-1">Pedidos em Trânsito · Norte</p>
        </div>
        <div className="gold-line rounded-full" />
```

- [ ] **Step 3: `AppShell.jsx` — marca no header**

Trocar o `<span>` do título por:
```jsx
        <div className="flex items-baseline gap-2">
          <span className="wordmark text-duty-gold">DUTY</span>
          <span className="text-stone-500 text-xs">Norte</span>
        </div>
```

- [ ] **Step 4: Build** — `npm run build` → ok.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "style: refino do tema preto/dourado (marca DUTY)"`

---

## Task 5: Guia de criação de logins dos RCAs

**Files:** `docs/guia-logins-rca.md`

- [ ] **Step 1: Escrever o guia** com: como criar usuário no painel Supabase (Authentication → Add user, com "Auto Confirm"); pegar o `user_id`; inserir em `rca_acesso` o `vendedor` EXATO da pessoa (papel 'rca'); como tornar alguém admin (papel 'admin'); tabela do roster (nome curto → string exata). Incluir os SQLs prontos.

- [ ] **Step 2: Commit** — `git add -A && git commit -m "docs: guia de criacao de logins dos RCAs"`

---

## Task 6: Redeploy no GitHub Pages

- [ ] **Step 1: Build + publicar no `gh-pages`** (conforme `docs/deploy-github-pages.md`): build, `.nojekyll`, push forçado do `dist` no `gh-pages`.
- [ ] **Step 2: Verificar** o site no ar (200) e um asset novo (hash mudou).
- [ ] **Step 3: Push do `main`** com todos os commits.

---

## Definition of Done (Plano 4)

- `kpisPorVendedor` testado (verde).
- Página Comparativo (tabela + barras) acessível só ao admin.
- Filtro por RCA no dashboard (admin).
- Tema refinado (marca DUTY, linha dourada).
- Guia de logins escrito.
- Build + testes verdes; redeploy feito; `main` atualizado.

## Self-review (feito)

- **Cobertura spec (sec. 8/9):** admin vê todos + filtro por RCA ✓, comparativo OTD/atrasados por RCA ✓, upload já existe (Plano 2) ✓, identidade preto/dourado reforçada ✓, docs de logins ✓.
- **Placeholders:** Task 5 detalha conteúdo real no passo de execução (SQLs). Sem placeholders de código nas demais.
- **Consistência:** `kpisPorVendedor`, `nomeCurtoVendedor`, `RcaFilter`, rota `/comparativo` + `AdminRoute` coerentes; usa `computeKpis` existente.
```
