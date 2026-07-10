import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import AppShell from '../components/AppShell.jsx'
import { usePedidos } from '../hooks/usePedidos.js'
import { kpisPorVendedor } from '../lib/kpis.js'
import { formatBRL } from '../lib/format.js'

export default function Comparativo() {
  const { pedidos, loading, error } = usePedidos()
  const dados = useMemo(() => kpisPorVendedor(pedidos), [pedidos])
  const barras = dados.map((d) => ({
    nome: d.nome,
    atrasados: d.atrasados,
    otd: d.otd == null ? 0 : Math.round(d.otd * 100),
  }))

  return (
    <AppShell>
      <div className="p-4 space-y-5">
        <h1 className="text-duty-gold text-lg font-semibold">Comparativo por RCA</h1>
        {loading && <p className="text-stone-400">Carregando…</p>}
        {error && <p className="text-status-late">Erro: {error}</p>}
        {!loading && !error && dados.length === 0 && <p className="text-stone-500">Sem dados.</p>}
        {!loading && !error && dados.length > 0 && (
          <>
            <div className="bg-duty-card rounded-2xl p-3">
              <p className="text-stone-300 text-sm font-medium mb-2">Atrasados por RCA</p>
              <div className="w-full h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={barras} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                    <XAxis dataKey="nome" tick={{ fill: '#a8a29e', fontSize: 11 }} interval={0} angle={-20} textAnchor="end" height={50} />
                    <YAxis allowDecimals={false} tick={{ fill: '#a8a29e', fontSize: 11 }} />
                    <Tooltip contentStyle={{ background: '#16161a', border: '1px solid #333', borderRadius: 8, color: '#eee' }} />
                    <Bar dataKey="atrasados" radius={[4, 4, 0, 0]}>
                      {barras.map((b) => <Cell key={b.nome} fill={b.atrasados > 0 ? '#ef4444' : '#3b82f6'} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-duty-card rounded-2xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-stone-400 text-left">
                    <th className="p-3">RCA</th>
                    <th className="p-3 text-right">Pedidos</th>
                    <th className="p-3 text-right">OTD</th>
                    <th className="p-3 text-right">Atras.</th>
                    <th className="p-3 text-right">Trâns.</th>
                    <th className="p-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {dados.map((d) => (
                    <tr key={d.vendedor} className="border-t border-stone-800">
                      <td className="p-3 text-stone-100">{d.nome}</td>
                      <td className="p-3 text-right text-stone-300">{d.total}</td>
                      <td className="p-3 text-right text-stone-300">{d.otd == null ? '—' : `${Math.round(d.otd * 100)}%`}</td>
                      <td className={`p-3 text-right ${d.atrasados > 0 ? 'text-status-late' : 'text-stone-300'}`}>{d.atrasados}</td>
                      <td className="p-3 text-right text-stone-300">{d.emTransito}</td>
                      <td className="p-3 text-right text-stone-300">{formatBRL(d.valor)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </AppShell>
  )
}
