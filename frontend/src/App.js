import React, { useState, useEffect } from 'react';
import { signOut, getCurrentUser, signInWithRedirect } from 'aws-amplify/auth';
import Calendar from './components/Calendar';
import Dashboard from './components/Dashboard';
import './App.css';

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [currentView, setCurrentView] = useState('dashboard'); // 'dashboard' 或 'calendar'
  const [selectedProject, setSelectedProject] = useState(null);
  const isDemo = String(process.env.REACT_APP_DEMO_MODE).toLowerCase() === 'true';

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    checkAuthState();
  }, []);

  const checkAuthState = async () => {
    try {
      if (isDemo) {
        setIsAuthenticated(true);
        setUser({ username: 'demo-user', attributes: { email: 'demo@example.com' } });
        return;
      }
      const currentUser = await getCurrentUser();
      setIsAuthenticated(true);
      setUser(currentUser);
    } catch (error) {
      setIsAuthenticated(false);
      setUser(null);
    }
  };

  const handleSignOut = async () => {
    try {
      // 使用 Hosted UI 全域登出，完成後重導至 redirectSignOut
      await signOut({ global: true });
      setIsAuthenticated(false);
      setUser(null);
      setCurrentView('dashboard');
      setSelectedProject(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleProjectSelect = (project) => {
    setSelectedProject(project);
    setCurrentView('calendar');
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    setSelectedProject(null);
  };

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
                <button className="btn" onClick={checkAuthState}>進入頁面</button>
              </div>
            ) : (
              <div style={{ textAlign: 'center' }}>
                <p>使用 Cognito Hosted UI 登入</p>
                <button className="btn" onClick={() => signInWithRedirect()}>登入</button>
              </div>
            )}
          </div>
        </main>
      </div>
    );
  }

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
            <button className="btn" onClick={handleSignOut}>
              登出
            </button>
          </div>
        </div>
      </header>
      <main className="main-content">
        {currentView === 'dashboard' ? (
          <Dashboard 
            user={user} 
            onProjectSelect={handleProjectSelect}
          />
        ) : (
          <div>
            {selectedProject && (
              <div className="project-header">
                <h2>{selectedProject.name}</h2>
                <p>{selectedProject.description}</p>
              </div>
            )}
            <Calendar user={user} selectedProject={selectedProject} />
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
