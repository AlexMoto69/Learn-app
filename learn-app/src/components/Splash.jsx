import React, { useEffect, useState, useRef } from 'react'
import logo from '../assets/logo2.png'
import './Splash.css'

// Create a small grid of fragments positioned relative to the card center
const FRAG_COUNT = 12

export default function Splash({ onFinished, duration = 1200, exitDuration = 900 }) {
  const [exiting, setExiting] = useState(false)
  const [fragments, setFragments] = useState([])
  const containerRef = useRef(null)

  useEffect(() => {
    // Build fragments once
    const f = Array.from({ length: FRAG_COUNT }).map((_, i) => ({ id: i }))
    setFragments(f)

    // start exit after duration
    const t1 = setTimeout(() => setExiting(true), duration)
    // finish after duration + exitDuration
    const t2 = setTimeout(() => {
      if (onFinished) onFinished()
    }, duration + exitDuration)

    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [duration, exitDuration, onFinished])

  return (
    <div className={`splash-root ${exiting ? 'exiting' : ''}`} aria-hidden="true">
      <div className={`splash-overlay`} /> {/* background pseudo-layer now as real element */}
      <div className={`splash-card ${exiting ? 'exiting' : ''}`} ref={containerRef}>
        <img src={logo} alt="Logo" className="splash-logo" />
        {exiting && (
          <div className="fragments">
            {fragments.map((frag, idx) => (
              <div
                key={frag.id}
                className={`fragment shatter`}
                style={{ ['--i']: idx, animationDelay: `${idx * 60}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
