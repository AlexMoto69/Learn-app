import React, { useState } from 'react'
import MainMenu from './components/MainMenu'
import './App.css'
import Lessons from './pages/Lessons'
import Chatbot from './pages/Chatbot'
import Profile from './pages/Profile'
import Upload from './pages/Upload'
import Daily from './pages/Daily'

function Placeholder({ title }) {
  return (
    <div className="placeholder-root">
      <h2>{title}</h2>
      <div className="placeholder-body">Content for {title} will go here.</div>
    </div>
  )
}

export default function App({ initialScreen = 'lessons' }){
  const [screen, setScreen] = useState(initialScreen) // menu | lessons | daily | chatbot | friends | profile | upload

  function handleNavigate(to){
    setScreen(to === 'menu' ? 'menu' : to)
  }

  return (
    <div className="app-root">
      <MainMenu onNavigate={handleNavigate} />
      {screen === 'lessons' && <Lessons />}
      {screen === 'daily' && <Daily />}
      {screen === 'chatbot' && <Chatbot />}
      {screen === 'friends' && <Placeholder title="Friends" />}
      {screen === 'profile' && <Profile />}
      {screen === 'upload' && <Upload />}
    </div>
  )
}
