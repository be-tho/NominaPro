import { useState } from 'react'
import { DollarSign, Loader } from 'lucide-react'
import { updateUserSettings } from '../lib/database'

interface SalarySetupProps {
  onSuccess: () => void
}

export default function SalarySetup({ onSuccess }: SalarySetupProps) {
  const [salary, setSalary] = useState('40000')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const salaryNum = parseInt(salary)
    if (isNaN(salaryNum) || salaryNum <= 0) {
      setError('Por favor ingresa un sueldo válido mayor a 0')
      return
    }

    setLoading(true)
    try {
      await updateUserSettings(salaryNum)
      onSuccess()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Error al guardar el sueldo')
      }
    } finally {
      setLoading(false)
    }
  }

  // Calculate daily value to show preview
  const dailyValue = Math.round(parseInt(salary) / 26)

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center px-4 py-8">
      {/* Animated Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
      </div>

      <div className="relative z-10 w-full max-w-md">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-indigo-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <DollarSign className="w-8 h-8 text-indigo-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Configurar sueldo</h2>
            <p className="text-sm text-slate-400">
              Ingresa tu sueldo mensual en pesos argentinos para calcular el valor por unidad
            </p>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Salary Input */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Sueldo Mensual
              </label>
              <div className="relative">
                <span className="absolute left-3 top-3 text-slate-400 font-medium">$</span>
                <input
                  type="number"
                  value={salary}
                  onChange={(e) => setSalary(e.target.value)}
                  className="w-full pl-8 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-lg font-semibold"
                  placeholder="40000"
                  min="1"
                  step="1"
                  required
                />
              </div>
            </div>

            {/* Preview */}
            <div className="bg-slate-700/50 rounded-lg p-4 border border-slate-600">
              <p className="text-xs text-slate-400 mb-2">Valor por día (calculado):</p>
              <p className="text-2xl font-bold text-indigo-400">
                ${isNaN(dailyValue) ? '0' : dailyValue.toLocaleString('es-AR')}
              </p>
              <p className="text-xs text-slate-400 mt-2">
                Calculado: {parseInt(salary).toLocaleString('es-AR')} ÷ 26
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Continuar'
              )}
            </button>
          </form>

          <p className="text-xs text-slate-500 text-center mt-4">
            Podrás cambiar esto más adelante en configuración
          </p>
        </div>
      </div>
    </div>
  )
}
