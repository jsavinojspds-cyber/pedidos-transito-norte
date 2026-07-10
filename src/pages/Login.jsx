import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthProvider.jsx'

export default function Login() {
  const { signIn } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')
    setBusy(true)
    const { error } = await signIn(email, password)
    setBusy(false)
    if (error) { setError('E-mail ou senha inválidos.'); return }
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-full flex items-center justify-center p-6">
      <form onSubmit={handleSubmit} className="bg-duty-card w-full max-w-sm rounded-2xl p-8 space-y-4">
        <h1 className="text-duty-gold text-xl font-semibold text-center">Pedidos em Trânsito — Norte</h1>
        <input
          type="email" required placeholder="E-mail" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg bg-black/40 border border-stone-700 px-3 py-2 outline-none focus:border-duty-gold"
        />
        <input
          type="password" required placeholder="Senha" value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg bg-black/40 border border-stone-700 px-3 py-2 outline-none focus:border-duty-gold"
        />
        {error && <p className="text-status-late text-sm">{error}</p>}
        <button
          type="submit" disabled={busy}
          className="w-full rounded-lg bg-duty-gold text-black font-semibold py-2 disabled:opacity-60"
        >
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  )
}
