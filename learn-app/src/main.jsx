import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Login from './LoginRegister/Login.jsx'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Login />
  </StrictMode>,
)
