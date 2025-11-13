import React, { useEffect, useRef, useState } from 'react';
import './Lessons.css';
import { getDailyQuiz, submitQuiz, getProfile } from '../services/authService';

export default function Daily(){
  const QUIZ_QUESTION_COUNT = 5;

  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef(null);
  const abortRef = useRef(null);

  const [error, setError] = useState(null);
  const [questions, setQuestions] = useState([]);

  const [qIndex, setQIndex] = useState(0);
  const [selected, setSelected] = useState(null);
  const [revealed, setRevealed] = useState(false);

  const [dailyNote, setDailyNote] = useState(null);
  const [alreadyDoneToday, setAlreadyDoneToday] = useState(false);

  const answersRef = useRef({});
  const selectionsRef = useRef({});

  const current = questions[qIndex] || null;

  useEffect(() => {
    (async () => {
      try {
        const prof = await getProfile();
        const last = prof?.last_daily_quiz_date;
        if (typeof last === 'string' && last.trim()) {
          const today = new Date();
          const isoToday = today.toISOString().slice(0,10);
          if (last.slice(0,10) === isoToday) setAlreadyDoneToday(true);
        }
      } catch (e) { void e; }
    })();
    return () => { if (timerRef.current) clearInterval(timerRef.current) };
  }, []);

  useEffect(() => () => { if (timerRef.current) clearInterval(timerRef.current) }, []);

  async function loadDaily({ another } = {}){
    setError(null);
    setDailyNote(null);
    setQuestions([]);
    setQIndex(0); setSelected(null); setRevealed(false);

    setLoading(true); setElapsed(0);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000);

    if (abortRef.current) { try { abortRef.current.abort(); } catch (err) { void err; } }
    abortRef.current = new AbortController();

    try {
      const data = await getDailyQuiz({ signal: abortRef.current.signal, another: !!another });
      if (data?.already_completed_today && (!Array.isArray(data?.questions) || data.questions.length === 0)) {
        setError(data?.msg || 'Deja ți-ai făcut Daily-ul de astăzi. Îți pot genera încă unul.');
        setQuestions([]);
      } else {
        const qs = Array.isArray(data?.questions) ? data.questions.slice(0, QUIZ_QUESTION_COUNT) : [];
        if (!qs.length) {
          setError(data?.msg || 'Nu am primit întrebări pentru Daily Challenge.');
        } else {
          if (data?.already_completed_today) {
            setDailyNote('Deja ți-ai făcut Daily-ul de astăzi. Ți-am generat încă un set de întrebări.');
          }
          setQuestions(qs);
        }
      }
    } catch (e) {
      if (e?.name === 'AbortError') { return; }
      const msg = e?.message || 'Eroare de rețea';
      setError(`Eroare: ${msg}`);
    } finally {
      setLoading(false);
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
      abortRef.current = null;
    }
  }

  function cancel(){
    setLoading(false);
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    if (abortRef.current) { try { abortRef.current.abort(); } catch (err) { void err; } abortRef.current = null; }
    setDailyNote(null);
  }

  function chooseAnswer(i){
    if (!current || revealed) return;
    setSelected(i); setRevealed(true);
    const key = `${qIndex}`;
    selectionsRef.current[key] = i;
    answersRef.current[key] = (i === current.correct_index);
  }

  async function finish(){
    const total = questions.length;
    let correct = 0;
    const items = questions.map((q, i) => {
      const sel = selectionsRef.current[String(i)];
      const ok = sel === q.correct_index; if (ok) correct++;
      return { index: i+1, question: q.question, options: q.options, correct_index: q.correct_index, selected_index: (typeof sel==='number'?sel:null), explanation: q.explanation || '', result: ok?'correct':'wrong' };
    });

    try {
      await submitQuiz({ questions_correct: correct, questions_total: total, daily: true });
      setAlreadyDoneToday(true);
    } catch(err){ void err; }

    setReport({ summary: { correct, total }, items });
  }

  const [report, setReport] = useState(null);

  function download(){
    try {
      const lines = [];
      const header = `Daily Challenge — Corecte: ${report.summary.correct}/${report.summary.total}`;
      lines.push(header, '');
      report.items.forEach(item => {
        const sel = item.selected_index;
        const selText = (typeof sel === 'number' && item.options[sel] !== undefined) ? item.options[sel] : '—';
        const correctText = item.options[item.correct_index] ?? '—';
        lines.push(`Q${item.index}. ${item.question}`);
        lines.push(`  Răspunsul tău: ${selText}${item.result === 'correct' ? ' ✅' : ' ❌'}`);
        lines.push(`  Răspuns corect: ${correctText}`);
        if ((item.explanation || '').trim()) lines.push(`  Explicație: ${item.explanation.trim()}`);
        lines.push('');
      });
      const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = 'daily-raport.txt';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) { void err; }
  }

  const idle = !loading && questions.length === 0 && !report;

  return (
    <div className="lessons-root">
      <div className="lessons-header"><h3>Daily Challenge</h3></div>

      {error && (
        <div style={{ padding: '1rem', color: '#ffbaba' }}>
          {error}
          <div style={{ marginTop: '.5rem' }}>
            <button className="ctrl" onClick={() => loadDaily({ another: true })}>Generează încă un Daily</button>
          </div>
        </div>
      )}

      {idle && (
        <article className="lesson-card" style={{ textAlign:'center', padding:'1.2rem' }}>
          {alreadyDoneToday ? (
            <>
              <p>Deja ți-ai făcut Daily-ul de astăzi. Vrei încă unul?</p>
              <button className="ctrl" onClick={() => loadDaily({ another: true })}>Generează încă un Daily</button>
            </>
          ) : (
            <>
              <p>Apasă butonul pentru a genera Daily Challenge (poate dura 30–60 secunde).</p>
              <button className="ctrl" onClick={() => loadDaily()}>Începe Daily</button>
            </>
          )}
        </article>
      )}

      {loading && (
        <article className="lesson-card">
          <div className="loading-panel">
            <div className="spinner" aria-hidden="true" />
            <div className="loading-text">Se generează quiz-ul zilnic...<div className="elapsed">{elapsed}s</div></div>
            <button className="cancel-btn" onClick={cancel}>Anulează</button>
          </div>
        </article>
      )}

      {!loading && questions.length > 0 && !report && (
        <article className="lesson-card">
          {dailyNote && (
            <div style={{ marginBottom: '.6rem', color: 'rgba(230,238,248,0.9)' }}>
              {dailyNote}
            </div>
          )}
          <div className="question">{current?.question}</div>
          <div className="options">
            {current?.options?.map((opt, i) => {
              const isSelected = selected === i;
              const correct = current.correct_index === i;
              const state = revealed ? (correct ? 'correct' : isSelected ? 'wrong' : '') : '';
              return (
                <button key={i} className={'option ' + state} disabled={revealed} onClick={() => chooseAnswer(i)}>{opt}</button>
              );
            })}
          </div>
          <div className="lesson-footer">
            {revealed ? (
              <div className="explanation">
                <div className="result">{selected === current.correct_index ? 'Corect!' : 'Răspuns corect: ' + current.options[current.correct_index]}</div>
                {current.explanation && <p className="explain-text">{current.explanation}</p>}
              </div>
            ) : (
              <em>Alege o opțiune</em>
            )}
            <div className="controls">
              <button disabled={qIndex === 0} onClick={() => { setQIndex(i=>i-1); setSelected(null); setRevealed(false); }}>Previous</button>
              <button onClick={() => {
                if (qIndex < questions.length - 1) { setQIndex(i=>i+1); setSelected(null); setRevealed(false); }
                else { finish(); }
              }}>{qIndex < questions.length - 1 ? 'Next' : 'Finish'}</button>
            </div>
          </div>
        </article>
      )}

      {report && (
        <div className="report-root">
          <div className="report-header">
            <h4>Raport — Daily Challenge</h4>
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
              );
            })}
          </div>
          <div className="report-actions">
            <button className="btn" onClick={download}>Descarcă raport</button>
            <button className="btn" onClick={() => {
              setReport(null);
              setQuestions([]);
              setError(null);
              setDailyNote(null);
              setQIndex(0); setSelected(null); setRevealed(false);
              window.scrollTo(0,0);
            }}>Închide</button>
          </div>
        </div>
      )}
    </div>
  );
}
