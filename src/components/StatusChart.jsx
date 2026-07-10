import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { statusColor } from '../lib/kpis.js'

export default function StatusChart({ data }) {
  if (!data.length) return <p className="text-stone-500 text-sm">Sem dados.</p>
  return (
    <div className="w-full h-56">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="count" nameKey="status" innerRadius={55} outerRadius={85} paddingAngle={2}>
            {data.map((d) => <Cell key={d.status} fill={statusColor(d.status)} />)}
          </Pie>
          <Tooltip
            contentStyle={{ background: '#16161a', border: '1px solid #333', borderRadius: 8, color: '#eee' }}
            formatter={(v, n) => [v, n]}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  )
}
