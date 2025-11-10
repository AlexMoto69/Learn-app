import React, { useState } from 'react'
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

export default function Lessons({ onBack = () => {} }) {
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)

  const questions = lessonData.questions || []
  const total = questions.length
  const current = questions[index]

  function goTo(i) {
    if (i < 0 || i >= total) return
    setIndex(i)
    setSelected(null)
    setRevealed(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function chooseOption(optIdx) {
    if (revealed) return
    setSelected(optIdx)
    setRevealed(true)
  }

  function next() {
    if (index < total - 1) goTo(index + 1)
  }

  function prev() {
    if (index > 0) goTo(index - 1)
  }

  return (
    <div className="lessons-root">
      <div className="lessons-header">
        <button className="back small" onClick={onBack}>⬅</button>
        <h3>Module {lessonData.module} — Lecție {index + 1}</h3>
      </div>

      <div className="progress-dots" role="navigation" aria-label="Navigare lecții">
        {questions.map((q, i) => {
          const isActive = i === index
          const done = i < index || (i === index && revealed)
          return (
            <button
              key={i}
              className={"dot" + (isActive ? ' active' : '') + (done ? ' done' : '')}
              onClick={() => goTo(i)}
              aria-current={isActive ? 'true' : 'false'}
              aria-label={`Lecția ${i + 1}`}>
              <span className="dot-number">{i + 1}</span>
            </button>
          )
        })}
      </div>

      <article className="lesson-card">
        <div className="question">{current.question}</div>

        <div className="options">
          {current.options.map((opt, i) => {
            const isSelected = selected === i
            const correct = current.correct_index === i
            const revealClass = revealed ? (correct ? 'correct' : isSelected ? 'wrong' : '') : ''
            return (
              <button
                key={i}
                className={"option " + revealClass}
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
                  {selected === current.correct_index ? (
                    <b>Ai răspuns corect.</b>
                  ) : (
                    <b>Răspuns corect: {current.options[current.correct_index]}</b>
                  )}
                </div>
                <p className="explain-text">{current.explanation}</p>
              </>
            ) : (
              <em>Alege o opțiune pentru a vedea explicația</em>
            )}
          </div>

          <div className="controls">
            <button onClick={prev} disabled={index === 0} className="ctrl">Previous</button>
            <button onClick={next} disabled={index === total - 1} className="ctrl">Next</button>
          </div>
        </div>
      </article>
    </div>
  )
}

