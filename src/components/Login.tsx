import { useState } from 'react'
import { Mail, Lock, LogInIcon } from 'lucide-react'
import { signIn } from '../lib/auth'

interface LoginProps {
  onSuccess: () => void
  onSwitchToRegister: () => void
}

export default function Login({ onSuccess, onSwitchToRegister }: LoginProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      await signIn(email, password)
      onSuccess()
    } catch (err) {
      if (err instanceof Error) {
        setError(err.message)
      } else {
        setError('Error al iniciar sesión')
      }
    } finally {
      setLoading(false)
    }
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
          <div className="flex items-center justify-center mb-8">
            <img src="/logo.svg" alt="NominaPro Logo" className="w-12 h-12" />
            <h1 className="text-3xl font-black text-white ml-3">NominaPro</h1>
          </div>

          <h2 className="text-xl font-bold text-white mb-2 text-center">Bienvenido de nuevo</h2>
          <p className="text-sm text-slate-400 text-center mb-6">Inicia sesión para continuar</p>

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
                  Iniciando sesión...
                </>
              ) : (
                <>
                  <LogInIcon className="w-5 h-5" />
                  Iniciar Sesión
                </>
              )}
            </button>
          </form>

          {/* Register Link */}
          <p className="text-center text-sm text-slate-400 mt-6">
            ¿No tienes cuenta?{' '}
            <button
              onClick={onSwitchToRegister}
              className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
            >
              Regístrate aquí
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
