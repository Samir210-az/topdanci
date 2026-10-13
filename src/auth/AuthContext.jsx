import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { auth } from '../firebase'
import { OWNER_EMAIL } from '../config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [state, setState] = useState({ user: null, ready: false })

  useEffect(
    () =>
      onAuthStateChanged(auth, (user) => {
        if (user && user.email !== OWNER_EMAIL) {
          signOut(auth)
          setState({ user: null, ready: true })
          return
        }
        setState({ user, ready: true })
      }),
    [],
  )

  const signInWithPin = useCallback((pin) => signInWithEmailAndPassword(auth, OWNER_EMAIL, pin), [])
  const logout = useCallback(() => signOut(auth), [])

  const value = useMemo(() => ({ ...state, signInWithPin, logout }), [state, signInWithPin, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
