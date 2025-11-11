import React, { useMemo, useState } from 'react'
import './Lessons.css'

// initial lesson data (from backend)
const lessonData = {
  module: '1',
  questions: [
    {
      correct_index: 2,
      explanation:
        'Potrivit textului, organismul uman este organizat ierarhic și sistemele de organe reprezintă nivelul de organizare care include mai multe organe.',
      options: ['A. Celule', 'B. Organe', 'C. Sisteme de organe', 'D. Organism'],
      question: 'Care este nivelul de organizare care include sistemele de organe?',
      source_sentence: 1,
    },
    {
      correct_index: 0,
      explanation:
        'Potrivit textului, exemple de sisteme de organe sunt sistemul digestiv și sistemul nervos.',
      options: [
        'A. Sistem nervos și sistem endocrin',
        'B. Inimă, ficat',
        'C. Creier, măduva spinării',
        'D. Plămâni, rinichi',
      ],
      question: 'Care sunt exemple de sisteme de organe?',
      source_sentence: 1,
    },
    {
      correct_index: 0,
      explanation:
        'Potrivit textului, organismul uman este organizat ierarhic și celula reprezintă nivelul de organizare care include structură și funcție asemănătoare.',
      options: [
        'A. Sistem de organe',
        'B. Organism',
        'C. Organe',
        'D. Celule',
      ],
      question: 'Care este nivelul de organizare care include celule?',
      source_sentence: 1,
    },
    {
      correct_index: 1,
      explanation:
        'Potrivit textului, exemple de sisteme cu funcțiile de nutriție sunt sistemul digestiv și sistemul circulator.',
      options: [
        'A. Sistem nervos, sistem endocrin',
        'B. Digestiv, circulator, respirator, excretor',
        'C. Sistem reproducător masculin și feminin',
        'D. Sistem locomotor',
      ],
      question: 'Care sunt exemple de sisteme cu funcțiile de nutriție?',
      source_sentence: 2,
    },
    {
      correct_index: 1,
      explanation: 'Potrivit textului, exemplu de organ este plămânul sau rinichiul.',
      options: ['A. Sistem de organe', 'B. Organism', 'C. Organe', 'D. Celule'],
      question: 'Care este nivelul de organizare care include plămâni și rinichi?',
      source_sentence: 3,
    },
  ],
}

// import level images
import activeImg from '../assets/levels/activelevel.png'
import inactiveImg from '../assets/levels/inactivelevel.png'
import lockedImg from '../assets/levels/unlockedlevel.png'

export default function Lessons({ onBack = () => {} }) {
  // We'll split questions into a fixed number of levels (configurable)
  const LEVEL_COUNT = 5

  const questions = lessonData.questions || []

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

  // per-level question navigation state (only relevant for startedLevel)
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  // derived
  const currentLevelQuestions = startedLevel >= 0 ? levels[startedLevel] : []
  const total = currentLevelQuestions.length
  const current = startedLevel >= 0 && total > 0 ? currentLevelQuestions[qIndex] : null

  // helper: start a level when its button is clicked
  function startLevel(i) {
    if (i < 0 || i >= LEVEL_COUNT) return
    if (i > unlockedLevel) return // locked
    if (levels[i].length === 0) return // empty level

    setStartedLevel(i)
    setQIndex(0)
    setSelected(null)
    setRevealed(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function chooseOption(optIdx) {
    if (startedLevel < 0) return
    if (revealed) return
    setSelected(optIdx)
    setRevealed(true)

    // if last question in level and correct answer, unlock next level
    const isCorrect = current && current.correct_index === optIdx
    if (isCorrect && qIndex === total - 1 && startedLevel < LEVEL_COUNT - 1) {
      setUnlockedLevel((s) => Math.max(s, startedLevel + 1))
    }
  }

  function next() {
    if (startedLevel < 0) return
    if (!revealed) return // must answer to go next
    if (qIndex < total - 1) {
      setQIndex((i) => i + 1)
      setSelected(null)
      setRevealed(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else {
      // at last question and revealed -> finish level
      finishLevel()
    }
  }

  function prev() {
    if (startedLevel < 0) return
    if (qIndex > 0) {
      setQIndex((i) => i - 1)
      setSelected(null)
      setRevealed(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  function finishLevel() {
    // return to the level list view
    setStartedLevel(-1)
    setQIndex(0)
    setSelected(null)
    setRevealed(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  return (
    <div className="lessons-root">
      <div className="lessons-header">
        <h3>
          Module {lessonData.module} — Lecție {startedLevel >= 0 ? `${startedLevel + 1} · ${qIndex + 1}` : '-'}
        </h3>
      </div>

      {/* level strip - only show when not inside a started level */}
      {startedLevel < 0 && (
        <div className="level-strip" role="navigation" aria-label="Selectează nivel">
          {levels.map((lvl, i) => {
            const isLocked = i > unlockedLevel || lvl.length === 0
            const isActive = i === startedLevel
            return (
              <button
                type="button"
                key={i}
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
                onClick={next}
                disabled={!revealed}
                className="ctrl"
              >
                {qIndex < total - 1 ? 'Next' : 'Finish'}
              </button>
            </div>
          </div>
        </article>
      )}
    </div>
  )
}