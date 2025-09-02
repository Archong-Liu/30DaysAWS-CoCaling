import React from 'react';
import './Sidebar.css';

const Sidebar = ({
  isOpen,
  onToggleOpen,
  onGoHome,
  showDebug,
  onToggleDebug
}) => {
  return (
    <aside className={`sidebar ${isOpen ? 'open' : 'collapsed'}`}>
      <div className="sidebar-header">
        <button className="sidebar-toggle" onClick={onToggleOpen} aria-label="toggle sidebar">
          {isOpen ? '⟨' : '⟩'}
        </button>
        {isOpen && <span className="sidebar-title">導航</span>}
      </div>

      <nav className="sidebar-nav">
        <button className="nav-item" onClick={onGoHome} title="回首頁">
          🏠 {isOpen && <span>回首頁</span>}
        </button>
        <button className={`nav-item ${showDebug ? 'active' : ''}`} onClick={onToggleDebug} title="切換除錯訊息">
          🛠️ {isOpen && <span>除錯訊息 {showDebug ? '開' : '關'}</span>}
        </button>
      </nav>
    </aside>
  );
};

export default Sidebar;


