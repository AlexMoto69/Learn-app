import React, { useState } from 'react'
import MainMenu from './components/MainMenu'
import './App.css'
import Lessons from './pages/Lessons'
import Chatbot from './pages/Chatbot'
import Profile from './pages/Profile'
import Upload from './pages/Upload'

function Placeholder({ title, onBack }) {
  return (
    <div className="placeholder-root">
      <button className="back" onClick={() => onBack && onBack()}>⬅ Back</button>
      <h2>{title}</h2>
      <div className="placeholder-body">Content for {title} will go here.</div>
    </div>
  )
}

export default function App(){
  const [screen, setScreen] = useState('menu') // menu | lessons | daily | chatbot | friends

  function handleNavigate(to){
    setScreen(to === 'menu' ? 'menu' : to)
  }

  return (
    <div className="app-root">
      <MainMenu onNavigate={handleNavigate} />
      {screen === 'lessons' && <Lessons onBack={()=>handleNavigate('menu')} />}
      {screen === 'daily' && <Placeholder title="Daily Challenge" onBack={()=>handleNavigate('menu')} />}
      {screen === 'chatbot' && <Chatbot onBack={()=>handleNavigate('menu')} />}
      {screen === 'friends' && <Placeholder title="Friends" onBack={()=>handleNavigate('menu')} />}
      {screen === 'profile' && <Profile onBack={()=>handleNavigate('menu')} />}
      {screen === 'upload' && <Upload onBack={()=>handleNavigate('menu')} />}
    </div>
  )
}
