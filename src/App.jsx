import { lazy, Suspense } from 'react'
import { HashRouter, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './context/AuthProvider.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import AdminRoute from './components/AdminRoute.jsx'
import Login from './pages/Login.jsx'
import Home from './pages/Home.jsx'

// Admin importa a biblioteca pesada de Excel (xlsx); carrega sob demanda
// para o RCA (mobile) nao baixar esse peso.
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
          <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <Suspense fallback={<Loading />}>
                  <Admin />
                </Suspense>
              </AdminRoute>
            }
          />
        </Routes>
      </HashRouter>
    </AuthProvider>
  )
}
