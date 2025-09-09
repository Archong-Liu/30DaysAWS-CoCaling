import React, { useEffect, useState } from 'react';
import Calendar from './components/Calendar';
import Dashboard from './components/Dashboard';
import './App.css';
import Sidebar from './components/Sidebar';
import { useAuth } from './hooks/useAuth';
import { useProject } from './hooks/useProject';
import useIsMobile from './hooks/useIsMobile';

function App() {
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' 或 'calendar'
  const isMobile = useIsMobile();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showDebug, setShowDebug] = useState(process.env.NODE_ENV === 'development');
  
  // 使用自定义Hook管理认证状态
  const { isAuthenticated, user, loading, isDemo, handleSignOut, handleSignIn } = useAuth();
  
  // 使用自定义Hook管理项目状态
  const { selectedProject, selectProject, clearSelectedProject } = useProject(user);

  // 手機預設收合側邊欄
  useEffect(() => {
    setIsSidebarOpen(!isMobile ? true : false);
  }, [isMobile]);

  // 如果还在加载认证状态，显示加载界面
  if (loading) {
    return (
      <div className="app">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          載入中...
        </div>
      </div>
    );
  }

  // 如果未认证，显示登录界面
  if (!isAuthenticated) {
    return (
      <div className="app">
        <header className="header">
          <h1>📅 多用戶週曆平台</h1>
        </header>
        <main className="main-content">
          <div className="auth-container">
            {isDemo ? (
              <div style={{ textAlign: 'center' }}>
                <p>目前為 DEMO 模式，已自動登入示範帳號。</p>
                <button className="btn" onClick={handleSignIn}>進入頁面</button>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p>使用 Cognito Hosted UI 登入</p>
                <button className="btn" onClick={handleSignIn}>登入</button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

  // 项目选择处理函数
  const handleProjectSelect = (project) => {
    selectProject(project);
    setCurrentView('calendar');
  };

  // 返回仪表板处理函数
  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    clearSelectedProject();
  };

  // 登出处理函数
  const handleSignOutAndReset = async () => {
    await handleSignOut();
    setCurrentView('dashboard');
    clearSelectedProject();
  };

  return (
    <div className="app">
      <header className="header">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h1>📅 多用戶週曆平台</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            {currentView === 'calendar' && (
              <button className="btn btn-secondary" onClick={handleBackToDashboard}>
                ← 返回專案列表
              </button>
            )}
            <span>歡迎, {user?.attributes?.email || user?.username}</span>
            <button className="btn" onClick={handleSignOutAndReset}>
              登出
            </button>
          </div>
        </div>
      </header>
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : (isSidebarOpen ? '220px 1fr' : '56px 1fr'), 
        gap: '1rem' 
      }}>
        {!isMobile && (
          <Sidebar
            isOpen={isSidebarOpen}
            onToggleOpen={() => setIsSidebarOpen(v => !v)}
            onGoHome={handleBackToDashboard}
            showDebug={showDebug}
            onToggleDebug={() => setShowDebug(v => !v)}
          />
        )}
        <main className="main-content">
          {currentView === 'dashboard' ? (
            <Dashboard 
              user={user} 
              onProjectSelect={handleProjectSelect}
              showDebug={showDebug}
            />
          ) : (
            <div>
              {selectedProject && (
                <div className="project-header">
                  <h2>{selectedProject.name}</h2>
                  <p>{selectedProject.description}</p>
                </div>
              )}
              <Calendar user={user} selectedProject={selectedProject} isMobile={isMobile} />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default App;
