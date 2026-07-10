export default function KpiCard({ label, value, danger = false, sub }) {
  return (
    <div className="bg-duty-card rounded-2xl p-4">
      <p className="text-stone-400 text-xs">{label}</p>
      <p className={`text-2xl font-semibold mt-1 ${danger ? 'text-status-late' : 'text-stone-100'}`}>{value}</p>
      {sub && <p className="text-stone-500 text-xs mt-1">{sub}</p>}
    </div>
  )
}
