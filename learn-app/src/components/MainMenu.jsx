/* learn-app/src/components/MainMenu.jsx */
import React from 'react';
import './MainMenu.css';
import lessonsIcon from '../assets/icons/lessons.svg'
import challengeIcon from '../assets/icons/challenge.svg'
import chatbotIcon from '../assets/icons/chatbotb.svg'
import friendsIcon from '../assets/icons/friends.svg'
import appLogo from '../assets/logo2.png'
import profileIcon from '../assets/icons/profile.svg'
import uploadIcon from '../assets/icons/upload.svg'
import logoutIcon from '../assets/icons/logout.svg'
import { logout } from '../services/authService'

export default function MainMenu({ onNavigate = () => {} }){
    const visible = true;

    const menuInner = (
        <>
            <nav className="menu-nav" aria-label="Main menu">
                <button className="nav-item" onClick={() => onNavigate('lessons')}>
                    <span className="nav-icon-wrap"><img src={lessonsIcon} className="nav-icon" alt="Lessons" /></span>
                    <span className="nav-label">Lessons</span>
                </button>

                <button className="nav-item" onClick={() => onNavigate('daily')}>
                    <span className="nav-icon-wrap"><img src={challengeIcon} className="nav-icon" alt="Daily Challenge" /></span>
                    <span className="nav-label">Daily Challenge</span>
                </button>

                <button className="nav-item" onClick={() => onNavigate('chatbot')}>
                    <span className="nav-icon-wrap"><img src={chatbotIcon} className="nav-icon" alt="Chatbot" /></span>
                    <span className="nav-label">Chatbot</span>
                </button>

                <button className="nav-item" onClick={() => onNavigate('friends')}>
                    <span className="nav-icon-wrap"><img src={friendsIcon} className="nav-icon" alt="Friends" /></span>
                    <span className="nav-label">Friends</span>
                </button>

                <button className="nav-item" onClick={() => onNavigate('profile')}>
                    <span className="nav-icon-wrap"><img src={profileIcon} className="nav-icon" alt="Profile" /></span>
                    <span className="nav-label">Profile</span>
                </button>

                <button className="nav-item" onClick={() => onNavigate('upload')}>
                    <span className="nav-icon-wrap"><img src={uploadIcon} className="nav-icon" alt="Upload" /></span>
                    <span className="nav-label">Upload</span>
                </button>

                {/* Visible logout icon */}
                <button className="nav-item" onClick={() => { logout(); window.location.reload(); }}>
                    <span className="nav-icon-wrap"><img src={logoutIcon} className="nav-icon" alt="Log out" /></span>
                    <span className="nav-label">Log out</span>
                </button>
            </nav>

            <div className="app-logo-wrap">
                <img src={appLogo} className="app-logo" alt="App logo" />
            </div>
        </>
    );

    return (
        <div className="main-root">
            <header className="menu-header" aria-hidden="true">
                <div className="menu-inner" style={{visibility: 'hidden'}}></div>
            </header>

            <div className={`restricted-menu ${visible ? 'menu-visible' : ''}`}>
                {menuInner}
            </div>

            <div className="main-card">
                <div className="menu-body"></div>
            </div>
        </div>
    );
}
