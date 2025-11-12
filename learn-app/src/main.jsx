import React, { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import Login from './LoginRegister/Login.jsx'
import Register from './LoginRegister/Register.jsx'
import Splash from './components/Splash.jsx'
import './index.css'
import App from './App.jsx'

function RootApp({ initialPage = 'login' }) {
  const [page, setPage] = useState(initialPage) // 'login' | 'register' | 'app'

  const goToRegister = () => setPage('register')
  const goToLogin = () => setPage('login')
  const onLoginSuccess = (data) => {
    console.log('Logged in, mounting App...', data)
    setPage('app')
  }

  if (page === 'login') {
    return <Login onLogin={onLoginSuccess} onRegisterClick={goToRegister} />
  }

  if (page === 'register') {
    return <Register onSignIn={goToLogin} />
  }

  return <App initialScreen="lessons" />
}

function Boot() {
  const params = new URLSearchParams(window.location.search)
  const devSkip = params.get('dev') === '1' || localStorage.getItem('dev_skip_login') === '1'
  const [showSplash, setShowSplash] = useState(!devSkip)

  return (
    <>
      <RootApp initialPage={devSkip ? 'app' : 'login'} />
      {showSplash && (
        <Splash duration={1200} exitDuration={1500} onFinished={() => setShowSplash(false)} />
      )}
    </>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Boot />
  </StrictMode>,
)
export default Boot
