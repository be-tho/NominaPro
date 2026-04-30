import { apiFetch } from './api'

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
  return apiFetch<{ user: User }>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export const signIn = async (email: string, password: string) => {
  return apiFetch<{ user: User }>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}

export const signOut = async () => {
  await apiFetch<null>('/auth/logout', { method: 'POST', body: '{}' })
}

export const getCurrentUser = async (): Promise<User | null> => {
  const data = await apiFetch<{ user: User | null }>('/auth/me')
  return data.user
}
