import React, { useMemo, useState, useEffect } from 'react'
import './Lessons.css'
import localLesson from '../data/lesson-1.json'

// fallback lesson data (used if the server is unreachable)
const FALLBACK_LESSON_DATA = localLesson

// import level images
import activeImg from '../assets/levels/activelevel.png'
import inactiveImg from '../assets/levels/inactivelevel.png'
import lockedImg from '../assets/levels/unlockedlevel.png'

export default function Lessons() {
  // We'll split questions into a fixed number of levels (configurable)
  const LEVEL_COUNT = 5

  // state to manage selected module: null = show modules list; otherwise load that module
  const [activeModule, setActiveModule] = useState(null)

  // state for lesson data fetched from server
  const [lesson, setLesson] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // fetch lesson data from backend when a module is selected
  useEffect(() => {
    const moduleToLoad = activeModule
    if (!moduleToLoad) return // don't load until user selects a module

    // Immediately show local fallback so offline editing works while we try to fetch
    setLesson(FALLBACK_LESSON_DATA)
    setLoading(false)

    // If query param offline=true OR explicit DEV flag, use local JSON immediately (useful for quick edits)
    const params = new URLSearchParams(window.location.search)
    const offlineParam = params.get('offline') === 'true'
    const useLocalInDev = process.env.NODE_ENV === 'development' && true // change to false to disable

    if (offlineParam || useLocalInDev) {
      // already set fallback above; skip network fetch
      return
    }

    const API = process.env.REACT_APP_API_URL || 'http://localhost:5000'
    const controller = new AbortController()
    const signal = controller.signal

    async function load() {
      setLoading(true)
      setError(null)

      // try a couple of common endpoint patterns used by backends
      const tries = [
        `${API}/api/lessons/${moduleToLoad}`,
        `${API}/api/lesson/${moduleToLoad}`,
        `${API}/lessons/${moduleToLoad}`,
        `${API}/lesson/${moduleToLoad}`,
      ]

      let success = false
      for (const url of tries) {
        try {
          const res = await fetch(url, { signal })
          if (!res.ok) {
            // try next
            continue
          }
          const json = await res.json()
          // basic validation: must have questions array
          if (json && Array.isArray(json.questions)) {
            setLesson(json)
            success = true
            break
          }
        } catch (e) {
          if (e.name === 'AbortError') return
          // continue to next URL
        }
      }

      if (!success) {
        setError('Nu am putut încărca lecția de pe server. Se folosește conținut local.')
        // fallback already set above
      }
      setLoading(false)
    }

    load()
    return () => controller.abort()
  }, [activeModule])

  // Use lesson questions if available, otherwise fall back to the local offline data so levels render reliably
  const questions = (lesson && Array.isArray(lesson.questions) && lesson.questions.length > 0)
    ? lesson.questions
    : (FALLBACK_LESSON_DATA.questions || [])

  // split questions into LEVEL_COUNT chunks (last may be shorter)
  const levels = useMemo(() => {
    if (questions.length === 0) return Array.from({ length: LEVEL_COUNT }, () => [])
    const per = Math.ceil(questions.length / LEVEL_COUNT)
    const out = []
    for (let i = 0; i < LEVEL_COUNT; i++) {
      const start = i * per
      const chunk = questions.slice(start, start + per)
      out.push(chunk)
    }
    return out
  }, [questions])

  // state: which level is unlocked (max index unlocked)
  const [unlockedLevel, setUnlockedLevel] = useState(0) // level 0 unlocked by default
  const [startedLevel, setStartedLevel] = useState(-1) // -1 means no level started
  const [levelsVisible, setLevelsVisible] = useState(false)

  // per-level question navigation state (only relevant for startedLevel)
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  // store per-question answered-correctness to avoid races with setState
  const answersRef = React.useRef({})
  // track whether the current in-memory selection is correct (fallback if answersRef isn't read yet)
  const currentSelectionCorrectRef = React.useRef(false)

  // measure top offset (height of the fixed menu) so the first node isn't hidden
  const [topOffset, setTopOffset] = useState(84)

  useEffect(() => {
    function calc() {
      try {
        const el = document.querySelector('.restricted-menu') || document.querySelector('.menu-header')
        const menuRect = el ? el.getBoundingClientRect() : { bottom: 0 }
        // measure button height (if available)
        const btn = document.querySelector('.level-btn')
        const btnH = btn ? Math.ceil(btn.getBoundingClientRect().height) : 0

        // desired padding (document pixels): menu bottom (viewport) + scrollY + button height + gap
        const gap = 24
        const desired = Math.ceil(menuRect.bottom + window.scrollY + btnH + gap)

        // apply immediately
        try {
          document.documentElement.style.setProperty('--lessons-top-offset', `${desired}px`)
          const root = document.querySelector('.lessons-root')
          if (root) root.style.paddingTop = `${desired}px`
        } catch (e) {}

        // re-check using rAF to ensure layout applied; retry a couple of times if still overlapping
        let attempts = 0
        const check = () => {
          attempts += 1
          const firstNode = document.querySelector('.map-item .map-node')
          const menuBottomNow = el ? el.getBoundingClientRect().bottom : 0
          if (firstNode && menuBottomNow) {
            const nodeTop = firstNode.getBoundingClientRect().top
            const desiredGap = 18
            const overlap = menuBottomNow + desiredGap - nodeTop
            if (overlap > 0) {
              const newPad = desired + overlap
              try {
                document.documentElement.style.setProperty('--lessons-top-offset', `${newPad}px`)
                const root = document.querySelector('.lessons-root')
                if (root) root.style.paddingTop = `${newPad}px`
              } catch (e) {}
              setTopOffset(newPad)
              return
            }
          }
          if (attempts < 3) requestAnimationFrame(check)
          else setTopOffset(desired)
        }
        requestAnimationFrame(check)
      } catch (e) {
        const fallback = 320
        setTopOffset(fallback)
        try { document.documentElement.style.setProperty('--lessons-top-offset', `${fallback}px`) } catch (e) {}
        const root = document.querySelector('.lessons-root')
        if (root) root.style.paddingTop = `${fallback}px`
      }
    }
    // run calc after a short timeout to allow initial layout to settle
    const id = window.setTimeout(calc, 40)
    window.addEventListener('resize', calc)
    return () => { window.clearTimeout(id); window.removeEventListener('resize', calc) }
  }, [activeModule, lesson])

  // helper to select a module and immediately populate offline data so levels show instantly
  function selectModule(id) {
    // set active module and immediately populate offline lesson so levels render right away
    setActiveModule(id)
    setLesson(FALLBACK_LESSON_DATA)
    setStartedLevel(-1)
    setQIndex(0)
    setUnlockedLevel(0)
    setLoading(false)
    setError(null)
    // clear in-memory selection correctness when loading module/demo
    try { currentSelectionCorrectRef.current = false } catch (e) {}
    // allow layout to adjust and force a recalculation of top offset
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      // dispatch a resize event so the layout calc runs and paddings update
      window.dispatchEvent(new Event('resize'))
      // ensure the level map is scrolled into view (in case of menu overlap)
      const el = document.querySelector('.level-map')
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      // mark levels visible
      setLevelsVisible(true)
    }, 80)
  }

  // clear answers when module changes
  useEffect(() => {
    answersRef.current = {}
  }, [activeModule])

  // derived
  const currentLevelQuestions = startedLevel >= 0 ? levels[startedLevel] : []
  const total = currentLevelQuestions.length
  const current = startedLevel >= 0 && total > 0 ? currentLevelQuestions[qIndex] : null

  // helper: start a level when its button is clicked
  function startLevel(i) {
    if (i < 0 || i >= LEVEL_COUNT) return
    if (i > unlockedLevel) return // locked
    if (levels[i].length === 0) return // empty level

    // clear previous answers for this level (avoid stale data)
    try {
      Object.keys(answersRef.current).forEach((k) => {
        if (k.startsWith(`${i}-`)) delete answersRef.current[k]
      })
    } catch (e) {}

    setStartedLevel(i)
    setQIndex(0)
    setSelected(null)
    setRevealed(false)
    // clear any tracked in-memory correctness for the new level
    try { currentSelectionCorrectRef.current = false } catch (e) {}
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function chooseOption(optIdx) {
    if (startedLevel < 0) return
    if (revealed) return
    setSelected(optIdx)
    setRevealed(true)
    // store correctness immediately in ref to avoid async state races
    try {
      const lvl = startedLevel
      const q = qIndex
      const question = (levels[lvl] && levels[lvl][q]) || null
      const correct = question ? (optIdx === question.correct_index) : false
      answersRef.current[`${lvl}-${q}`] = !!correct
      // also update currentSelectionCorrectRef for finish-time checks
      currentSelectionCorrectRef.current = !!correct
    } catch (e) {}
  }

  // navigate to previous question within the current started level (offline-safe)
  function prev() {
    if (startedLevel < 0) return
    if (qIndex > 0) {
      setQIndex((i) => Math.max(0, i - 1))
      setSelected(null)
      setRevealed(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function finishLevel() {
    // If the user just revealed the last question and it was correct, unlock the next level.
    try {
      if (startedLevel >= 0) {
        const lvl = startedLevel
        // Prefer the user's current question (qIndex) as the candidate for unlocking.
        // If it's not present, fall back to the last question in the level or any correct answer.
        const lastIdx = Math.max(0, total - 1)
        const candidateIdx = Math.min(Math.max(0, qIndex), lastIdx)
        const candidateKey = `${lvl}-${candidateIdx}`
        const candidateAnswered = Object.prototype.hasOwnProperty.call(answersRef.current, candidateKey)
        const candidateRaw = answersRef.current[candidateKey]
        const candidateCorrect = Boolean(candidateRaw)

        // also treat the current selected option or the tracked in-memory selection as a source of truth
        const isCurrentSelectionCorrect = (selected !== null && current && selected === current.correct_index) || currentSelectionCorrectRef.current

        // also check if any question in the level has a truthy (correct) value (fallback)
        const keys = Array.from({ length: total }, (_, idx) => `${lvl}-${idx}`)
        const anyCorrect = keys.some((k) => Boolean(answersRef.current[k]))

        console.log('finishLevel debug:', {
          lvl,
          total,
          qIndex,
          candidateKey,
          candidateAnswered,
          candidateRaw,
          candidateType: typeof candidateRaw,
          candidateCorrect,
          anyCorrect,
          isCurrentSelectionCorrect,
          answers: JSON.stringify(answersRef.current),
        })

        // Unlock if the candidate question is answered and considered correct (truthy),
        // or if the current in-memory selection is correct, or if any question in the level is truthy.
        if (((candidateAnswered && candidateCorrect) || isCurrentSelectionCorrect || anyCorrect) && lvl < LEVEL_COUNT - 1) {
          console.log('finishLevel: unlocking next level ->', lvl + 1)
          setUnlockedLevel((prev) => Math.max(prev, lvl + 1))
        } else {
          console.log('finishLevel: not unlocking (no correct answers recorded for this level)')
        }
      }
    } catch (e) {
      // ignore safety errors
    }

    // return to the level list view
    setStartedLevel(-1)
    setQIndex(0)
    setSelected(null)
    setRevealed(false)
    try { currentSelectionCorrectRef.current = false } catch (e) {}
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  // Modules list - simple for now. Expand as you add more modules.
  const modules = [
    { id: '1', title: 'Biologie', subtitle: 'Modulul 1' },
    // future modules: { id: '2', title: 'Matematică', icon: ... }
  ]

  // find active module metadata for header/title
  const activeModuleMeta = modules.find((m) => m.id === activeModule) || null

  // If no module selected, show modules list
  if (!activeModule) {
    return (
      <div className="lessons-root modules-root">
        <div className="lessons-header">
          <h3>Alege modul</h3>
        </div>
        <div className="modules-grid">
          {modules.map((m) => (
            <div key={m.id} className="module-card">
              <div className="module-title">{m.title}</div>
              <button className="module-btn" onClick={() => selectModule(m.id)} aria-label={`Deschide modul ${m.title}`}>
                <img src={inactiveImg} alt="" className="module-img default-img" />
                <img src={activeImg} alt="" className="module-img active-img" />
              </button>
              <div className="module-sub">{m.subtitle}</div>
            </div>
          ))}
        </div>
        <div style={{padding:'1rem', color:'var(--text, #e6eef8)'}}>
          (Folosește vizualizarea locală offline; intră într-un modul pentru a vedea nivelele.)
        </div>
      </div>
    )
  }

  // If module is selected but lesson data hasn't loaded yet, show a loader/message
  if (!lesson) {
    return (
      <div className="lessons-root" style={{ paddingTop: `${topOffset}px` }}>
        <div className="lessons-header">
          <button className="back-to-modules" onClick={() => { setActiveModule(null); setLesson(null); setLevelsVisible(false) }}>&larr; Module</button>
          <h3>{activeModuleMeta ? activeModuleMeta.title : `Module ${activeModule}`}</h3>
        </div>
        <div style={{ padding: '1.2rem', color: 'var(--text)' }}>
          Încarcare lecție... (folosind modul offline dacă este disponibil)
        </div>
      </div>
    )
  }

  return (
    <div className="lessons-root" style={{ paddingTop: `${topOffset}px` }}>
      <div className="lessons-header">
        <button className="back-to-modules" onClick={() => { setActiveModule(null); setLesson(null); setStartedLevel(-1); setLevelsVisible(false) }}>&larr; Module</button>
        <h3>{activeModuleMeta ? activeModuleMeta.title : `Module ${activeModule}`}</h3>
      </div>

      {/* small info to confirm loaded data (helps debugging offline) */}
      <div className="lesson-meta" style={{padding: '0.6rem 1rem', color: 'rgba(230,238,248,0.85)'}}>
         Întrebări: {questions.length} — Nivele: {levels.length}
       </div>

      {loading && (
        <div style={{ padding: '1rem', textAlign: 'center', color: 'var(--text, #e6eef8)' }}>
          Încărcare lecție...
        </div>
      )}
      {error && (
        <div style={{ padding: '1rem', textAlign: 'center', color: 'salmon' }}>{error}</div>
      )}

      {/* level strip - only show when not inside a started level */}
      {levelsVisible && startedLevel < 0 && levels.length > 0 && (
        // Changed layout: vertical "treasure map" style. visual only — same behavior.
        <div className="level-map" role="navigation" aria-label="Selectează nivel">
          {levels.map((lvl, i) => {
            const isLocked = i > unlockedLevel || lvl.length === 0
            const isActive = i === startedLevel
            return (
              <div key={i} className="map-item">
                <div className={"map-node" + (isLocked ? ' locked' : '') + (isActive ? ' active' : '')}>
                  <button
                    type="button"
                    className={"level-btn" + (isLocked ? ' locked' : '') + (isActive ? ' active' : '')}
                    onClick={() => startLevel(i)}
                    disabled={isLocked}
                    aria-current={isActive ? 'true' : 'false'}
                  >
                    {/* level images: default, active (hover/active), and locked */}
                    <img src={inactiveImg} alt="" aria-hidden="true" className="lvl-img default-img" />
                    <img src={activeImg} alt="" aria-hidden="true" className="lvl-img active-img" />
                    <img src={lockedImg} alt="" aria-hidden="true" className="lvl-img locked-img" />

                    {/* accessibility label for screen readers */}
                    <span className="visually-hidden">Nivel {i + 1}</span>
                  </button>
                </div>

                {/* connector between nodes - a vertical line with small dots */}
                {i < levels.length - 1 && (
                  <div className="connector" aria-hidden="true">
                    <span className="conn-dot top" />
                    <span className="conn-line" />
                    <span className="conn-dot bottom" />
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* prompt when no level started */}
      {startedLevel < 0 && (
        <div style={{ padding: '2rem 1rem', textAlign: 'center', color: 'var(--text, #e6eef8)' }}>
          <p>Apasă pe un nivel pentru a începe lecția.</p>
        </div>
      )}

      {/* lesson content for the started level */}
      {startedLevel >= 0 && current && (
        <article className="lesson-card">
          <div className="question">{current.question}</div>

          <div className="options">
            {current.options.map((opt, i) => {
              const isSelected = selected === i
              const correct = current.correct_index === i
              const revealClass = revealed ? (correct ? 'correct' : isSelected ? 'wrong' : '') : ''
              return (
                <button
                  type="button"
                  key={i}
                  className={'option ' + revealClass}
                  onClick={() => chooseOption(i)}
                  disabled={revealed}
                  aria-pressed={isSelected}
                >
                  <span className="opt-label">{opt}</span>
                </button>
              )
            })}
          </div>

          <div className="lesson-footer">
            <div className="explanation">
              {revealed ? (
                <>
                  <div className="result">
                    {selected === current.correct_index ? <b>Ai răspuns corect.</b> : <b>Răspuns corect: {current.options[current.correct_index]}</b>}
                  </div>
                  <p className="explain-text">{current.explanation}</p>
                </>
              ) : (
                <em>Alege o opțiune pentru a vedea explicația</em>
              )}
            </div>

            <div className="controls">
              <button type="button" onClick={prev} disabled={qIndex === 0} className="ctrl">
                Previous
              </button>

              <button
                type="button"
                onClick={finishLevel}
                disabled={!revealed}
                className="ctrl"
              >
                Finish
              </button>
            </div>
          </div>
        </article>
      )}

      {/* Visible debug banner to inspect unlocking state */}
      {startedLevel >= 0 && (
        (() => {
          const lvl = startedLevel
          const lastIdx = Math.max(0, (levels[lvl] || []).length - 1)
          const candidateIdx = Math.min(Math.max(0, qIndex), lastIdx)
          const candidateKey = `${lvl}-${candidateIdx}`
          const candidateAnswered = Object.prototype.hasOwnProperty.call(answersRef.current, candidateKey)
          const candidateRaw = answersRef.current[candidateKey]
          const candidateCorrect = Boolean(candidateRaw)
          const keys = Array.from({ length: (levels[lvl] || []).length }, (_, idx) => `${lvl}-${idx}`)
          const anyCorrect = keys.some((k) => Boolean(answersRef.current[k]))
          const isCurrentSelectionCorrect = (selected !== null && current && selected === current.correct_index) || currentSelectionCorrectRef.current
          return (
            <div style={{ padding: '0.5rem 1rem', background: 'rgba(0,0,0,0.18)', color: '#bfe8ff', fontSize: '.85rem' }}>
              <strong>Unlock debug:</strong>
              <span style={{ marginLeft: 8 }}>qIndex={qIndex}</span>
              <span style={{ marginLeft: 8 }}>candidateKey={candidateKey}</span>
              <span style={{ marginLeft: 8 }}>candidateAnswered={String(candidateAnswered)}</span>
              <span style={{ marginLeft: 8 }}>candidateRaw={String(candidateRaw)}</span>
              <span style={{ marginLeft: 8 }}>candidateCorrect={String(candidateCorrect)}</span>
              <span style={{ marginLeft: 8 }}>isCurrentSelectionCorrect={String(isCurrentSelectionCorrect)}</span>
              <span style={{ marginLeft: 8 }}>anyCorrect={String(anyCorrect)}</span>
              <span style={{ marginLeft: 8 }}>unlockedLevel={unlockedLevel}</span>
            </div>
          )
        })()
      )}
    </div>
  )
}