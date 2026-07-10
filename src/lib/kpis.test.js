import { describe, it, expect } from 'vitest'
import {
  computeKpis,
  statusCounts,
  getAlertas,
  statusColor,
  kpisPorVendedor,
  nomeCurtoVendedor,
} from './kpis.js'

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
    expect(k.otd).toBeCloseTo(0.5)
    expect(k.emTransito).toBe(1)
    expect(k.atrasados).toBe(2)
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
    expect(chaves).toContain('c')
    expect(chaves).not.toContain('d')
    expect(chaves).not.toContain('e')
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
    expect(nailson.otd).toBe(1)
    expect(nailson.valor).toBe(150)
    const daniela = r.find((x) => x.vendedor === 'DANIELA NASCIMENTO DA SILVA')
    expect(daniela.atrasados).toBe(1)
    expect(daniela.otd).toBe(0)
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
