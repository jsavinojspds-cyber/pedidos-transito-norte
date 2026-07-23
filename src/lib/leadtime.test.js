import { describe, it, expect } from 'vitest'
import {
  diffDias, leadTimes, entregasConcluidas, ultimaEntregaPorCliente, mediaLeadTime,
} from './leadtime.js'

describe('diffDias', () => {
  it('conta dias corridos', () => {
    expect(diffDias('2026-07-01', '2026-07-06')).toBe(5)
  })
  it('nulo quando falta data', () => {
    expect(diffDias(null, '2026-07-06')).toBeNull()
    expect(diffDias('2026-07-01', null)).toBeNull()
  })
})

describe('leadTimes', () => {
  it('calcula total e transporte', () => {
    const lt = leadTimes({ data_faturamento: '2026-07-01', data_expedicao: '2026-07-03', data_real_entrega: '2026-07-08' })
    expect(lt.total).toBe(7)
    expect(lt.transporte).toBe(5)
  })
})

describe('entregasConcluidas', () => {
  it('inclui só quem tem entrega real', () => {
    const r = entregasConcluidas([
      { chave: '1', data_faturamento: '2026-07-01', data_real_entrega: '2026-07-05' },
      { chave: '2', data_faturamento: '2026-07-01', data_real_entrega: null },
    ])
    expect(r).toHaveLength(1)
    expect(r[0].lt.total).toBe(4)
  })
})

describe('ultimaEntregaPorCliente', () => {
  it('pega a entrega mais recente de cada cliente', () => {
    const r = ultimaEntregaPorCliente([
      { chave: 'a', nome_cliente: 'X', data_faturamento: '2026-06-01', data_real_entrega: '2026-06-10' },
      { chave: 'b', nome_cliente: 'X', data_faturamento: '2026-07-01', data_real_entrega: '2026-07-09' },
      { chave: 'c', nome_cliente: 'Y', data_faturamento: '2026-07-01', data_real_entrega: '2026-07-05' },
    ])
    expect(r).toHaveLength(2)
    const x = r.find((p) => p.nome_cliente === 'X')
    expect(x.chave).toBe('b') // a mais recente
  })
})

describe('mediaLeadTime', () => {
  it('calcula médias', () => {
    const ent = entregasConcluidas([
      { chave: '1', data_faturamento: '2026-07-01', data_expedicao: '2026-07-02', data_real_entrega: '2026-07-05', lead_time: 3 },
      { chave: '2', data_faturamento: '2026-07-01', data_expedicao: '2026-07-03', data_real_entrega: '2026-07-09', lead_time: 5 },
    ])
    const m = mediaLeadTime(ent)
    expect(m.n).toBe(2)
    expect(m.total).toBe(6)         // (4 + 8) / 2
    expect(m.transporte).toBe(4.5)  // (3 + 6) / 2
    expect(m.planejado).toBe(4)     // (3 + 5) / 2
  })
})
