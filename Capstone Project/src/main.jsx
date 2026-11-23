import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import './motion.css'
import './pages.css'
import './brand.css'
import { installPointerEffects } from './utils/motion.js'
import App from './App.jsx'
import { AuthProvider } from './auth/AuthContext.jsx'
import { SettingsProvider } from './settings/Settings.jsx'
import { ToastProvider } from './components/Toaster.jsx'

installPointerEffects()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <SettingsProvider>
        <ToastProvider>
          <AuthProvider>
            <App />
          </AuthProvider>
        </ToastProvider>
      </SettingsProvider>
    </BrowserRouter>
  </StrictMode>,
)
