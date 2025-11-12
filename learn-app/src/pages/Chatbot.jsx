import React, { useState, useRef, useEffect } from 'react'
import './Chatbot.css'
import { sendChat } from '../services/authService'

export default function Chatbot(){
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Salut! Sunt asistentul tău. Pune o întrebare despre lecție.' }
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  // module selection hidden; default to 'all' so backend uses allowed modules for the user
  const moduleValue = 'all'
  const listRef = useRef(null)

  useEffect(() => {
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  function buildHistory() {
    // convert local messages into minimal history format
    return messages
      .filter(m => m.from === 'user' || m.from === 'bot')
      .map(m => ({ from: m.from, text: m.text }))
  }

  async function sendMessage(e){
    e?.preventDefault()
    if (!input.trim()) return
    const text = input.trim()

    const userMsg = { from: 'user', text }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setSending(true)

    try {
      const data = await sendChat({ prompt: text, module: moduleValue, history: buildHistory() })
      const reply = (data && (data.reply || data.answer || data.message)) || 'Răspuns gol de la server.'
      setMessages((m) => [...m, { from: 'bot', text: reply }])
    } catch (err) {
      const msg = err?.message || 'Eroare de rețea.'
      setMessages((m) => [...m, { from: 'bot', text: `Eroare: ${msg}` }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="chatbot-root">
      <div className="chatbot-header">
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
