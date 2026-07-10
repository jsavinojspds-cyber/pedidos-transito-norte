import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase.js'
import StatusBadge from '../components/StatusBadge.jsx'
import { formatBRL, formatKg } from '../lib/format.js'

const Linha = ({ label, value }) => (
  <div className="flex justify-between gap-3 py-1 border-b border-stone-800/60">
    <span className="text-stone-500 text-sm">{label}</span>
    <span className="text-stone-200 text-sm text-right">{value ?? '—'}</span>
  </div>
)

export default function PedidoDetalhe() {
  const { chave } = useParams()
  const [pedido, setPedido] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let ativo = true
    ;(async () => {
      setLoading(true)
      const { data, error } = await supabase.from('pedidos').select('*').eq('chave', chave).maybeSingle()
      if (!ativo) return
      if (error) setError(error.message)
      setPedido(data)
      setLoading(false)
    })()
    return () => { ativo = false }
  }, [chave])

  const regua = [
    ['Faturamento', pedido?.data_faturamento],
    ['Prog. expedição', pedido?.data_prog_expedicao],
    ['Expedição', pedido?.data_expedicao],
    ['Previsão', pedido?.previsao_entrega],
    ['Chegada', pedido?.data_real_chegada],
    ['Entrega', pedido?.data_real_entrega],
  ]

  return (
    <div className="min-h-full p-4 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <Link to="/pedidos" className="text-stone-400 text-sm hover:text-duty-gold">← Pedidos</Link>
        {pedido && <StatusBadge status={pedido.status_transito} />}
      </div>

      {loading && <p className="text-stone-400">Carregando…</p>}
      {error && <p className="text-status-late">Erro: {error}</p>}
      {!loading && !pedido && <p className="text-stone-400">Pedido não encontrado (ou fora da sua carteira).</p>}

      {pedido && (
        <div className="space-y-5">
          <div>
            <h1 className="text-duty-gold text-lg font-semibold">{pedido.nome_cliente || pedido.chave}</h1>
            <p className="text-stone-500 text-sm">{[pedido.cidade, pedido.estado].filter(Boolean).join('/')}</p>
          </div>

          <section className="bg-duty-card rounded-2xl p-4">
            <h2 className="text-stone-300 text-sm font-medium mb-2">Linha do tempo</h2>
            <ol className="space-y-1">
              {regua.map(([label, val]) => (
                <li key={label} className="flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full ${val ? 'bg-duty-gold' : 'bg-stone-700'}`} />
                  <span className="text-stone-400 text-sm w-32">{label}</span>
                  <span className="text-stone-200 text-sm">{val || '—'}</span>
                </li>
              ))}
            </ol>
          </section>

          <section className="bg-duty-card rounded-2xl p-4">
            <Linha label="Valor faturado" value={formatBRL(pedido.valor_faturado)} />
            <Linha label="Peso" value={pedido.peso != null ? formatKg(pedido.peso) : '—'} />
            <Linha label="Transportador" value={pedido.transportador} />
            <Linha label="Operação" value={pedido.operacao} />
            <Linha label="Lead time (dias úteis)" value={pedido.lead_time} />
            <Linha label="Recebimento" value={pedido.recebimento} />
            <Linha label="NF" value={pedido.nf} />
            <Linha label="Nº Protheus" value={pedido.numero_pedido} />
            <Linha label="Oportunidade SF" value={pedido.pedido_salesforce} />
            <Linha label="CNPJ" value={pedido.cnpj_cliente} />
          </section>

          {pedido.obs_transito && (
            <section className="bg-duty-card rounded-2xl p-4">
              <h2 className="text-stone-300 text-sm font-medium mb-1">Observação</h2>
              <p className="text-stone-300 text-sm whitespace-pre-wrap">{pedido.obs_transito}</p>
            </section>
          )}
        </div>
      )}
    </div>
  )
}
