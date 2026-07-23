import { useMemo } from 'react'
import AppShell from '../components/AppShell.jsx'
import KpiCard from '../components/KpiCard.jsx'
import { usePedidos } from '../hooks/usePedidos.js'
import { mediaFases, transportePorTransportadora } from '../lib/ciclo.js'

const FASES = [
  { key: 'preparacao', nome: 'Preparação', desc: 'faturamento → expedição', cor: '#3b82f6' },
  { key: 'transporte', nome: 'Transporte', desc: 'expedição → chegada', cor: '#f59e0b' },
  { key: 'descarga', nome: 'Descarga', desc: 'chegada → entrega', cor: '#22c55e' },
]

export default function Ciclo() {
  const { pedidos, loading, error } = usePedidos()
  const m = useMemo(() => mediaFases(pedidos), [pedidos])
  const transp = useMemo(() => transportePorTransportadora(pedidos), [pedidos])

  const soma = FASES.reduce((s, f) => s + (m[f.key].media || 0), 0)
  const gargalo = FASES.reduce((g, f) => ((m[f.key].media || 0) > (m[g.key].media || 0) ? f : g), FASES[0])
  const maxTransp = Math.max(1, ...transp.map((t) => t.media || 0))

  return (
    <AppShell>
      <div className="p-4 space-y-5">
        <h1 className="text-duty-gold text-lg font-semibold">Ciclo do pedido</h1>
        {loading && <p className="text-stone-400">Carregando…</p>}
        {error && <p className="text-status-late">Erro: {error}</p>}
        {!loading && !error && (
          <>
            <div className="bg-duty-card rounded-2xl p-4">
              <p className="text-stone-300 text-sm font-medium mb-3">Onde o tempo vai (média de cada fase)</p>
              {soma > 0 ? (
                <>
                  <div className="flex w-full h-6 rounded-lg overflow-hidden bg-stone-800">
                    {FASES.map((f) => {
                      const v = m[f.key].media || 0
                      if (v <= 0) return null
                      return <div key={f.key} title={`${f.nome}: ${v}d`} style={{ width: `${(v / soma) * 100}%`, background: f.cor }} />
                    })}
                  </div>
                  <ul className="mt-3 space-y-1">
                    {FASES.map((f) => (
                      <li key={f.key} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ background: f.cor }} />
                        <span className="text-stone-300">{f.nome}</span>
                        <span className="text-stone-500 hidden xs:inline">({f.desc})</span>
                        <span className="ml-auto text-stone-100 font-semibold">{m[f.key].media == null ? '—' : `${m[f.key].media} d`}</span>
                      </li>
                    ))}
                  </ul>
                </>
              ) : <p className="text-stone-500 text-sm">Sem dados suficientes.</p>}
            </div>

            {soma > 0 && (
              <div className="bg-duty-card rounded-2xl p-4 border-l-4" style={{ borderColor: gargalo.cor }}>
                <p className="text-stone-400 text-xs">Gargalo do ciclo</p>
                <p className="text-lg font-semibold" style={{ color: gargalo.cor }}>
                  {gargalo.nome} — {m[gargalo.key].media} dias
                </p>
                <p className="text-stone-500 text-xs mt-1">
                  {Math.round(((m[gargalo.key].media || 0) / soma) * 100)}% do ciclo está aqui ({gargalo.desc}).
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="Preparação (fat→exp)" value={m.preparacao.media == null ? '—' : `${m.preparacao.media} d`} sub={`${m.preparacao.n} pedidos`} />
              <KpiCard label="Transporte (exp→cheg)" value={m.transporte.media == null ? '—' : `${m.transporte.media} d`} danger={gargalo.key === 'transporte'} sub={`${m.transporte.n} pedidos`} />
              <KpiCard label="Descarga (cheg→ent)" value={m.descarga.media == null ? '—' : `${m.descarga.media} d`} sub={`${m.descarga.n} pedidos`} />
              <KpiCard label="Total (fat→entrega)" value={m.total.media == null ? '—' : `${m.total.media} d`} sub={`${m.total.n} entregas`} />
            </div>

            {transp.length > 0 && (
              <div className="bg-duty-card rounded-2xl p-4">
                <p className="text-stone-300 text-sm font-medium mb-1">Transporte por transportadora</p>
                <p className="text-stone-500 text-xs mb-3">dias médios da expedição até a chegada</p>
                <div className="space-y-2">
                  {transp.map((t) => (
                    <div key={t.transportador}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-stone-300 truncate">{t.transportador}</span>
                        <span className="text-stone-400 whitespace-nowrap">{t.media} d · {t.n}</span>
                      </div>
                      <div className="h-2 rounded bg-stone-800 overflow-hidden">
                        <span className="block h-full" style={{ width: `${((t.media || 0) / maxTransp) * 100}%`, background: '#f59e0b' }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-stone-500 text-xs leading-relaxed">
              Fases em dias corridos entre as datas do relatório. “Preparação” existe para quase todos
              os pedidos; “Transporte”, “Descarga” e “Total” só para os que já têm chegada/entrega.
            </p>
          </>
        )}
      </div>
    </AppShell>
  )
}
