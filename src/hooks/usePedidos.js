import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase.js'

export function usePedidos() {
  const [pedidos, setPedidos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const reload = useCallback(async () => {
    setLoading(true); setError('')
    const { data, error } = await supabase
      .from('pedidos')
      .select('*')
      .order('previsao_entrega', { ascending: true, nullsFirst: false })
    if (error) setError(error.message)
    setPedidos(data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { reload() }, [reload])

  return { pedidos, loading, error, reload }
}
