import { supabase } from './supabaseClient'

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

/**
 * Get the authenticated user ID from Supabase
 */
export const getUserId = async (): Promise<string> => {
  const { data } = await supabase.auth.getSession()
  if (!data.session?.user?.id) {
    throw new Error('User not authenticated')
  }
  return data.session.user.id
}

// ============================================
// DAY OPERATIONS
// ============================================

/**
 * Insert a new day record
 */
export const insertDayData = async (dayData: DayData) => {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('days')
    .insert([
      {
        date: dayData.date,
        type: dayData.type,
        user_id: userId,
      },
    ])
    .select()
  
  if (error) throw error
  return data
}

/**
 * Update a day record type
 */
export const updateDayData = async (date: string, type: DayType) => {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('days')
    .update({ type })
    .eq('date', date)
    .eq('user_id', userId)
    .select()
  
  if (error) throw error
  return data
}

/**
 * Delete a day record
 */
export const deleteDayData = async (date: string) => {
  const userId = await getUserId()
  const { error } = await supabase
    .from('days')
    .delete()
    .eq('date', date)
    .eq('user_id', userId)
  
  if (error) throw error
}

/**
 * Fetch all day records for the current user
 */
export const fetchAllDays = async (): Promise<DayData[]> => {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('days')
    .select('*')
    .eq('user_id', userId)
    .order('date', { ascending: true })
  
  if (error) throw error
  return data || []
}

/**
 * Delete all days for the current user
 */
export const deleteAllDays = async () => {
  const userId = await getUserId()
  const { error } = await supabase
    .from('days')
    .delete()
    .eq('user_id', userId)

  if (error) throw error
}

// ============================================
// SETTINGS OPERATIONS
// ============================================

/**
 * Update user settings (monthly salary in ARS)
 * Auto-creates if doesn't exist
 * Formula: daily_value = monthly_salary / 26
 */
export const updateUserSettings = async (monthlySalary: number) => {
  const userId = await getUserId()
  
  // Validate that salary is a positive integer
  const salaryInt = Math.round(monthlySalary)
  if (salaryInt <= 0) {
    throw new Error('El salario debe ser mayor a 0')
  }
  
  // Check if settings exist
  const { data: existing } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  let data, error
  
  if (existing) {
    // Update existing settings
    ({ data, error } = await supabase
      .from('user_settings')
      .update({ monthly_salary: salaryInt })
      .eq('user_id', userId)
      .select()
    )
  } else {
    // Create new settings
    ({ data, error } = await supabase
      .from('user_settings')
      .insert([
        {
          user_id: userId,
          monthly_salary: salaryInt,
        },
      ])
      .select()
    )
  }

  if (error) throw error
  return data
}

/**
 * Fetch user settings for the current user
 */
export const fetchUserSettings = async (): Promise<UserSettings | null> => {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  return data || null
}

// ============================================
// PAYMENT HISTORY OPERATIONS
// ============================================

/**
 * Record a payment/settlement
 */
export const recordPayment = async (payment: Omit<PaymentRecord, 'id' | 'user_id' | 'created_at' | 'updated_at'>) => {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('payment_history')
    .insert([
      {
        user_id: userId,
        total_days: payment.total_days,
        daily_value: payment.daily_value,
        total_paid: payment.total_paid,
        payment_date: payment.payment_date,
        period_start: payment.period_start,
        period_end: payment.period_end,
      },
    ])
    .select()

  if (error) throw error
  return data
}

/**
 * Fetch all payment history for the current user
 */
export const fetchPaymentHistory = async (): Promise<PaymentRecord[]> => {
  const userId = await getUserId()
  const { data, error } = await supabase
    .from('payment_history')
    .select('*')
    .eq('user_id', userId)
    .order('payment_date', { ascending: false })

  if (error) throw error
  return data || []
}