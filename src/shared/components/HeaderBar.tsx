import { useEffect, useRef, useState } from "react";

interface HeaderBarProps {
  localMode: boolean;
  title?: string;
  userEmail?: string;
  darkMode: boolean;
  onToggleDarkMode: () => void;
  onLogout?: () => void;
}

export const HeaderBar = ({
  title = "IT Accountability Form",
  userEmail,
  darkMode,
  onToggleDarkMode,
  onLogout
}: HeaderBarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setMenuOpen(false);
      }
    };

    if (menuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [menuOpen]);

  const handleToggleDarkMode = () => {
    onToggleDarkMode();
    setMenuOpen(false);
  };

  const handleLogoutClick = () => {
    setMenuOpen(false);
    onLogout?.();
  };

  return (
    <header className="header-bar">
      <div className="header-logo">
        <img src="/assets/mdclogo.png?v=20260319" alt="MDC logo" className="header-logo-image" />
        <div className="header-copy">
          <p className="eyebrow">IT Department</p>
          <h1>{title}</h1>
        </div>
      </div>
      <div className="header-actions">
        <p className="header-user-email">{userEmail || "Admin"}</p>

        <div className="header-menu-wrap" ref={menuRef}>
          <button
            type="button"
            className="header-menu-trigger"
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="Open account menu"
          >
            <span className="avatar-dot" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none">
                <circle cx="12" cy="8" r="3" stroke="currentColor" strokeWidth="1.8" />
                <path d="M6.5 18c.45-2.45 2.45-4 5.5-4s5.05 1.55 5.5 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
              </svg>
            </span>
            <span className="header-menu-indicator" aria-hidden="true">
              <svg viewBox="0 0 12 12" width="10" height="10" fill="none">
                <path d="M3 4.5 6 7.5 9 4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </span>
          </button>

          {menuOpen && (
            <div className="header-menu" role="menu">
              <button type="button" role="menuitem" onClick={handleToggleDarkMode}>
                {darkMode ? "Toggle dark mode (On)" : "Toggle dark mode (Off)"}
              </button>
              <button type="button" role="menuitem" onClick={handleLogoutClick}>
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
