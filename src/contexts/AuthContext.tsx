import { createContext, useContext, useEffect, useState } from 'react'
import type { User } from '../lib/auth'
import { getCurrentUser, onAuthStateChange } from '../lib/auth'

interface AuthContextType {
  user: User | null
  loading: boolean
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      try {
        const currentUser = await getCurrentUser()
        setUser(currentUser)
      } catch (error) {
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    initAuth()

    try {
      const subscription = onAuthStateChange((newUser) => {
        setUser(newUser)
        setLoading(false)
      })

      return () => {
        subscription?.unsubscribe()
      }
    } catch (error) {
      setLoading(false)
    }
  }, [])

  const handleSignOut = async () => {
    try {
      const { signOut: signOutAuth } = await import('../lib/auth')
      await signOutAuth()
      setUser(null)
    } catch (error) {
      // Sign out error
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, signOut: handleSignOut }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

