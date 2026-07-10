import { statusColor } from '../lib/kpis.js'

export default function StatusBadge({ status }) {
  const color = statusColor(status)
  return (
    <span
      className="inline-block rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap"
      style={{ color, backgroundColor: `${color}22`, border: `1px solid ${color}55` }}
    >
      {status || '—'}
    </span>
  )
}
