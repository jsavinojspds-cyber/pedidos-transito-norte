import { describe, it, expect } from 'vitest'
import { fasesPedido, mediaFases, transportePorTransportadora } from './ciclo.js'

const p1 = { data_faturamento: '2026-07-01', data_expedicao: '2026-07-03', data_real_chegada: '2026-07-08', data_real_entrega: '2026-07-09', transportador: 'A' }
const p2 = { data_faturamento: '2026-07-01', data_expedicao: '2026-07-02', data_real_chegada: '2026-07-10', data_real_entrega: '2026-07-10', transportador: 'A' }
const p3 = { data_faturamento: '2026-07-01', data_expedicao: '2026-07-02', data_real_chegada: '2026-07-04', data_real_entrega: null, transportador: 'B' }

describe('fasesPedido', () => {
  it('calcula as fases', () => {
    const f = fasesPedido(p1)
    expect(f.preparacao).toBe(2)
    expect(f.transporte).toBe(5)
    expect(f.descarga).toBe(1)
    expect(f.total).toBe(8)
  })
})

describe('mediaFases', () => {
  it('média por fase, ignorando o que não dá pra calcular', () => {
    const m = mediaFases([p1, p2, p3])
    expect(m.preparacao.media).toBe(1.3)   // (2+1+1)/3 = 1.33 -> 1.3
    expect(m.transporte.media).toBe(5)      // (5+8+2)/3 = 5
    expect(m.descarga.n).toBe(2)            // p3 sem entrega
    expect(m.total.n).toBe(2)
  })
})

describe('transportePorTransportadora', () => {
  it('agrupa e ordena pelo maior tempo', () => {
    const r = transportePorTransportadora([p1, p2, p3])
    expect(r[0].transportador).toBe('A') // (5+8)/2 = 6.5
    expect(r[0].media).toBe(6.5)
    const b = r.find((x) => x.transportador === 'B')
    expect(b.media).toBe(2)
  })
})
