import { useMemo, useState } from 'react'
import AppShell from '../components/AppShell.jsx'
import KpiCard from '../components/KpiCard.jsx'
import StatusChart from '../components/StatusChart.jsx'
import AlertList from '../components/AlertList.jsx'
import RcaFilter from '../components/RcaFilter.jsx'
import { usePedidos } from '../hooks/usePedidos.js'
import { useAuth } from '../context/AuthProvider.jsx'
import { computeKpis, statusCounts, getAlertas, statusColor } from '../lib/kpis.js'
import { formatBRL, formatKg } from '../lib/format.js'

export default function Dashboard() {
  const { pedidos, loading, error } = usePedidos()
  const { isAdmin } = useAuth()
  const [rca, setRca] = useState('')

  const vendedores = useMemo(
    () => [...new Set(pedidos.map((p) => p.vendedor).filter(Boolean))].sort(),
    [pedidos],
  )
  const baseData = useMemo(
    () => (rca ? pedidos.filter((p) => p.vendedor === rca) : pedidos),
    [pedidos, rca],
  )
  const kpis = useMemo(() => computeKpis(baseData), [baseData])
  const counts = useMemo(() => statusCounts(baseData), [baseData])
  const alertas = useMemo(() => getAlertas(baseData), [baseData])

  return (
    <AppShell>
      <div className="p-4 space-y-5">
        {loading && <p className="text-stone-400">Carregando…</p>}
        {error && <p className="text-status-late">Erro ao carregar: {error}</p>}
        {!loading && !error && (
          <>
            {isAdmin && vendedores.length > 1 && (
              <RcaFilter vendedores={vendedores} value={rca} onChange={setRca} />
            )}
            <div className="grid grid-cols-2 gap-3">
              <KpiCard label="OTD (no prazo)" value={kpis.otd === null ? '—' : `${Math.round(kpis.otd * 100)}%`} />
              <KpiCard label="Em trânsito" value={kpis.emTransito} />
              <KpiCard label="Atrasados" value={kpis.atrasados} danger={kpis.atrasados > 0} />
              <KpiCard label="Aguard. expedição" value={kpis.aguardandoExpedicao} />
              <KpiCard label="Valor faturado" value={formatBRL(kpis.valorTotal)} />
              <KpiCard label="Peso total" value={formatKg(kpis.pesoTotal)} />
            </div>

            <section>
              <h2 className="text-stone-300 text-sm font-medium mb-2">Por status</h2>
              <div className="bg-duty-card rounded-2xl p-3">
                <StatusChart data={counts} />
                <ul className="mt-3 grid grid-cols-2 gap-1">
                  {counts.map((c) => (
                    <li key={c.status} className="flex items-center gap-2 text-xs text-stone-400">
                      <span className="inline-block w-2 h-2 rounded-full" style={{ background: statusColor(c.status) }} />
                      <span className="truncate">{c.status}</span>
                      <span className="ml-auto text-stone-200">{c.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section>
              <h2 className="text-stone-300 text-sm font-medium mb-2">Alertas ({alertas.length})</h2>
              <AlertList pedidos={alertas} />
            </section>
          </>
        )}
      </div>
    </AppShell>
  )
}
