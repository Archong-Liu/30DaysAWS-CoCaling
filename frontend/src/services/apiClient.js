/**
 * API 客戶端
 * 封裝與後端的通信，支援單表設計的數據操作
 */

import { fetchAuthSession } from 'aws-amplify/auth';
import { get, post, put, del } from 'aws-amplify/api';

class ApiClient {
  constructor() {
    this.baseUrl = process.env.REACT_APP_API_GATEWAY_URL;
    this.isDemo = String(process.env.REACT_APP_DEMO_MODE).toLowerCase() === 'true';
  }

  /**
   * 獲取認證 token
   */
  async getAuthToken() {
    if (this.isDemo) {
      return 'demo-token';
    }
    
    try {
      const session = await fetchAuthSession();
      const token = session.tokens?.idToken?.toString();
      
      if (!token) {
        throw new Error('No authentication token available');
      }
      
      return token;
    } catch (error) {
      console.error('Failed to get auth token:', error);
      throw error;
    }
  }

  /**
   * 構建請求頭
   */
  async buildHeaders() {
    const token = await this.getAuthToken();
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }

  /**
   * 通用請求方法
   */
  async request(method, path, data = null, options = {}) {
    if (this.isDemo) {
      return this.handleDemoRequest(method, path, data);
    }

    // 優先使用 Amplify，如遇到返回空 response 再回退 fetch 直連
    try {
      const headers = await this.buildHeaders();
      const requestOptions = {
        apiName: 'CalendarAPI',
        path,
        options: {
          headers,
          ...options
        }
      };

      let response;
      switch (method.toLowerCase()) {
        case 'get':
          response = await get(requestOptions);
          break;
        case 'post':
          requestOptions.options.body = data;
          response = await post(requestOptions);
          break;
        case 'put':
          requestOptions.options.body = data;
          response = await put(requestOptions);
          break;
        case 'delete':
          response = await del(requestOptions);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      const parsed = await this.parseResponse(response);

      // 僅對 GET 採用後備重試，避免 POST/PUT/DELETE 造成重複提交
      const isEmptyAmplify = !parsed || (typeof parsed === 'object' && Object.keys(parsed).length === 0);
      if (isEmptyAmplify && this.baseUrl && method.toLowerCase() === 'get') {
        return this.requestViaFetch(method, path, data, headers);
      }

      return parsed;
    } catch (error) {
      console.warn(`Amplify API request failed${method.toLowerCase() === 'get' ? ', fallback to fetch' : ''}: ${method} ${path}`, error);
      if (this.baseUrl && method.toLowerCase() === 'get') {
        const headers = await this.buildHeaders();
        return this.requestViaFetch(method, path, data, headers);
      }
      throw error;
    }
  }

  /**
   * 使用 fetch 直連 API Gateway（後備方案）
   */
  async requestViaFetch(method, path, data, headers) {
    const url = `${this.baseUrl}${path}`;
    const init = {
      method: method.toUpperCase(),
      headers
    };
    if (data && method.toLowerCase() !== 'get' && method.toLowerCase() !== 'delete') {
      init.body = JSON.stringify(data);
    }
    const res = await fetch(url, init);
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch (_) {
      return { statusCode: res.status, body: text };
    }
  }

  /**
   * 解析 API 響應
   */
  async parseResponse(response) {
    try {
      console.log('Parsing response:', response);
      
      // 處理 Lambda 直接調用的情況（如 get_calendars, project_manager 等）
      if (response && response.statusCode && response.body !== undefined) {
        if (typeof response.body === 'string') {
          return JSON.parse(response.body);
        } else if (typeof response.body?.json === 'function') {
          return await response.body.json();
        } else {
          return response.body;
        }
      }
      
      // 處理 Amplify API 的情況
      if (response && response.response) {
        const { body } = response.response;
        if (!body) return {};
        if (typeof body.json === 'function') {
          return await body.json();
        }
        // 嘗試讀取 text 再 JSON 解析
        if (typeof body.text === 'function') {
          const t = await body.text();
          try { return JSON.parse(t); } catch { return { body: t }; }
        }
        return {};
      }

      // 其他未知結果
      return response ?? {};
    } catch (error) {
      console.error('Failed to parse response:', error);
      return {};
    }
  }

  /**
   * Demo 模式請求處理
   */
  handleDemoRequest(method, path, data) {
    // 模擬 API 響應
    return new Promise((resolve) => {
      setTimeout(() => {
        if (method === 'get') {
          resolve(this.getDemoData(path));
        } else if (method === 'post' || method === 'put') {
          resolve({ success: true, data });
        } else if (method === 'delete') {
          resolve({ success: true });
        }
      }, 100);
    });
  }

  /**
   * 獲取 Demo 數據
   */
  getDemoData(path) {
    if (path.includes('/projects')) {
      return {
        Items: [
          {
            PK: 'PROJECT#demo-1',
            SK: 'PROJECT#demo-1',
            GSI1PK: 'USER#demo-user',
            GSI1SK: 'PROJECT#demo-1',
            name: '個人工作管理',
            description: '管理日常工作和個人任務',
            ownerId: 'demo-user',
            color: '#FF9900',
            createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          },
          {
            PK: 'PROJECT#demo-2',
            SK: 'PROJECT#demo-2',
            GSI1PK: 'USER#demo-user',
            GSI1SK: 'PROJECT#demo-2',
            name: '團隊專案',
            description: '與團隊協作的專案管理',
            ownerId: 'demo-user',
            color: '#146EB4',
            createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      };
    }
    
    // calendars 已移除
    
    if (path.includes('/events')) {
      return {
        success: true,
        message: 'Event created successfully'
      };
    }
    
    return { events: [], count: 0 };
  }

  // 事件查詢（RESTful）
  async getProjectEvents(projectId, params = {}) {
    const query = new URLSearchParams();
    if (params.startDate) query.set('startDate', params.startDate);
    if (params.endDate) query.set('endDate', params.endDate);
    const qs = query.toString();
    const path = qs ? `/projects/${encodeURIComponent(projectId)}/events?${qs}` : `/projects/${encodeURIComponent(projectId)}/events`;
    return this.request('get', path);
  }

  async createEvent(projectId, eventData) {
    return this.request('post', `/projects/${encodeURIComponent(projectId)}/events`, eventData);
  }

  async deleteEvent(eventId, projectId) {
    return this.request('delete', `/projects/${encodeURIComponent(projectId)}/events/${encodeURIComponent(eventId)}`);
  }

  // 專案管理 API（新的統一接口）
  async getProjects() {
    return this.request('get', '/projects');
  }

  async createProject(projectData) {
    return this.request('post', '/projects', projectData);
  }

  async updateProject(projectId, projectData) {
    return this.request('put', `/projects/${projectId}`, projectData);
  }

  async deleteProject(projectId) {
    return this.request('delete', `/projects/${projectId}`);
  }

  // 任務管理 API（新的統一接口）
  async getTasks(projectId = null) {
    const path = projectId ? `/projects/${projectId}/tasks` : '/tasks';
    return this.request('get', path);
  }

  async createTask(taskData) {
    return this.request('post', '/tasks', taskData);
  }

  async updateTask(taskId, taskData) {
    return this.request('put', `/tasks/${taskId}`, taskData);
  }

  async deleteTask(taskId) {
    return this.request('delete', `/tasks/${taskId}`);
  }

  // 用戶管理 API（新的統一接口）
  async getUserProfile(userId) {
    return this.request('get', `/users/${userId}`);
  }

  async updateUserProfile(userId, userData) {
    return this.request('put', `/users/${userId}`, userData);
  }

  // 專案成員管理 API
  async addProjectMember(projectId, memberData) {
    return this.request('post', `/projects/${projectId}/members`, memberData);
  }

  async removeProjectMember(projectId, userId) {
    return this.request('delete', `/projects/${projectId}/members/${userId}`);
  }

  // 活動紀錄 API
  async getActivityLog(entityType, entityId) {
    return this.request('get', `/${entityType}/${entityId}/activities`);
  }

  async logActivity(activityData) {
    return this.request('post', '/activities', activityData);
  }
}

export default ApiClient;
