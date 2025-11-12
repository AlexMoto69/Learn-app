import React, { useMemo, useState, useEffect } from 'react';
import './Lessons.css';
import { getModuleQuiz, submitQuiz } from '../services/authService';

// images
import activeImg from '../assets/levels/activelevel.png';
import inactiveImg from '../assets/levels/inactivelevel.png';
import lockedImg from '../assets/levels/unlockedlevel.png';

export default function Lessons() {
    const LEVEL_COUNT = 8;
    const QUIZ_QUESTION_COUNT = 5;

    const [activeModule, setActiveModule] = useState(null);
    const [levelsData, setLevelsData] = useState(() => Array.from({ length: LEVEL_COUNT }, () => null));

    const [error, setError] = useState(null);
    const [unlockedLevel, setUnlockedLevel] = useState(0);
    const [startedLevel, setStartedLevel] = useState(-1);
    const [qIndex, setQIndex] = useState(0);
    const [selected, setSelected] = useState(null);
    const [revealed, setRevealed] = useState(false);

    // New: generation loading state and timer
    const [generating, setGenerating] = useState(false);
    const [elapsed, setElapsed] = useState(0);
    const timerRef = React.useRef(null);

    const answersRef = React.useRef({});
    const currentLevels = useMemo(() => levelsData.map(q => Array.isArray(q) ? q : []), [levelsData]);

    const currentLevelQuestions = startedLevel >= 0 ? currentLevels[startedLevel] : [];
    const current = currentLevelQuestions[qIndex] || null;

    // AbortController ref for canceling requests
    const abortRef = React.useRef(null);

    // New: track selections to build a detailed report
    const selectionsRef = React.useRef({});

    // New: report state
    const [showReport, setShowReport] = useState(false);
    const [reportItems, setReportItems] = useState([]);
    const [reportSummary, setReportSummary] = useState({ correct: 0, total: 0, module: null });

    useEffect(() => { answersRef.current = {}; }, [activeModule]);
    useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); } }, []);

    function selectModule(id) {
        setActiveModule(id);
        setLevelsData(Array.from({ length: LEVEL_COUNT }, () => null));
        setStartedLevel(-1);
        setUnlockedLevel(0);
        setQIndex(0);
        setSelected(null);
        setRevealed(false);
        setError(null);
        setGenerating(false);
        setElapsed(0);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        answersRef.current = {};
        window.scrollTo(0, 0);
    }

    async function startLevel(i) {
        if (i > unlockedLevel) return;

        setStartedLevel(i);
        setQIndex(0);
        setSelected(null);
        setRevealed(false);
        setError(null);

        // start loading timer UI
        setGenerating(true);
        setElapsed(0);
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = setInterval(() => setElapsed((s) => s + 1), 1000);

        // create AbortController for this request
        if (abortRef.current) {
            try { abortRef.current.abort(); } catch (e) { void e; }
        }
        abortRef.current = new AbortController();

        let ok = false;
        try {
            ok = await (async () => {
                try {
                    const data = await getModuleQuiz(activeModule, { signal: abortRef.current.signal });
                    const qs = Array.isArray(data?.questions) ? data.questions.slice(0, QUIZ_QUESTION_COUNT) : [];
                    if (!qs.length) {
                        setError(data?.msg || 'Serverul nu a returnat întrebările pentru acest nivel. Încearcă din nou.');
                        return false;
                    }
                    setLevelsData(arr => arr.map((v, idx) => (idx === i ? qs : v)));
                    return true;
                } catch (err) {
                    if (err?.name === 'AbortError') {
                        // request was cancelled, ignore error
                        return false;
                    }
                    const msg = err?.message || 'Eroare de rețea';
                    setError(`Nu am putut încărca întrebările pentru nivel. (${msg})`);
                    return false;
                }
            })();
        } finally {
            setGenerating(false);
            if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
            abortRef.current = null;
        }

        if (!ok) {
            // go back to levels if nothing loaded
            setStartedLevel(-1);
            setSelected(null);
            setRevealed(false);
        }
    }

    function cancelGeneration() {
        setGenerating(false);
        setStartedLevel(-1);
        setSelected(null);
        setRevealed(false);
        setElapsed(0);
        if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
        if (abortRef.current) { try { abortRef.current.abort(); } catch (e) { void e; } abortRef.current = null; }
    }

    function chooseAnswer(optionIndex) {
        if (!current || revealed) return;
        setSelected(optionIndex);
        setRevealed(true);
        // save selection and correctness
        const key = `${startedLevel}-${qIndex}`;
        selectionsRef.current[key] = optionIndex;
        answersRef.current[key] = (optionIndex === current.correct_index);
    }

    async function finishLevel() {
        const lvl = startedLevel;
        const qs = currentLevels[lvl] || [];
        let correctCount = 0;

        const items = qs.map((q, idx) => {
            const key = `${lvl}-${idx}`;
            const sel = selectionsRef.current[key];
            const isCorrect = sel === q.correct_index;
            if (isCorrect) correctCount++;
            return {
                index: idx + 1,
                question: q.question,
                options: q.options,
                correct_index: q.correct_index,
                selected_index: typeof sel === 'number' ? sel : null,
                explanation: q.explanation || '',
                result: isCorrect ? 'correct' : 'wrong',
            };
        });

        setReportItems(items);
        setReportSummary({ correct: correctCount, total: qs.length, module: parseInt(activeModule) });
        setShowReport(true);

        if (correctCount > 0 && lvl < LEVEL_COUNT - 1) {
            setUnlockedLevel(prev => Math.max(prev, lvl + 1));
        }

        try {
            await submitQuiz({
                questions_correct: correctCount,
                questions_total: qs.length,
                module: parseInt(activeModule)
            });
        } catch (e) {
            console.warn('submitQuiz failed:', e);
        }

        // reset quiz state but keep report visible
        setStartedLevel(-1);
        setSelected(null);
        setRevealed(false);
        setQIndex(0);
        answersRef.current = {};
        selectionsRef.current = {};
    }

    function downloadReport() {
        try {
            const lines = [];
            const header = `Raport quiz — Modul ${reportSummary.module} — Corecte: ${reportSummary.correct}/${reportSummary.total}`;
            lines.push(header);
            lines.push('');
            reportItems.forEach(item => {
                const sel = item.selected_index;
                const selText = (typeof sel === 'number' && item.options[sel] !== undefined) ? item.options[sel] : '—';
                const correctText = item.options[item.correct_index] ?? '—';
                lines.push(`Q${item.index}. ${item.question}`);
                lines.push(`  Răspunsul tău: ${selText}${item.result === 'correct' ? ' ✅' : ' ❌'}`);
                lines.push(`  Răspuns corect: ${correctText}`);
                if ((item.explanation || '').trim()) {
                    lines.push(`  Explicație: ${item.explanation.trim()}`);
                }
                lines.push('');
            });
            const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `raport-modul-${reportSummary.module}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) { void e; }
    }

    const modules = Array.from({ length: 8 }, (_, i) => ({
        id: String(i + 1),
        title: "Biologie",
        subtitle: `Modulul ${i + 1}`
    }));

    if (!activeModule) {
        return (
            <div className="lessons-root modules-root">
                <div className="lessons-header">
                    <h3>Alege modul</h3>
                </div>

                <div className="modules-grid">
                    {modules.map(m => (
                        <div key={m.id} className="module-card">
                            <div className="module-title">{m.title}</div>
                            <button onClick={() => selectModule(m.id)} className="module-btn">
                                <img src={inactiveImg} className="module-img default-img" alt="" aria-hidden="true" />
                                <img src={activeImg} className="module-img active-img" alt="" aria-hidden="true" />
                            </button>
                            <div className="module-sub">{m.subtitle}</div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="lessons-root">
            <div className="lessons-header">
                <button
                  className="back-to-modules"
                  onClick={() => {
                    // full reset on back
                    setActiveModule(null);
                    setStartedLevel(-1);
                    setQIndex(0);
                    setSelected(null);
                    setRevealed(false);
                    setError(null);
                    setGenerating(false);
                    setElapsed(0);
                    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
                    if (abortRef.current) { try { abortRef.current.abort(); } catch (e) { void e; } abortRef.current = null; }
                    answersRef.current = {};
                    window.scrollTo(0, 0);
                  }}
                >
                    ← Module
                </button>
                <h3>Biologie — Modulul {activeModule}</h3>
            </div>

            {error && <div style={{ padding: "1rem", color: "#ffbaba" }}>{error}</div>}

            {startedLevel < 0 && (
                <div className="level-map">
                    {Array.from({ length: LEVEL_COUNT }).map((_, i) => {
                        const isLocked = i > unlockedLevel;

                        return (
                            <div key={i} className="map-item">
                                <button
                                    className={"level-btn" + (isLocked ? " locked" : "")}
                                    disabled={isLocked}
                                    onClick={() => startLevel(i)}
                                >
                                    <img src={inactiveImg} className="lvl-img default-img" alt="" aria-hidden="true" />
                                    <img src={activeImg} className="lvl-img active-img" alt="" aria-hidden="true" />
                                    <img src={lockedImg} className="lvl-img locked-img" alt="" aria-hidden="true" />
                                </button>
                            </div>
                        );
                    })}
                </div>
            )}

            {startedLevel >= 0 && (
                <article className="lesson-card">
                    {generating || !current ? (
                        <div className="loading-panel">
                            <div className="spinner" aria-hidden="true" />
                            <div className="loading-text">
                                Se generează quiz-ul (poate dura 30–60 secunde)...
                                <div className="elapsed">{elapsed}s</div>
                            </div>
                            <button className="cancel-btn" onClick={cancelGeneration}>Anulează</button>
                        </div>
                    ) : (
                        <>
                            <div className="question">{current.question}</div>

                            <div className="options">
                                {current.options.map((o, i) => {
                                    const isSelected = selected === i;
                                    const correct = current.correct_index === i;
                                    const state = revealed ? (correct ? 'correct' : isSelected ? 'wrong' : '') : '';
                                    return (
                                        <button key={i} className={'option ' + state} disabled={revealed} onClick={() => chooseAnswer(i)}>
                                            {o}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="lesson-footer">
                                {revealed ? (
                                    <div className="explanation">
                                        <div className="result">
                                            {selected === current.correct_index ? 'Corect!' : 'Răspuns corect: ' + current.options[current.correct_index]}
                                        </div>
                                        {current.explanation && (
                                            <p className="explain-text">{current.explanation}</p>
                                        )}
                                    </div>
                                ) : (
                                    <em>Alege o opțiune</em>
                                )}

                                <div className="controls">
                                    <button disabled={qIndex === 0} onClick={() => { setQIndex(i => i - 1); setSelected(null); setRevealed(false); }}>Previous</button>
                                    <button onClick={() => {
                                        if (qIndex < currentLevelQuestions.length - 1) {
                                            setQIndex(i => i + 1); setSelected(null); setRevealed(false);
                                        } else { finishLevel(); }
                                    }}>{qIndex < currentLevelQuestions.length - 1 ? 'Next' : 'Finish'}</button>
                                </div>
                            </div>
                        </>
                    )}
                </article>
            )}

            {showReport && (
                <div className="report-root">
                    <div className="report-header">
                        <h4>Raport — Modul {reportSummary.module}</h4>
                        <div className="report-score">Corecte: {reportSummary.correct} / {reportSummary.total}</div>
                    </div>
                    <div className="report-list">
                        {reportItems.map((it) => {
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
                        <button className="btn" onClick={downloadReport}>Descarcă raport</button>
                        <button className="btn" onClick={() => setShowReport(false)}>Închide</button>
                    </div>
                </div>
            )}
        </div>
    );
}
