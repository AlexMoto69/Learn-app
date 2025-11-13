import React, { useEffect, useState } from 'react'
import './Friends.css'
import { searchUsers, addFriend, removeFriend, listFriends, friendsStats, getUserPublic } from '../services/authService'

export default function Friends(){
  const [q, setQ] = useState('')
  const [results, setResults] = useState([])
  const [friends, setFriends] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState(null)
  const [profile, setProfile] = useState(null) // selected friend's public profile

  async function loadFriends(){
    try {
      const list = await listFriends(); setFriends(Array.isArray(list) ? list : [])
      try { const s = await friendsStats(); setStats(s) } catch {}
    } catch (e) { setError(e?.message || 'Eroare la încărcarea prietenilor') }
  }

  useEffect(() => { loadFriends() }, [])

  async function onSearch(e){
    e?.preventDefault?.()
    if (!q.trim()) { setResults([]); return }
    setLoading(true); setError(null)
    try { const data = await searchUsers(q.trim()); setResults(Array.isArray(data) ? data : []) } catch (e) { setError(e?.message || 'Eroare la căutare') } finally { setLoading(false) }
  }

  async function onAdd(id){
    try { await addFriend(id); await loadFriends(); await onSearch(); } catch (e) { setError(e?.message || 'Eroare la adăugare') }
  }

  async function onRemove(id){
    try { await removeFriend(id); await loadFriends(); await onSearch(); } catch (e) { setError(e?.message || 'Eroare la eliminare') }
  }

  const friendIds = new Set(friends.map(f => f.id))

  return (
    <div className="friends-root">
      <div className="friends-header"><h3 className="friends-title">Prieteni</h3></div>

      <div className="friends-grid">
        <section className="friends-card">
          <div className="friends-header" style={{marginBottom:'.25rem'}}>
            <h4 className="friends-title" style={{margin:0}}>Caută</h4>
          </div>
          <form onSubmit={onSearch} className="friends-search">
            <input className="friends-input" value={q} onChange={e=>setQ(e.target.value)} placeholder="Caută utilizatori (username sau email)" />
            <button className="btn" type="submit">Caută</button>
          </form>
        </section>

        {error && <div style={{ color:'salmon', marginBottom:'.5rem' }}>{error}</div>}

        <section className="friends-card">
          <h4 className="friends-title" style={{ marginTop:0 }}>Rezultate</h4>
          {loading ? <div>Se caută...</div> : (
            <ul className="flist">
              {results.map(u => (
                <li key={u.id} className="frow">
                  <div className="finfo" onClick={async ()=>{ try { const p = await getUserPublic(u.id); setProfile(p) } catch {} }} style={{ cursor:'pointer' }}>
                    <span className="favatar">👤</span>
                    <div className="fmeta">
                      <div className="fname">{u.username}</div>
                      {u.email && <div className="fstats">{u.email}</div>}
                    </div>
                  </div>
                  {friendIds.has(u.id) ? (
                    <button className="btn ghost" onClick={() => onRemove(u.id)}>Șterge</button>
                  ) : (
                    <button className="btn primary" onClick={() => onAdd(u.id)}>Adaugă</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="friends-card">
          <h4 className="friends-title" style={{ marginTop:0 }}>Prietenii mei</h4>
          {friends.length === 0 ? (
            <div style={{ opacity:.8 }}>Nu ai prieteni încă.</div>
          ) : (
            <ul className="flist">
              {friends.map(u => (
                <li key={u.id} className="frow">
                  <div className="finfo" onClick={async ()=>{ try { const p = await getUserPublic(u.id); setProfile(p) } catch {} }} style={{ cursor:'pointer' }}>
                    <span className="favatar">👥</span>
                    <div className="fmeta">
                      <div className="fname">{u.username}</div>
                    </div>
                  </div>
                  <button className="btn" onClick={() => onRemove(u.id)}>Șterge</button>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="friends-card">
          <h4 className="friends-title" style={{ marginTop:0 }}>Statistici prieteni</h4>
          {!stats ? (
            <div style={{ opacity:.8 }}>Se încarcă...</div>
          ) : (
            <div className="stats-grid">
              <div className="stat"><div className="label"><span className="sicon">👥</span> Număr prieteni</div><div className="value">{stats.count}</div></div>
              <div className="stat"><div className="label"><span className="sicon">⭐</span> Scor mediu</div><div className="value">{(stats.summary?.avg_score ?? 0).toFixed(1)}</div></div>
              <div className="stat"><div className="label"><span className="sicon">🏆</span> Top scor</div><div className="value">{stats.summary?.top_score ?? 0}{stats.summary?.top_user_id ? ` — #${stats.summary.top_user_id}` : ''}</div></div>
            </div>
          )}
        </section>
      </div>

      {profile && (
        <div className="modal" onClick={()=>setProfile(null)}>
          <div className="modal-card" onClick={(e)=>e.stopPropagation()}>
            <div className="modal-head">
              <h4 style={{margin:0}}>Profil — {profile?.username || 'Utilizator'}</h4>
              <button className="btn ghost" onClick={()=>setProfile(null)}>Închide</button>
            </div>
            <div className="stats-grid">
              <div className="stat"><div className="label"><span className="sicon">⭐</span> Scor total</div><div className="value">{profile?.total_score ?? 0}</div></div>
              <div className="stat"><div className="label"><span className="sicon">🔥</span> Streak curent</div><div className="value">{profile?.current_streak ?? 0}</div></div>
              <div className="stat"><div className="label"><span className="sicon">🏁</span> Streak maxim</div><div className="value">{profile?.longest_streak ?? 0}</div></div>
              <div className="stat"><div className="label"><span className="sicon">📚</span> Module finalizate</div><div className="value">{Array.isArray(profile?.completed_modules) ? profile.completed_modules.length : 0}</div></div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
