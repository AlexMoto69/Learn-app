import React, { useState, useRef, useEffect } from 'react'
import './Chatbot.css'

export default function Chatbot({ onBack = () => {} }){
  const [messages, setMessages] = useState([
    { from: 'bot', text: 'Salut! Sunt asistentul tău. Pune o întrebare despre lecție.' }
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  // moduleInput preserved for payload; default to 'all' (no visible control)
  const [moduleInput] = useState('all')
  const listRef = useRef(null)

  useEffect(() => {
    // scroll to bottom when messages change
    if (listRef.current) listRef.current.scrollTop = listRef.current.scrollHeight
  }, [messages])

  function parseModuleInput(text) {
    const t = (text || '').trim()
    if (!t) return 'all'
    if (t.toLowerCase() === 'all') return 'all'
    // comma separated list -> array of numbers
    if (t.includes(',')) {
      const arr = t.split(',').map(s => { const n = parseInt(s.trim(), 10); return isNaN(n) ? null : n }).filter(Boolean)
      return arr.length ? arr : 'all'
    }
    const n = parseInt(t, 10)
    if (!isNaN(n)) return n
    return t
  }

  async function sendMessage(e){
    e?.preventDefault()
    if (!input.trim()) return
    const text = input.trim()

    // append user message immediately
    const userMsg = { from: 'user', text }
    setMessages((m) => [...m, userMsg])
    setInput('')
    setSending(true)

    // prepare payload
    const payload = {
      prompt: text,
      module: parseModuleInput(moduleInput)
    }

    try {
      const res = await fetch('http://127.0.0.1:5000/api/chatbot/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // ...(accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {})
        },
        body: JSON.stringify(payload)
      })

      if (!res.ok) {
        // try to read error message and show it as a bot reply
        let errText = `Server error: ${res.status}`
        try { const j = await res.json(); if (j && j.error) errText = j.error } catch (_) {}
        setMessages((m) => [...m, { from: 'bot', text: `Server error: ${errText}` }])
        return
      }

      const data = await res.json()
      const reply = (data && (data.reply || data.answer || data.message)) || 'Răspuns gol de la server.'
      setMessages((m) => [...m, { from: 'bot', text: reply }])

    } catch (err) {
      console.error('Chatbot request failed:', err)
      // fallback simulated reply
      setMessages((m) => [...m, { from: 'bot', text: `Răspuns (demo): nu am putut contacta serverul. Mesaj local: ${err.message || err}` }])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="chatbot-root">
      <div className="chatbot-header">
        <button className="back" onClick={() => onBack()}>⬅</button>
        <h3>Chatbot</h3>

        {/* No extra controls here: only chat box visible; moduleInput kept default 'all' for payload */}
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
