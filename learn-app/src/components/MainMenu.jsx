/* learn-app/src/components/MainMenu.jsx */
import React from 'react';
import './MainMenu.css';

export default function MainMenu({ onNavigate = () => {} }){
    // menu is always visible and constant — no scroll listeners
    const visible = true;

    const menuInner = (
        <>
            <nav className="menu-nav" aria-label="Main menu">
                <button className="nav-item" onClick={() => onNavigate('lessons')}>
                    <span className="nav-icon-wrap"><img src="src/assets/icons/lessons.png" className="nav-icon" alt="Lessons" /></span>
                    <span className="nav-label">Lessons</span>
                </button>

                <button className="nav-item" onClick={() => onNavigate('daily')}>
                    <span className="nav-icon-wrap"><img src="src/assets/icons/challenge.png" className="nav-icon" alt="Daily Challenge" /></span>
                    <span className="nav-label">Daily Challenge</span>
                </button>

                <button className="nav-item" onClick={() => onNavigate('chatbot')}>
                    <span className="nav-icon-wrap"><img src="src/assets/icons/chatbotb.png" className="nav-icon" alt="Chatbot" /></span>
                    <span className="nav-label">Chatbot</span>
                </button>

                <button className="nav-item" onClick={() => onNavigate('friends')}>
                    <span className="nav-icon-wrap"><img src="src/assets/icons/friends.png" className="nav-icon" alt="Friends" /></span>
                    <span className="nav-label">Friends</span>
                </button>
            </nav>

            <div className="app-logo-wrap">
                <img src="src/assets/logo2.png" className="app-logo" alt="App logo" />
            </div>
        </>
    );

    return (
        <div className="main-root">
            {/* transparent header for accessibility / layout fallback */}
            <header className="menu-header" aria-hidden="true">
                <div className="menu-inner" style={{visibility: 'hidden'}}></div>
            </header>

            {/* always-visible fixed restricted menu */}
            <div className={`restricted-menu ${visible ? 'menu-visible' : ''}`}>
                {menuInner}
            </div>

            <div className="main-card">
                <div className="menu-body">{/* main content here */}</div>
            </div>
        </div>
    );
}
