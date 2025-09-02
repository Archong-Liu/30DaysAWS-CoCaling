import React, { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import { fetchAuthSession } from 'aws-amplify/auth';

import { get, post, del } from 'aws-amplify/api';
import './Calendar.css';
import ApiClient from '../services/apiClient';

const Calendar = ({ user, selectedProject }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const isDemo = String(process.env.REACT_APP_DEMO_MODE).toLowerCase() === 'true';
  const api = new ApiClient();
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

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

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!user) return;
    if (isDemo) {
      // 使用本地假資料
      const demo = [
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
      
      // 在 Demo 模式下也應用專案過濾
      const filteredDemo = selectedProject 
        ? demo.filter(event => event.extendedProps.projectId === selectedProject.id)
        : demo;
      
      setEvents(filteredDemo);
      setLoading(false);
      return;
    }
    fetchEvents();
  }, [user]);

  // 監聽 selectedProject 變化，重新過濾事件
  useEffect(() => {
    if (user && !isDemo) {
      fetchEvents();
    } else if (user && isDemo) {
      // Demo 模式下重新應用過濾邏輯
      const demo = [
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
      
      const filteredDemo = selectedProject 
        ? demo.filter(event => event.extendedProps.projectId === selectedProject.id)
        : demo;
      
      setEvents(filteredDemo);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProject, user, isDemo]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      if (isDemo) {
        setLoading(false);
        return; // DEMO 模式不呼叫 API
      }
      
      const data = await api.getCalendars({ projectId: selectedProject?.id });
      console.log('Calendars data:', data);
      // 安全取得事件清單（兼容不同回傳形狀）
      const eventsArray = Array.isArray(data?.events)
        ? data.events
        : Array.isArray(data)
          ? data
          : Array.isArray(data?.data?.events)
            ? data.data.events
            : [];
      // 過濾事件：如果有選定專案，只顯示該專案的事件
      const filteredEvents = selectedProject 
        ? eventsArray.filter(event => event.projectId === selectedProject.id)
        : eventsArray;

      const formattedEvents = filteredEvents.map(event => ({
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
      
      setEvents(formattedEvents);
      setError(null);
    } catch (err) {
        console.error('Error fetching events:', err);
        console.error('Error details:', {
          message: err.message,
          stack: err.stack,
          name: err.name
        });
        setError(`載入事件時發生錯誤: ${err.message}`);
      } finally {
        setLoading(false);
      }
  };

  const handleDateSelect = (selectInfo) => {
    const title = prompt('請輸入事件標題:');
    if (title) {
      createEvent({
        title,
        start: selectInfo.startStr,
        end: selectInfo.endStr,
        allDay: selectInfo.allDay
      });
    }
    selectInfo.view.calendar.unselect();
  };

  const handleEventClick = (clickInfo) => {
    // eslint-disable-next-line no-restricted-globals
    if (confirm(`確定要刪除事件 "${clickInfo.event.title}" 嗎？`)) {
      deleteEvent(clickInfo.event.id);
    }
  };

  const createEvent = async (eventData) => {
    try {
      if (isDemo) {
        const newEvent = {
          id: 'demo-' + Date.now(),
          title: eventData.title,
          start: eventData.start,
          end: eventData.end,
          allDay: eventData.allDay || false,
          backgroundColor: selectedProject ? selectedProject.color : '#146EB4',
          borderColor: selectedProject ? selectedProject.color : '#0F5A8A',
          extendedProps: { 
            description: eventData.description || '',
            projectId: selectedProject?.id,
            projectName: selectedProject?.name
          }
        };
        setEvents(prev => [...prev, newEvent]);
        return;
      }
      await api.createEvent({
        title: eventData.title,
        startDate: eventData.start,
        endDate: eventData.end,
        allDay: eventData.allDay || false,
        description: eventData.description || '',
        ...(selectedProject && {
          projectId: selectedProject.id,
          projectName: selectedProject.name,
          projectDescription: selectedProject.description,
          ownerId: selectedProject.ownerId || user?.username
        })
      });
      // 重新載入事件（延遲 + 重試，避免讀到未同步資料）
      await refetchAfterMutation();
    } catch (err) {
      console.error('Error creating event:', err);
      alert('建立事件時發生錯誤');
    }
  };

  const deleteEvent = async (eventId) => {
    try {
      if (isDemo) {
        setEvents(prev => prev.filter(e => e.id !== eventId));
        return;
      }
      await api.deleteEvent(eventId, selectedProject?.id);
      // 重新載入事件（延遲 + 重試，避免讀到未同步資料）
      await refetchAfterMutation();
    } catch (err) {
      console.error('Error deleting event:', err);
      alert('刪除事件時發生錯誤');
    }
  };

  if (loading) {
    return (
      <div className="calendar-container">
        <div style={{ padding: '2rem', textAlign: 'center' }}>
          載入中...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="calendar-container">
        <div style={{ padding: '2rem', textAlign: 'center', color: 'red' }}>
          {error}
          <br />
          <button className="btn" onClick={fetchEvents}>
            重試
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="calendar-container">
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        }}
        initialView="dayGridMonth"
        editable={true}
        selectable={true}
        selectMirror={true}
        dayMaxEvents={true}
        weekends={true}
        events={events}
        select={handleDateSelect}
        eventClick={handleEventClick}
        locale="zh-tw"
        buttonText={{
          today: '今天',
          month: '月',
          week: '週',
          day: '日',
          list: '列表'
        }}
        height="auto"
      />
    </div>
  );
};

export default Calendar;
