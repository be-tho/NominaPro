import { useState, useEffect } from 'react'
import {
  ChevronLeft,
  ChevronRight,
  DollarSign,
  TrendingUp,
  Settings,
  RotateCw,
  X,
  Check,
  Loader,
  LogOut,
  History,
  CreditCard,
} from 'lucide-react'
import {
  eachDayOfInterval,
  startOfMonth,
  endOfMonth,
  format,
  isToday,
} from 'date-fns'
import { es } from 'date-fns/locale'
import './App.css'
import {
  fetchAllDays,
  fetchUserSettings,
  insertDayData,
  updateDayData,
  deleteDayData,
  updateUserSettings,
  deleteAllDays,
  type DayType,
  type DayData,
} from './lib/database'
import { useAuth } from './contexts/AuthContext'
import Login from './components/Login'
import Register from './components/Register'
import CobraModal from './components/CobraModal'
import PaymentHistoryModal from './components/PaymentHistoryModal'

interface AppState {
  days: DayData[]
  monthlySalary: number
}

/**
 * Calculate daily value from monthly salary
 * Formula: salary / 26 days
 * Returns: rounded integer value
 */
const calculateDailyValue = (monthlySalary: number): number => {
  return Math.round(monthlySalary / 26)
}

const getDayTypeValue = (type: DayType): number => {
  const values: Record<Exclude<DayType, null>, number> = {
    'full': 1,
    'half': 0.5,
    'holiday': 1,
    'holiday-worked': 2,
    'not-working': 0,
  }
  return type ? values[type] : 0
}

const getDayTypeLabel = (type: DayType): string => {
  const labels: Record<Exclude<DayType, null>, string> = {
    'full': 'Día Completo',
    'half': 'Medio Día',
    'holiday': 'Feriado (No trabajado)',
    'holiday-worked': 'Feriado Trabajado',
    'not-working': 'No Trabajado',
  }
  return type ? labels[type] : 'Sin registrar'
}

const getDayTypeColor = (type: DayType): string => {
  const colors: Record<Exclude<DayType, null>, string> = {
    'full': 'bg-green-500',
    'half': 'bg-yellow-500',
    'holiday': 'bg-purple-500',
    'holiday-worked': 'bg-red-500',
    'not-working': 'bg-gray-300',
  }
  return type ? colors[type] : 'bg-white border-2 border-gray-200'
}

export default function App() {
  const { user, loading: authLoading, signOut } = useAuth()
  const [showAuthModal, setShowAuthModal] = useState<'login' | 'register' | null>(null)
  
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [state, setState] = useState<AppState>({ days: [], monthlySalary: 40000 })
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  const [selectedDate, setSelectedDate] = useState<Date | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [salaryInput, setSalaryInput] = useState(state.monthlySalary.toString())
  const [showCobraModal, setShowCobraModal] = useState(false)
  const [showPaymentHistory, setShowPaymentHistory] = useState(false)

  // Load data from Supabase on component mount
  useEffect(() => {
    if (!user) return

    const loadData = async () => {
      try {
        setLoading(true)
        const [daysData, settings] = await Promise.all([
          fetchAllDays(),
          fetchUserSettings(),
        ])
        
        setState({
          days: daysData,
          monthlySalary: settings?.monthly_salary ?? 40000,
        })
        setSalaryInput((settings?.monthly_salary ?? 40000).toString())
      } catch (error) {
        setState({ days: [], monthlySalary: 40000 })
      } finally {
        setLoading(false)
      }
    }

    loadData()
  }, [user])

  // Show login if user is not authenticated
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-white font-medium">Cargando...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    if (showAuthModal === 'register') {
      return (
        <Register
          onSuccess={() => setShowAuthModal(null)}
          onSwitchToLogin={() => setShowAuthModal('login')}
        />
      )
    }
    return (
      <Login
        onSuccess={() => setShowAuthModal(null)}
        onSwitchToRegister={() => setShowAuthModal('register')}
      />
    )
  }

  const getDayData = (date: Date): DayData | undefined => {
    const dateStr = format(date, 'yyyy-MM-dd')
    return state.days.find(d => d.date === dateStr)
  }

  const setDayType = async (date: Date, type: DayType) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    setSyncing(true)
    try {
      const existingDay = getDayData(date)
      
      if (existingDay) {
        if (type === null) {
          // Delete the day
          await deleteDayData(dateStr)
          setState(prev => ({
            ...prev,
            days: prev.days.filter(d => d.date !== dateStr),
          }))
        } else {
          // Update the day
          await updateDayData(dateStr, type)
          setState(prev => ({
            ...prev,
            days: prev.days.map(d =>
              d.date === dateStr ? { ...d, type } : d
            ),
          }))
        }
      } else if (type !== null) {
        // Insert new day
        const newDay = { date: dateStr, type }
        await insertDayData(newDay)
        setState(prev => ({
          ...prev,
          days: [...prev.days, newDay],
        }))
      }
    } catch (error) {
      alert('Error al guardar el día. Intenta de nuevo.')
    } finally {
      setSyncing(false)
    }
    setSelectedDate(null)
    setShowForm(false)
  }

  const handleSalaryChange = async () => {
    const salary = parseInt(salaryInput)
    if (!isNaN(salary) && salary > 0) {
      setSyncing(true)
      try {
        await updateUserSettings(salary)
        setState(prev => ({ ...prev, monthlySalary: salary }))
        setShowSettings(false)
      } catch (error) {
        alert('Error al guardar el sueldo. Intenta de nuevo.')
      } finally {
        setSyncing(false)
      }
    } else {
      alert('Por favor ingresa un sueldo válido')
    }
  }

  const handleResetData = async () => {
    if (confirm('¿Está seguro de que desea limpiar todos los datos del mes?')) {
      setSyncing(true)
      try {
        await deleteAllDays()
        setState({ ...state, days: [] })
      } catch (error) {
        alert('Error al limpiar los datos. Intenta de nuevo.')
      } finally {
        setSyncing(false)
      }
    }
  }

  const handleSettlementSuccess = async () => {
    // Refresh data after successful settlement
    setSyncing(true)
    try {
      const [daysData] = await Promise.all([fetchAllDays()])
      setState(prev => ({ ...prev, days: daysData }))
    } catch (error) {
      // Silently fail on refresh
    } finally {
      setSyncing(false)
    }
  }

  const getDaysInMonth = () => {
    return eachDayOfInterval({
      start: startOfMonth(currentMonth),
      end: endOfMonth(currentMonth),
    })
  }

  const getStartingEmptyDays = () => {
    const firstDay = startOfMonth(currentMonth)
    return firstDay.getDay()
  }

  const calculateTotals = () => {
    const totalUnits = state.days.reduce((sum, day) => {
      return sum + getDayTypeValue(day.type)
    }, 0)
    const dailyValue = calculateDailyValue(state.monthlySalary)
    const totalMoney = Math.round(totalUnits * dailyValue)

    const dayBreakdown = {
      full: state.days.filter(d => d.type === 'full').length,
      half: state.days.filter(d => d.type === 'half').length,
      holiday: state.days.filter(d => d.type === 'holiday').length,
      'holiday-worked': state.days.filter(d => d.type === 'holiday-worked').length,
      'not-working': state.days.filter(d => d.type === 'not-working').length,
    }

    return { totalUnits, totalMoney, dayBreakdown }
  }

  const { totalUnits, totalMoney, dayBreakdown } = calculateTotals()

  const monthDays = getDaysInMonth()
  const emptyDays = getStartingEmptyDays()
  const allDays = [...Array(emptyDays).fill(null), ...monthDays]

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 flex flex-col items-center gap-4">
          <Loader className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-white font-medium">Cargando datos...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 py-10 px-8">
      {/* Animated Background Elements */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-indigo-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
        <div className="absolute top-40 right-10 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
        <div className="absolute bottom-20 left-1/2 w-72 h-72 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-10 animate-pulse" />
      </div>

      <div className="relative z-10 w-full">
        {/* Loading Spinner */}
        {loading && (
          <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 flex flex-col items-center gap-4">
              <Loader className="w-8 h-8 text-indigo-500 animate-spin" />
              <p className="text-white font-medium">Cargando datos...</p>
            </div>
          </div>
        )}

        {/* Sync Indicator */}
        {syncing && !loading && (
          <div className="fixed top-4 right-4 z-40 bg-slate-800 rounded-lg border border-slate-700 px-4 py-2 flex items-center gap-2">
            <Loader className="w-4 h-4 text-indigo-500 animate-spin" />
            <span className="text-sm text-slate-300">Sincronizando...</span>
          </div>
        )}
        {/* Header */}
        <header className="border-b border-slate-700 bg-slate-800/50 backdrop-blur-xl sticky top-0 z-50 w-full">
          <div className="w-full app-container mx-auto py-6\">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img src="/logo.svg" alt="NominaPro Logo" className="w-12 h-12 lg:w-14 lg:h-14" />
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-white">NominaPro</h1>
                  <p className="text-xs sm:text-sm text-slate-400">Gestiona tu asistencia</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-slate-700/50 rounded-lg">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-slate-300">{user?.email}</span>
                </div>
                <button
                  onClick={() => setShowCobraModal(true)}
                  className="relative group px-3 py-2 text-slate-300 hover:text-green-400 transition-colors rounded-lg hover:bg-green-500/10"
                  title="Realizar cobro"
                >
                  <CreditCard className="w-5 h-5" />
                  <div className="absolute inset-0 bg-gradient-to-r from-green-600 to-emerald-600 rounded-lg opacity-0 group-hover:opacity-10 transition-opacity" />
                </button>
                <button
                  onClick={() => setShowPaymentHistory(true)}
                  className="relative group p-2 text-slate-400 hover:text-cyan-400 transition-colors"
                  title="Historial de cobros"
                >
                  <History className="w-6 h-6" />
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-600 to-blue-600 rounded-lg opacity-0 group-hover:opacity-10 transition-opacity" />
                </button>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="relative group p-2 text-slate-400 hover:text-white transition-colors"
                  title="Configuración"
                >
                  <Settings className="w-6 h-6" />
                  <div className="absolute inset-0 bg-gradient-to-r from-indigo-600 to-cyan-600 rounded-lg opacity-0 group-hover:opacity-10 transition-opacity" />
                </button>
                <button
                  onClick={signOut}
                  className="relative group p-2 text-slate-400 hover:text-red-400 transition-colors"
                  title="Cerrar sesión"
                >
                  <LogOut className="w-6 h-6" />
                  <div className="absolute inset-0 bg-gradient-to-r from-red-600 to-red-700 rounded-lg opacity-0 group-hover:opacity-10 transition-opacity" />
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Settings Modal */}
        {showSettings && (
          <div className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center">
            <div className="bg-slate-800 rounded-2xl border border-slate-700 p-14 w-full max-w-md shadow-2xl animate-in">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-white">Configuración</h2>
                <button
                  onClick={() => setShowSettings(false)}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Sueldo Mensual (Pesos Argentinos)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-slate-400">$</span>
                    <input
                      type="number"
                      value={salaryInput}
                      onChange={e => setSalaryInput(e.target.value)}
                      className="w-full pl-7 pr-4 py-3 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                      min="0"
                      step="1"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    Fórmula: Sueldo ÷ 26 = valor por día
                  </p>
                </div>

                <div className="bg-slate-700/50 rounded-lg p-3 border border-slate-600">
                  <p className="text-xs text-slate-400 mb-1">Valor por día:</p>
                  <p className="text-xl font-bold text-indigo-400">
                    ${calculateDailyValue(parseInt(salaryInput) || 0).toLocaleString('es-AR')}
                  </p>
                </div>

                <button
                  onClick={handleSalaryChange}
                  className="w-full bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Guardar Sueldo
                </button>

                <div className="border-t border-slate-600 pt-4">
                  <p className="text-sm text-slate-300 mb-3">
                    ¿Reestablecer todos los ingresos registrados del mes?
                  </p>
                  <button
                    onClick={handleResetData}
                    className="w-full py-2 px-4 bg-red-500/10 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors border border-red-500/20 flex items-center justify-center gap-2 font-medium"
                    title="Limpiar datos"
                  >
                    <RotateCw className="w-5 h-5" />
                    Limpiar datos del mes
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Main Content - Calendar */}
        <div className="flex flex-col w-full gap-8 md:gap-12 app-container\">
          {/* Dashboard Stats Container */}
          <div className="flex flex-col gap-6 app-content-box rounded-2xl bg-slate-900/50 border border-slate-700/50">
            {/* Stats Cards - Top Row */}
            <div className="flex flex-col sm:flex-row flex-wrap gap-6 sm:gap-8 w-full">
              {/* Total Units */}
              <div className="flex-1 min-w-[250px] bg-gradient-to-br from-slate-700 to-slate-800 rounded-xl p-8 border border-slate-600 hover:border-indigo-500 transition-all hover:shadow-xl hover:shadow-indigo-500/10 group">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-slate-300 text-sm font-medium">Total Unidades</h3>
                  <div className="p-2 bg-indigo-500/20 rounded-lg group-hover:bg-indigo-500/30 transition-colors">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                  </div>
                </div>
                <p className="text-3xl lg:text-4xl font-bold text-white mt-4">{totalUnits.toFixed(1)}</p>
                <p className="text-xs lg:text-sm text-slate-400 mt-3">unidades trabajadas</p>
              </div>

              {/* Total Amount */}
              <div className="flex-1 min-w-[250px] bg-gradient-to-br from-green-700/30 to-emerald-800/30 rounded-xl p-8 border border-green-500/30 hover:border-green-400 transition-all hover:shadow-xl hover:shadow-green-500/10 group">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-slate-300 text-sm lg:text-base font-medium">Total a Cobrar</h3>
                  <div className="p-2 bg-green-500/20 rounded-lg group-hover:bg-green-500/30 transition-colors">
                    <DollarSign className="w-4 h-4 text-green-400" />
                  </div>
                </div>
                <p className="text-3xl lg:text-4xl font-bold text-green-400 mt-4">
                  ${totalMoney.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
                <p className="text-xs lg:text-sm text-slate-400 mt-3">monto total</p>
              </div>

              {/* Daily Value */}
              <div className="flex-1 min-w-[250px] bg-gradient-to-br from-purple-700/30 to-pink-800/30 rounded-xl p-8 border border-purple-500/30 hover:border-purple-400 transition-all hover:shadow-xl hover:shadow-purple-500/10 group">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-slate-300 text-sm lg:text-base font-medium">Valor por Día</h3>
                  <div className="p-2 bg-purple-500/20 rounded-lg group-hover:bg-purple-500/30 transition-colors">
                    <DollarSign className="w-4 h-4 text-purple-400" />
                  </div>
                </div>
                <p className="text-3xl lg:text-4xl font-bold text-purple-400 mt-4">
                  ${calculateDailyValue(state.monthlySalary).toLocaleString('es-AR')}
                </p>
                <p className="text-xs lg:text-sm text-slate-400 mt-3">pesos por día</p>
              </div>

              {/* Days Registered */}
              <div className="flex-1 min-w-[250px] bg-gradient-to-br from-cyan-700/30 to-blue-800/30 rounded-xl p-8 border border-cyan-500/30 hover:border-cyan-400 transition-all hover:shadow-xl hover:shadow-cyan-500/10 group">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-slate-300 text-sm lg:text-base font-medium">Días Registrados</h3>
                  <div className="p-2 bg-cyan-500/20 rounded-lg group-hover:bg-cyan-500/30 transition-colors">
                    <Check className="w-4 h-4 text-cyan-400" />
                  </div>
                </div>
                <p className="text-3xl lg:text-4xl font-bold text-cyan-400 mt-4">{state.days.length}</p>
                <p className="text-xs lg:text-sm text-slate-400 mt-3">días totales</p>
              </div>
            </div>
          </div>

          {/* Main Content Layout */}
          <div className="flex flex-col lg:flex-row gap-6 md:gap-8 app-content-box rounded-2xl bg-slate-900/50 border border-slate-700/50">
            {/* Calendar */}
            <div className="flex-1 lg:flex-[2] min-w-0">
              <div className="bg-slate-800 rounded-2xl border border-slate-700 overflow-hidden shadow-2xl">
                {/* Calendar Header */}
                <div className="bg-gradient-to-r from-indigo-600 to-cyan-600 p-8">
                  <div className="flex items-center justify-between">
                    <button
                      onClick={() =>
                        setCurrentMonth(
                          new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1)
                        )
                      }
                      className="p-2 hover:bg-white/10 rounded-lg transition-all hover:scale-110"
                    >
                      <ChevronLeft className="w-5 h-5 text-white" />
                    </button>
                    <h2 className="text-2xl lg:text-3xl font-bold text-white capitalize\">
                      {format(currentMonth, 'MMMM de yyyy', { locale: es })}
                    </h2>
                    <button
                      onClick={() =>
                        setCurrentMonth(
                          new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1)
                        )
                      }
                      className="p-2 hover:bg-white/10 rounded-lg transition-all hover:scale-110"
                    >
                      <ChevronRight className="w-5 h-5 text-white" />
                    </button>
                  </div>
                </div>

                {/* Days of Week */}
                <div className="grid grid-cols-7 bg-slate-700/50 border-b border-slate-700">
                  {['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sab'].map(day => (
                    <div key={day} className="p-4 text-center font-semibold text-slate-300 text-sm">
                      {day}
                    </div>
                  ))}
                </div>

                {/* Calendar Days */}
                <div className="grid grid-cols-7 p-5 gap-3 bg-slate-800">
                  {allDays.map((day, idx) => {
                    if (!day) {
                      return <div key={`empty-${idx}`} className="aspect-square" />
                    }

                    const dayData = getDayData(day)
                    const isSelectedDay = selectedDate && format(day, 'yyyy-MM-dd') === format(selectedDate, 'yyyy-MM-dd')
                    const isTodayDate = isToday(day)

                    return (
                      <button
                        key={format(day, 'yyyy-MM-dd')}
                        onClick={() => {
                          setSelectedDate(day)
                          setShowForm(true)
                        }}
                        className={`
                          aspect-square rounded-lg font-bold text-sm
                          transition-all duration-200 cursor-pointer
                          flex items-center justify-center relative
                          ${dayData ? getDayTypeColor(dayData.type) + ' text-white hover:shadow-lg hover:shadow-white/20' : 'bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600'}
                          ${isTodayDate && !dayData ? 'ring-2 ring-cyan-400' : ''}
                          ${isSelectedDay ? 'ring-2 ring-yellow-400 scale-110' : ''}
                        `}
                      >
                        {format(day, 'd')}
                        {dayData && (
                          <div className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full" />
                        )}
                      </button>
                    )
                  })}
                </div>

                {/* Legend */}
                <div className="bg-slate-700/30 border-t border-slate-700 p-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 text-xs">
                    <div className="flex items-center gap-2 text-slate-300">
                      <div className="w-3 h-3 rounded bg-green-500" />
                      <span>Completo</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <div className="w-3 h-3 rounded bg-yellow-500" />
                      <span>Medio</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <div className="w-3 h-3 rounded bg-purple-500" />
                      <span>Feriado</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <div className="w-3 h-3 rounded bg-red-500" />
                      <span>Doble</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-300">
                      <div className="w-3 h-3 rounded bg-slate-600" />
                      <span>No Trab.</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Sidebar */}
            <div className="flex flex-col gap-8 flex-1 lg:flex-[1] min-w-0">
              {/* Breakdown Card */}
              <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-2xl">
                <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 bg-indigo-500/20 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-indigo-400" />
                  </div>
                  Desglose de Días
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-lg hover:border-green-500/50 transition-colors">
                    <span className="text-slate-300 text-sm font-medium">Días Completos</span>
                    <span className="text-green-400 font-bold">{dayBreakdown.full}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg hover:border-yellow-500/50 transition-colors">
                    <span className="text-slate-300 text-sm font-medium">Medios Días</span>
                    <span className="text-yellow-400 font-bold">{dayBreakdown.half}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-purple-500/10 border border-purple-500/30 rounded-lg hover:border-purple-500/50 transition-colors">
                    <span className="text-slate-300 text-sm font-medium">Feriados</span>
                    <span className="text-purple-400 font-bold">{dayBreakdown.holiday}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-red-500/10 border border-red-500/30 rounded-lg hover:border-red-500/50 transition-colors">
                    <span className="text-slate-300 text-sm font-medium">Feriados Trab.</span>
                    <span className="text-red-400 font-bold">{dayBreakdown['holiday-worked']}</span>
                  </div>
                </div>
              </div>

              {/* Form Card */}
              {showForm && selectedDate && (
                <div className="bg-slate-800 rounded-2xl border border-slate-700 p-8 shadow-2xl animate-in">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-bold text-white">
                      {format(selectedDate, 'dd MMMM', { locale: es })}
                    </h3>
                    <button
                      onClick={() => setShowForm(false)}
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    {(['full', 'half', 'holiday', 'holiday-worked', 'not-working'] as DayType[]).map(
                      type => {
                        const isSelected = getDayData(selectedDate)?.type === type
                        return (
                          <button
                            key={type}
                            onClick={() => setDayType(selectedDate, type)}
                            className={`
                              w-full p-4 rounded-lg font-medium text-sm transition-all
                              ${
                                isSelected
                                  ? `${getDayTypeColor(type)} text-white ring-2 ring-offset-2 ring-offset-slate-800`
                                  : `bg-slate-700 text-slate-300 hover:bg-slate-600 border border-slate-600`
                              }
                            `}
                          >
                            <div className="font-bold">{getDayTypeLabel(type)}</div>
                            <div className="text-xs opacity-75">
                              {getDayTypeValue(type)} unidad(es)
                            </div>
                          </button>
                        )
                      }
                    )}
                  </div>

                  <button
                    onClick={() => setDayType(selectedDate, null)}
                    className="w-full mt-4 py-2 text-sm text-red-400 bg-red-500/10 border border-red-500/30 rounded-lg hover:bg-red-500/20 transition-colors"
                  >
                    Limpiar
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-700 bg-slate-800/50 backdrop-blur-xl mt-12 md:mt-16 py-8 md:py-12 w-full">
          <div className="w-full app-container mx-auto text-center text-slate-400 text-sm">
            <p>Datos sincronizados con Supabase • NominaPro v1.0</p>
          </div>
        </footer>

        {/* Modals */}
        <CobraModal
          isOpen={showCobraModal}
          onClose={() => setShowCobraModal(false)}
          onSuccess={handleSettlementSuccess}
          monthlySalary={state.monthlySalary}
          days={state.days}
        />
        <PaymentHistoryModal
          isOpen={showPaymentHistory}
          onClose={() => setShowPaymentHistory(false)}
        />
      </div>
    </div>
  )

}
