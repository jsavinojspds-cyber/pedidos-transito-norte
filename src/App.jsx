import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AdminRoute from './components/AdminRoute.jsx'
import Login from './pages/Login.jsx'
import Dashboard from './pages/Dashboard.jsx'
import Pedidos from './pages/Pedidos.jsx'
import PedidoDetalhe from './pages/PedidoDetalhe.jsx'
import Comparativo from './pages/Comparativo.jsx'
import LeadTime from './pages/LeadTime.jsx'

const Admin = lazy(() => import('./pages/Admin.jsx'))
const Loading = () => (
  <div className="min-h-full flex items-center justify-center text-stone-400">Carregando…</div>
)

export default function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
          <Route path="/pedidos" element={<ProtectedRoute><Pedidos /></ProtectedRoute>} />
          <Route path="/pedido/:chave" element={<ProtectedRoute><PedidoDetalhe /></ProtectedRoute>} />
          <Route path="/leadtime" element={<ProtectedRoute><LeadTime /></ProtectedRoute>} />
          <Route path="/comparativo" element={<AdminRoute><Comparativo /></AdminRoute>} />
          <Route
            path="/admin"
            element={<AdminRoute><Suspense fallback={<Loading />}><Admin /></Suspense></AdminRoute>}
          />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
