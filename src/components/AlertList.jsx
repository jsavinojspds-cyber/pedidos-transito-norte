import { Link } from 'react-router-dom'
import StatusBadge from './StatusBadge.jsx'

export default function AlertList({ pedidos }) {
  if (!pedidos.length) return <p className="text-stone-500 text-sm">Nenhum alerta. 🎉</p>
  return (
    <ul className="space-y-2">
      {pedidos.map((p) => (
        <li key={p.chave}>
          <Link
            to={`/pedido/${encodeURIComponent(p.chave)}`}
            className="block bg-duty-card rounded-xl p-3 border-l-4"
            style={{ borderColor: '#ef4444' }}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-stone-100 text-sm font-medium truncate">{p.nome_cliente || p.chave}</span>
              <StatusBadge status={p.status_transito} />
            </div>
            <p className="text-stone-500 text-xs mt-1">
              {[p.cidade, p.estado].filter(Boolean).join('/')} · Previsão: {p.previsao_entrega || '—'}
            </p>
          </Link>
        </li>
      ))}
    </ul>
  )
}
