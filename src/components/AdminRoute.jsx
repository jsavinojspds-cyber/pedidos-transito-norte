import { Navigate } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider.jsx'

export default function AdminRoute({ children }) {
  const { user, isAdmin, loading } = useAuth()
  if (loading) {
    return <div className="min-h-full flex items-center justify-center text-stone-400">Carregando…</div>
  }
  if (!user) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/" replace />
  return children
}
