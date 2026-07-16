import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const sample = [
  { chave: '1', nome_cliente: 'Cliente A', status_transito: 'Entregue no prazo', valor_faturado: 100, peso: 10, estado: 'AM', cidade: 'Manaus' },
  { chave: '2', nome_cliente: 'Cliente B', status_transito: 'Entregue em atraso', valor_faturado: 200, peso: 20, estado: 'PA', cidade: 'Belém' },
  { chave: '3', nome_cliente: 'Cliente C', status_transito: 'Em trânsito', valor_faturado: 50, peso: 5, estado: 'AM', cidade: 'Manaus' },
  { chave: '4', nome_cliente: 'Cliente D', status_transito: 'Atrasado', valor_faturado: 30, peso: 3, estado: 'AM', cidade: 'Parintins' },
  { chave: '5', nome_cliente: 'Cliente E', status_transito: 'Aguarda expedição', valor_faturado: 10, peso: 1, estado: 'RR', cidade: 'Boa Vista' },
]

vi.mock('../hooks/usePedidos.js', () => ({
  usePedidos: () => ({ pedidos: sample, loading: false, error: '' }),
}))
vi.mock('../components/AppShell.jsx', () => ({
  default: ({ children }) => <div>{children}</div>,
}))
vi.mock('../components/StatusChart.jsx', () => ({
  default: () => <div data-testid="chart" />,
}))
vi.mock('../context/AuthProvider.jsx', () => ({
  useAuth: () => ({ isAdmin: false }),
}))
vi.mock('../components/CargaBanner.jsx', () => ({
  default: () => null,
}))

import Dashboard from './Dashboard.jsx'

describe('Dashboard', () => {
  it('renderiza os KPIs a partir dos dados', () => {
    render(<MemoryRouter><Dashboard /></MemoryRouter>)
    expect(screen.getByText('OTD (no prazo)')).toBeInTheDocument()
    expect(screen.getByText('50%')).toBeInTheDocument() // 1 no prazo / (1+1)
    expect(screen.getByText('R$ 390,00')).toBeInTheDocument() // soma faturado
    // KPI "Atrasados" com valor 2 (Atrasado + Entregue em atraso)
    expect(screen.getByText('Atrasados')).toBeInTheDocument()
    // Cliente D (Atrasado) deve aparecer na lista de alertas
    expect(screen.getByText('Cliente D')).toBeInTheDocument()
  })
})
