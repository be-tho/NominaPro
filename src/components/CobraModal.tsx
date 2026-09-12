import { useEffect, useState } from 'react'
import { Check, X, Loader, AlertCircle, Plus, Trash2 } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import {
  recordPayment,
  deleteAllDays,
  fetchSettlementAdjustments,
  createSettlementAdjustment,
  deleteSettlementAdjustment,
  deleteAllSettlementAdjustments,
  type DayData,
  type SettlementAdjustment,
  type AdjustmentType,
} from '../lib/database'

interface CobraModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  monthlySalary: number
  days: DayData[]
}

const getDayTypeValue = (type: DayData['type']): number => {
  switch (type) {
    case 'full':
      return 1
    case 'half':
      return 0.5
    case 'holiday':
      return 1
    case 'holiday-worked':
      return 2
    case 'not-working':
      return 0
    default:
      return 0
  }
}

const getDayTypeLabel = (type: DayData['type']): string => {
  switch (type) {
    case 'full':
      return 'Día Completo'
    case 'half':
      return 'Medio Día'
    case 'holiday':
      return 'Feriado'
    case 'holiday-worked':
      return 'Feriado Trabajado'
    case 'not-working':
      return 'No Trabajado'
    default:
      return 'Sin registrar'
  }
}

export default function CobraModal({
  isOpen,
  onClose,
  onSuccess,
  monthlySalary,
  days,
}: CobraModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [adjustments, setAdjustments] = useState<SettlementAdjustment[]>([])
  const [newAdjustment, setNewAdjustment] = useState({
    label: '',
    amount: '',
    type: 'expense' as AdjustmentType,
  })

  useEffect(() => {
    if (!isOpen) return

    const loadAdjustments = async () => {
      try {
        const data = await fetchSettlementAdjustments()
        setAdjustments(data)
      } catch {
        setAdjustments([])
      }
    }

    loadAdjustments()
  }, [isOpen])

  if (!isOpen) return null

  const dailyValue = Math.round(monthlySalary / 26)
  const sortedDays = [...days].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  const totalDays = days.reduce((sum, day) => sum + getDayTypeValue(day.type), 0)
  const additionalTotal = days.reduce((sum, day) => {
    const amount = Number(day.additional_amount)
    return sum + (Number.isFinite(amount) && amount > 0 ? amount : 0)
  }, 0)
  const baseTotal = Math.round(totalDays * dailyValue) + additionalTotal
  const adjustmentsTotal = adjustments.reduce((sum, item) => {
    const amount = Number(item.amount)
    if (!Number.isFinite(amount)) return sum
    return sum - Math.abs(amount)
  }, 0)
  const totalPaid = baseTotal + adjustmentsTotal

  const firstDay = sortedDays.length > 0 ? new Date(sortedDays[0].date) : new Date()
  const lastDay = sortedDays.length > 0 ? new Date(sortedDays[sortedDays.length - 1].date) : new Date()

  const handleAddAdjustment = async () => {
    const label = newAdjustment.label.trim()
    const amount = Number(newAdjustment.amount)
    if (!label || !Number.isFinite(amount) || amount <= 0) {
      setError('Ingresá descripción y un monto válido para el ajuste.')
      return
    }

    try {
      setLoading(true)
      setError(null)
      await createSettlementAdjustment({
        label,
        amount,
        type: newAdjustment.type,
        date: format(new Date(), 'yyyy-MM-dd'),
        notes: null,
      })
      const next = await fetchSettlementAdjustments()
      setAdjustments(next)
      setNewAdjustment({ label: '', amount: '', type: 'expense' })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar el ajuste')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAdjustment = async (id?: string) => {
    if (!id) return

    try {
      setLoading(true)
      await deleteSettlementAdjustment(id)
      setAdjustments(prev => prev.filter(item => item.id !== id))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el ajuste')
    } finally {
      setLoading(false)
    }
  }

  const generateSettlementSummary = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) {
      setError('El navegador bloqueó la ventana de resumen. Permití pop-ups para guardar o imprimir el comprobante.')
      return
    }

    const dayRows = days.map(day => {
      const typeLabel = day.type ? getDayTypeLabel(day.type) : 'Sin registrar'
      const extraLabel = day.additional_title ? ` • ${day.additional_title}` : ''
      const extraAmount = Number(day.additional_amount)
      const extraValue = Number.isFinite(extraAmount) && extraAmount > 0 ? ` • $${extraAmount.toLocaleString('es-AR')}` : ''
      return `
        <tr>
          <td>${format(new Date(day.date), 'dd/MM/yyyy')}</td>
          <td>${typeLabel}</td>
          <td>${extraLabel || '-'}${extraValue}</td>
        </tr>
      `
    }).join('')

    const adjustmentRows = adjustments.map(item => `
      <tr>
        <td>${item.label}</td>
        <td>${item.type === 'advance' ? 'Adelanto' : item.type === 'expense' ? 'Gasto' : 'Descuento'}</td>
        <td>$${Number(item.amount).toLocaleString('es-AR')}</td>
      </tr>
    `).join('')

    const summaryDoc = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Resumen de cobro</title>
          <style>
            body { font-family: Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; padding: 32px; }
            .card { max-width: 900px; margin: 0 auto; background: white; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 8px 24px rgba(15, 23, 42, 0.08); }
            h1 { margin: 0 0 10px; font-size: 28px; }
            .meta { display: grid; grid-template-columns: repeat(2, minmax(180px, 1fr)); gap: 12px; margin: 20px 0; }
            .meta div { background: #f1f5f9; border-radius: 10px; padding: 12px; }
            .label { display: block; color: #475569; font-size: 12px; margin-bottom: 4px; text-transform: uppercase; }
            .value { font-size: 18px; font-weight: 700; }
            table { width: 100%; border-collapse: collapse; margin-top: 18px; }
            th, td { padding: 10px 12px; border-bottom: 1px solid #e2e8f0; text-align: left; font-size: 14px; }
            th { background: #f8fafc; }
            .total { margin-top: 24px; font-size: 22px; font-weight: 700; color: #15803d; }
            .footer { margin-top: 18px; font-size: 12px; color: #64748b; }
            @media print { body { background: white; } .card { box-shadow: none; border: none; } }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Resumen de cobro</h1>
            <div class="meta">
              <div>
                <span class="label">Período</span>
                <span class="value">${format(firstDay, 'dd/MM/yyyy')} - ${format(lastDay, 'dd/MM/yyyy')}</span>
              </div>
              <div>
                <span class="label">Fecha de cobro</span>
                <span class="value">${format(new Date(), 'dd/MM/yyyy')}</span>
              </div>
              <div>
                <span class="label">Días trabajados</span>
                <span class="value">${totalDays.toFixed(1)}</span>
              </div>
              <div>
                <span class="label">Valor diario</span>
                <span class="value">$${dailyValue.toLocaleString('es-AR')}</span>
              </div>
            </div>

            <h2>Detalle de días</h2>
            <table>
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Tipo</th>
                  <th>Adicional</th>
                </tr>
              </thead>
              <tbody>
                ${dayRows || '<tr><td colspan="3">Sin días cargados</td></tr>'}
              </tbody>
            </table>

            <h2>Gastos / adelantos / descuentos</h2>
            <table>
              <thead>
                <tr>
                  <th>Descripción</th>
                  <th>Tipo</th>
                  <th>Monto</th>
                </tr>
              </thead>
              <tbody>
                ${adjustmentRows || '<tr><td colspan="3">Sin ajustes</td></tr>'}
              </tbody>
            </table>

            <div class="total">
              Total final: $${totalPaid.toLocaleString('es-AR')}
            </div>

            <div class="footer">
              Base: $${baseTotal.toLocaleString('es-AR')} • Adicionales: $${additionalTotal.toLocaleString('es-AR')} • Ajustes: $${Math.abs(adjustmentsTotal).toLocaleString('es-AR')}
            </div>
          </div>
        </body>
      </html>
    `

    printWindow.document.open()
    printWindow.document.write(summaryDoc)
    printWindow.document.close()
    printWindow.focus()
  }

  const handleSettlement = async () => {
    setLoading(true)
    setError(null)

    try {
      await recordPayment({
        total_days: totalDays,
        daily_value: dailyValue,
        total_paid: totalPaid,
        adjustments_total: Math.abs(adjustmentsTotal),
        net_total: totalPaid,
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        period_start: format(firstDay, 'yyyy-MM-dd'),
        period_end: format(lastDay, 'yyyy-MM-dd'),
      })

      await deleteAllDays()
      await deleteAllSettlementAdjustments()
      setAdjustments([])
      generateSettlementSummary()
      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al procesar el cobro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 py-8">
      <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl border border-slate-700 p-8 w-full max-w-md shadow-2xl">
        {/* Header */}
        <h2 className="text-2xl font-bold text-white mb-6">Confirmar Cobro</h2>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {/* Settlement Details */}
        <div className="space-y-4 mb-6">
          {/* Period */}
          <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
            <p className="text-xs text-slate-400 mb-1">Período</p>
            <p className="text-white font-semibold">
              {format(firstDay, 'dd MMM', { locale: es })} - {format(lastDay, 'dd MMM yyyy', { locale: es })}
            </p>
          </div>

          {/* Metrics */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600">
              <p className="text-xs text-slate-400 mb-1">Días Trabajados</p>
              <p className="text-lg font-bold text-indigo-400">{totalDays.toFixed(1)}</p>
            </div>
            <div className="bg-slate-700/30 rounded-lg p-3 border border-slate-600">
              <p className="text-xs text-slate-400 mb-1">Valor por Día</p>
              <p className="text-lg font-bold text-slate-300">${dailyValue.toLocaleString('es-AR')}</p>
            </div>
          </div>

          <div className="bg-slate-700/30 rounded-lg p-4 border border-slate-600">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-slate-400">Ajustes del período</p>
              <span className="text-xs text-slate-300">${Math.abs(adjustmentsTotal).toLocaleString('es-AR')}</span>
            </div>

            <div className="space-y-2">
              <input
                value={newAdjustment.label}
                onChange={e => setNewAdjustment(prev => ({ ...prev, label: e.target.value }))}
                placeholder="Ej: Adelanto del viernes"
                className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
              />

              <div className="grid grid-cols-[1fr_auto] gap-2">
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={newAdjustment.amount}
                  onChange={e => setNewAdjustment(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="Monto"
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                />
                <select
                  value={newAdjustment.type}
                  onChange={e => setNewAdjustment(prev => ({ ...prev, type: e.target.value as AdjustmentType }))}
                  className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                >
                  <option value="expense">Gasto</option>
                  <option value="advance">Adelanto</option>
                  <option value="discount">Descuento</option>
                </select>
              </div>

              <button
                onClick={handleAddAdjustment}
                className="w-full flex items-center justify-center gap-2 bg-cyan-600 hover:bg-cyan-500 text-white font-medium py-2 rounded-lg transition-colors"
              >
                <Plus className="w-4 h-4" />
                Agregar ajuste
              </button>
            </div>

            {adjustments.length > 0 && (
              <div className="mt-3 space-y-2">
                {adjustments.map(item => (
                  <div key={item.id} className="flex items-center justify-between bg-slate-800 rounded-lg px-3 py-2 border border-slate-700">
                    <div>
                      <p className="text-sm text-white">{item.label}</p>
                      <p className="text-[11px] text-slate-400 capitalize">
                        {item.type === 'advance' ? 'Adelanto' : item.type === 'expense' ? 'Gasto' : 'Descuento'}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-red-300">-${Number(item.amount).toLocaleString('es-AR')}</span>
                      <button onClick={() => handleDeleteAdjustment(item.id)} className="text-slate-400 hover:text-red-400">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Total */}
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-4 border border-green-500/30">
            <p className="text-xs text-slate-400 mb-1">Total a Cobrar</p>
            <p className="text-3xl font-bold text-green-400">${totalPaid.toLocaleString('es-AR')}</p>
            {additionalTotal > 0 && (
              <p className="mt-2 text-xs text-emerald-300">
                Incluye adicionales por día: ${additionalTotal.toLocaleString('es-AR')}
              </p>
            )}
            {adjustments.length > 0 && (
              <p className="mt-1 text-xs text-red-300">
                Ajustes descontados: ${Math.abs(adjustmentsTotal).toLocaleString('es-AR')}
              </p>
            )}
          </div>
        </div>

        {/* Warning */}
        <div className="mb-6 p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-lg">
          <p className="text-xs text-yellow-600">
            ⚠️ Después de confirmar, se resetearán los días guardados para comenzar un nuevo período.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Cancelar
          </button>
          <button
            onClick={handleSettlement}
            disabled={loading || totalPaid === 0}
            className="flex-1 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-500 hover:to-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="w-4 h-4 animate-spin" />
                Procesando...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Confirmar Cobro
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
