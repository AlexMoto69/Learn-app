// javascript
import React, { useState } from 'react';
import './LoginRegister.css';

export default function Login({ onLogin, onRegisterClick }) {
    const [identifier, setIdentifier] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!identifier.trim() || !password) {
            setError('Please enter your email/username and password.');
            return;
        }
        setLoading(true);

        try {
            // If parent provided an onLogin handler, prefer it (e.g. for centralized auth)
            if (onLogin) {
                await onLogin({ identifier: identifier.trim(), password });
                return;
            }

            // Otherwise send JSON to backend Flask endpoint
            const res = await fetch('http://localhost:5000/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                // include cookies if your Flask session/auth relies on them
                credentials: 'include', // remove if not needed
                body: JSON.stringify({
                    identifier: identifier.trim(),
                    password
                })
            });

            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(data.message || data.error || 'Login failed.');
                return;
            }

            // success: data may contain token/user
            console.log('Login success:', data);
            // Optionally call onLogin with server result if you want parent to know
            if (onLogin) onLogin(data);
            // clear sensitive fields
            setPassword('');
        } catch (err) {
            setError(err?.message || 'Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <form className="login-form" onSubmit={handleSubmit} aria-label="Login form">
                <h2 className="login-title">Log in</h2>

                <label className="label" htmlFor="identifier">Email or username</label>
                <input
                    id="identifier"
                    name="identifier"
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    className="input"
                    autoComplete="username"
                    required
                />

                <label className="label" htmlFor="password">Password</label>
                <input
                    id="password"
                    name="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    autoComplete="current-password"
                    required
                />

                {error && <div role="alert" className="error">{error}</div>}

                <button type="submit" className="submit" disabled={loading}>
                    {loading ? 'Signing in...' : 'Sign in'}
                </button>

                <div className="footer">
                    <span className="small">Don't have an account?</span>
                    <button
                        type="button"
                        className="link-button"
                        onClick={() => {
                            if (onRegisterClick) onRegisterClick();
                            else window.location.href = '/register';
                        }}
                    >
                        Create one
                    </button>
                </div>
                {/* Dev helper: quickly skip login and show main menu (only visible with ?dev=1 or in dev build) */}
                { (new URLSearchParams(window.location.search).get('dev') === '1') && (
                    <div style={{ marginTop: '8px', textAlign: 'center' }}>
                        <button type="button" className="submit" onClick={() => {
                            // set local flag and call onLogin to navigate to app
                            localStorage.setItem('dev_skip_login', '1')
                            if (onLogin) onLogin({ dev: true })
                            else window.location.reload()
                        }}>Dev: Skip to menu</button>
                    </div>
                )}
            </form>
        </div>
    );
}
