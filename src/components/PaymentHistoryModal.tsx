import { useState, useEffect } from 'react'
import { X, Loader, Calendar, Pencil, Trash2, Check } from 'lucide-react'
import {
  deletePaymentHistory,
  fetchPaymentHistory,
  updatePaymentHistory,
  type PaymentRecord,
} from '../lib/database'
import { format, parseISO } from 'date-fns'
import { es } from 'date-fns/locale'

interface PaymentHistoryModalProps {
  isOpen: boolean
  onClose: () => void
}

interface PaymentEditForm {
  payment_date: string
  period_start: string
  period_end: string
  total_days: string
  daily_value: string
  total_paid: string
  adjustments_total: string
  net_total: string
}

export default function PaymentHistoryModal({ isOpen, onClose }: PaymentHistoryModalProps) {
  const [payments, setPayments] = useState<PaymentRecord[]>([])
  const [loading, setLoading] = useState(false)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<PaymentEditForm | null>(null)

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

  const startEditing = (payment: PaymentRecord) => {
    if (!payment.id) return
    setError(null)
    setEditingId(payment.id)
    setEditForm({
      payment_date: payment.payment_date,
      period_start: payment.period_start,
      period_end: payment.period_end,
      total_days: String(payment.total_days),
      daily_value: String(payment.daily_value),
      total_paid: String(payment.total_paid),
      adjustments_total: String(payment.adjustments_total ?? 0),
      net_total: String(payment.net_total ?? payment.total_paid),
    })
  }

  const handleSave = async (id: string) => {
    if (!editForm) return
    const totalDays = Number(editForm.total_days)
    const dailyValue = Number(editForm.daily_value)
    const totalPaid = Number(editForm.total_paid)
    const adjustmentsTotal = Number(editForm.adjustments_total)
    const netTotal = Number(editForm.net_total)

    if (!editForm.payment_date || !editForm.period_start || !editForm.period_end || editForm.period_start > editForm.period_end) {
      setError('Revisá las fechas: el inicio del período no puede superar el final.')
      return
    }
    if (
      !Number.isFinite(totalDays) || totalDays < 0 ||
      !Number.isFinite(dailyValue) || dailyValue < 0 ||
      !Number.isFinite(totalPaid) ||
      !Number.isFinite(adjustmentsTotal) || adjustmentsTotal < 0 ||
      !Number.isFinite(netTotal)
    ) {
      setError('Revisá los importes y la cantidad de días.')
      return
    }

    setSavingId(id)
    setError(null)
    try {
      const updated = await updatePaymentHistory(id, {
        payment_date: editForm.payment_date,
        period_start: editForm.period_start,
        period_end: editForm.period_end,
        total_days: totalDays,
        daily_value: dailyValue,
        total_paid: totalPaid,
        adjustments_total: adjustmentsTotal,
        net_total: netTotal,
      })
      setPayments(current => current.map(payment =>
        payment.id === id ? { ...payment, ...updated, days: payment.days } : payment
      ))
      setEditingId(null)
      setEditForm(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo modificar el cobro')
    } finally {
      setSavingId(null)
    }
  }

  const handleDelete = async (payment: PaymentRecord) => {
    if (!payment.id || !window.confirm('¿Eliminar este cobro del historial? Esta acción no se puede deshacer.')) return
    setSavingId(payment.id)
    setError(null)
    try {
      await deletePaymentHistory(payment.id)
      setPayments(current => current.filter(item => item.id !== payment.id))
      if (editingId === payment.id) {
        setEditingId(null)
        setEditForm(null)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo eliminar el cobro')
    } finally {
      setSavingId(null)
    }
  }

  const updateField = (field: keyof PaymentEditForm, value: string) => {
    setEditForm(current => current ? { ...current, [field]: value } : current)
  }

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
            {payments.map(payment => {
              const isEditing = editingId === payment.id && editForm !== null
              const isSaving = savingId === payment.id
              return (
                <div key={payment.id} className="bg-slate-700/50 rounded-lg p-4 border border-slate-600 hover:border-slate-500 transition-colors">
                  {isEditing && editForm ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <label className="text-xs text-slate-400">Fecha de cobro
                          <input type="date" value={editForm.payment_date} onChange={event => updateField('payment_date', event.target.value)} className="mt-1 w-full rounded border border-slate-600 bg-slate-800 p-2 text-sm text-white" />
                        </label>
                        <label className="text-xs text-slate-400">Desde
                          <input type="date" value={editForm.period_start} onChange={event => updateField('period_start', event.target.value)} className="mt-1 w-full rounded border border-slate-600 bg-slate-800 p-2 text-sm text-white" />
                        </label>
                        <label className="text-xs text-slate-400">Hasta
                          <input type="date" value={editForm.period_end} onChange={event => updateField('period_end', event.target.value)} className="mt-1 w-full rounded border border-slate-600 bg-slate-800 p-2 text-sm text-white" />
                        </label>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <label className="text-xs text-slate-400">Días
                          <input type="number" min="0" step="0.5" value={editForm.total_days} onChange={event => updateField('total_days', event.target.value)} className="mt-1 w-full rounded border border-slate-600 bg-slate-800 p-2 text-sm text-white" />
                        </label>
                        <label className="text-xs text-slate-400">Valor día
                          <input type="number" min="0" step="0.01" value={editForm.daily_value} onChange={event => updateField('daily_value', event.target.value)} className="mt-1 w-full rounded border border-slate-600 bg-slate-800 p-2 text-sm text-white" />
                        </label>
                        <label className="text-xs text-slate-400">Ajustes
                          <input type="number" min="0" step="0.01" value={editForm.adjustments_total} onChange={event => updateField('adjustments_total', event.target.value)} className="mt-1 w-full rounded border border-slate-600 bg-slate-800 p-2 text-sm text-white" />
                        </label>
                        <label className="text-xs text-slate-400">Total cobrado / neto
                          <input type="number" step="0.01" value={editForm.total_paid} onChange={event => {
                            updateField('total_paid', event.target.value)
                            updateField('net_total', event.target.value)
                          }} className="mt-1 w-full rounded border border-slate-600 bg-slate-800 p-2 text-sm text-white" />
                        </label>
                      </div>
                      {editForm.total_paid !== editForm.net_total && (
                        <label className="block text-xs text-slate-400">Neto guardado
                          <input type="number" step="0.01" value={editForm.net_total} onChange={event => updateField('net_total', event.target.value)} className="mt-1 w-full max-w-xs rounded border border-slate-600 bg-slate-800 p-2 text-sm text-white" />
                        </label>
                      )}
                      <div className="flex gap-2">
                        <button onClick={() => handleSave(payment.id!)} disabled={isSaving} className="inline-flex items-center gap-2 rounded bg-emerald-700 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-600 disabled:opacity-50">
                          {isSaving ? <Loader className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Guardar
                        </button>
                        <button onClick={() => { setEditingId(null); setEditForm(null); setError(null) }} disabled={isSaving} className="rounded bg-slate-600 px-3 py-2 text-sm text-white hover:bg-slate-500 disabled:opacity-50">Cancelar</button>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span className="text-sm text-slate-300">Cobrado {format(parseISO(payment.payment_date), 'dd/MM/yyyy', { locale: es })}</span>
                          <span className="text-xs text-slate-400">
                            Período: {format(parseISO(payment.period_start), 'dd/MM/yyyy', { locale: es })} - {format(parseISO(payment.period_end), 'dd/MM/yyyy', { locale: es })}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEditing(payment)} disabled={!payment.id || savingId !== null} title="Editar cobro" aria-label="Editar cobro" className="rounded p-2 text-slate-300 hover:bg-slate-600 hover:text-white disabled:opacity-50">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button onClick={() => handleDelete(payment)} disabled={!payment.id || savingId !== null} title="Eliminar cobro" aria-label="Eliminar cobro" className="rounded p-2 text-red-300 hover:bg-red-500/20 hover:text-red-200 disabled:opacity-50">
                            {isSaving ? <Loader className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>

                      <div className="mb-3 grid grid-cols-3 gap-4">
                        <div className="rounded bg-slate-800/50 p-2">
                          <p className="text-xs text-slate-400">Días trabajados</p>
                          <p className="text-lg font-bold text-indigo-400">{payment.total_days.toFixed(1)}</p>
                        </div>
                        <div className="rounded bg-slate-800/50 p-2">
                          <p className="text-xs text-slate-400">Valor día</p>
                          <p className="text-lg font-bold text-slate-300">${payment.daily_value.toLocaleString('es-AR')}</p>
                        </div>
                        <div className="rounded border border-green-500/30 bg-green-500/10 p-2">
                          <p className="text-xs text-slate-400">Total cobrado</p>
                          <p className="text-lg font-bold text-green-400">${payment.total_paid.toLocaleString('es-AR')}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-400">
                        Ajustes: ${Number(payment.adjustments_total ?? 0).toLocaleString('es-AR')}
                        {' · Neto guardado: $'}{Number(payment.net_total ?? payment.total_paid).toLocaleString('es-AR')}
                      </p>
                      <details className="mt-3 border-t border-slate-600 pt-3">
                        <summary className="cursor-pointer text-sm text-cyan-300">Detalle diario ({payment.days?.length ?? 0})</summary>
                        {payment.days?.length ? (
                          <ul className="mt-2 space-y-1 text-xs text-slate-300">
                            {payment.days.map(day => (
                              <li key={day.date} className="flex flex-wrap justify-between gap-x-4 gap-y-1">
                                <span>{format(parseISO(day.date), 'dd/MM/yyyy', { locale: es })} · {day.type}</span>
                                <span>{day.additional_title ?? ''}{day.additional_amount != null ? ` $${Number(day.additional_amount).toLocaleString('es-AR')}` : ''}</span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="mt-2 text-xs text-slate-500">Este cobro es anterior al guardado de detalle diario.</p>
                        )}
                      </details>
                    </>
                  )}
                </div>
              )
            })}
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
