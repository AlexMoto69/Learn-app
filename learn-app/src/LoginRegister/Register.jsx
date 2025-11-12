// javascript
// File: learn-app/src/LoginRegister/Register.jsx
import React, { useState } from 'react';
import './LoginRegister.css';

export default function Register({ onSignIn }) {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

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
            name: name.trim(),
            email: email.trim(),
            password,
            confirmPassword: confirm
        };

        try {
            const res = await fetch('http://localhost:5000/api/register', { // update URL to your Flask route
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify(payload)
                // add `credentials: 'include'` if your backend uses cookies/sessions
            });

            // try parse JSON; backend may return JSON with message or error
            const data = await res.json().catch(() => ({}));

            if (!res.ok) {
                setError(data.message || data.error || 'Registration failed.');
                setLoading(false);
                return;
            }

            // success
            console.log('Registered:', data);
            setName('');
            setEmail('');
            setPassword('');
            setConfirm('');
            setLoading(false);
        } catch (err) {
            setError('Network error. Please try again.');
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
