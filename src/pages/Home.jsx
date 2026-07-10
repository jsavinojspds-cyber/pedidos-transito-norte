import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider.jsx'

export default function Home() {
  const { isAdmin, signOut } = useAuth()
  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <div className="bg-duty-card rounded-2xl p-8 text-center space-y-4">
        <h1 className="text-duty-gold text-2xl font-semibold">Pedidos em Trânsito — Norte</h1>
        <p className="text-stone-400">Você está autenticado. Dashboard vem no Plano 3.</p>
        {isAdmin && (
          <Link to="/admin" className="inline-block rounded-lg bg-duty-gold text-black font-semibold px-4 py-2">
            Área do admin (carga)
          </Link>
        )}
        <button onClick={signOut} className="block mx-auto text-stone-500 text-sm hover:text-duty-gold">Sair</button>
      </div>
    </div>
  )
}
