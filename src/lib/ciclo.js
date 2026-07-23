import { diffDias } from './leadtime.js'

// Fases do ciclo do pedido (dias corridos):
// preparacao = faturamento -> expedicao
// transporte = expedicao   -> chegada real
// descarga   = chegada     -> entrega real
// total      = faturamento -> entrega real
export function fasesPedido(p) {
  return {
    preparacao: diffDias(p.data_faturamento, p.data_expedicao),
    transporte: diffDias(p.data_expedicao, p.data_real_chegada),
    descarga: diffDias(p.data_real_chegada, p.data_real_entrega),
    total: diffDias(p.data_faturamento, p.data_real_entrega),
  }
}

const media = (a) =>
  a.length ? Math.round((a.reduce((s, x) => s + x, 0) / a.length) * 10) / 10 : null

export function mediaFases(pedidos) {
  const fs = pedidos.map(fasesPedido)
  const mk = (k) => {
    const a = fs.map((f) => f[k]).filter((v) => v != null)
    return { media: media(a), n: a.length }
  }
  return {
    preparacao: mk('preparacao'),
    transporte: mk('transporte'),
    descarga: mk('descarga'),
    total: mk('total'),
  }
}

// Tempo de transporte medio por transportadora (o gargalo), maior primeiro.
export function transportePorTransportadora(pedidos) {
  const g = new Map()
  for (const p of pedidos) {
    const d = diffDias(p.data_expedicao, p.data_real_chegada)
    if (d == null) continue
    const t = p.transportador || '—'
    if (!g.has(t)) g.set(t, [])
    g.get(t).push(d)
  }
  return [...g.entries()]
    .map(([transportador, arr]) => ({ transportador, media: media(arr), n: arr.length }))
    .sort((a, b) => (b.media ?? -1) - (a.media ?? -1))
}
