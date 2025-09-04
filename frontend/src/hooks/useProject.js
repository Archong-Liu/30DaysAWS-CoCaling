import { useState, useEffect } from 'react';
import DataService from '../services/dataService';
import ApiClient from '../services/apiClient';

export const useProject = (user) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isMutating, setIsMutating] = useState(false);
  
  const isDemo = String(process.env.REACT_APP_DEMO_MODE).toLowerCase() === 'true';
  const apiClient = new ApiClient();
  const dataService = new DataService(apiClient);

  useEffect(() => {
    if (!user) return;
    fetchProjects();
  }, [user, refreshKey]);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      
      if (isDemo) {
        const demoProjects = getDemoProjects();
        setProjects(demoProjects);
        setLoading(false);
        return;
      }
      
      const projectsData = await dataService.getProjectsByUser(user.username);
      
      if (projectsData && Array.isArray(projectsData) && projectsData.length > 0) {
        const formattedProjects = formatProjects(projectsData, user);
        setProjects(formattedProjects);
        updateProjectStatsCounts(formattedProjects);
      } else {
        setProjects([]);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  const createProject = async (projectData) => {
    try {
      setIsMutating(true);
      if (isDemo) {
        const newProject = createDemoProject(projectData, user);
        setProjects(prev => [...prev, newProject]);
        setRefreshKey(prev => prev + 1);
        return newProject;
      }
      
      const result = await dataService.createProject(projectData);
      await sleep(200);
      setRefreshKey(prev => prev + 1);
      await sleep(200);
      setRefreshKey(prev => prev + 1);
      return result;
    } catch (error) {
      console.error('Error creating project:', error);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const updateProject = async (projectId, projectData) => {
    try {
      setIsMutating(true);
      if (isDemo) {
        setProjects(prev => prev.map(p => 
          p.id === projectId ? { ...p, ...projectData } : p
        ));
        return;
      }
      
      const result = await dataService.updateProject(projectId, projectData);
      await sleep(150);
      setRefreshKey(prev => prev + 1);
      return result;
    } catch (error) {
      console.error('Error updating project:', error);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const deleteProject = async (projectId) => {
    try {
      setIsMutating(true);
      if (isDemo) {
        setProjects(prev => prev.filter(p => p.id !== projectId));
        if (selectedProject?.id === projectId) {
          setSelectedProject(null);
        }
        return;
      }
      
      await dataService.deleteProject(projectId);
      if (selectedProject?.id === projectId) {
        setSelectedProject(null);
      }
      await sleep(200);
      setRefreshKey(prev => prev + 1);
      await sleep(200);
      setRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting project:', error);
      throw error;
    } finally {
      setIsMutating(false);
    }
  };

  const selectProject = (project) => {
    setSelectedProject(project);
  };

  const clearSelectedProject = () => {
    setSelectedProject(null);
  };

  return {
    projects,
    loading,
    isMutating,
    selectedProject,
    selectProject,
    clearSelectedProject,
    createProject,
    updateProject,
    deleteProject,
    refreshProjects: () => setRefreshKey(prev => prev + 1)
  };
};

// 辅助函数
const getDemoProjects = () => [
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

const formatProjects = (projectsData, user) => {
  return projectsData.map(project => ({
    id: project.id,
    name: project.name,
    description: project.description,
    eventCount: project.eventCount || 0,
    lastUpdated: project.updatedAt,
    color: project.color || getRandomColor(),
    upcomingEvents: project.upcomingEvents || [],
    members: project.members || [{ id: user.username, name: user.username, role: 'OWNER' }]
  }));
};

const createDemoProject = (projectData, user) => ({
  id: projectData.id,
  name: projectData.name,
  description: projectData.description,
  color: projectData.color,
  status: 'ACTIVE',
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  stats: {
    totalEvents: 0,
    totalMembers: 1,
    totalTasks: 0
  },
  settings: {
    allowMemberInvite: true,
    allowEventCreation: true,
    visibility: 'PRIVATE'
  },
  members: [{ 
    id: user.username, 
    name: user.username, 
    role: 'OWNER',
    joinedAt: new Date().toISOString()
  }],
  upcomingEvents: [],
  eventCount: 0
});

const getRandomColor = () => {
  const colors = ['#FF9900', '#146EB4', '#232F3E', '#37475A', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4'];
  return colors[Math.floor(Math.random() * colors.length)];
};

const updateProjectStatsCounts = (projects) => {
  // 这里可以添加更新项目统计的逻辑
  console.log('Updating project stats counts for:', projects.length, 'projects');
};

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));
