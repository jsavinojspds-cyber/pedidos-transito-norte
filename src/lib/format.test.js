import { describe, it, expect } from 'vitest'
import { formatBRL, formatKg } from './format.js'

describe('formatBRL', () => {
  it('formata número em reais', () => {
    expect(formatBRL(1234.5)).toBe('R$ 1.234,50')
  })
  it('trata nulo como zero', () => {
    expect(formatBRL(null)).toBe('R$ 0,00')
  })
})

describe('formatKg', () => {
  it('formata peso com kg', () => {
    expect(formatKg(1234.5)).toBe('1.234,5 kg')
  })
})
