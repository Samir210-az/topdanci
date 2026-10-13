import { useCallback, useEffect, useState } from 'react'
import { useAuth } from './AuthContext'
import { PIN_LENGTH } from '../config'
import { Icon } from '../components/Icon'
import Wordmark from '../components/Wordmark'

const ERRORS = {
  'auth/invalid-credential': 'PIN yanlışdır',
  'auth/wrong-password': 'PIN yanlışdır',
  'auth/user-not-found': 'Sahib hesabı hələ yaradılmayıb',
  'auth/too-many-requests': 'Çox cəhd edildi. Bir az gözləyib yenidən yoxla',
  'auth/network-request-failed': 'İnternet yoxdur. Giriş üçün internet lazımdır',
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9']

export default function LoginScreen() {
  const { signInWithPin } = useAuth()
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = useCallback(
    async (value) => {
      setBusy(true)
      try {
        await signInWithPin(value)
      } catch (e) {
        setError(ERRORS[e.code] || 'Giriş alınmadı')
        setPin('')
        setBusy(false)
      }
    },
    [signInWithPin],
  )

  const press = useCallback(
    (digit) => {
      if (busy || pin.length >= PIN_LENGTH) return
      const next = pin + digit
      setError('')
      setPin(next)
      if (next.length === PIN_LENGTH) submit(next)
    },
    [busy, pin, submit],
  )

  const erase = useCallback(() => {
    if (!busy) setPin((current) => current.slice(0, -1))
  }, [busy])

  useEffect(() => {
    const onKey = (event) => {
      if (/^\d$/.test(event.key)) press(event.key)
      else if (event.key === 'Backspace') erase()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [press, erase])

  return (
    <main className="login">
      <img className="login-logo" src="/icon.svg" alt="" width="72" height="72" />
      <h1>
          <Wordmark />
        </h1>
      <p className="muted">PIN-i daxil et</p>

      <div className="pin-dots" role="img" aria-label={`PIN: ${pin.length} / ${PIN_LENGTH} rəqəm`}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span key={i} className={i < pin.length ? 'filled' : ''} />
        ))}
      </div>

      <p className="login-error" role="alert">
        {error}
      </p>

      <div className="keypad">
        {KEYS.map((key) => (
          <button key={key} type="button" onClick={() => press(key)} disabled={busy}>
            {key}
          </button>
        ))}
        <span />
        <button type="button" onClick={() => press('0')} disabled={busy}>
          0
        </button>
        <button type="button" onClick={erase} disabled={busy} aria-label="Sonuncunu sil">
          <Icon name="back" size={24} />
        </button>
      </div>

      <footer className="login-footer">
        <a href="https://instagram.com/securtiy_group" target="_blank" rel="noopener noreferrer">
          By securtiy_group
        </a>
      </footer>
    </main>
  )
}
