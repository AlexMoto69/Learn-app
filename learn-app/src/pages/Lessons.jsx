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

    useEffect(() => { answersRef.current = {}; }, [activeModule]);
    useEffect(() => { return () => { if (timerRef.current) clearInterval(timerRef.current); } }, []);

    // Load a specific level (server call). Returns true if questions loaded.
    async function loadLevel(i) {
        if (levelsData[i]) return true;

        try {
            const data = await getModuleQuiz(activeModule);
            const qs = Array.isArray(data?.questions)
                ? data.questions.slice(0, QUIZ_QUESTION_COUNT)
                : [];

            if (!qs.length) {
                setError(data?.msg || "Serverul nu a returnat întrebările pentru acest nivel. Încearcă din nou.");
                return false;
            }

            setLevelsData(arr => arr.map((v, idx) => (idx === i ? qs : v)));
            return true;
        } catch (err) {
            const msg = err?.message || 'Eroare de rețea';
            console.warn('loadLevel error:', err);
            setError(`Nu am putut încărca întrebările pentru nivel. (${msg})`);
            return false;
        }
    }

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
        if (abortRef.current) abortRef.current.abort();
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
        if (abortRef.current) { try { abortRef.current.abort(); } catch {} finally { abortRef.current = null; } }
    }

    async function finishLevel() {
        const lvl = startedLevel;
        const qs = currentLevels[lvl] || [];
        let correctCount = 0;

        qs.forEach((_, i) => {
            if (answersRef.current[`${lvl}-${i}`]) correctCount++;
        });

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

        // reset
        setStartedLevel(-1);
        setSelected(null);
        setRevealed(false);
        setQIndex(0);
        answersRef.current = {};
    }

    function chooseAnswer(optionIndex) {
        if (!current || revealed) return;
        setSelected(optionIndex);
        setRevealed(true);
        answersRef.current[`${startedLevel}-${qIndex}`] = (optionIndex === current.correct_index);
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
                    if (abortRef.current) { try { abortRef.current.abort(); } catch {} finally { abortRef.current = null; } }
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
                                    const state =
                                        revealed ? (correct ? "correct" : isSelected ? "wrong" : "") : "";

                                    return (
                                        <button
                                            key={i}
                                            className={"option " + state}
                                            disabled={revealed}
                                            onClick={() => chooseAnswer(i)}
                                        >
                                            {o}
                                        </button>
                                    );
                                })}
                            </div>

                            <div className="lesson-footer">
                                {revealed ? (
                                    <p>
                                        {selected === current.correct_index
                                            ? "Corect!"
                                            : "Răspuns corect: " + current.options[current.correct_index]}
                                    </p>
                                ) : (
                                    <em>Alege o opțiune</em>
                                )}

                                <div className="controls">
                                    <button
                                        disabled={qIndex === 0}
                                        onClick={() => {
                                            setQIndex(i => i - 1);
                                            setSelected(null);
                                            setRevealed(false);
                                        }}
                                    >
                                        Previous
                                    </button>

                                    <button
                                        onClick={() => {
                                            if (qIndex < currentLevelQuestions.length - 1) {
                                                setQIndex(i => i + 1);
                                                setSelected(null);
                                                setRevealed(false);
                                            } else {
                                                finishLevel();
                                            }
                                        }}
                                    >
                                        {qIndex < currentLevelQuestions.length - 1 ? "Next" : "Finish"}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </article>
            )}
        </div>
    );
}
