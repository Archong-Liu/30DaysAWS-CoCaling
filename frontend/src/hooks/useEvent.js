import { useState, useEffect, useRef } from 'react';
import ApiClient from '../services/apiClient';

export const useEvent = (user, selectedProject) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isMutating, setIsMutating] = useState(false);
  
  const isDemo = String(process.env.REACT_APP_DEMO_MODE).toLowerCase() === 'true';
  const api = new ApiClient();
  const fetchSeqRef = useRef(0);
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  useEffect(() => {
    if (!user) return;
    if (isDemo) {
      loadDemoEvents();
      return;
    }
    fetchEvents();
  }, [user, selectedProject]);

  const loadDemoEvents = () => {
    const demo = getDemoEvents();
    const filteredDemo = selectedProject 
      ? demo.filter(event => event.extendedProps.projectId === selectedProject.id)
      : demo;
    setEvents(filteredDemo);
    setLoading(false);
  };

  const fetchEvents = async () => {
    try {
      const seq = ++fetchSeqRef.current;
      setLoading(true);
      
      if (isDemo) {
        setLoading(false);
        return;
      }
      
      const data = await api.getEvents(null, selectedProject?.id);
      console.log('Project events data:', data);
      
      const eventsArray = Array.isArray(data?.events) ? data.events : [];
      const filteredEvents = selectedProject 
        ? eventsArray.filter(event => event.projectId === selectedProject.id)
        : eventsArray;

      const formattedEvents = formatEvents(filteredEvents);
      
      if (seq === fetchSeqRef.current) {
        setEvents(formattedEvents);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError(`載入事件時發生錯誤: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async (eventData) => {
    try {
      if (isSubmitting) return;
      setIsSubmitting(true);
      setIsMutating(true);
      
      if (isDemo) {
        const newEvent = createDemoEvent(eventData);
        setEvents(prev => [...prev, newEvent]);
        return;
      }
      
      // 乐观更新
      const optimisticId = 'tmp-' + Date.now();
      const optimisticEvent = createOptimisticEvent(eventData, optimisticId);
      setEvents(prev => [...prev, optimisticEvent]);
      
      await api.createEvent({
        title: eventData.title,
        startDate: eventData.start,
        endDate: eventData.end,
        allDay: eventData.allDay || false,
        description: eventData.description || '',
        projectId: selectedProject?.id,
        ...(selectedProject && {
          projectName: selectedProject.name,
          projectDescription: selectedProject.description,
          ownerId: selectedProject.ownerId || user?.username
        })
      });
      
      await refetchAfterMutation();
    } catch (err) {
      console.error('Error creating event:', err);
      alert('建立事件時發生錯誤');
    } finally {
      setIsSubmitting(false);
      setIsMutating(false);
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      setIsMutating(true);
      if (isDemo) {
        setEvents(prev => prev.filter(e => e.id !== eventId));
        return;
      }
      
      await api.deleteEvent(eventId, selectedProject?.id);
      await refetchAfterMutation();
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('刪除事件時發生錯誤');
    } finally {
      setIsMutating(false);
    }
  };

  const refetchAfterMutation = async () => {
    try {
      await sleep(200);
      await fetchEvents();
      await sleep(200);
      await fetchEvents();
    } catch (e) {
      console.error('Refetch after mutation failed:', e);
    }
  };

  return {
    events,
    loading,
    error,
    isSubmitting,
    isMutating,
    createEvent,
    deleteEvent,
    fetchEvents
  };
};

// 辅助函数
const getDemoEvents = () => [
  {
    id: 'demo-1',
    title: 'DEMO：團隊站會',
    start: new Date().toISOString().slice(0, 10) + 'T09:30:00',
    end: new Date().toISOString().slice(0, 10) + 'T10:00:00',
    allDay: false,
    backgroundColor: '#FF9900',
    borderColor: '#E47911',
    extendedProps: { 
      description: '每日 30 分鐘進度同步',
      projectId: 'demo-1',
      projectName: '個人工作管理'
    }
  },
  {
    id: 'demo-2',
    title: 'DEMO：與客戶會議',
    start: new Date().toISOString().slice(0, 10) + 'T14:00:00',
    end: new Date().toISOString().slice(0, 10) + 'T15:00:00',
    allDay: false,
    backgroundColor: '#232F3E',
    borderColor: '#37475A',
    extendedProps: { 
      description: '專案需求討論',
      projectId: 'demo-2',
      projectName: '團隊專案'
    }
  }
];

const createDemoEvent = (eventData) => ({
  id: 'demo-' + Date.now(),
  title: eventData.title,
  start: eventData.start,
  end: eventData.end,
  allDay: eventData.allDay || false,
  backgroundColor: '#146EB4',
  borderColor: '#0F5A8A',
  extendedProps: { 
    description: eventData.description || '',
    projectId: 'demo-1',
    projectName: '個人工作管理'
  }
});

const createOptimisticEvent = (eventData, optimisticId) => ({
  id: optimisticId,
  title: eventData.title,
  start: eventData.start,
  end: eventData.end,
  allDay: eventData.allDay || false,
  backgroundColor: '#146EB4',
  borderColor: '#0F5A8A',
  extendedProps: {
    description: eventData.description || '',
    projectId: 'demo-1',
    projectName: '個人工作管理'
  }
});

const formatEvents = (eventsArray) => {
  return eventsArray.map(event => ({
    id: event.eventId || event.id,
    title: event.title,
    start: event.startDate || event.start,
    end: event.endDate || event.end,
    allDay: event.allDay,
    backgroundColor: event.color,
    borderColor: event.color,
    extendedProps: {
      description: event.description,
      projectName: event.projectName
    }
  }));
};
