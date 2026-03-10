import { useState, useEffect } from 'react'
import { X, Loader, Calendar } from 'lucide-react'
import { fetchPaymentHistory, type PaymentRecord } from '../lib/database'
import { format } from 'date-fns'
import { es } from 'date-fns/locale'

interface PaymentHistoryModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function PaymentHistoryModal({ isOpen, onClose }: PaymentHistoryModalProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!isOpen) return

    const loadPayments = async () => {
      setLoading(true)
      setError(null)
      try {
        const data = await fetchPaymentHistory()
        setPayments(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar el historial')
      } finally {
        setLoading(false)
      }
    }

    loadPayments()
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4 py-8">
      <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-white">Historial de Cobros</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
            <p className="text-sm text-red-400">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader className="w-8 h-8 text-indigo-500 animate-spin" />
          </div>
        ) : payments.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-400 mb-2">No hay cobros registrados aún</p>
            <p className="text-sm text-slate-500">Realiza tu primer cobro para ver el historial</p>
          </div>
        ) : (
          <div className="space-y-4">
            {payments.map((payment) => (
              <div key={payment.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 hover:border-slate-500 transition-colors">
                {/* Date Row */}
                <div className="flex items-center gap-2 mb-3">
                  <Calendar className="w-4 h-4 text-slate-400" />
                  <span className="text-sm text-slate-400">
                    {format(new Date(payment.payment_date), 'dd/MM/yyyy', { locale: es })}
                  </span>
                  <span className="text-xs text-slate-500">
                    Período: {format(new Date(payment.period_start), 'dd/MM', { locale: es })} - {format(new Date(payment.period_end), 'dd/MM/yyyy', { locale: es })}
                  </span>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-3 gap-4 mb-3">
                  <div className="bg-slate-800/50 rounded p-2">
                    <p className="text-xs text-slate-400">Días Trabajados</p>
                    <p className="text-lg font-bold text-indigo-400">{payment.total_days.toFixed(1)}</p>
                  </div>
                  <div className="bg-slate-800/50 rounded p-2">
                    <p className="text-xs text-slate-400">Valor Día</p>
                    <p className="text-lg font-bold text-slate-300">
                      ${payment.daily_value.toLocaleString('es-AR')}
                    </p>
                  </div>
                  <div className="bg-green-500/10 rounded p-2 border border-green-500/30">
                    <p className="text-xs text-slate-400">Total Cobrado</p>
                    <p className="text-lg font-bold text-green-400">
                      ${payment.total_paid.toLocaleString('es-AR')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-6 pt-6 border-t border-slate-600">
          <button
            onClick={onClose}
            className="w-full bg-gradient-to-r from-slate-700 to-slate-800 hover:from-slate-600 hover:to-slate-700 text-white font-semibold py-2 px-4 rounded-lg transition-all"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
