import React from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import './Calendar.css';
import { useEvent } from '../hooks/useEvent';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmDialog from './common/ConfirmDialog';

const Calendar = ({ user, selectedProject, isMobile = false }) => {
  // 使用自定义Hook管理事件状态和逻辑
  const { 
    events, 
    loading, 
    error, 
    isSubmitting, 
    isMutating,
    createEvent, 
    deleteEvent, 
    fetchEvents 
  } = useEvent(user, selectedProject);

  // 使用确认对话框Hook
  const confirmDialog = useConfirm();

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
    confirmDialog.confirm(
      `確定要刪除事件「${clickInfo.event.title}」嗎？`,
      () => deleteEvent(clickInfo.event.id)
    );
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
      {(loading || isMutating) && (
        <div style={{ padding: '0.5rem 0', textAlign: 'center' }}>
          {loading ? '載入事件中...' : '正在更新事件，請稍候...'}
        </div>
      )}
      <FullCalendar
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        headerToolbar={isMobile ? {
          left: 'prev,next',
          center: 'title',
          right: 'today'
        } : {
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
        }}
        initialView={isMobile ? 'listWeek' : 'dayGridMonth'}
        editable={true}
        selectable={!isMobile}
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
        height={isMobile ? 'auto' : 'auto'}
      />

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

export default Calendar;
