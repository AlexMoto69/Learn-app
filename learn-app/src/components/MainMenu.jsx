/* learn-app/src/components/MainMenu.jsx */
import React, { useEffect, useRef, useState } from 'react';
import './MainMenu.css';

export default function MainMenu({ onNavigate = () => {} }){
    const [visible, setVisible] = useState(false);
    const timeoutRef = useRef(null);
    const lastY = useRef(0);

    useEffect(() => {
        function handleScroll(){
            const y = window.scrollY || window.pageYOffset;
            // show when user scrolled down a bit
            if (y > 20) {
                setVisible(true);
                // reset hide timer
                if (timeoutRef.current) clearTimeout(timeoutRef.current);
                timeoutRef.current = setTimeout(() => setVisible(false), 1500);
            } else {
                // hide at very top
                setVisible(false);
                if (timeoutRef.current) { clearTimeout(timeoutRef.current); timeoutRef.current = null; }
            }
            lastY.current = y;
        }

        window.addEventListener('scroll', handleScroll, { passive: true });
        // also show on touch move / wheel for better UX
        window.addEventListener('wheel', handleScroll, { passive: true });
        window.addEventListener('touchmove', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
            window.removeEventListener('wheel', handleScroll);
            window.removeEventListener('touchmove', handleScroll);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
        };
    }, []);

    return (
        <div className="main-root">
            {/* header slides in/out based on scroll; menu-hidden/menu-visible classes */}
            <header className={"menu-header " + (visible ? 'menu-visible' : 'menu-hidden')}>
                <div className="menu-inner">
                    <nav className="menu-nav" aria-label="Main menu">
                        <button className="nav-item" onClick={() => onNavigate('lessons')}>
                            <span className="nav-icon-wrap"><img src="src/assets/icons/lessons.png" className="nav-icon" alt="" /></span>
                            <span className="nav-label">Lessons</span>
                        </button>

                        <button className="nav-item" onClick={() => onNavigate('daily')}>
                            <span className="nav-icon-wrap"><img src="src/assets/icons/challenge.png" className="nav-icon" alt="" /></span>
                            <span className="nav-label">Daily Challenge</span>
                        </button>

                        <button className="nav-item" onClick={() => onNavigate('chatbot')}>
                            <span className="nav-icon-wrap"><img src="src/assets/icons/chatbotb.png" className="nav-icon" alt="" /></span>
                            <span className="nav-label">Chatbot</span>
                        </button>

                        <button className="nav-item" onClick={() => onNavigate('friends')}>
                            <span className="nav-icon-wrap"><img src="src/assets/icons/friends.png" className="nav-icon" alt="" /></span>
                            <span className="nav-label">Friends</span>
                        </button>
                    </nav>

                    <div className="app-logo-wrap">
                        <img src="src/assets/logo2.png" className="app-logo" alt="App logo" />
                    </div>
                </div>
            </header>

            <div className="main-card">
                <div className="menu-body">{/* main content here */}</div>
            </div>
        </div>
    );
}
