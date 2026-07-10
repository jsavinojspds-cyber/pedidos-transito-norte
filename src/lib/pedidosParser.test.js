import { describe, it, expect } from 'vitest'
import * as XLSX from 'xlsx'
import {
  normalizeHeader,
  parseNumeroBR,
  parseDateCell,
  VENDEDORES_NORTE,
  parseWorkbook,
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

function makeWorkbook(dataRows) {
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
    expect(pedidos).toHaveLength(2)
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
