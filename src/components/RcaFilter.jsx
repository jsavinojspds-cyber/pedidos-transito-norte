import { nomeCurtoVendedor } from '../lib/kpis.js'

export default function RcaFilter({ vendedores, value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg bg-black/40 border border-stone-700 px-3 py-2 text-sm focus:border-duty-gold outline-none"
    >
      <option value="">Todos os RCAs</option>
      {vendedores.map((v) => <option key={v} value={v}>{nomeCurtoVendedor(v)}</option>)}
    </select>
  )
}
