import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import 'leaflet/dist/leaflet.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import PWAInstallGuard from './components/PWAInstallGuard'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PWAInstallGuard>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </PWAInstallGuard>
  </StrictMode>,
)
