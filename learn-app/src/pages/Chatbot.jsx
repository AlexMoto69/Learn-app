import React, { useState, useRef, useEffect } from 'react'
import './Chatbot.css'

export default function Chatbot({ onBack = () => {} }){
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Salut! Sunt asistentul tău. Pune o întrebare despre lecție.' }
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const listRef = useRef(null)

  useEffect(() => {
    // scroll to bottom when messages change
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  function sendMessage(e){
    e?.preventDefault()
    if (!input.trim()) return
    const text = input.trim()
    const userMsg = { from: 'user', text }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setSending(true)

    // placeholder: simulate bot reply after a short delay
    setTimeout(() => {
      setMessages((m) => [...m, { from: 'bot', text: `Răspuns simulat: am primit "${text}"` }])
      setSending(false)
    }, 700)
  }

  return (
    <div className="chatbot-root">
      <div className="chatbot-header">
        <button className="back" onClick={() => onBack()}>⬅</button>
        <h3>Chatbot</h3>
      </div>

      <div className="chatbot-body">
        <div className="messages" ref={listRef} aria-live="polite">
          {messages.map((m, i) => (
            <div key={i} className={`msg ${m.from}`}>
              <div className="bubble">{m.text}</div>
            </div>
          ))}
        </div>

        <form className="chatbot-input" onSubmit={sendMessage}>
          <input value={input} onChange={(e)=>setInput(e.target.value)} placeholder="Scrie mesajul..." />
          <button type="submit" disabled={sending || !input.trim()}>{sending ? '...' : 'Trimite'}</button>
        </form>
      </div>
    </div>
  )
}

