import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import Register from "./LoginRegister/Register.jsx";
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Register />
  </StrictMode>,
)
