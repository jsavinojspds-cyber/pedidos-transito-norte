import { supabase } from './supabase.js'

const CHUNK = 500

function chunk(arr, size) {
  const out = []
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size))
  return out
}

/**
 * Faz upsert dos pedidos por `chave`. Antes, consulta as chaves ja existentes
 * para reportar inseridos vs atualizados. So admin consegue gravar (RLS).
 * @returns {Promise<{inseridos:number, atualizados:number, total:number}>}
 */
export async function upsertPedidos(pedidos) {
  if (!pedidos.length) return { inseridos: 0, atualizados: 0, total: 0 }

  const chaves = pedidos.map((p) => p.chave)
  const existentes = new Set()
  for (const parte of chunk(chaves, 1000)) {
    const { data, error } = await supabase.from('pedidos').select('chave').in('chave', parte)
    if (error) throw error
    for (const r of data) existentes.add(r.chave)
  }

  const stamp = new Date().toISOString()
  for (const parte of chunk(pedidos, CHUNK)) {
    const withStamp = parte.map((p) => ({ ...p, updated_at: stamp }))
    const { error } = await supabase.from('pedidos').upsert(withStamp, { onConflict: 'chave' })
    if (error) throw error
  }

  const atualizados = chaves.filter((c) => existentes.has(c)).length
  const inseridos = chaves.length - atualizados
  return { inseridos, atualizados, total: chaves.length }
}
