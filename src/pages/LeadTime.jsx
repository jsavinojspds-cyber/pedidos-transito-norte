import { useMemo, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import KpiCard from '../components/KpiCard.jsx'
import { usePedidos } from '../hooks/usePedidos.js'
import { entregasConcluidas, ultimaEntregaPorCliente, mediaLeadTime } from '../lib/leadtime.js'
import { nomeCurtoVendedor } from '../lib/kpis.js'

export default function LeadTime() {
  const { pedidos, loading, error } = usePedidos()
  const [busca, setBusca] = useState('')
  const [ordem, setOrdem] = useState('lento') // lento | recente

  const entregas = useMemo(() => entregasConcluidas(pedidos), [pedidos])
  const media = useMemo(() => mediaLeadTime(entregas), [entregas])
  const ultimas = useMemo(() => ultimaEntregaPorCliente(pedidos), [pedidos])

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase()
    const r = ultimas.filter((p) => (p.nome_cliente || '').toLowerCase().includes(q))
    return r.sort((a, b) => {
      if (ordem === 'recente') {
        return String(b.data_real_entrega).localeCompare(String(a.data_real_entrega))
      }
      return (b.lt.total ?? -1) - (a.lt.total ?? -1)
    })
  }, [ultimas, busca, ordem])

  const corLT = (v) =>
    v == null ? '#9ca3af' : media.total != null && v > media.total ? '#ef4444' : '#22c55e'

  return (
    <AppShell>
      <div className="p-4 space-y-5">
        <h1 className="text-duty-gold text-lg font-semibold">Lead Time das entregas</h1>
        {loading && <p className="text-stone-400">Carregando…</p>}
        {error && <p className="text-status-late">Erro: {error}</p>}
        {!loading && !error && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Entregas concluídas" value={media.n} />
              <KpiCard label="LT médio (fat→entrega)" value={media.total == null ? '—' : `${media.total} dias`} />
              <KpiCard label="LT médio (transporte)" value={media.transporte == null ? '—' : `${media.transporte} dias`} />
              <KpiCard label="Planejado médio" value={media.planejado == null ? '—' : `${media.planejado}`} sub="dias úteis (referência)" />
            </div>

            {media.n === 0 ? (
              <p className="text-stone-500 text-sm">
                Ainda não há entregas concluídas (com data de entrega registrada) para calcular o lead time.
              </p>
            ) : (
              <>
                <input
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar cliente…"
                  className="w-full rounded-lg bg-black/40 border border-stone-700 px-3 py-2 outline-none focus:border-duty-gold"
                />
                <div className="flex gap-2 text-xs">
                  <button
                    onClick={() => setOrdem('lento')}
                    className={`rounded-full px-3 py-1 border ${ordem === 'lento' ? 'border-duty-gold text-duty-gold' : 'border-stone-700 text-stone-400'}`}
                  >
                    Mais demoradas
                  </button>
                  <button
                    onClick={() => setOrdem('recente')}
                    className={`rounded-full px-3 py-1 border ${ordem === 'recente' ? 'border-duty-gold text-duty-gold' : 'border-stone-700 text-stone-400'}`}
                  >
                    Mais recentes
                  </button>
                </div>
                <p className="text-stone-500 text-xs">{lista.length} cliente(s) · última entrega de cada</p>
                <ul className="space-y-2">
                  {lista.map((p) => (
                    <li key={p.chave} className="bg-duty-card rounded-xl p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-stone-100 text-sm font-medium truncate">{p.nome_cliente || p.chave}</span>
                        <span className="text-sm font-semibold whitespace-nowrap" style={{ color: corLT(p.lt.total) }}>
                          {p.lt.total == null ? '—' : `${p.lt.total} dias`}
                        </span>
                      </div>
                      <div className="flex items-center justify-between mt-1 text-xs text-stone-500 gap-2">
                        <span className="truncate">Entrega {p.data_real_entrega} · {nomeCurtoVendedor(p.vendedor)}</span>
                        <span className="whitespace-nowrap">
                          transp. {p.lt.transporte == null ? '—' : `${p.lt.transporte}d`}
                          {p.lead_time != null ? ` · plan. ${p.lead_time}du` : ''}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                <p className="text-stone-500 text-xs leading-relaxed">
                  Verde = abaixo da média · vermelho = acima. “fat→entrega” conta dias corridos do
                  faturamento até a entrega; “transp.” conta da expedição até a entrega; “plan.” é o
                  lead time em dias úteis do relatório.
                </p>
              </>
            )}
          </>
        )}
      </div>
    </AppShell>
  )
}
