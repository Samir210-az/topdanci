import { useRef, useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import ServiceSheet from './ServiceSheet'
import Wordmark from './Wordmark'
import { usePwaInstall } from '../lib/install'
import { Icon } from './Icon'
import { useData } from '../store/DataContext'
import { useCart } from '../store/CartContext'

const TABS = [
  { to: '/', label: 'Əsas', icon: 'home', end: true },
  { to: '/products', label: 'Mallar', icon: 'box' },
  { to: '/sale', label: 'Satış', icon: 'cart' },
  { to: '/customers', label: 'Müştərilər', icon: 'users' },
  { to: '/reports', label: 'Hesabat', icon: 'chart' },
]

function SyncBadge() {
  const { online, pending } = useData()
  let text = 'Sinxron'
  let tone = 'ok'
  if (!online) {
    text = 'Oflayn: yazılanlar telefonda saxlanır'
    tone = 'warn'
  } else if (pending) {
    text = 'Göndərilir…'
    tone = 'warn'
  }
  return (
    <span className={`sync ${tone}`} role="status">
      <i aria-hidden="true" />
      {text}
    </span>
  )
}

export default function Layout() {
  const { ready } = useData()
  const { count } = useCart()
  const [service, setService] = useState(false)
  const pwa = usePwaInstall()
  const taps = useRef({ n: 0, t: 0 })

  function brandTap(event) {
    const now = Date.now()
    taps.current = { n: now - taps.current.t < 2000 ? taps.current.n + 1 : 1, t: now }
    if (taps.current.n >= 5) {
      event.preventDefault()
      taps.current = { n: 0, t: 0 }
      setService(true)
    }
  }

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand" onClick={brandTap}>
          <Wordmark onDark />
        </Link>
        <SyncBadge />
        {pwa.canPrompt && !pwa.installed && (
          <button type="button" className="btn sm" onClick={pwa.install}>
            Yüklə
          </button>
        )}
        <Link to="/settings" className="icon-btn light" aria-label="Hesab">
          <Icon name="user" />
        </Link>
      </header>

      <main className="page">{ready ? <Outlet /> : <p className="muted">Yüklənir…</p>}</main>

      <ServiceSheet open={service} onClose={() => setService(false)} />

      <nav className="nav" aria-label="Əsas menyu">
        {TABS.map((tab) => (
          <NavLink key={tab.to} to={tab.to} end={tab.end}>
            <span className="nav-icon">
              <Icon name={tab.icon} />
              {tab.to === '/sale' && count > 0 && <b className="nav-badge">{count}</b>}
            </span>
            {tab.label}
          </NavLink>
        ))}
      </nav>
    </div>
  )
}
