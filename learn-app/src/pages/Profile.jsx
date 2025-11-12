import React, { useState, useEffect } from 'react'
import './Profile.css'
import logo from '../assets/logo2.png'

export default function Profile({ onBack = () => {} }) {
  // demo offline profile state
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState('Demo User')
  const [email, setEmail] = useState('demo@example.com')

  // new demo progress/stats (keep only these per request)
  const [streak, setStreak] = useState(3)
  const [modulesCompleted, setModulesCompleted] = useState(1)

  // UI status
  const [statusMsg, setStatusMsg] = useState('')
  const [syncedFromServer, setSyncedFromServer] = useState(false)

  // load local data on mount (so editing works offline)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('profile_demo')
      if (raw) {
        const obj = JSON.parse(raw)
        if (obj.name) setName(obj.name)
        if (obj.email) setEmail(obj.email)
        if (typeof obj.streak === 'number') setStreak(obj.streak)
        if (typeof obj.modulesCompleted === 'number') setModulesCompleted(obj.modulesCompleted)
        setStatusMsg('Loaded local profile (offline)')
        setSyncedFromServer(false)
      }
    } catch (e) {
      // ignore
    }
  }, [])

  async function loadFromServer() {
    setStatusMsg('Încerc să încarc profilul de pe server...')
    try {
      // Use credentials: 'include' so a server-set HttpOnly cookie can be used for auth.
      const res = await fetch('http://localhost:5000/auth/profile', { method: 'GET', credentials: 'include' })
      if (!res.ok) {
        setStatusMsg(`Server răspunde cu status ${res.status}`)
        return
      }
      const j = await res.json()
      // map server fields to local state if present
      if (j.name) setName(j.name)
      if (j.email) setEmail(j.email)
      if (typeof j.streak === 'number') setStreak(j.streak)
      if (typeof j.modulesCompleted === 'number') setModulesCompleted(j.modulesCompleted)
      setSyncedFromServer(true)
      setStatusMsg('Profil încărcat de pe server')
      // also persist locally as cache
      try { localStorage.setItem('profile_demo', JSON.stringify({ name: j.name || name, email: j.email || email, streak: j.streak || streak, modulesCompleted: j.modulesCompleted || modulesCompleted })) } catch (e) {}
    } catch (e) {
      console.error(e)
      setStatusMsg('Nu am putut contacta serverul (folosesc modul offline)')
    }
  }

  async function save() {
    const payload = { name, email, streak, modulesCompleted }
    setEditing(false)
    // try to send to server first (server should handle auth via cookie/httpOnly)
    try {
      const res = await fetch('http://localhost:5000/auth/profile', {
        method: 'POST', // or PUT depending on backend
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload)
      })
      if (res.ok) {
        setStatusMsg('Profil salvat pe server')
        setSyncedFromServer(true)
        try { localStorage.setItem('profile_demo', JSON.stringify(payload)) } catch (e) {}
        return
      } else {
        // server returned error; fallback to local save
        setStatusMsg(`Server error: ${res.status} — salvare locală`)
      }
    } catch (e) {
      console.error('Save to server failed:', e)
      setStatusMsg('Eroare la salvare pe server — salvare locală')
    }

    // fallback: save to localStorage so edits persist offline
    try {
      localStorage.setItem('profile_demo', JSON.stringify(payload))
      setSyncedFromServer(false)
      setStatusMsg('Profil salvat local (offline)')
    } catch (e) {
      console.error('Local save failed', e)
      setStatusMsg('Eroare la salvare locală')
    }
  }

  function resetProgress() {
    setStreak(0)
    setModulesCompleted(0)
    setStatusMsg('Progres resetat (nu salvat automat)')
  }

  function exportProfile() {
    const payload = { name, email, streak, modulesCompleted }
    const text = JSON.stringify(payload, null, 2)
    // try clipboard first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        alert('Profile JSON copied to clipboard (demo)')
      }).catch(() => {
        // fallback to download
        const blob = new Blob([text], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `${name.replace(/\s+/g, '_') || 'profile'}_profile.json`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      })
    } else {
      const blob = new Blob([text], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${name.replace(/\s+/g, '_') || 'profile'}_profile.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    }
  }

  return (
    <div className="profile-root">
      <button className="back" onClick={onBack}>⬅ Back</button>

      <div className="profile-card">
        <img src={logo} alt="avatar" className="profile-avatar" />

        <div className="profile-info">
          <div className="profile-sync">
            <button className="btn small" onClick={loadFromServer}>Load from server</button>
            <span style={{marginLeft:12}}>{syncedFromServer ? 'Synced from server' : 'Local / offline'}</span>
          </div>

          {!editing ? (
            <>
              <h2 className="profile-name">{name}</h2>
              <div className="profile-email">{email}</div>

              <div className="profile-stats">
                <div className="stat">
                  <div className="stat-value">{streak}</div>
                  <div className="stat-label">Streak (days)</div>
                </div>
                <div className="stat">
                  <div className="stat-value">{modulesCompleted}</div>
                  <div className="stat-label">Modules completed</div>
                </div>
              </div>

              <div className="profile-actions">
                <button className="btn" onClick={() => setEditing(true)}>Edit profile</button>
                <button className="btn ghost" onClick={exportProfile}>Export JSON</button>
                <button className="btn small" onClick={save} style={{marginLeft:8}}>Save</button>
              </div>

              <div className="profile-controls">
                <button className="btn small" onClick={() => setStreak((s) => s + 1)}>+ Day (streak)</button>
                <button className="btn small" onClick={() => setModulesCompleted((m) => m + 1)}>Complete module</button>
                <button className="btn small" onClick={resetProgress}>Reset progress</button>
              </div>
            </>
          ) : (
            <div className="profile-edit">
              <label>
                Name
                <input value={name} onChange={(e) => setName(e.target.value)} />
              </label>
              <label>
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <div className="profile-edit-actions">
                <button className="btn" onClick={save}>Save</button>
                <button className="btn ghost" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          )}

          <div style={{marginTop:12,color:'rgba(200,220,240,0.75)'}}>{statusMsg}</div>

        </div>
      </div>
    </div>
  )
}
