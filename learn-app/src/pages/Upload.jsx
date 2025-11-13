import React, { useState, useRef, useEffect } from 'react'
import './Upload.css'
import { uploadPdf, listPdfs, quizFromPdf, submitQuiz } from '../services/authService'

export default function Upload() {
  const [file, setFile] = useState(null)
  const [error, setError] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [docs, setDocs] = useState([])
  const [loadingDocs, setLoadingDocs] = useState(false)

  const [loadingQuiz, setLoadingQuiz] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const timerRef = useRef(null)

  const [questions, setQuestions] = useState([])
  const [qIndex, setQIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [revealed, setRevealed] = useState(false)
  const [report, setReport] = useState(null)
  const [currentDoc, setCurrentDoc] = useState(null)
  const [selections, setSelections] = useState({}) // map qIndex -> selected option index

  const inputRef = useRef(null)

  function onChoose(e) {
    const f = (e.target && e.target.files && e.target.files[0]) || null
    handleFile(f)
  }

  function handleFile(f) {
    setError(null)
    if (!f) return setFile(null)
    if (f.size > 10 * 1024 * 1024) { setError('Fișierul este prea mare (max 10 MB)'); return }
    const name = (f.name || '').toLowerCase()
    const isPdfMime = f.type === 'application/pdf'
    const hasPdfExt = name.endsWith('.pdf')
    if (!isPdfMime && !hasPdfExt) { setError('Doar fișiere PDF sunt permise'); return }
    setFile(f)
  }

  function onDrop(e) { e.preventDefault(); e.stopPropagation(); const f = (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) || null; handleFile(f) }
  function onDragOver(e) { e.preventDefault(); e.stopPropagation() }

  async function onUpload() {
    if (!file) return setError('Alege un fișier înainte de upload')
    setUploading(true); setError(null)
    try {
      await uploadPdf(file)
      setFile(null)
      await refreshDocs()
    } catch (e) {
      setError(e?.message || 'Eroare la upload')
    } finally {
      setUploading(false)
    }
  }

  async function refreshDocs(){
    setLoadingDocs(true)
    try { const list = await listPdfs(); setDocs(Array.isArray(list) ? list : []) } catch (e) { setError(e?.message || 'Eroare la listare') } finally { setLoadingDocs(false) }
  }

  useEffect(() => { refreshDocs() }, [])

  async function startQuiz(doc){
    setCurrentDoc(doc)
    setQuestions([])
    setReport(null)
    setQIndex(0); setSelected(null); setRevealed(false); setSelections({})
    setLoadingQuiz(true); setElapsed(0)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    try {
      const data = await quizFromPdf(doc.id, { count: 5 })
      const qsRaw = Array.isArray(data?.questions) ? data.questions : []
      const qs = qsRaw.map(q => ({
        ...q,
        // coerce correct_index to a number when possible
        correct_index: Number.isFinite(Number(q?.correct_index)) ? Number(q.correct_index) : q?.correct_index
      }))
      if (!qs.length) {
        setError(data?.msg || 'Nu am primit întrebări din document.')
      }
      setQuestions(qs)
    } catch (e) {
      setError(e?.message || 'Eroare la generarea quiz-ului')
    } finally {
      setLoadingQuiz(false)
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null }
    }
  }

  function choose(i){
    if (!questions[qIndex] || revealed) return;
    setSelected(i);
    setRevealed(true);
    setSelections(prev => ({ ...prev, [qIndex]: i }));
  }

  async function finish(){
    const total = questions.length
    let correct = 0
    const items = questions.map((q, i) => {
      const sel = selections[i]
      const ok = (typeof sel === 'number') && sel === Number(q.correct_index)
      if (ok) correct++
      return {
        index: i+1,
        question: q.question,
        options: q.options,
        correct_index: Number.isFinite(Number(q.correct_index)) ? Number(q.correct_index) : q.correct_index,
        selected_index: (typeof sel === 'number' ? sel : null),
        explanation: q.explanation || '',
        result: ok ? 'correct' : 'wrong'
      }
    })
    try { await submitQuiz({ questions_correct: correct, questions_total: total }) } catch (e) { void e }
    setReport({ summary: { correct, total, doc: currentDoc?.filename }, items })
  }

  return (
    <div className="upload-root">
      <div className="upload-card">
        <h2>Upload document</h2>
        <div className="dropzone" onDrop={onDrop} onDragOver={onDragOver} onClick={() => inputRef.current && inputRef.current.click()} role="button" tabIndex={0}>
          <input ref={inputRef} type="file" onChange={onChoose} accept="application/pdf,.pdf" hidden />
          {!file ? (
            <div className="dz-empty">
              <div className="dz-icon">📤</div>
              <div>Trage un fișier aici sau dă click pentru a alege</div>
              <div className="dz-note">Max 10 MB. Tipuri acceptate: PDF doar</div>
            </div>
          ) : (
            <div className="dz-hasfile">
              <div className="file-meta">
                <div className="file-name">{file.name}</div>
                <div className="file-info">{(file.size / 1024).toFixed(1)} KB — {file.type || 'unknown'}</div>
              </div>
            </div>
          )}
        </div>
        {error && <div className="upload-error">{error}</div>}
        <div className="upload-actions">
          <button className="btn" onClick={() => { inputRef.current && (inputRef.current.value = null); setFile(null) }}>Clear</button>
          <button className="btn primary" onClick={onUpload} disabled={!file || uploading}>{uploading ? 'Uploading...' : 'Upload'}</button>
        </div>

        <div style={{marginTop:16}}>
          <h3>Documentele mele</h3>
          {loadingDocs ? (
            <div style={{opacity:.8}}>Se încarcă lista...</div>
          ) : docs.length === 0 ? (
            <div style={{opacity:.7}}>Nu ai încă documente încărcate.</div>
          ) : (
            <ul style={{ listStyle:'none', margin:0, padding:0, display:'grid', gap:'.5rem' }}>
              {docs.map(doc => (
                <li key={doc.id} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:'.5rem', padding:'.5rem .75rem', border:'1px solid rgba(255,255,255,0.06)', borderRadius:8 }}>
                  <div style={{ display:'flex', flexDirection:'column' }}>
                    <span style={{ fontWeight:600 }}>{doc.filename}</span>
                    <span style={{ opacity:.8, fontSize:'.9rem' }}>Încărcat: {new Date(doc.created_at).toLocaleString()}</span>
                  </div>
                  <button className="btn" onClick={() => startQuiz(doc)}>Generează quiz</button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {loadingQuiz && (
          <article className="lesson-card" style={{ marginTop:16 }}>
            <div className="loading-panel">
              <div className="spinner" aria-hidden="true" />
              <div className="loading-text">Se generează quiz-ul...<div className="elapsed">{elapsed}s</div></div>
              <button className="cancel-btn" onClick={() => { setLoadingQuiz(false); if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null } }}>Anulează</button>
            </div>
          </article>
        )}

        {!loadingQuiz && questions.length > 0 && !report && (
          <article className="lesson-card" style={{ marginTop:16 }}>
            <div className="question">{questions[qIndex]?.question}</div>
            <div className="options">
              {questions[qIndex]?.options?.map((opt, i) => {
                const isSelected = selected === i
                const correct = Number(questions[qIndex]?.correct_index) === i
                const state = revealed ? (correct ? 'correct' : isSelected ? 'wrong' : '') : ''
                return (
                  <button key={i} className={'option ' + state} disabled={revealed} onClick={() => choose(i)}>{opt}</button>
                )
              })}
            </div>
            <div className="lesson-footer">
              {revealed ? (
                <div className="explanation">
                  <div className="result">{selected === questions[qIndex]?.correct_index ? 'Corect!' : 'Răspuns corect: ' + (questions[qIndex]?.options?.[questions[qIndex]?.correct_index] ?? '—')}</div>
                  {/* ensure index is number for lookup */}
                  {/* no change in visible text needed otherwise */}
                  {questions[qIndex]?.explanation && <p className="explain-text">{questions[qIndex]?.explanation}</p>}
                </div>
              ) : (
                <em>Alege o opțiune</em>
              )}
              <div className="controls">
                <button disabled={qIndex === 0} onClick={() => { setQIndex(i=>i-1); setSelected(null); setRevealed(false) }}>Previous</button>
                <button onClick={() => {
                  if (qIndex < questions.length - 1) { setQIndex(i=>i+1); setSelected(null); setRevealed(false) }
                  else { finish() }
                }}>{qIndex < questions.length - 1 ? 'Next' : 'Finish'}</button>
              </div>
            </div>
          </article>
        )}

        {report && (
          <div className="report-root" style={{ marginTop:16 }}>
            <div className="report-header">
              <h4>Raport — {currentDoc?.filename || 'Document'}</h4>
              <div className="report-score">Corecte: {report.summary.correct} / {report.summary.total}</div>
            </div>
            <div className="report-list">
              {report.items.map((it) => {
                const sel = (typeof it.selected_index === 'number') ? it.options[it.selected_index] : '—';
                const corr = it.options[it.correct_index] ?? '—';
                return (
                  <div key={it.index} className={'report-item ' + it.result}>
                    <div className="rep-q">{it.index}. {it.question}</div>
                    <div className="rep-a">Răspunsul tău: <b>{sel}</b> {it.result === 'correct' ? '✅' : '❌'}</div>
                    <div className="rep-c">Răspuns corect: <b>{corr}</b></div>
                    {it.explanation && <div className="rep-e">Explicație: {it.explanation}</div>}
                  </div>
                )
              })}
            </div>
            <div className="report-actions">
              <button className="btn" onClick={() => {
                setReport(null); setQuestions([]); setQIndex(0); setSelected(null); setRevealed(false);
              }}>Închide</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
