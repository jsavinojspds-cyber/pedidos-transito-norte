# Pedidos em Trânsito Norte — Plano 3: Dashboard + Lista + Detalhe (RCA)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Ao logar, o RCA vê um dashboard mobile-first já restrito à carteira dele (via RLS): KPIs, gráfico por status e alertas; navega para a lista de pedidos (com busca/filtros) e para o detalhe de cada pedido.

**Architecture:** Um módulo puro `kpis.js` calcula KPIs, contagens por status e alertas a partir de um array de `pedido` (100% testável). Um hook `usePedidos()` busca `select * from pedidos` (o RLS filtra). As páginas (`Dashboard`, `Pedidos`, `PedidoDetalhe`) e componentes de apresentação consomem esses dados. Recharts para o donut de status.

**Tech Stack:** React, react-router-dom (HashRouter), Recharts, Vitest, @supabase/supabase-js. Node no PATH: prefixar `C:\Users\jean.savino\nodejs\node-v24.18.0-win-x64`; usar PowerShell.

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/kpis.js` (+ `.test.js`) | Puro: `computeKpis`, `statusCounts`, `getAlertas`, `statusColor`, `STATUS_LIST` |
| `src/hooks/usePedidos.js` | Busca pedidos (RLS) — retorna `{pedidos, loading, error, reload}` |
| `src/components/AppShell.jsx` | Cabeçalho (título, sair, link admin) + navegação inferior (Dashboard/Pedidos) |
| `src/components/KpiCard.jsx` | Card de KPI (rótulo, valor, destaque opcional) |
| `src/components/StatusChart.jsx` | Donut Recharts por status |
| `src/components/StatusBadge.jsx` | Etiqueta colorida do status |
| `src/components/AlertList.jsx` | Lista de alertas |
| `src/pages/Dashboard.jsx` | KPIs + gráfico + alertas |
| `src/pages/Pedidos.jsx` | Lista com busca (cliente) e filtros (status, estado) |
| `src/pages/PedidoDetalhe.jsx` | Régua de datas + dados do pedido |
| `src/App.jsx` (modificar) | Rotas `/`, `/pedidos`, `/pedido/:chave` |
| `src/pages/Home.jsx` | REMOVER (vira Dashboard) |

---

## Task 1: Núcleo de KPIs e alertas (TDD)

**Files:**
- Create: `src/lib/kpis.js`, `src/lib/kpis.test.js`

- [ ] **Step 1: Testes (falham)**

`src/lib/kpis.test.js`:
```js
import { describe, it, expect } from 'vitest'
import { computeKpis, statusCounts, getAlertas, statusColor } from './kpis.js'

const base = [
  { chave: '1', status_transito: 'Entregue no prazo', valor_faturado: 100, peso: 10, estado: 'AM' },
  { chave: '2', status_transito: 'Entregue em atraso', valor_faturado: 200, peso: 20, estado: 'PA' },
  { chave: '3', status_transito: 'Em trânsito', valor_faturado: 50, peso: 5, estado: 'AM' },
  { chave: '4', status_transito: 'Atrasado', valor_faturado: 30, peso: 3, estado: 'AM' },
  { chave: '5', status_transito: 'Aguarda expedição', valor_faturado: 10, peso: 1, estado: 'RR' },
]

describe('computeKpis', () => {
  it('calcula OTD, contagens e somas', () => {
    const k = computeKpis(base)
    expect(k.otd).toBeCloseTo(0.5) // 1 no prazo / (1 no prazo + 1 em atraso)
    expect(k.emTransito).toBe(1)
    expect(k.atrasados).toBe(2) // Atrasado + Entregue em atraso
    expect(k.aguardandoExpedicao).toBe(1)
    expect(k.valorTotal).toBe(390)
    expect(k.pesoTotal).toBe(39)
    expect(k.total).toBe(5)
  })
  it('OTD é null quando não há entregas', () => {
    const k = computeKpis([{ chave: 'x', status_transito: 'Em trânsito' }])
    expect(k.otd).toBeNull()
  })
})

describe('statusCounts', () => {
  it('conta por status', () => {
    const c = statusCounts(base)
    const emTransito = c.find((x) => x.status === 'Em trânsito')
    expect(emTransito.count).toBe(1)
    expect(c.reduce((s, x) => s + x.count, 0)).toBe(5)
  })
})

describe('getAlertas', () => {
  it('inclui Atrasado, Aguardando descarga e previsão vencida sem entrega', () => {
    const pedidos = [
      { chave: 'a', status_transito: 'Atrasado' },
      { chave: 'b', status_transito: 'Aguardando descarga' },
      { chave: 'c', status_transito: 'Em trânsito', previsao_entrega: '2026-07-01', data_real_entrega: null },
      { chave: 'd', status_transito: 'Em trânsito', previsao_entrega: '2026-07-20', data_real_entrega: null },
      { chave: 'e', status_transito: 'Em trânsito', previsao_entrega: '2026-07-01', data_real_entrega: '2026-07-02' },
    ]
    const al = getAlertas(pedidos, '2026-07-09')
    const chaves = al.map((p) => p.chave)
    expect(chaves).toContain('a')
    expect(chaves).toContain('b')
    expect(chaves).toContain('c') // vencida sem entrega
    expect(chaves).not.toContain('d') // previsão futura
    expect(chaves).not.toContain('e') // já entregue
  })
})

describe('statusColor', () => {
  it('mapeia cores conhecidas', () => {
    expect(statusColor('Entregue no prazo')).toBe('#22c55e')
    expect(statusColor('Atrasado')).toBe('#ef4444')
    expect(statusColor('Em trânsito')).toBe('#3b82f6')
    expect(statusColor('desconhecido')).toBe('#9ca3af')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test` → Expected: FAIL (`kpis.js` não existe).

- [ ] **Step 3: Implementar `src/lib/kpis.js`**

```js
export const STATUS_LIST = [
  'Em trânsito',
  'Entregue no prazo',
  'Aguarda expedição',
  'Entregue em atraso',
  'Atrasado',
  'Aguardando descarga no prazo',
  'Aguardando descarga',
]

const COLORS = {
  'Em trânsito': '#3b82f6',
  'Entregue no prazo': '#22c55e',
  'Aguarda expedição': '#f59e0b',
  'Entregue em atraso': '#ef4444',
  'Atrasado': '#ef4444',
  'Aguardando descarga no prazo': '#f59e0b',
  'Aguardando descarga': '#f59e0b',
}

export function statusColor(status) {
  return COLORS[status] ?? '#9ca3af'
}

export function computeKpis(pedidos) {
  let noPrazo = 0, emAtraso = 0, emTransito = 0, atrasado = 0, aguardExp = 0
  let valorTotal = 0, pesoTotal = 0
  for (const p of pedidos) {
    const s = p.status_transito
    if (s === 'Entregue no prazo') noPrazo++
    else if (s === 'Entregue em atraso') emAtraso++
    else if (s === 'Em trânsito') emTransito++
    else if (s === 'Atrasado') atrasado++
    else if (s === 'Aguarda expedição') aguardExp++
    valorTotal += Number(p.valor_faturado) || 0
    pesoTotal += Number(p.peso) || 0
  }
  const entregues = noPrazo + emAtraso
  return {
    otd: entregues === 0 ? null : noPrazo / entregues,
    emTransito,
    atrasados: atrasado + emAtraso,
    aguardandoExpedicao: aguardExp,
    valorTotal,
    pesoTotal,
    total: pedidos.length,
  }
}

export function statusCounts(pedidos) {
  const map = new Map()
  for (const p of pedidos) {
    const s = p.status_transito || '—'
    map.set(s, (map.get(s) || 0) + 1)
  }
  return [...map.entries()].map(([status, count]) => ({ status, count }))
}

export function getAlertas(pedidos, hoje = new Date().toISOString().slice(0, 10)) {
  return pedidos.filter((p) => {
    if (p.status_transito === 'Atrasado' || p.status_transito === 'Aguardando descarga') return true
    if (p.previsao_entrega && !p.data_real_entrega && p.previsao_entrega < hoje) return true
    return false
  })
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test` → Expected: PASS (kpis + os testes anteriores).

- [ ] **Step 5: Commit**

```
git add -A && git commit -m "feat: nucleo de KPIs, contagens, alertas e cores (TDD)"
```

---

## Task 2: Hook de dados `usePedidos`

**Files:**
- Create: `src/hooks/usePedidos.js`

- [ ] **Step 1: Implementar**

```js
import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export function usePedidos() {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true); setError('')
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('previsao_entrega', { ascending: true, nullsFirst: false })
    if (error) setError(error.message)
    setPedidos(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  return { pedidos, loading, error, reload }
}
```

- [ ] **Step 2: Verificar build** — `npm run build` → Expected: ok.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: hook usePedidos (busca sob RLS)"`

---

## Task 3: Shell + componentes de apresentação

**Files:**
- Create: `src/components/AppShell.jsx`, `KpiCard.jsx`, `StatusBadge.jsx`, `StatusChart.jsx`, `AlertList.jsx`

- [ ] **Step 1: `src/components/StatusBadge.jsx`**

```jsx
import { statusColor } from '../lib/kpis.js'

export default function StatusBadge({ status }) {
  const color = statusColor(status)
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ color, backgroundColor: `${color}22`, border: `1px solid ${color}55` }}
    >
      {status || '—'}
    </span>
  )
}
```

- [ ] **Step 2: `src/components/KpiCard.jsx`**

```jsx
export default function KpiCard({ label, value, danger = false, sub }) {
  return (
    <div className="bg-duty-card rounded-2xl p-4">
      <p className="text-stone-400 text-xs">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${danger ? 'text-status-late' : 'text-stone-100'}`}>{value}</p>
      {sub && <p className="text-stone-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}
```

- [ ] **Step 3: `src/components/StatusChart.jsx`**

```jsx
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { statusColor } from '../lib/kpis.js'

export default function StatusChart({ data }) {
  if (!data.length) return <p className="text-stone-500 text-sm">Sem dados.</p>
  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="status" innerRadius={55} outerRadius={85} paddingAngle={2}>
            {data.map((d) => <Cell key={d.status} fill={statusColor(d.status)} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#16161a', border: '1px solid #333', borderRadius: 8, color: '#eee' }}
            formatter={(v, n) => [v, n]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
```

- [ ] **Step 4: `src/components/AlertList.jsx`**

```jsx
import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge.jsx'

export default function AlertList({ pedidos }) {
  if (!pedidos.length) return <p className="text-stone-500 text-sm">Nenhum alerta. 🎉</p>
  return (
    <ul className="space-y-2">
      {pedidos.map((p) => (
        <li key={p.chave}>
          <Link to={`/pedido/${encodeURIComponent(p.chave)}`} className="block bg-duty-card rounded-xl p-3 border-l-4" style={{ borderColor: '#ef4444' }}>
            <div className="flex items-center justify-between gap-2">
              <span className="text-stone-100 text-sm font-medium truncate">{p.nome_cliente || p.chave}</span>
              <StatusBadge status={p.status_transito} />
            </div>
            <p className="text-stone-500 text-xs mt-1">
              {[p.cidade, p.estado].filter(Boolean).join('/')} · Previsão: {p.previsao_entrega || '—'}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
```

- [ ] **Step 5: `src/components/AppShell.jsx`**

```jsx
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider.jsx'

export default function AppShell({ children }) {
  const { isAdmin, signOut } = useAuth()
  const { pathname } = useLocation()
  const tab = (to, label) => (
    <Link to={to} className={`flex-1 text-center py-3 text-sm ${pathname === to ? 'text-duty-gold' : 'text-stone-400'}`}>
      {label}
    </Link>
  )
  return (
    <div className="min-h-full flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
        <span className="text-duty-gold font-semibold">Pedidos · Norte</span>
        <div className="flex items-center gap-3">
          {isAdmin && <Link to="/admin" className="text-stone-400 text-sm hover:text-duty-gold">Carga</Link>}
          <button onClick={signOut} className="text-stone-500 text-sm hover:text-duty-gold">Sair</button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">{children}</main>
      <nav className="flex border-t border-stone-800 bg-duty-bg">
        {tab('/', 'Dashboard')}
        {tab('/pedidos', 'Pedidos')}
      </nav>
    </div>
  )
}
```

- [ ] **Step 6: Verificar build** — `npm run build` → Expected: ok (Recharts entra no bundle).
- [ ] **Step 7: Commit** — `git add -A && git commit -m "feat: shell + componentes (KpiCard, StatusChart, StatusBadge, AlertList)"`

---

## Task 4: Página Dashboard

**Files:**
- Create: `src/pages/Dashboard.jsx`
- Delete: `src/pages/Home.jsx`

- [ ] **Step 1: `src/pages/Dashboard.jsx`**

```jsx
import { useMemo } from 'react'
import AppShell from '../components/AppShell.jsx'
import KpiCard from '../components/KpiCard.jsx'
import StatusChart from '../components/StatusChart.jsx'
import AlertList from '../components/AlertList.jsx'
import { usePedidos } from '../hooks/usePedidos.js'
import { computeKpis, statusCounts, getAlertas } from '../lib/kpis.js'
import { formatBRL, formatKg } from '../lib/format.js'

export default function Dashboard() {
  const { pedidos, loading, error } = usePedidos()
  const kpis = useMemo(() => computeKpis(pedidos), [pedidos])
  const counts = useMemo(() => statusCounts(pedidos), [pedidos])
  const alertas = useMemo(() => getAlertas(pedidos), [pedidos])

  return (
    <AppShell>
      <div className="p-4 space-y-5">
        {loading && <p className="text-stone-400">Carregando…</p>}
        {error && <p className="text-status-late">Erro ao carregar: {error}</p>}
        {!loading && !error && (
          <>
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
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: 'currentColor' }} />
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

- [ ] **Step 2: Deletar `src/pages/Home.jsx`** (substituído por Dashboard).

Run: `git rm src/pages/Home.jsx`

- [ ] **Step 3: Commit** — `git add -A && git commit -m "feat: pagina Dashboard (KPIs + grafico + alertas)"`

---

## Task 5: Lista de pedidos (busca + filtros)

**Files:**
- Create: `src/pages/Pedidos.jsx`

- [ ] **Step 1: `src/pages/Pedidos.jsx`**

```jsx
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { usePedidos } from '../hooks/usePedidos.js'
import { STATUS_LIST } from '../lib/kpis.js'
import { formatBRL } from '../lib/format.js'

export default function Pedidos() {
  const { pedidos, loading, error } = usePedidos()
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('')
  const [estado, setEstado] = useState('')

  const estados = useMemo(
    () => [...new Set(pedidos.map((p) => p.estado).filter(Boolean))].sort(),
    [pedidos],
  )

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return pedidos.filter((p) => {
      if (status && p.status_transito !== status) return false
      if (estado && p.estado !== estado) return false
      if (q && !(p.nome_cliente || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [pedidos, busca, status, estado])

  return (
    <AppShell>
      <div className="p-4 space-y-3">
        <input
          value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente…"
          className="w-full rounded-lg bg-black/40 border border-stone-700 px-3 py-2 outline-none focus:border-duty-gold"
        />
        <div className="flex gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="flex-1 rounded-lg bg-black/40 border border-stone-700 px-2 py-2 text-sm">
            <option value="">Todos os status</option>
            {STATUS_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-28 rounded-lg bg-black/40 border border-stone-700 px-2 py-2 text-sm">
            <option value="">UF</option>
            {estados.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>

        {loading && <p className="text-stone-400">Carregando…</p>}
        {error && <p className="text-status-late">Erro: {error}</p>}
        {!loading && <p className="text-stone-500 text-xs">{filtrados.length} pedido(s)</p>}

        <ul className="space-y-2">
          {filtrados.map((p) => (
            <li key={p.chave}>
              <Link to={`/pedido/${encodeURIComponent(p.chave)}`} className="block bg-duty-card rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-stone-100 text-sm font-medium truncate">{p.nome_cliente || p.chave}</span>
                  <StatusBadge status={p.status_transito} />
                </div>
                <div className="flex items-center justify-between mt-1 text-xs text-stone-500">
                  <span>{[p.cidade, p.estado].filter(Boolean).join('/')} · NF {p.nf || '—'}</span>
                  <span className="text-stone-300">{formatBRL(p.valor_faturado)}</span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">Previsão: {p.previsao_entrega || '—'}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  )
}
```

- [ ] **Step 2: Commit** — `git add -A && git commit -m "feat: lista de pedidos com busca e filtros"`

---

## Task 6: Detalhe do pedido + rotas

**Files:**
- Create: `src/pages/PedidoDetalhe.jsx`
- Modify: `src/App.jsx`

- [ ] **Step 1: `src/pages/PedidoDetalhe.jsx`**

```jsx
import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import StatusBadge from '../components/StatusBadge.jsx'
import { formatBRL, formatKg } from '../lib/format.js'

const Linha = ({ label, value }) => (
  <div className="flex justify-between gap-3 py-1 border-b border-stone-800/60">
    <span className="text-stone-500 text-sm">{label}</span>
    <span className="text-stone-200 text-sm text-right">{value ?? '—'}</span>
  </div>
)

export default function PedidoDetalhe() {
  const { chave } = useParams()
  const [pedido, setPedido] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ativo = true
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase.from('pedidos').select('*').eq('chave', chave).maybeSingle()
      if (!ativo) return
      if (error) setError(error.message)
      setPedido(data)
      setLoading(false)
    })()
    return () => { ativo = false }
  }, [chave])

  const regua = [
    ['Faturamento', pedido?.data_faturamento],
    ['Prog. expedição', pedido?.data_prog_expedicao],
    ['Expedição', pedido?.data_expedicao],
    ['Previsão', pedido?.previsao_entrega],
    ['Chegada', pedido?.data_real_chegada],
    ['Entrega', pedido?.data_real_entrega],
  ]

  return (
    <div className="min-h-full p-4 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link to="/pedidos" className="text-stone-400 text-sm hover:text-duty-gold">← Pedidos</Link>
        {pedido && <StatusBadge status={pedido.status_transito} />}
      </div>

      {loading && <p className="text-stone-400">Carregando…</p>}
      {error && <p className="text-status-late">Erro: {error}</p>}
      {!loading && !pedido && <p className="text-stone-400">Pedido não encontrado (ou fora da sua carteira).</p>}

      {pedido && (
        <div className="space-y-5">
          <div>
            <h1 className="text-duty-gold text-lg font-semibold">{pedido.nome_cliente || pedido.chave}</h1>
            <p className="text-stone-500 text-sm">{[pedido.cidade, pedido.estado].filter(Boolean).join('/')}</p>
          </div>

          <section className="bg-duty-card rounded-2xl p-4">
            <h2 className="text-stone-300 text-sm font-medium mb-2">Linha do tempo</h2>
            <ol className="space-y-1">
              {regua.map(([label, val]) => (
                <li key={label} className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${val ? 'bg-duty-gold' : 'bg-stone-700'}`} />
                  <span className="text-stone-400 text-sm w-32">{label}</span>
                  <span className="text-stone-200 text-sm">{val || '—'}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="bg-duty-card rounded-2xl p-4">
            <Linha label="Valor faturado" value={formatBRL(pedido.valor_faturado)} />
            <Linha label="Peso" value={pedido.peso != null ? formatKg(pedido.peso) : '—'} />
            <Linha label="Transportador" value={pedido.transportador} />
            <Linha label="Operação" value={pedido.operacao} />
            <Linha label="Lead time (dias úteis)" value={pedido.lead_time} />
            <Linha label="Recebimento" value={pedido.recebimento} />
            <Linha label="NF" value={pedido.nf} />
            <Linha label="Nº Protheus" value={pedido.numero_pedido} />
            <Linha label="Oportunidade SF" value={pedido.pedido_salesforce} />
            <Linha label="CNPJ" value={pedido.cnpj_cliente} />
          </section>

          {pedido.obs_transito && (
            <section className="bg-duty-card rounded-2xl p-4">
              <h2 className="text-stone-300 text-sm font-medium mb-1">Observação</h2>
              <p className="text-stone-300 text-sm whitespace-pre-wrap">{pedido.obs_transito}</p>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Atualizar `src/App.jsx` (rotas Dashboard/Pedidos/Detalhe)**

```jsx
import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AdminRoute from './components/AdminRoute.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Pedidos from './pages/Pedidos.jsx'
import PedidoDetalhe from './pages/PedidoDetalhe.jsx'

const Admin = lazy(() => import('./pages/Admin.jsx'))
const Loading = () => (
  <div className="min-h-full flex items-center justify-center text-stone-400">Carregando…</div>
)

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/pedidos" element={<ProtectedRoute><Pedidos /></ProtectedRoute>} />
          <Route path="/pedido/:chave" element={<ProtectedRoute><PedidoDetalhe /></ProtectedRoute>} />
          <Route
            path="/admin"
            element={<AdminRoute><Suspense fallback={<Loading />}><Admin /></Suspense></AdminRoute>}
          />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
```

- [ ] **Step 3: Build + testes** — `npm run build` e `npm test` → Expected: ambos ok, todos os testes PASS.
- [ ] **Step 4: Commit** — `git add -A && git commit -m "feat: detalhe do pedido + rotas do RCA"`

---

## Task 7: Verificação com dados semeados (RLS)

- [ ] **Step 1: Semear alguns pedidos para um vendedor de teste e conferir no app**

Como não há login real ainda, a verificação visual completa fica para quando existir o login admin. Verificação possível agora: build + testes verdes (feito) e revisão de que `usePedidos` faz `select('*')` sem filtro de vendedor no cliente (o RLS filtra). Registrar pendência de smoke test visual com dados reais.

---

## Definition of Done (Plano 3)

- `kpis.js` testado (OTD, contagens, alertas, cores) — verde.
- Dashboard (KPIs + donut + alertas), Lista (busca/filtros) e Detalhe (régua + dados) implementados.
- Navegação inferior Dashboard/Pedidos; admin vê link "Carga".
- `npm run build` e `npm test` passam.
- Smoke test visual com dados reais fica pendente do login admin.

## Self-review (feito)

- **Cobertura da spec (sec. 7):** OTD ✓, em trânsito ✓, atrasados (Atrasado+Entregue em atraso) com destaque vermelho ✓, aguardando expedição ✓, valor/peso ✓, donut por status ✓, alertas (Atrasado/Aguardando descarga/previsão vencida sem entrega) ✓, lista com busca+filtros ✓, detalhe com régua de datas e campos ✓.
- **Placeholders:** nenhum; todo código presente. Task 7 é pendência condicionada a login real, não placeholder.
- **Consistência:** `usePedidos`, `computeKpis`, `statusCounts`, `getAlertas`, `statusColor`, `STATUS_LIST`, `formatBRL/Kg`, `StatusBadge` usados de forma consistente; rotas `/pedido/:chave` batem com os `Link` gerados.
```
