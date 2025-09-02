import React, { useState, useEffect } from 'react';
import DataService from '../services/dataService';
import ApiClient from '../services/apiClient';
import './Dashboard.css';

const Dashboard = ({ user, onProjectSelect }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0); // 強制重新渲染的鍵
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [selectedProject, setSelectedProject] = useState(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  const isDemo = String(process.env.REACT_APP_DEMO_MODE).toLowerCase() === 'true';
  
  // 初始化數據服務
  const apiClient = new ApiClient();
  const dataService = new DataService(apiClient);

  useEffect(() => {
    if (!user) return;
    fetchProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      if (isDemo) {
        // Demo 模式使用本地數據
        const demoProjects = [
          {
            id: 'demo-1',
            name: '個人工作管理',
            description: '管理日常工作和個人任務',
            eventCount: 12,
            lastUpdated: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            color: '#FF9900',
            upcomingEvents: [
              { title: '團隊會議', date: '2024-01-15', time: '09:00' },
              { title: '專案審查', date: '2024-01-16', time: '14:00' }
            ],
            members: [{ id: 'user1', name: '張小明', role: 'OWNER' }]
          },
          {
            id: 'demo-2',
            name: '團隊專案',
            description: '與團隊協作的專案管理',
            eventCount: 8,
            lastUpdated: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            color: '#146EB4',
            upcomingEvents: [
              { title: '客戶會議', date: '2024-01-17', time: '10:00' },
              { title: '進度報告', date: '2024-01-18', time: '16:00' }
            ],
            members: [
              { id: 'user1', name: '張小明', role: 'OWNER' },
              { id: 'user2', name: '李小華', role: 'MEMBER' }
            ]
          }
        ];
        setProjects(demoProjects);
        setLoading(false);
        return;
      }
      
      // 使用數據服務獲取專案
      const projectsData = await dataService.getProjectsByUser(user.username);
      
      if (projectsData && Array.isArray(projectsData) && projectsData.length > 0) {
        // 轉換為顯示格式
        const formattedProjects = projectsData.map(project => ({
          id: project.id,
          name: project.name,
          description: project.description,
          eventCount: project.eventCount || 0,
          lastUpdated: project.updatedAt,
          color: project.color || getRandomColor(),
          upcomingEvents: project.upcomingEvents || [], // 使用從 API 獲取的事件數據
          members: project.members || [{ id: user.username, name: user.username, role: 'OWNER' }] // 使用從 API 獲取的成員數據或默認值
        }));
        
        setProjects(formattedProjects);
        console.log('Successfully loaded projects from API:', formattedProjects);
      } else {
        // 如果沒有專案數據，顯示空狀態
        setProjects([]);
        console.log('No projects found in API response');
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      // 如果API失敗，顯示空狀態
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    
    try {
      const projectData = {
        id: 'project-' + Date.now(),
        name: newProjectName.trim(),
        description: newProjectDescription.trim(),
        ownerId: user.username,
        color: getRandomColor()
      };
      
      if (isDemo) {
        // Demo 模式直接添加到本地狀態
        const newProject = {
          id: projectData.id,
          name: projectData.name,
          description: projectData.description,
          color: projectData.color,
          status: 'ACTIVE',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          // 專案統計
          stats: {
            totalEvents: 0,
            totalMembers: 1,
            totalTasks: 0
          },
          // 專案設置
          settings: {
            allowMemberInvite: true,
            allowEventCreation: true,
            visibility: 'PRIVATE'
          },
          // 專案成員（創建者為擁有者）
          members: [{ 
            id: user.username, 
            name: user.username, 
            role: 'OWNER',
            joinedAt: new Date().toISOString()
          }],
          // 專案事件
          upcomingEvents: [],
          eventCount: 0
        };
        
        console.log('Creating new project in demo mode:', newProject);
        
        // 使用函數式更新確保狀態正確更新
        setProjects(prevProjects => {
          const updatedProjects = [...prevProjects, newProject];
          console.log('Updated projects array:', updatedProjects);
          return updatedProjects;
        });
        
        // 強制重新渲染
        setRefreshKey(prev => prev + 1);
        
        // 確保狀態更新完成後再關閉表單
        setTimeout(() => {
          console.log('Projects state after update:', projects);
          // 再次強制重新渲染以確保新專案可見
          setRefreshKey(prev => prev + 1);
        }, 100);
      } else {
        // 使用數據服務創建專案
        const newProject = await dataService.createProject(projectData);
        
        // 將新專案添加到本地狀態
        setProjects(prevProjects => [...prevProjects, newProject]);
        
        // 強制重新渲染
        setRefreshKey(prev => prev + 1);
      }
      
      setNewProjectName('');
      setNewProjectDescription('');
      setShowCreateForm(false);
      
      // 在 Demo 模式下，確保狀態更新後重新渲染
      if (isDemo) {
        setTimeout(() => {
          console.log('Final projects state:', projects);
        }, 100);
      }
    } catch (error) {
      console.error('Error creating project:', error);
      alert('創建專案失敗，請重試');
    }
  };

  const getRandomColor = () => {
    const colors = ['#FF9900', '#146EB4', '#232F3E', '#D4EDDA', '#FFF3CD', '#F8D7DA'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '昨天';
    if (diffDays === 0) return '今天';
    if (diffDays < 7) return `${diffDays}天前`;
    return date.toLocaleDateString('zh-TW');
  };

  const handleProjectClick = (project) => {
    if (onProjectSelect) {
      onProjectSelect(project);
    }
  };

  const handleInviteCollaborator = (project, event) => {
    event.stopPropagation(); // 防止觸發專案點擊
    setSelectedProject(project);
    setShowInviteForm(true);
  };

  const handleSendInvite = async () => {
    if (!inviteEmail.trim() || !selectedProject) return;
    
    try {
      if (isDemo) {
        // Demo 模式：直接添加到本地狀態
        const newMember = {
          id: inviteEmail,
          name: inviteEmail.split('@')[0],
          role: inviteRole
        };
        
        setProjects(prev => prev.map(project => 
          project.id === selectedProject.id 
            ? { 
                ...project, 
                members: [...(project.members || []), newMember],
                stats: {
                  ...project.stats,
                  totalMembers: (project.stats?.totalMembers || project.members?.length || 1) + 1
                }
              }
            : project
        ));
        
        // 強制重新渲染以顯示新成員
        setRefreshKey(prev => prev + 1);
        
        alert(`已邀請 ${inviteEmail} 加入專案`);
      } else {
        // 實際 API 調用
        const result = await dataService.addProjectMember(selectedProject.id, inviteEmail, inviteRole);
        
        if (result && result.success) {
          // 將新成員添加到本地狀態
          const newMember = {
            id: inviteEmail,
            name: inviteEmail.split('@')[0],
            role: inviteRole,
            joinedAt: new Date().toISOString()
          };
          
          setProjects(prev => prev.map(project => 
            project.id === selectedProject.id 
              ? { 
                  ...project, 
                  members: [...(project.members || []), newMember],
                  stats: {
                    ...project.stats,
                    totalMembers: (project.stats?.totalMembers || project.members?.length || 1) + 1
                  }
                }
              : project
          ));
          
          // 強制重新渲染
          setRefreshKey(prev => prev + 1);
          
          alert(`已邀請 ${inviteEmail} 加入專案`);
        } else {
          alert('邀請失敗，請重試');
        }
      }
      
      setInviteEmail('');
      setInviteRole('MEMBER');
      setShowInviteForm(false);
      setSelectedProject(null);
    } catch (error) {
      console.error('Error inviting collaborator:', error);
      alert('邀請失敗，請重試');
    }
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="aws-loading"></div>
          <p>載入專案中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h2>我的專案</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateForm(true)}
        >
          + 建立新專案
        </button>
      </div>

      {showCreateForm && (
        <div className="create-project-form">
          <div className="form-header">
            <h3>建立新專案</h3>
            <button 
              className="close-btn"
              onClick={() => setShowCreateForm(false)}
            >
              ×
            </button>
          </div>
          <div className="form-content">
            <div className="form-group">
              <label>專案名稱 *</label>
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="輸入專案名稱"
                maxLength={50}
              />
            </div>
            <div className="form-group">
              <label>專案描述</label>
              <textarea
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
                placeholder="輸入專案描述（可選）"
                maxLength={200}
                rows={3}
              />
            </div>
            <div className="form-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowCreateForm(false)}
              >
                取消
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleCreateProject}
                disabled={!newProjectName.trim()}
              >
                建立專案
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 邀請協作者表單 */}
      {showInviteForm && selectedProject && (
        <div className="invite-collaborator-form">
          <div className="form-header">
            <h3>邀請協作者加入專案</h3>
            <button 
              className="close-btn"
              onClick={() => {
                setShowInviteForm(false);
                setSelectedProject(null);
                setInviteEmail('');
                setInviteRole('MEMBER');
              }}
            >
              ×
            </button>
          </div>
          <div className="form-content">
            <div className="form-group">
              <label>專案名稱</label>
              <input
                type="text"
                value={selectedProject.name}
                disabled
                className="disabled-input"
              />
            </div>
            <div className="form-group">
              <label>邀請郵箱 *</label>
              <input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="輸入協作者的郵箱地址"
                maxLength={100}
              />
            </div>
            <div className="form-group">
              <label>角色權限</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="MEMBER">成員 (MEMBER)</option>
                <option value="VIEWER">查看者 (VIEWER)</option>
                <option value="OWNER">擁有者 (OWNER)</option>
              </select>
            </div>
            <div className="form-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setShowInviteForm(false);
                  setSelectedProject(null);
                  setInviteEmail('');
                  setInviteRole('MEMBER');
                }}
              >
                取消
              </button>
              <button 
                className="btn btn-primary"
                onClick={handleSendInvite}
                disabled={!inviteEmail.trim()}
              >
                發送邀請
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="projects-grid" key={refreshKey}>
        {/* 調試信息 */}
        {process.env.NODE_ENV === 'development' && (
          <div style={{ gridColumn: '1 / -1', padding: '1rem', background: '#f0f0f0', marginBottom: '1rem', borderRadius: '8px' }}>
            <strong>調試信息:</strong> 專案數量: {projects.length}, 刷新鍵: {refreshKey}
            <br />
            <strong>專案列表:</strong> {projects.map(p => p.name).join(', ')}
          </div>
        )}
        
        {projects.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📁</div>
            <h3>還沒有專案</h3>
            <p>建立您的第一個專案來開始管理行程</p>
            <button 
              className="btn btn-primary"
              onClick={() => setShowCreateForm(true)}
            >
              建立第一個專案
            </button>
          </div>
        ) : (
          <>
            {projects.map(project => (
              <div 
                key={project.id} 
                className="project-card"
                onClick={() => handleProjectClick(project)}
              >
                <div 
                  className="project-color-bar"
                  style={{ backgroundColor: project.color }}
                ></div>
                <div className="project-content">
                  <h3 className="project-name">{project.name}</h3>
                  <p className="project-description">{project.description}</p>
                  
                  {/* 專案統計信息 */}
                  <div className="project-stats">
                    <span className="stat">
                      <span className="stat-label">事件</span>
                      <span className="stat-value">{project.stats?.totalEvents || project.eventCount || 0}</span>
                    </span>
                    <span className="stat">
                      <span className="stat-label">成員</span>
                      <span className="stat-value">{project.stats?.totalMembers || project.members?.length || 1}</span>
                    </span>
                    <span className="stat">
                      <span className="stat-label">任務</span>
                      <span className="stat-value">{project.stats?.totalTasks || 0}</span>
                    </span>
                  </div>
                  
                  {/* 即將到來的事件 */}
                  {project.upcomingEvents && project.upcomingEvents.length > 0 && (
                    <div className="upcoming-events">
                      <h4>即將到來</h4>
                      <div className="events-list">
                        {project.upcomingEvents.slice(0, 2).map((event, index) => (
                          <div key={index} className="event-item">
                            <span className="event-title">{event.title}</span>
                            <span className="event-time">{event.date} {event.time}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* 協作者信息 */}
                  <div className="project-members">
                    <div className="members-avatars">
                      {project.members?.slice(0, 3).map((member, index) => (
                        <div key={member.id} className="member-avatar" title={`${member.name} (${member.role})`}>
                          {member.name.charAt(0)}
                        </div>
                      ))}
                      {project.members && project.members.length > 3 && (
                        <div className="member-avatar more-members">
                          +{project.members.length - 3}
                        </div>
                      )}
                    </div>
                    
                    {/* 協作者提示 */}
                    {(!project.members || project.members.length <= 1) && (
                      <div 
                        className="collaborator-hint"
                        onClick={(e) => handleInviteCollaborator(project, e)}
                      >
                        <span className="hint-icon">👥</span>
                        <span className="hint-text">邀請協作者</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="project-actions">
                  <button className="action-btn" title="查看日曆">📅</button>
                  <button className="action-btn" title="專案設置">⚙️</button>
                  <button 
                    className="action-btn" 
                    title="邀請協作者"
                    onClick={(e) => handleInviteCollaborator(project, e)}
                  >
                    👥
                  </button>
                </div>
              </div>
            ))}
            
            {/* 新增專案卡片 */}
            <div 
              className="project-card add-project-card"
              onClick={() => setShowCreateForm(true)}
            >
              <div className="add-project-content">
                <div className="add-icon">+</div>
                <h3>建立新專案</h3>
                <p>開始一個新的專案</p>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
