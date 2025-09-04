import React, { useState } from 'react';
import './Dashboard.css';
import { useProject } from '../hooks/useProject';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmDialog from './common/ConfirmDialog';

const Dashboard = ({ user, onProjectSelect, showDebug = false }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDescription, setNewProjectDescription] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('MEMBER');
  
  // 使用自定义Hook管理项目状态和逻辑
  const { 
    projects, 
    loading, 
    isMutating,
    createProject, 
    updateProject, 
    deleteProject, 
    refreshProjects 
  } = useProject(user);

  // 使用确认对话框Hook
  const confirmDialog = useConfirm();

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
      
      await createProject(projectData);
      
      // 重置表单
      setNewProjectName('');
      setNewProjectDescription('');
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating project:', error);
      alert('創建專案時發生錯誤');
    }
  };

  const handleUpdateProject = async (projectId, updates) => {
    try {
      await updateProject(projectId, updates);
    } catch (error) {
      console.error('Error updating project:', error);
      alert('更新專案時發生錯誤');
    }
  };

  const handleDeleteProject = async (projectId) => {
    const project = projects.find(p => p.id === projectId);
    confirmDialog.confirm(
      `確定要刪除專案「${project?.name}」嗎？此操作無法撤銷。`,
      async () => {
        try {
          await deleteProject(projectId);
        } catch (error) {
          console.error('Error deleting project:', error);
          alert('刪除專案時發生錯誤');
        }
      }
    );
  };

  const handleInviteMember = async (projectId) => {
    if (!inviteEmail.trim()) return;
    
    try {
      // 这里可以添加邀请成员的逻辑
      console.log('Inviting member:', inviteEmail, 'to project:', projectId);
      
      // 重置表单
      setInviteEmail('');
      setInviteRole('MEMBER');
      setShowInviteForm(false);
    } catch (error) {
      console.error('Error inviting member:', error);
      alert('邀請成員時發生錯誤');
    }
  };

  const getRandomColor = () => {
    const colors = ['#FF9900', '#146EB4', '#232F3E', '#37475A', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <p>載入專案中...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {(loading || isMutating) && (
        <div className="loading-container" style={{ position: 'sticky', top: 0, zIndex: 1 }}>
          <p>{loading ? '載入專案中...' : '正在更新，請稍候...'}</p>
        </div>
      )}
      <div className="dashboard-header">
        <h2>專案管理</h2>
        <button 
          className="btn btn-primary" 
          onClick={() => setShowCreateForm(true)}
        >
          + 新增專案
        </button>
      </div>

      {/* 创建项目表单 */}
      {showCreateForm && (
        <div className="create-project-form">
          <div className="form-header">
            <h3>新增專案</h3>
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
                placeholder="專案名稱"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>專案描述</label>
              <textarea
                placeholder="專案描述"
                value={newProjectDescription}
                onChange={(e) => setNewProjectDescription(e.target.value)}
              />
            </div>
            <div className="form-actions">
              <button className="btn" onClick={handleCreateProject}>
                創建
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowCreateForm(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 项目列表 */}
      <div className="projects-grid">
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
                onClick={() => onProjectSelect(project)}
              >
                <div 
                  className="project-color-bar"
                  style={{ backgroundColor: project.color }}
                />
                <div className="project-content">
                  <h3 className="project-name">{project.name}</h3>
                  <p className="project-description">{project.description}</p>
                  
                  <div className="project-stats">
                    <span className="stat">
                      <span className="stat-label">事件</span>
                      <span className="stat-value">{project.eventCount || 0}</span>
                    </span>
                    <span className="stat">
                      <span className="stat-label">成員</span>
                      <span className="stat-value">{project.members?.length || 1}</span>
                    </span>
                  </div>

                  {/* 成员头像与邀请提示 */}
                  <div className="project-members">
                    <div className="members-avatars">
                      {(project.members || []).slice(0, 3).map((member, index) => (
                        <div 
                          key={member?.id || index} 
                          className="member-avatar" 
                          title={`${member?.name || member?.id || 'user'} (${member?.role || 'MEMBER'})`}
                        >
                          {(member?.name || member?.id || '?').charAt(0)}
                        </div>
                      ))}
                      {project.members && project.members.length > 3 && (
                        <div className="member-avatar more-members">
                          +{project.members.length - 3}
                        </div>
                      )}
                    </div>

                    {(!project.members || project.members.length <= 1) && (
                      <div 
                        className="collaborator-hint"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShowInviteForm(true);
                        }}
                      >
                        <span className="hint-icon">👥</span>
                        <span className="hint-text">邀請成員</span>
                      </div>
                    )}
                  </div>

                  <div className="project-actions">
                    <button 
                      className="action-btn" 
                      title="查看日曆"
                      onClick={(e) => { e.stopPropagation(); onProjectSelect(project); }}
                    >
                      📅
                    </button>
                    <button 
                      className="action-btn" 
                      title="邀請成員"
                      onClick={(e) => { e.stopPropagation(); setShowInviteForm(true); }}
                    >
                      👥
                    </button>
                    <button 
                      className="action-btn" 
                      title="刪除專案"
                      onClick={(e) => { e.stopPropagation(); handleDeleteProject(project.id); }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {/* 新增專案提示卡片 */}
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

      {/* 邀请成员表单 */}
      {showInviteForm && (
        <div className="invite-collaborator-form">
          <div className="form-header">
            <h3>邀請成員</h3>
            <button 
              className="close-btn"
              onClick={() => setShowInviteForm(false)}
            >
              ×
            </button>
          </div>
          <div className="form-content">
            <div className="form-group">
              <label>成員郵箱 *</label>
              <input
                type="email"
                placeholder="成員郵箱"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>角色</label>
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="MEMBER">成員</option>
                <option value="ADMIN">管理員</option>
              </select>
            </div>
            <div className="form-actions">
              <button className="btn" onClick={() => handleInviteMember()}>
                邀請
              </button>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowInviteForm(false)}
              >
                取消
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Debug信息 */}
      {showDebug && (
        <div className="debug-info">
          <h4>Debug 信息</h4>
          <p>專案數量: {projects.length}</p>
          <p>用戶: {user?.username}</p>
          <button onClick={refreshProjects}>刷新專案</button>
        </div>
      )}

      {/* 确认对话框 */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        message={confirmDialog.message}
        onConfirm={confirmDialog.onConfirm}
        onCancel={confirmDialog.onCancel}
        confirmText="刪除"
        cancelText="取消"
      />
    </div>
  );
};

export default Dashboard;
