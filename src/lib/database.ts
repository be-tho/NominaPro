import type { User } from './auth'
import { apiFetch } from './api'

// ============================================
// TYPES & INTERFACES
// ============================================

export type DayType = 'full' | 'half' | 'holiday' | 'holiday-worked' | 'not-working' | null

export interface DayData {
  id?: string
  date: string
  type: DayType
  user_id?: string
  created_at?: string
  updated_at?: string
}

export interface UserSettings {
  id?: string
  user_id?: string
  monthly_salary: number
  created_at?: string
  updated_at?: string
}

export interface PaymentRecord {
  id?: string
  user_id?: string
  total_days: number
  daily_value: number
  total_paid: number
  payment_date: string
  period_start: string
  period_end: string
  created_at?: string
  updated_at?: string
}

// ============================================
// AUTH UTILITIES
// ============================================

export const getUserId = async (): Promise<string> => {
  const data = await apiFetch<{ user: User | null }>('/auth/me')
  if (!data.user?.id) {
    throw new Error('User not authenticated')
  }
  return data.user.id
}

// ============================================
// DAY OPERATIONS
// ============================================

export const insertDayData = async (dayData: DayData) => {
  await apiFetch<{ day: DayData }>('/days', {
    method: 'POST',
    body: JSON.stringify({
      date: dayData.date,
      type: dayData.type,
    }),
  })
}

export const updateDayData = async (date: string, type: DayType) => {
  if (type === null) {
    await deleteDayData(date)
    return
  }
  await apiFetch<{ updated: number }>('/days', {
    method: 'PATCH',
    body: JSON.stringify({ date, type }),
  })
}

export const deleteDayData = async (date: string) => {
  await apiFetch<{ deleted: number }>('/days', {
    method: 'DELETE',
    query: { date },
  })
}

export const fetchAllDays = async (): Promise<DayData[]> => {
  const data = await apiFetch<{ days: DayData[] }>('/days')
  return data.days ?? []
}

export const deleteAllDays = async () => {
  await apiFetch<{ deleted: number }>('/days/delete-all', {
    method: 'POST',
    body: '{}',
  })
}

// ============================================
// SETTINGS OPERATIONS
// ============================================

export const updateUserSettings = async (monthlySalary: number) => {
  const salaryInt = Math.round(monthlySalary)
  if (salaryInt <= 0) {
    throw new Error('El salario debe ser mayor a 0')
  }

  await apiFetch<{ settings: UserSettings }>('/settings', {
    method: 'PUT',
    body: JSON.stringify({ monthly_salary: salaryInt }),
  })
}

export const fetchUserSettings = async (): Promise<UserSettings | null> => {
  const data = await apiFetch<{ settings: UserSettings | null }>('/settings')
  return data.settings ?? null
}

// ============================================
// PAYMENT HISTORY OPERATIONS
// ============================================

export const recordPayment = async (payment: Omit<PaymentRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
  await apiFetch<{ payment: PaymentRecord }>('/payments', {
    method: 'POST',
    body: JSON.stringify({
      total_days: payment.total_days,
      daily_value: payment.daily_value,
      total_paid: payment.total_paid,
      payment_date: payment.payment_date,
      period_start: payment.period_start,
      period_end: payment.period_end,
    }),
  })
}

export const fetchPaymentHistory = async (): Promise<PaymentRecord[]> => {
  const data = await apiFetch<{ payments: PaymentRecord[] }>('/payments')
  const rows = data.payments ?? []
  return rows.map((p) => ({
    ...p,
    total_days: typeof p.total_days === 'string' ? parseFloat(p.total_days) : p.total_days,
  }))
}
