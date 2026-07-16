import { useEffect, useState } from 'react'
import { getUltimaCarga } from '../lib/cargaInfo.js'

export default function CargaBanner() {
  const [carga, setCarga] = useState(null)

  useEffect(() => {
    let ativo = true
    getUltimaCarga().then((c) => { if (ativo) setCarga(c) })
    return () => { ativo = false }
  }, [])

  if (!carga) return null

  const quando = new Date(carga.quando).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })

  return (
    <div className="rounded-xl border border-stone-800 bg-duty-card px-3 py-2">
      <p className="text-xs text-stone-400">
        Atualizado com o arquivo{' '}
        <span className="text-duty-gold font-medium break-all">{carga.arquivo}</span>
      </p>
      <p className="text-[11px] text-stone-500 mt-0.5">
        em {quando}{carga.total != null ? ` · ${carga.total} pedidos` : ''}
      </p>
    </div>
  )
}
