// Lead time das entregas concluídas (com data_real_entrega).
// total     = dias corridos do faturamento até a entrega real
// transporte = dias corridos da expedição até a entrega real

export function diffDias(inicioISO, fimISO) {
  if (!inicioISO || !fimISO) return null
  const a = Date.parse(inicioISO + 'T00:00:00')
  const b = Date.parse(fimISO + 'T00:00:00')
  if (Number.isNaN(a) || Number.isNaN(b)) return null
  return Math.round((b - a) / 86400000)
}

export function leadTimes(p) {
  return {
    total: diffDias(p.data_faturamento, p.data_real_entrega),
    transporte: diffDias(p.data_expedicao, p.data_real_entrega),
  }
}

export function entregasConcluidas(pedidos) {
  return pedidos
    .filter((p) => p.data_real_entrega)
    .map((p) => ({ ...p, lt: leadTimes(p) }))
}

// Uma linha por cliente = a entrega mais recente dele (a "última entrega").
export function ultimaEntregaPorCliente(pedidos) {
  const map = new Map()
  for (const p of entregasConcluidas(pedidos)) {
    const c = p.nome_cliente || '—'
    const atual = map.get(c)
    if (!atual || String(p.data_real_entrega) > String(atual.data_real_entrega)) {
      map.set(c, p)
    }
  }
  return [...map.values()]
}

export function mediaLeadTime(entregas) {
  const avg = (a) =>
    a.length ? Math.round((a.reduce((s, x) => s + x, 0) / a.length) * 10) / 10 : null
  return {
    total: avg(entregas.map((e) => e.lt.total).filter((v) => v != null)),
    transporte: avg(entregas.map((e) => e.lt.transporte).filter((v) => v != null)),
    planejado: avg(entregas.map((e) => e.lead_time).filter((v) => v != null)),
    n: entregas.length,
  }
}
