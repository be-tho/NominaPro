import { supabase } from './supabaseClient'

export interface User {
  id: string
  email: string
}

export interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
}

export const signUp = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  })

  if (error) throw error
  return data
}

export const signIn = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) throw error
  return data
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export const getCurrentUser = async (): Promise<User | null> => {
  const { data } = await supabase.auth.getSession()
  if (data.session?.user) {
    return {
      id: data.session.user.id,
      email: data.session.user.email || '',
    }
  }
  return null
}

export const onAuthStateChange = (callback: (user: User | null) => void) => {
  const { data } = supabase.auth.onAuthStateChange(async (_event, session) => {
    if (session?.user) {
      callback({
        id: session.user.id,
        email: session.user.email || '',
      })
    } else {
      callback(null)
    }
  })

  return data.subscription
}
