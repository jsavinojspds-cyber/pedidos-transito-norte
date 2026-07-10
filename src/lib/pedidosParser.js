import * as XLSX from 'xlsx'

export const SHEET_NAME = 'Base de pedidos'
export const HEADER_ROW = 5 // 1-indexed (linhas 1-4 sao titulo/metadados)

export const VENDEDORES_NORTE = [
  'FURTADO E GEMAQUE LTDA (FREDERICSON)',
  'NAILSON F COSTA',
  'OREN REPRESENTACOES (ROSIMARA)',
  'DANIELA NASCIMENTO DA SILVA',
  'FURTADO E GEMAQUE LTDA (ANA GEMAQUE)',
  'ORTIZ E OLIVEIRA REP E COM (SCARLETTY)',
  'ES ANDRADE REPRESENTACOES (EDUARDO)',
]

// Cabecalho Excel -> coluna do banco
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
    .replace(/\p{Mn}/gu, '') // remove marcas de acento (combining)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

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
    // serial Excel: base 1899-12-30 (compensa o bug do ano 1900)
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

export function mapRowToPedido(row) {
  const pedido = {}
  for (const [header, value] of Object.entries(row)) {
    const field = fieldForHeader(header)
    if (!field) continue
    if (DATE_FIELDS.has(field)) {
      pedido[field] = parseDateCell(value)
    } else if (NUMBER_FIELDS.has(field)) {
      pedido[field] = parseNumeroBR(value)
    } else if (INT_FIELDS.has(field)) {
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
  const rows = XLSX.utils.sheet_to_json(ws, {
    range: HEADER_ROW - 1, // 0-indexed: cabecalho na linha 5
    defval: null,
    raw: true,
  })
  const norte = new Set(VENDEDORES_NORTE)
  const pedidos = []
  let ignorados = 0
  for (const row of rows) {
    const pedido = mapRowToPedido(row)
    if (!pedido.chave) continue
    if (!norte.has(pedido.vendedor)) { ignorados++; continue }
    pedidos.push(pedido)
  }
  return { pedidos, ignorados }
}
