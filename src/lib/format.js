const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const kg = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

// Intl pode usar espaco nao-quebravel (NBSP U+00A0 / U+202F). O \s do JS
// abrange esses casos, entao normalizamos qualquer espaco para o espaco comum.
const normalizeSpaces = (s) => s.replace(/\s/g, ' ')

export function formatBRL(value) {
  return normalizeSpaces(brl.format(Number(value) || 0))
}

export function formatKg(value) {
  return `${normalizeSpaces(kg.format(Number(value) || 0))} kg`
}
