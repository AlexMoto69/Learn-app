// javascript
// File: learn-app/src/LoginRegister/Register.jsx
import React, { useState } from 'react';
import './LoginRegister.css';
import { useAuth } from '../contexts/authContext';
import { register as apiRegister } from '../services/authService';

export default function Register({ onSignIn }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const auth = useAuth();

    function isValidEmail(value) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    }

    async function handleSubmit(e) {
        e.preventDefault();
        setError('');

        if (!name.trim() || !email.trim() || !password) {
            setError('Please fill out all fields.');
            return;
        }

        if (!isValidEmail(email.trim())) {
            setError('Please enter a valid email address.');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);

        const payload = {
            username: name.trim(),
            email: email.trim(),
            password,
        };

        try {
            const data = await apiRegister(payload);

            // backend returns a message; some backends auto-login and return token/user
            const token = data.access_token || data.token || data.accessToken;
            const user = data.user || null;

            if (token) {
                auth.loginUser({ token, user });
                window.location.reload();
                return;
            }

            // If no token returned, assume registration succeeded
            console.log('Registered:', data);
            setName('');
            setEmail('');
            setPassword('');
            setConfirm('');
            // If parent provided onSignIn, navigate to sign-in
            if (onSignIn) onSignIn();
        } catch (err) {
            setError(err?.message || 'Network error. Please try again.');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="login-container">
            <form className="login-form" onSubmit={handleSubmit} noValidate>
                <h2 className="login-title">Create account</h2>

                <label className="label" htmlFor="name">Username</label>
                <input
                    id="name"
                    className="input"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Username"
                    autoComplete="name"
                />

                <label className="label" htmlFor="email">Email</label>
                <input
                    id="email"
                    className="input"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                />

                <label className="label" htmlFor="password">Password</label>
                <input
                    id="password"
                    className="input"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Choose a password"
                    autoComplete="new-password"
                />

                <label className="label" htmlFor="confirm">Confirm password</label>
                <input
                    id="confirm"
                    className="input"
                    type="password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Repeat password"
                    autoComplete="new-password"
                />

                {error && <div className="error">{error}</div>}

                <button className="submit" type="submit" disabled={loading}>
                    {loading ? 'Creating…' : 'Create account'}
                </button>

                <div className="footer">
                    <div className="small">Already have an account?</div>
                    <a href="#" onClick={(e)=>{e.preventDefault(); if(onSignIn) onSignIn(); else window.location.href='/'}} className="link-button">Sign in</a>
                </div>
            </form>
        </div>
    );
}
