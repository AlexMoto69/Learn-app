import React, { StrictMode, useState } from 'react'
import { createRoot } from 'react-dom/client'
import Login from './LoginRegister/Login.jsx'
import Register from './LoginRegister/Register.jsx'
import Splash from './components/Splash.jsx'
import './index.css'
import App from './App.jsx'
import logo2 from './assets/logo2.png'

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

// Set app favicon to logo2.png (Vite will resolve the asset URL)
(function setFavicon(){
  try {
    let link = document.querySelector("link[rel='icon']");
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.type = 'image/png';
    link.href = logo2;
  } catch (e) { void e }
})();

// dynamically measure the visible header/menu height and expose it to CSS via --app-header-height
function setAppHeaderHeight() {
  try {
    // prefer the fixed centered bar if present
    const header = document.querySelector('.restricted-menu') || document.querySelector('.menu-header')
    if (header instanceof HTMLElement) {
      const h = header.offsetHeight || header.getBoundingClientRect().height || 0
      document.documentElement.style.setProperty('--app-header-height', `${Math.round(h)}px`)
      return h
    }
  } catch (e) {
    // ignore errors
  }
  return null
}

// run shortly after mount
setTimeout(() => setAppHeaderHeight(), 120)
window.addEventListener('resize', () => setAppHeaderHeight())

export default Boot
