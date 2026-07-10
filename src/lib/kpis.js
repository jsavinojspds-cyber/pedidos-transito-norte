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
