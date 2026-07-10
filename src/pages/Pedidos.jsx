import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import AppShell from '../components/AppShell.jsx'
import StatusBadge from '../components/StatusBadge.jsx'
import { usePedidos } from '../hooks/usePedidos.js'
import { STATUS_LIST } from '../lib/kpis.js'
import { formatBRL } from '../lib/format.js'

export default function Pedidos() {
  const { pedidos, loading, error } = usePedidos()
  const [busca, setBusca] = useState('')
  const [status, setStatus] = useState('')
  const [estado, setEstado] = useState('')

  const estados = useMemo(
    () => [...new Set(pedidos.map((p) => p.estado).filter(Boolean))].sort(),
    [pedidos],
  )

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase()
    return pedidos.filter((p) => {
      if (status && p.status_transito !== status) return false
      if (estado && p.estado !== estado) return false
      if (q && !(p.nome_cliente || '').toLowerCase().includes(q)) return false
      return true
    })
  }, [pedidos, busca, status, estado])

  return (
    <AppShell>
      <div className="p-4 space-y-3">
        <input
          value={busca} onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar cliente…"
          className="w-full rounded-lg bg-black/40 border border-stone-700 px-3 py-2 outline-none focus:border-duty-gold"
        />
        <div className="flex gap-2">
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="flex-1 rounded-lg bg-black/40 border border-stone-700 px-2 py-2 text-sm">
            <option value="">Todos os status</option>
            {STATUS_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={estado} onChange={(e) => setEstado(e.target.value)} className="w-28 rounded-lg bg-black/40 border border-stone-700 px-2 py-2 text-sm">
            <option value="">UF</option>
            {estados.map((uf) => <option key={uf} value={uf}>{uf}</option>)}
          </select>
        </div>

        {loading && <p className="text-stone-400">Carregando…</p>}
        {error && <p className="text-status-late">Erro: {error}</p>}
        {!loading && <p className="text-stone-500 text-xs">{filtrados.length} pedido(s)</p>}

        <ul className="space-y-2">
          {filtrados.map((p) => (
            <li key={p.chave}>
              <Link to={`/pedido/${encodeURIComponent(p.chave)}`} className="block bg-duty-card rounded-xl p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-stone-100 text-sm font-medium truncate">{p.nome_cliente || p.chave}</span>
                  <StatusBadge status={p.status_transito} />
                </div>
                <div className="flex items-center justify-between mt-1 text-xs text-stone-500">
                  <span>{[p.cidade, p.estado].filter(Boolean).join('/')} · NF {p.nf || '—'}</span>
                  <span className="text-stone-300">{formatBRL(p.valor_faturado)}</span>
                </div>
                <p className="text-xs text-stone-500 mt-0.5">Previsão: {p.previsao_entrega || '—'}</p>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </AppShell>
  )
}
