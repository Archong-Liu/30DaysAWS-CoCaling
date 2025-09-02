/**
 * 數據訪問服務
 * 簡化設計，直接與 Lambda 函數對接
 */

// 資料類型常量
export const ENTITY_TYPES = {
  USER: 'USER',
  PROJECT: 'PROJECT',
  TASK: 'TASK',
  EVENT: 'EVENT'
};

// 狀態常量
export const TASK_STATUS = {
  TODO: 'TODO',
  IN_PROGRESS: 'IN_PROGRESS',
  DONE: 'DONE',
  CANCELLED: 'CANCELLED'
};

export const PROJECT_ROLES = {
  OWNER: 'OWNER',
  MEMBER: 'MEMBER',
  VIEWER: 'VIEWER'
};

/**
 * 業務邏輯服務
 */
export class DataService {
  constructor(apiClient) {
    this.api = apiClient;
  }

  // 專案相關操作
  async createProject(projectData) {
    try {
      console.log('Creating project with data:', projectData);
      
      // 直接調用專案管理 API
      const result = await this.api.createProject(projectData);
      console.log('Create project result:', result);
      
      // 處理 API 響應 - 更詳細的檢查
      if (result && result.project) {
        console.log('Project created successfully with project data:', result.project);
        return result.project;
      } else if (result && result.message) {
        console.log('Project created successfully with message:', result.message);
        // 如果沒有 project 字段，但有成功消息，返回基本專案信息
        const fallbackProject = {
          id: projectData.id || `project-${Date.now()}`,
          name: projectData.name,
          description: projectData.description || '',
          color: projectData.color || '#FF9900',
          status: 'ACTIVE',
          ownerId: projectData.ownerId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        console.log('Returning fallback project data:', fallbackProject);
        return fallbackProject;
      } else if (result && result.success) {
        console.log('Project created successfully with success flag');
        // 如果有 success 標誌，返回基本專案信息
        const fallbackProject = {
          id: projectData.id || `project-${Date.now()}`,
          name: projectData.name,
          description: projectData.description || '',
          color: projectData.color || '#FF9900',
          status: 'ACTIVE',
          ownerId: projectData.ownerId,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        return fallbackProject;
      }
      
      console.error('Unexpected API response format:', result);
      throw new Error(`Unexpected API response format: ${JSON.stringify(result)}`);
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    }
  }

  async getProjectsByUser(userId) {
    try {
      // 直接調用專案管理 API
      const result = await this.api.getProjects();
      console.log('Get projects result:', result);
      
      if (result && result.projects) {
        return result.projects;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching projects:', error);
      return [];
    }
  }

  async updateProject(projectId, projectData) {
    try {
      const result = await this.api.updateProject(projectId, projectData);
      return result;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    }
  }

  async deleteProject(projectId) {
    try {
      const result = await this.api.deleteProject(projectId);
      return result;
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    }
  }

  async addProjectMember(projectId, userId, role = PROJECT_ROLES.MEMBER) {
    try {
      const memberData = {
        userId,
        role,
        joinedAt: new Date().toISOString()
      };
      
      const result = await this.api.addProjectMember(projectId, memberData);
      return result;
    } catch (error) {
      console.error('Error adding project member:', error);
      throw error;
    }
  }

  // 任務相關操作
  async createTask(taskData) {
    try {
      const result = await this.api.createTask(taskData);
      
      if (result && result.task) {
        return result.task;
      }
      
      throw new Error('Unexpected API response format');
    } catch (error) {
      console.error('Error creating task:', error);
      throw error;
    }
  }

  async getTasksByProject(projectId) {
    try {
      const result = await this.api.getTasks(projectId);
      
      if (result && result.tasks) {
        return result.tasks;
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching tasks:', error);
      return [];
    }
  }

  async updateTaskStatus(taskId, status) {
    try {
      const result = await this.api.updateTask(taskId, { status });
      return result;
    } catch (error) {
      console.error('Error updating task status:', error);
      throw error;
    }
  }

  async deleteTask(taskId) {
    try {
      const result = await this.api.deleteTask(taskId);
      return result;
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  }

  // 事件相關操作
  async createEvent(eventData) {
    try {
      const result = await this.api.createEvent(eventData);
      return result;
    } catch (error) {
      console.error('Error creating event:', error);
      throw error;
    }
  }

  async getEventsByProject(projectId) {
    try {
      // 使用 getCalendars 然後過濾專案事件
      const result = await this.api.getCalendars();
      
      if (result && result.events) {
        return result.events.filter(event => event.projectId === projectId);
      }
      
      return [];
    } catch (error) {
      console.error('Error fetching project events:', error);
      return [];
    }
  }

  async deleteEvent(eventId) {
    try {
      const result = await this.api.deleteEvent(eventId);
      return result;
    } catch (error) {
      console.error('Error deleting event:', error);
      throw error;
    }
  }

  // 日曆相關操作
  async getCalendars() {
    try {
      const result = await this.api.getCalendars();
      return result;
    } catch (error) {
      console.error('Error fetching calendars:', error);
      throw error;
    }
  }

  // 用戶相關操作
  async getUserProfile(userId) {
    try {
      const result = await this.api.getUserProfile(userId);
      return result;
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  async updateUserProfile(userId, userData) {
    try {
      const result = await this.api.updateUserProfile(userId, userData);
      return result;
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }

  // 活動紀錄
  async getActivityLog(entityType, entityId) {
    try {
      const result = await this.api.getActivityLog(entityType, entityId);
      return result;
    } catch (error) {
      console.error('Error fetching activity log:', error);
      return [];
    }
  }

  async logActivity(activityData) {
    try {
      const result = await this.api.logActivity(activityData);
      return result;
    } catch (error) {
      console.error('Error logging activity:', error);
      throw error;
    }
  }
}

export default DataService;
