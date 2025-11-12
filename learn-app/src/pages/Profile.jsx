import React, { useEffect, useState } from 'react'
import './Profile.css'
import logo from '../assets/logo2.png'
import { getProfile, updateProfile } from '../services/authService'

export default function Profile({ onBack = () => {} }) {
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)

  // editable fields
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')

  // Fetch profile from backend
  async function fetchProfile() {
    setLoading(true); setError('')
    try {
      const token = localStorage.getItem('access_token')
      if (!token) { setError('Not authenticated. Please log in.'); setLoading(false); return }
      const data = await getProfile(token)
      setProfile(data)
      setUsername(data.username || '')
      setEmail(data.email || '')
    } catch (e) {
      setError(e?.message || 'Failed to load profile')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetchProfile() }, [])

  async function saveProfile() {
    setLoading(true); setError('')
    try {
      const token = localStorage.getItem('access_token')
      const body = { username, email }
      const res = await updateProfile(body, token)
      // server returns { msg, updated, user }
      if (res?.user) {
        setProfile(res.user)
        // sync local user cache if present
        try { localStorage.setItem('user', JSON.stringify(res.user)) } catch { /* ignore quota */ }
      }
      setEditing(false)
      // automatically refresh from server to ensure latest computed fields
      await fetchProfile()
    } catch (e) {
      setError(e?.message || 'Failed to save profile')
    } finally { setLoading(false) }
  }

  const totalScore = profile?.total_score ?? 0
  const streak = profile?.current_streak ?? 0
  const longest = profile?.longest_streak ?? 0
  const modulesCompleted = Array.isArray(profile?.completed_modules) ? profile.completed_modules.length : 0
  const modulesInProgress = Array.isArray(profile?.modules_in_progress) ? profile.modules_in_progress.length : 0
  const completedList = Array.isArray(profile?.completed_modules) ? profile.completed_modules : []
  const progressList = Array.isArray(profile?.modules_in_progress) ? profile.modules_in_progress : []
  const completedListLabel = modulesCompleted ? `module ${completedList.join(', ')}` : '—'
  const progressListLabel = modulesInProgress ? `module ${progressList.join(', ')}` : '—'

  return (
    <div className="profile-root">
      <button className="back" onClick={onBack}>⬅ Back</button>

      <div className="profile-card">
        <img src={logo} alt="avatar" className="profile-avatar" />

        <div className="profile-info">
          <div className="profile-header">
            <h2 className="profile-name">{profile?.username || username || '—'}</h2>
            <div className="profile-email">{profile?.email || email || '—'}</div>
          </div>

          {error && (
            <div className="profile-error" role="alert">{error}</div>
          )}

          <div className="profile-stats">
            <div className="stat stat--score">
              <div className="stat-top">
                <span className="stat-icon" aria-hidden>⭐</span>
                <span className="stat-title">Total score</span>
              </div>
              <div className="stat-value">{totalScore}</div>
            </div>

            <div className="stat stat--streak">
              <div className="stat-top">
                <span className="stat-icon" aria-hidden>🔥</span>
                <span className="stat-title">Streak</span>
              </div>
              <div className="stat-value">{streak}</div>
              <div className="stat-note">Longest: {longest}</div>
            </div>

            <div className="stat stat--completed">
              <div className="stat-top">
                <span className="stat-icon" aria-hidden>✅</span>
                <span className="stat-title">Completed</span>
              </div>
              <div className="stat-value">{modulesCompleted}</div>
              <div className="stat-sub">{completedListLabel}</div>
            </div>

            <div className="stat stat--progress">
              <div className="stat-top">
                <span className="stat-icon" aria-hidden>⏳</span>
                <span className="stat-title">In progress</span>
              </div>
              <div className="stat-value">{modulesInProgress}</div>
              <div className="stat-sub">{progressListLabel}{modulesInProgress ? ' in progress' : ''}</div>
            </div>
          </div>

          {!editing ? (
            <div className="profile-actions">
              <button className="btn" onClick={() => setEditing(true)} disabled={loading}>Edit</button>
              {/* Removed manual Refresh button; data refreshes on mount and after save */}
            </div>
          ) : (
            <div className="profile-edit">
              <label>
                Username
                <input value={username} onChange={(e) => setUsername(e.target.value)} />
              </label>
              <label>
                Email
                <input value={email} onChange={(e) => setEmail(e.target.value)} />
              </label>
              <div className="profile-edit-actions">
                <button className="btn" onClick={saveProfile} disabled={loading}>Save</button>
                <button className="btn ghost" onClick={() => setEditing(false)}>Cancel</button>
              </div>
            </div>
          )}

          {loading && <div className="profile-loading">Loading…</div>}
        </div>
      </div>
    </div>
  )
}
