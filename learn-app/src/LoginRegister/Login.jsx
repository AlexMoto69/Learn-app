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
            if (onLogin) {
                await onLogin({ identifier: identifier.trim(), password });
            } else {
                console.log('login', { identifier: identifier.trim(), password });
            }
        } catch (err) {
            setError(err?.message || 'Login failed');
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
            </form>
        </div>
    );
}