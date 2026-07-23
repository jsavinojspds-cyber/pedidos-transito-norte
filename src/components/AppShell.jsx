import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider.jsx'

export default function AppShell({ children }) {
  const { isAdmin, signOut } = useAuth()
  const { pathname } = useLocation()
  const tab = (to, label) => (
    <Link
      to={to}
      className={`flex-1 text-center py-3 text-sm ${pathname === to ? 'text-duty-gold' : 'text-stone-400'}`}
    >
      {label}
    </Link>
  )
  return (
    <div className="min-h-full flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-stone-800">
        <div className="flex items-baseline gap-2">
          <span className="wordmark text-duty-gold">DUTY</span>
          <span className="text-stone-500 text-xs">Norte</span>
        </div>
        <div className="flex items-center gap-3">
          {isAdmin && <Link to="/admin" className="text-stone-400 text-sm hover:text-duty-gold">Carga</Link>}
          <button onClick={signOut} className="text-stone-500 text-sm hover:text-duty-gold">Sair</button>
        </div>
      </header>
      <main className="flex-1 overflow-y-auto">{children}</main>
      <nav className="flex border-t border-stone-800 bg-duty-bg">
        {tab('/', 'Dashboard')}
        {tab('/pedidos', 'Pedidos')}
        {tab('/leadtime', 'Lead time')}
        {isAdmin && tab('/comparativo', 'Comparativo')}
      </nav>
    </div>
  )
}
