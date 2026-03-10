import { useState } from 'react'
import { Check, X, Loader, AlertCircle } from 'lucide-react'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'
import { recordPayment, deleteAllDays, type DayData } from '../lib/database'

interface CobraModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  monthlySalary: number
  days: DayData[]
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

  if (!isOpen) return null

  // Calculate metrics
  const dailyValue = Math.round(monthlySalary / 26)
  const sortedDays = [...days].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
  
  const getDayTypeValue = (type: string | null): number => {
    if (!type) return 0
    switch (type) {
      case 'full': return 1
      case 'half': return 0.5
      case 'extra': return 1.5
      case 'free': return 0
      default: return 0
    }
  }

  const totalDays = days.reduce((sum, day) => sum + getDayTypeValue(day.type), 0)
  const totalPaid = Math.round(totalDays * dailyValue)
  
  const firstDay = sortedDays.length > 0 ? new Date(sortedDays[0].date) : new Date()
  const lastDay = sortedDays.length > 0 ? new Date(sortedDays[sortedDays.length - 1].date) : new Date()

  const handleSettlement = async () => {
    setLoading(true)
    setError(null)

    try {
      // Record the payment
      await recordPayment({
        total_days: totalDays,
        daily_value: dailyValue,
        total_paid: totalPaid,
        payment_date: format(new Date(), 'yyyy-MM-dd'),
        period_start: format(firstDay, 'yyyy-MM-dd'),
        period_end: format(lastDay, 'yyyy-MM-dd'),
      })

      // Delete all days to reset for next period
      await deleteAllDays()

      // Call success callback to refresh UI
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

          {/* Total */}
          <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-lg p-4 border border-green-500/30">
            <p className="text-xs text-slate-400 mb-1">Total a Cobrar</p>
            <p className="text-3xl font-bold text-green-400">${totalPaid.toLocaleString('es-AR')}</p>
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
