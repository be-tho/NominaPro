import { useState } from 'react'
import { Mail, Lock, UserPlus, ArrowLeft } from 'lucide-react'
import { signUp } from '../lib/auth'
import SalarySetup from './SalarySetup'

interface RegisterProps {
  onSuccess: () => void
  onSwitchToLogin: () => void
}

export default function Register({ onSuccess, onSwitchToLogin }: RegisterProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden')
      return
    }

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      return
    }

    setLoading(true)

    try {
      await signUp(email, password)
      setSuccess(true)
      setTimeout(() => {
        onSuccess()
      }, 2000)
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Error al registrarse')
      }
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return <SalarySetup onSuccess={onSuccess} />
  }

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
          <button
            onClick={onSwitchToLogin}
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-6"
          >
            <ArrowLeft className="w-5 h-5" />
            Volver al login
          </button>

          <h2 className="text-2xl font-bold text-white mb-2">Crear cuenta</h2>
          <p className="text-sm text-slate-400 mb-6">Regístrate para comenzar a usar NominaPro</p>

          {error && (
            <div className="mb-4 p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="tu@email.com"
                  required
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
              <p className="text-xs text-slate-500 mt-1">Mínimo 6 caracteres</p>
            </div>

            {/* Confirm Password */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Confirmar contraseña
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-4 rounded-lg transition-all flex items-center justify-center gap-2 mt-6"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-indigo-400 rounded-full animate-spin" />
                  Registrando...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Crear Cuenta
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  )
}
