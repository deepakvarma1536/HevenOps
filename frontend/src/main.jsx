import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext'
import { TenantAuthProvider } from './context/TenantAuthContext'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <TenantAuthProvider>
          <App />
        </TenantAuthProvider>
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)
