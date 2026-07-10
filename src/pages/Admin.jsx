import { useState } from 'react'
import { Link } from 'react-router-dom'
import * as XLSX from 'xlsx'
import { parseWorkbook } from '../lib/pedidosParser.js'
import { upsertPedidos } from '../lib/upsertPedidos.js'

export default function Admin() {
  const [status, setStatus] = useState('idle') // idle | lendo | gravando | ok | erro
  const [resumo, setResumo] = useState(null)
  const [erro, setErro] = useState('')

  async function handleFile(e) {
    const file = e.target.files?.[0]
    if (!file) return
    setErro(''); setResumo(null); setStatus('lendo')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array', cellDates: true })
      const { pedidos, ignorados } = parseWorkbook(wb)
      setStatus('gravando')
      const r = await upsertPedidos(pedidos)
      setResumo({ ...r, ignorados, quando: new Date().toLocaleString('pt-BR') })
      setStatus('ok')
    } catch (err) {
      setErro(err.message || 'Falha ao processar a planilha.')
      setStatus('erro')
    } finally {
      e.target.value = '' // permite reenviar o mesmo arquivo
    }
  }

  const busy = status === 'lendo' || status === 'gravando'

  return (
    <div className="min-h-full p-6 max-w-xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-duty-gold text-xl font-semibold">Carga de pedidos</h1>
        <Link to="/" className="text-stone-400 text-sm hover:text-duty-gold">← Voltar</Link>
      </div>

      <label className="block bg-duty-card rounded-2xl p-8 text-center cursor-pointer border border-stone-800 hover:border-duty-gold">
        <input type="file" accept=".xlsx,.xls" className="hidden" onChange={handleFile} disabled={busy} />
        <p className="text-stone-200 font-medium">Selecionar arquivo .xlsx</p>
        <p className="text-stone-500 text-sm mt-1">Aba “Base de pedidos”. Filtra os 7 vendedores do Norte e atualiza por chave.</p>
      </label>

      {busy && <p className="text-stone-400 mt-4">{status === 'lendo' ? 'Lendo a planilha…' : 'Gravando no banco…'}</p>}
      {status === 'erro' && <p className="text-status-late mt-4">{erro}</p>}

      {resumo && (
        <div className="bg-duty-card rounded-2xl p-6 mt-4 space-y-1">
          <p className="text-status-ok font-semibold">Carga concluída ✓</p>
          <p className="text-stone-300">Inseridos: <b>{resumo.inseridos}</b></p>
          <p className="text-stone-300">Atualizados: <b>{resumo.atualizados}</b></p>
          <p className="text-stone-300">Total gravado: <b>{resumo.total}</b></p>
          <p className="text-stone-500 text-sm">Ignorados (fora do Norte): {resumo.ignorados}</p>
          <p className="text-stone-500 text-sm">Atualização: {resumo.quando}</p>
        </div>
      )}
    </div>
  )
}
