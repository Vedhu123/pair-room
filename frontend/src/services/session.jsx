import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api } from './api'

const SessionContext = createContext(null)

export function SessionProvider({ children }) {
  const [user, setUser] = useState(undefined)

  const refresh = useCallback(async () => {
    try {
      const data = await api('/api/me')
      setUser(data.user)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refresh()
  }, [refresh])

  const logout = useCallback(async () => {
    await api('/api/logout', { method: 'POST' })
    setUser(null)
  }, [])

  return (
    <SessionContext.Provider value={{ user, setUser, logout }}>
      {children}
    </SessionContext.Provider>
  )
}

export function useSession() {
  return useContext(SessionContext)
}
