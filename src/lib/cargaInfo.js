import { supabase } from './supabase.js'

/** Registra qual arquivo gerou a carga (so admin consegue gravar - RLS). */
export async function registrarCarga({ arquivo, total, inseridos, atualizados, ignorados }) {
  const { data: userData } = await supabase.auth.getUser()
  const { error } = await supabase.from('carga_info').insert({
    arquivo,
    total,
    inseridos,
    atualizados,
    ignorados,
    user_id: userData?.user?.id ?? null,
  })
  if (error) throw error
}

/** Ultima carga feita (todos os logados podem ver qual arquivo gerou os dados). */
export async function getUltimaCarga() {
  const { data, error } = await supabase
    .from('carga_info')
    .select('arquivo, quando, total')
    .order('quando', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (error) return null
  return data
}
