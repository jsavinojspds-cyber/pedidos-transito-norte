# Pedidos em Trânsito Norte — Plano 2: Carga (parser xlsx + upsert + tela admin)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O admin faz upload do `Em trânsito.xlsx`; o app lê a aba "Base de pedidos", filtra os 7 vendedores do Norte, converte datas/números e faz **upsert** por `chave` na tabela `pedidos`, mostrando um resumo (inseridos/atualizados).

**Architecture:** Um módulo **puro** de parsing (`pedidosParser.js`) transforma um workbook SheetJS em objetos `pedido` (sem tocar em rede/UI) — 100% testável. Um módulo `upsertPedidos.js` cuida da gravação no Supabase em lotes e do cálculo de inseridos vs atualizados. A tela `Admin.jsx` (só papel admin) junta os dois. Cabeçalhos são casados de forma tolerante (sem acento/maiúscula/espaço extra) porque o arquivo real ainda não foi visto.

**Tech Stack:** SheetJS (`xlsx`), @supabase/supabase-js, React, Vitest.

**Pré-requisitos:** Plano 1 concluído (tabelas + RLS + auth). Node no PATH: prefixar `C:\Users\jean.savino\nodejs\node-v24.18.0-win-x64` e usar PowerShell.

---

## Mapa de arquivos

| Arquivo | Responsabilidade |
|---|---|
| `src/lib/pedidosParser.js` | Puro: normalização de cabeçalho, mapa de colunas, conversão de data/número, filtro Norte, `parseWorkbook` |
| `src/lib/pedidosParser.test.js` | Testes do parser com workbook fabricado em memória |
| `src/lib/upsertPedidos.js` | Grava no Supabase em lotes; calcula inseridos/atualizados |
| `src/pages/Admin.jsx` | Tela de upload (input file, chama parser + upsert, mostra resumo) |
| `src/components/AdminRoute.jsx` | Protege rota: exige papel admin |
| `src/App.jsx` (modificar) | Adiciona rota `/admin` |
| `src/pages/Home.jsx` (modificar) | Link "Área do admin" quando `isAdmin` |

---

## Task 1: Parser puro — conversões e mapa (TDD)

**Files:**
- Create: `src/lib/pedidosParser.js`
- Test: `src/lib/pedidosParser.test.js`

- [ ] **Step 1: Escrever os testes das funções de conversão (falham)**

`src/lib/pedidosParser.test.js`:
```js
import { describe, it, expect } from 'vitest'
import {
  normalizeHeader,
  parseNumeroBR,
  parseDateCell,
  VENDEDORES_NORTE,
} from './pedidosParser.js'

describe('normalizeHeader', () => {
  it('remove acento, espaço e caixa', () => {
    expect(normalizeHeader('  Região Brasil ')).toBe('regiao brasil')
    expect(normalizeHeader('OBS. TRÂNSITO')).toBe('obs. transito')
  })
})

describe('parseNumeroBR', () => {
  it('converte string com milhar/vírgula', () => {
    expect(parseNumeroBR('1.234,56')).toBe(1234.56)
  })
  it('aceita número puro', () => {
    expect(parseNumeroBR(1234.56)).toBe(1234.56)
  })
  it('vazio vira null', () => {
    expect(parseNumeroBR('')).toBeNull()
    expect(parseNumeroBR(null)).toBeNull()
  })
})

describe('parseDateCell', () => {
  it('Date do JS vira ISO (sem shift de fuso)', () => {
    expect(parseDateCell(new Date(2026, 6, 1))).toBe('2026-07-01')
  })
  it('serial do Excel vira ISO', () => {
    // 45839 = 2025-07-01 (base 1899-12-30)
    expect(parseDateCell(45839)).toBe('2025-07-01')
  })
  it('string dd/mm/aaaa vira ISO', () => {
    expect(parseDateCell('01/07/2026')).toBe('2026-07-01')
  })
  it('string ISO passa direto', () => {
    expect(parseDateCell('2026-07-01')).toBe('2026-07-01')
  })
  it('vazio vira null', () => {
    expect(parseDateCell('')).toBeNull()
    expect(parseDateCell(null)).toBeNull()
  })
})

describe('VENDEDORES_NORTE', () => {
  it('tem os 7 vendedores exatos', () => {
    expect(VENDEDORES_NORTE).toHaveLength(7)
    expect(VENDEDORES_NORTE).toContain('NAILSON F COSTA')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run (PowerShell):
```
$env:Path = "C:\Users\jean.savino\nodejs\node-v24.18.0-win-x64;$env:Path"; Set-Location "C:\Users\jean.savino\APP PEDIDO  EM TRANSITO"; npm test
```
Expected: FAIL (módulo não existe).

- [ ] **Step 3: Implementar `src/lib/pedidosParser.js` (parte 1)**

```js
export const SHEET_NAME = 'Base de pedidos'
export const HEADER_ROW = 5 // 1-indexed (linhas 1-4 são título/metadados)

export const VENDEDORES_NORTE = [
  'FURTADO E GEMAQUE LTDA (FREDERICSON)',
  'NAILSON F COSTA',
  'OREN REPRESENTACOES (ROSIMARA)',
  'DANIELA NASCIMENTO DA SILVA',
  'FURTADO E GEMAQUE LTDA (ANA GEMAQUE)',
  'ORTIZ E OLIVEIRA REP E COM (SCARLETTY)',
  'ES ANDRADE REPRESENTACOES (EDUARDO)',
]

// Cabeçalho Excel (normalizado) -> coluna do banco
const COLUMN_MAP_RAW = {
  'Chave': 'chave',
  'CNPJ Cliente': 'cnpj_cliente',
  'Nome Cliente': 'nome_cliente',
  'Vendedor': 'vendedor',
  'Cidade': 'cidade',
  'Estado': 'estado',
  'Região Brasil': 'regiao_brasil',
  'Região': 'regiao',
  'Filial': 'filial',
  'Número Pedido (Protheus)': 'numero_pedido',
  'Pedido SalesForce (Oportunidade)': 'pedido_salesforce',
  'Ped. Cliente': 'pedido_cliente',
  'NF': 'nf',
  'Valor Faturado': 'valor_faturado',
  'Peso': 'peso',
  'Desc. Tipo Saída': 'desc_tipo_saida',
  'Operação': 'operacao',
  'Transportador': 'transportador',
  'Data Faturamento': 'data_faturamento',
  'Data programada expedição': 'data_prog_expedicao',
  'Data expedição': 'data_expedicao',
  'Lead time (dias úteis)': 'lead_time',
  'Previsão de entrega': 'previsao_entrega',
  'Data Real de Chegada': 'data_real_chegada',
  'Data Real Entrega': 'data_real_entrega',
  'Recebimento': 'recebimento',
  'Data Agenda': 'data_agenda',
  'Status trânsito': 'status_transito',
  'OBS. TRÂNSITO': 'obs_transito',
}

export const DATE_FIELDS = new Set([
  'data_faturamento', 'data_prog_expedicao', 'data_expedicao',
  'previsao_entrega', 'data_real_chegada', 'data_real_entrega', 'data_agenda',
])
export const NUMBER_FIELDS = new Set(['valor_faturado', 'peso'])
export const INT_FIELDS = new Set(['lead_time'])

export function normalizeHeader(h) {
  return String(h ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // remove acentos
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

// mapa normalizado -> campo
const COLUMN_MAP = Object.fromEntries(
  Object.entries(COLUMN_MAP_RAW).map(([k, v]) => [normalizeHeader(k), v]),
)

export function fieldForHeader(header) {
  return COLUMN_MAP[normalizeHeader(header)] ?? null
}

export function parseNumeroBR(value) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value === 'number') return value
  const s = String(value).trim()
  if (s === '') return null
  // remove separador de milhar '.', troca decimal ',' por '.'
  const cleaned = s.replace(/\./g, '').replace(',', '.').replace(/[^0-9.\-]/g, '')
  const n = Number(cleaned)
  return Number.isNaN(n) ? null : n
}

function pad2(n) { return String(n).padStart(2, '0') }
function ymd(y, m, d) { return `${y}-${pad2(m)}-${pad2(d)}` }

export function parseDateCell(value) {
  if (value === null || value === undefined || value === '') return null
  if (value instanceof Date) {
    return ymd(value.getFullYear(), value.getMonth() + 1, value.getDate())
  }
  if (typeof value === 'number') {
    // serial Excel: base 1899-12-30 (compensa bug do ano 1900)
    const ms = Math.round((value - 25569) * 86400 * 1000)
    const d = new Date(ms)
    return ymd(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate())
  }
  const s = String(value).trim()
  if (s === '') return null
  let m = s.match(/^(\d{4})-(\d{2})-(\d{2})/) // ISO
  if (m) return ymd(Number(m[1]), Number(m[2]), Number(m[3]))
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/) // dd/mm/aaaa
  if (m) return ymd(Number(m[3]), Number(m[2]), Number(m[1]))
  return null
}
```

- [ ] **Step 4: Rodar e ver passar (conversões)**

Run: `npm test`
Expected: PASS nos describes de normalizeHeader, parseNumeroBR, parseDateCell, VENDEDORES_NORTE.

- [ ] **Step 5: Commit**

```
git add -A
git commit -m "feat: parser puro (conversoes + mapa de colunas) com TDD"
```

---

## Task 2: `parseWorkbook` — leitura da aba, filtro Norte, transformação (TDD)

**Files:**
- Modify: `src/lib/pedidosParser.js`
- Modify: `src/lib/pedidosParser.test.js`

- [ ] **Step 1: Adicionar teste com workbook fabricado (falha)**

Acrescentar ao fim de `src/lib/pedidosParser.test.js`:
```js
import * as XLSX from 'xlsx'
import { parseWorkbook, mapRowToPedido } from './pedidosParser.js'

function makeWorkbook(dataRows) {
  // 4 linhas de título + 1 de cabeçalho + dados (replica cabeçalho na linha 5)
  const header = [
    'Chave', 'CNPJ Cliente', 'Nome Cliente', 'Vendedor', 'Estado',
    'Valor Faturado', 'Peso', 'Lead time (dias úteis)',
    'Data Faturamento', 'Previsão de entrega', 'Status trânsito',
  ]
  const aoa = [
    ['Relatório Pedidos em Trânsito'], [], ['Data atualização', '09/07/2026'], [],
    header, ...dataRows,
  ]
  const ws = XLSX.utils.aoa_to_sheet(aoa)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Base de pedidos')
  return wb
}

describe('parseWorkbook', () => {
  it('filtra só vendedores do Norte e converte tipos', () => {
    const wb = makeWorkbook([
      ['K1', '111', 'Cliente A', 'NAILSON F COSTA', 'AM', '1.234,56', '10,5', '3', '01/07/2026', '10/07/2026', 'Em trânsito'],
      ['K2', '222', 'Cliente B', 'VENDEDOR DE OUTRA REGIAO', 'SP', '999,00', '1', '2', '01/07/2026', '05/07/2026', 'Entregue no prazo'],
      ['K3', '333', 'Cliente C', 'DANIELA NASCIMENTO DA SILVA', 'PA', '500,00', '2,0', '1', '02/07/2026', '08/07/2026', 'Atrasado'],
    ])
    const { pedidos, ignorados } = parseWorkbook(wb)
    expect(pedidos).toHaveLength(2) // K1 e K3 (K2 é de outra região)
    expect(ignorados).toBe(1)
    const k1 = pedidos.find((p) => p.chave === 'K1')
    expect(k1.vendedor).toBe('NAILSON F COSTA')
    expect(k1.valor_faturado).toBe(1234.56)
    expect(k1.peso).toBe(10.5)
    expect(k1.lead_time).toBe(3)
    expect(k1.data_faturamento).toBe('2026-07-01')
    expect(k1.previsao_entrega).toBe('2026-07-10')
    expect(k1.status_transito).toBe('Em trânsito')
  })

  it('ignora linhas sem chave', () => {
    const wb = makeWorkbook([
      ['', '000', 'Sem chave', 'NAILSON F COSTA', 'AM', '1', '1', '1', '01/07/2026', '02/07/2026', 'Em trânsito'],
    ])
    const { pedidos } = parseWorkbook(wb)
    expect(pedidos).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `npm test`
Expected: FAIL (`parseWorkbook`/`mapRowToPedido` não existem).

- [ ] **Step 3: Implementar `parseWorkbook` + `mapRowToPedido` em `pedidosParser.js`**

Adicionar ao final de `src/lib/pedidosParser.js`:
```js
import * as XLSX from 'xlsx'

export function mapRowToPedido(row) {
  // row: objeto { 'Cabeçalho Excel': valor }
  const pedido = {}
  for (const [header, value] of Object.entries(row)) {
    const field = fieldForHeader(header)
    if (!field) continue
    if (DATE_FIELDS.has(field)) pedido[field] = parseDateCell(value)
    else if (NUMBER_FIELDS.has(field)) pedido[field] = parseNumeroBR(value)
    else if (INT_FIELDS.has(field)) {
      const n = parseNumeroBR(value)
      pedido[field] = n === null ? null : Math.round(n)
    } else {
      const s = value === null || value === undefined ? null : String(value).trim()
      pedido[field] = s === '' ? null : s
    }
  }
  return pedido
}

export function parseWorkbook(workbook) {
  const ws = workbook.Sheets[SHEET_NAME]
  if (!ws) {
    throw new Error(`Aba "${SHEET_NAME}" não encontrada na planilha.`)
  }
  // range: HEADER_ROW-1 (0-indexed) -> cabeçalho na linha 5
  const rows = XLSX.utils.sheet_to_json(ws, {
    range: HEADER_ROW - 1,
    defval: null,
    raw: true,
  })
  const norte = new Set(VENDEDORES_NORTE)
  const pedidos = []
  let ignorados = 0
  for (const row of rows) {
    const pedido = mapRowToPedido(row)
    if (!pedido.chave) continue // linha sem chave = lixo
    if (!norte.has(pedido.vendedor)) { ignorados++; continue }
    pedidos.push(pedido)
  }
  return { pedidos, ignorados }
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `npm test`
Expected: PASS (todos os testes do parser, incluindo parseWorkbook).

- [ ] **Step 5: Commit**

```
git add -A
git commit -m "feat: parseWorkbook - filtro Norte + transformacao de linhas (TDD)"
```

---

## Task 3: Upsert no Supabase (lotes + inseridos/atualizados)

**Files:**
- Create: `src/lib/upsertPedidos.js`

- [ ] **Step 1: Implementar `src/lib/upsertPedidos.js`**

```js
import { supabase } from './supabase.js'

const CHUNK = 500

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * Faz upsert dos pedidos por `chave`. Antes, consulta as chaves já existentes
 * para reportar inseridos vs atualizados. Só admin consegue gravar (RLS).
 * @returns {Promise<{inseridos:number, atualizados:number, total:number}>}
 */
export async function upsertPedidos(pedidos) {
  if (!pedidos.length) return { inseridos: 0, atualizados: 0, total: 0 }

  const chaves = pedidos.map((p) => p.chave)
  const existentes = new Set()
  for (const parte of chunk(chaves, 1000)) {
    const { data, error } = await supabase.from('pedidos').select('chave').in('chave', parte)
    if (error) throw error
    for (const r of data) existentes.add(r.chave)
  }

  const stamp = new Date().toISOString()
  for (const parte of chunk(pedidos, CHUNK)) {
    const withStamp = parte.map((p) => ({ ...p, updated_at: stamp }))
    const { error } = await supabase.from('pedidos').upsert(withStamp, { onConflict: 'chave' })
    if (error) throw error
  }

  const atualizados = chaves.filter((c) => existentes.has(c)).length
  const inseridos = chaves.length - atualizados
  return { inseridos, atualizados, total: chaves.length }
}
```

- [ ] **Step 2: Verificar build**

Run: `npm run build`
Expected: build ok (sem erros de import/sintaxe).

- [ ] **Step 3: Commit**

```
git add -A
git commit -m "feat: upsertPedidos - gravacao em lotes + contagem inseridos/atualizados"
```

---

## Task 4: Tela do Admin (upload) + rota protegida por papel

**Files:**
- Create: `src/components/AdminRoute.jsx`
- Create: `src/pages/Admin.jsx`
- Modify: `src/App.jsx`
- Modify: `src/pages/Home.jsx`

- [ ] **Step 1: `src/components/AdminRoute.jsx`**

```jsx
import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider.jsx'

export default function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth()
  if (loading) {
    return <div className="min-h-full flex items-center justify-center text-stone-400">Carregando…</div>
  }
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}
```

- [ ] **Step 2: `src/pages/Admin.jsx`**

```jsx
import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { parseWorkbook } from '../lib/pedidosParser.js'
import { upsertPedidos } from '../lib/upsertPedidos.js'

export default function Admin() {
  const [status, setStatus] = useState('idle') // idle | lendo | gravando | ok | erro
  const [resumo, setResumo] = useState(null)
  const [erro, setErro] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErro(''); setResumo(null); setStatus('lendo')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const { pedidos, ignorados } = parseWorkbook(wb)
      setStatus('gravando')
      const r = await upsertPedidos(pedidos)
      setResumo({ ...r, ignorados, quando: new Date().toLocaleString('pt-BR') })
      setStatus('ok')
    } catch (err) {
      setErro(err.message || 'Falha ao processar a planilha.')
      setStatus('erro')
    } finally {
      e.target.value = '' // permite reenviar o mesmo arquivo
    }
  }

  const busy = status === 'lendo' || status === 'gravando'

  return (
    <div className="min-h-full p-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-duty-gold text-xl font-semibold">Carga de pedidos</h1>
        <Link to="/" className="text-stone-400 text-sm hover:text-duty-gold">← Voltar</Link>
      </div>

      <label className="block bg-duty-card rounded-2xl p-8 text-center cursor-pointer border border-stone-800 hover:border-duty-gold">
        <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} disabled={busy} />
        <p className="text-stone-200 font-medium">Selecionar arquivo .xlsx</p>
        <p className="text-stone-500 text-sm mt-1">Aba “Base de pedidos”. Filtra os 7 vendedores do Norte e atualiza por chave.</p>
      </label>

      {busy && <p className="text-stone-400 mt-4">{status === 'lendo' ? 'Lendo a planilha…' : 'Gravando no banco…'}</p>}
      {status === 'erro' && <p className="text-status-late mt-4">{erro}</p>}

      {resumo && (
        <div className="bg-duty-card rounded-2xl p-6 mt-4 space-y-1">
          <p className="text-status-ok font-semibold">Carga concluída ✓</p>
          <p className="text-stone-300">Inseridos: <b>{resumo.inseridos}</b></p>
          <p className="text-stone-300">Atualizados: <b>{resumo.atualizados}</b></p>
          <p className="text-stone-300">Total gravado: <b>{resumo.total}</b></p>
          <p className="text-stone-500 text-sm">Ignorados (fora do Norte): {resumo.ignorados}</p>
          <p className="text-stone-500 text-sm">Atualização: {resumo.quando}</p>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Rota `/admin` em `src/App.jsx`**

Substituir o conteúdo de `src/App.jsx` por:
```jsx
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AdminRoute from './components/AdminRoute.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'
import Admin from './pages/Admin.jsx'

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/admin" element={<AdminRoute><Admin /></AdminRoute>} />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
```

- [ ] **Step 4: Link do admin em `src/pages/Home.jsx`**

Substituir o conteúdo de `src/pages/Home.jsx` por:
```jsx
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider.jsx'

export default function Home() {
  const { isAdmin, signOut } = useAuth()
  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="bg-duty-card rounded-2xl p-8 text-center space-y-4">
        <h1 className="text-duty-gold text-2xl font-semibold">Pedidos em Trânsito — Norte</h1>
        <p className="text-stone-400">Você está autenticado. Dashboard vem no Plano 3.</p>
        {isAdmin && (
          <Link to="/admin" className="inline-block rounded-lg bg-duty-gold text-black font-semibold px-4 py-2">
            Área do admin (carga)
          </Link>
        )}
        <button onClick={signOut} className="block mx-auto text-stone-500 text-sm hover:text-duty-gold">Sair</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 5: Build + testes**

Run: `npm run build` → Expected: ok.
Run: `npm test` → Expected: todos PASS.

- [ ] **Step 6: Commit**

```
git add -A
git commit -m "feat: tela admin de upload + rota /admin protegida por papel"
```

---

## Task 5: Verificação end-to-end do parser com arquivo real fabricado

**Files:**
- Create (temporário, NÃO commitar): script de geração de xlsx no scratchpad

- [ ] **Step 1: Gerar um xlsx de amostra e rodar o parser por fora**

Criar `scratchpad/gera_amostra.mjs` (fora do repo, no diretório de scratchpad) que monta uma planilha no formato real (4 linhas + cabeçalho completo na linha 5 + linhas de vários vendedores, incluindo fora do Norte) e roda `parseWorkbook`, imprimindo `{pedidos.length, ignorados}` e um pedido de exemplo.

Run: `node scratchpad/gera_amostra.mjs`
Expected: imprime a contagem correta (só Norte) e os tipos convertidos (número/data), confirmando o pipeline com um arquivo .xlsx binário real (não só objeto em memória).

- [ ] **Step 2: (Depois, com login admin real) validar o upsert no banco**

Quando existir o login admin do Jean (entrega final), abrir `/admin`, subir o arquivo e conferir o resumo (inseridos/atualizados) e as linhas em `pedidos` via `execute_sql`. Registrar como pendência se o login ainda não existir.

---

## Definition of Done (Plano 2)

- `pedidosParser.js` testado (conversões + filtro Norte + transformação) — todos os testes verdes.
- `upsertPedidos.js` implementado (lotes + inseridos/atualizados).
- Tela `/admin` de upload, protegida por papel admin; link some para não-admin.
- `npm run build` e `npm test` passam.
- Parser validado com um `.xlsx` binário fabricado (Task 5 Step 1).
- Upsert live no banco fica pendente até existir login admin (Task 5 Step 2).

## Self-review (feito)

- **Cobertura da spec (sec. 6/8-admin upload):** ler aba/linha 5 ✓, mapa de 29 colunas ✓, filtro por whitelist de vendedores ✓, saneamento data/número ✓, upsert por chave ✓, resumo inseridos/atualizados/atualização ✓.
- **Placeholders:** nenhum — todo código presente. Task 5 Step 2 é explicitamente uma pendência condicionada ao login admin (não um placeholder de implementação).
- **Consistência de nomes:** `parseWorkbook`, `mapRowToPedido`, `upsertPedidos`, `VENDEDORES_NORTE`, `fieldForHeader` usados igual entre módulos e testes. `onConflict: 'chave'` bate com a PK real.
