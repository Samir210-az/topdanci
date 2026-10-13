import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import ToastHost from './components/ToastHost.jsx'
import './index.css'
import './pages.css'

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <ToastHost />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
