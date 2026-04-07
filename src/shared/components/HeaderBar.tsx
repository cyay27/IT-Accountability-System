import { useEffect, useRef, useState } from "react";

type HeaderNotificationItem = {
  key: string;
  softwareName: string;
  contractOrPoNumber: string;
  expirationDate: string;
  renewalStatus: string;
};

type HeaderApiStatus = {
  label: string;
  tone: "ok" | "warning";
  detail?: string;
};

interface HeaderBarProps {
  localMode: boolean;
  title?: string;
  userEmail?: string;
  darkMode: boolean;
  apiStatus?: HeaderApiStatus;
  notificationCount?: number;
  notificationItems?: HeaderNotificationItem[];
  onNotificationClick?: () => void;
  onOpenDiagnostics?: () => void;
  onToggleDarkMode: () => void;
  onLogout?: () => void;
}

export const HeaderBar = ({
  title = "IT Accountability Form",
  userEmail,
  darkMode,
  apiStatus,
  notificationCount = 0,
  notificationItems = [],
  onNotificationClick,
  onOpenDiagnostics,
  onToggleDarkMode,
  onLogout
}: HeaderBarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!menuRef.current?.contains(target)) {
        setMenuOpen(false);
      }

      if (!notificationRef.current?.contains(target)) {
        setNotificationOpen(false);
      }
    };

    if (menuOpen || notificationOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }

    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [menuOpen, notificationOpen]);

  const handleToggleDarkMode = () => {
    onToggleDarkMode();
    setMenuOpen(false);
  };

  const handleLogoutClick = () => {
    setMenuOpen(false);
    onLogout?.();
  };

  const handleOpenDiagnostics = () => {
    setMenuOpen(false);
    onOpenDiagnostics?.();
  };

  const handleNotificationButtonClick = () => {
    setMenuOpen(false);
    setNotificationOpen((prev) => !prev);
    onNotificationClick?.();
  };

  const handleNotificationItemClick = () => {
    setNotificationOpen(false);
    onNotificationClick?.();
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
        {apiStatus && (
          <button
            type="button"
            className={`status-pill api-status-pill ${apiStatus.tone}`}
            title={apiStatus.detail || apiStatus.label}
            onClick={onOpenDiagnostics}
          >
            {apiStatus.label}
          </button>
        )}
        <p className="header-user-email">{userEmail || "Admin"}</p>

        <div className="header-notification-wrap" ref={notificationRef}>
          <button
            type="button"
            className="header-notification-btn"
            onClick={handleNotificationButtonClick}
            aria-haspopup="menu"
            aria-expanded={notificationOpen}
            aria-label={`Open notifications (${notificationCount})`}
            title="Open notifications"
          >
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" aria-hidden="true">
              <path
                d="M6.5 16.5h11a1 1 0 0 0 .77-1.64l-1.77-2.16V9.5a4.5 4.5 0 0 0-9 0v3.2L5.73 14.86a1 1 0 0 0 .77 1.64Z"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinejoin="round"
              />
              <path d="M10 18.5a2 2 0 0 0 4 0" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
            </svg>
            <span className="header-notification-count" aria-hidden="true">{notificationCount}</span>
          </button>

          {notificationOpen && (
            <div className="header-notification-menu" role="menu" aria-label="Notifications">
              {notificationItems.length === 0 ? (
                <p className="header-notification-empty">No active notifications.</p>
              ) : (
                <>
                  {notificationItems.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      role="menuitem"
                      className="header-notification-item"
                      onClick={handleNotificationItemClick}
                    >
                      <strong>{item.softwareName}</strong>
                      <span>Contract/PO: {item.contractOrPoNumber}</span>
                      <span>Expires: {item.expirationDate}</span>
                      <span>Status: {item.renewalStatus}</span>
                    </button>
                  ))}
                  <button type="button" role="menuitem" className="header-notification-viewall" onClick={handleNotificationItemClick}>
                    View in License Maintenance
                  </button>
                </>
              )}
            </div>
          )}
        </div>

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
              {onOpenDiagnostics && (
                <button type="button" role="menuitem" onClick={handleOpenDiagnostics}>
                  API diagnostics
                </button>
              )}
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
