import React, { useState } from 'react'
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

  function save() {
    // in real app send to backend as JSON; here just log and exit edit mode
    const payload = { name, email, streak, modulesCompleted }
    console.log('Save profile (demo):', payload)
    setEditing(false)
  }

  function resetProgress() {
    setStreak(0)
    setModulesCompleted(0)
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

        </div>
      </div>
    </div>
  )
}
