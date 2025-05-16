import React, { useState, useEffect } from 'react';
import '../styles/TaskCalendar.css';

const TaskCalendar = ({ tasks }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarView, setCalendarView] = useState('month'); // 'month', 'week', 'day'
  const [calendarData, setCalendarData] = useState([]);

  // Get days in month
  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Get day of week (0-6) for the first day of the month
  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  // Format date to YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Parse ISO date string to Date object
  const parseISODate = (isoString) => {
    return new Date(isoString);
  };

  // Check if a task falls on a specific date
  const taskFallsOnDate = (task, date) => {
    const taskStartDate = parseISODate(task.start_at);
    const taskEndDate = parseISODate(task.end_at);
    const taskDeadline = parseISODate(task.deadline);
    
    const dateStart = new Date(date);
    dateStart.setHours(0, 0, 0, 0);
    
    const dateEnd = new Date(date);
    dateEnd.setHours(23, 59, 59, 999);
    
    // Check if task starts, ends, or has deadline on this date
    return (
      (taskStartDate >= dateStart && taskStartDate <= dateEnd) ||
      (taskEndDate >= dateStart && taskEndDate <= dateEnd) ||
      (taskDeadline >= dateStart && taskDeadline <= dateEnd) ||
      (taskStartDate < dateStart && taskEndDate > dateEnd) // Task spans over this date
    );
  };

  // Get tasks for a specific date
  const getTasksForDate = (date) => {
    const dateString = formatDate(date);
    return tasks.filter(task => taskFallsOnDate(task, dateString));
  };

  // Generate calendar data
  useEffect(() => {
    const generateCalendarData = () => {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();
      const daysInMonth = getDaysInMonth(year, month);
      const firstDayOfMonth = getFirstDayOfMonth(year, month);
      
      const calendarDays = [];
      
      // Add empty cells for days before the first day of the month
      for (let i = 0; i < firstDayOfMonth; i++) {
        calendarDays.push({
          date: null,
          isCurrentMonth: false,
          tasks: []
        });
      }
      
      // Add days of the current month
      for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        calendarDays.push({
          date,
          isCurrentMonth: true,
          tasks: getTasksForDate(date)
        });
      }
      
      // Add empty cells to complete the last row if needed
      const totalCells = Math.ceil((firstDayOfMonth + daysInMonth) / 7) * 7;
      for (let i = calendarDays.length; i < totalCells; i++) {
        calendarDays.push({
          date: null,
          isCurrentMonth: false,
          tasks: []
        });
      }
      
      setCalendarData(calendarDays);
    };
    
    generateCalendarData();
  }, [currentDate, tasks]);

  // Navigate to previous month/week/day
  const navigatePrevious = () => {
    const newDate = new Date(currentDate);
    if (calendarView === 'month') {
      newDate.setMonth(newDate.getMonth() - 1);
    } else if (calendarView === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else if (calendarView === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    }
    setCurrentDate(newDate);
  };

  // Navigate to next month/week/day
  const navigateNext = () => {
    const newDate = new Date(currentDate);
    if (calendarView === 'month') {
      newDate.setMonth(newDate.getMonth() + 1);
    } else if (calendarView === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else if (calendarView === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    }
    setCurrentDate(newDate);
  };

  // Navigate to today
  const navigateToday = () => {
    setCurrentDate(new Date());
  };

  // Change calendar view
  const changeView = (view) => {
    setCalendarView(view);
  };

  // Format month name
  const getMonthName = (date) => {
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  // Render week view
  const renderWeekView = () => {
    // Get the start of the week (Sunday)
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
    
    const weekDays = [];
    
    // Generate 7 days starting from the start of the week
    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek);
      date.setDate(startOfWeek.getDate() + i);
      weekDays.push({
        date,
        tasks: getTasksForDate(date)
      });
    }
    
    return (
      <div className="calendar-week-view">
        <div className="calendar-week-header">
          {weekDays.map((day, index) => (
            <div key={index} className="calendar-week-day-header">
              <div className="calendar-day-name">{day.date.toLocaleString('default', { weekday: 'short' })}</div>
              <div className="calendar-day-number">{day.date.getDate()}</div>
            </div>
          ))}
        </div>
        <div className="calendar-week-body">
          <div className="calendar-time-slots">
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} className="calendar-time-slot">
                <div className="calendar-time-label">{hour}:00</div>
              </div>
            ))}
          </div>
          {weekDays.map((day, dayIndex) => (
            <div key={dayIndex} className="calendar-day-column">
              {day.tasks.map((task, taskIndex) => {
                const startTime = parseISODate(task.start_at);
                const endTime = parseISODate(task.end_at);
                const startHour = startTime.getHours() + startTime.getMinutes() / 60;
                const endHour = endTime.getHours() + endTime.getMinutes() / 60;
                const duration = endHour - startHour;
                
                // Only show tasks that start on this day
                if (startTime.toDateString() !== day.date.toDateString()) {
                  return null;
                }
                
                return (
                  <div 
                    key={taskIndex} 
                    className="calendar-task"
                    style={{
                      top: `${startHour * 60}px`,
                      height: `${duration * 60}px`,
                      backgroundColor: getCategoryColor(task.category)
                    }}
                    title={`${task.title} (${formatTimeRange(startTime, endTime)})`}
                  >
                    <div className="calendar-task-title">{task.title}</div>
                    <div className="calendar-task-time">{formatTimeRange(startTime, endTime)}</div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    );
  };

  // Render day view
  const renderDayView = () => {
    const dayTasks = getTasksForDate(currentDate);
    
    return (
      <div className="calendar-day-view">
        <div className="calendar-day-header">
          <div className="calendar-day-name">{currentDate.toLocaleString('default', { weekday: 'long' })}</div>
          <div className="calendar-day-number">{currentDate.getDate()}</div>
        </div>
        <div className="calendar-day-body">
          <div className="calendar-time-slots">
            {Array.from({ length: 24 }, (_, hour) => (
              <div key={hour} className="calendar-time-slot">
                <div className="calendar-time-label">{hour}:00</div>
              </div>
            ))}
          </div>
          <div className="calendar-day-events">
            {dayTasks.map((task, index) => {
              const startTime = parseISODate(task.start_at);
              const endTime = parseISODate(task.end_at);
              const startHour = startTime.getHours() + startTime.getMinutes() / 60;
              const endHour = endTime.getHours() + endTime.getMinutes() / 60;
              const duration = endHour - startHour;
              
              return (
                <div 
                  key={index} 
                  className="calendar-task"
                  style={{
                    top: `${startHour * 60}px`,
                    height: `${duration * 60}px`,
                    backgroundColor: getCategoryColor(task.category)
                  }}
                  title={`${task.title} (${formatTimeRange(startTime, endTime)})`}
                >
                  <div className="calendar-task-title">{task.title}</div>
                  <div className="calendar-task-time">{formatTimeRange(startTime, endTime)}</div>
                  <div className="calendar-task-description">{task.description}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  // Format time range (e.g., "9:00 AM - 10:00 AM")
  const formatTimeRange = (startTime, endTime) => {
    return `${startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - ${endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  };

  // Get color based on task category
  const getCategoryColor = (category) => {
    const colors = {
      'Academics': '#4285F4', // Blue
      'Professional': '#0F9D58', // Green
      'Personal': '#DB4437', // Red
      'Health': '#F4B400', // Yellow
      'Social': '#9C27B0', // Purple
      'Finance': '#00ACC1', // Cyan
      'Home': '#FF7043', // Deep Orange
      'Other': '#9E9E9E', // Grey
    };
    
    return colors[category] || colors['Other'];
  };

  return (
    <div className="task-calendar">
      <div className="calendar-header">
        <div className="calendar-navigation">
          <button onClick={navigatePrevious}>Previous</button>
          <button onClick={navigateToday}>Today</button>
          <button onClick={navigateNext}>Next</button>
        </div>
        <div className="calendar-title">
          {calendarView === 'month' && getMonthName(currentDate)}
          {calendarView === 'week' && `Week of ${currentDate.toLocaleDateString()}`}
          {calendarView === 'day' && currentDate.toLocaleDateString()}
        </div>
        <div className="calendar-view-options">
          <button 
            className={calendarView === 'month' ? 'active' : ''} 
            onClick={() => changeView('month')}
          >
            Month
          </button>
          <button 
            className={calendarView === 'week' ? 'active' : ''} 
            onClick={() => changeView('week')}
          >
            Week
          </button>
          <button 
            className={calendarView === 'day' ? 'active' : ''} 
            onClick={() => changeView('day')}
          >
            Day
          </button>
        </div>
      </div>
      
      <div className="calendar-body">
        {calendarView === 'month' && (
          <div className="calendar-month-view">
            <div className="calendar-days-header">
              <div>Sun</div>
              <div>Mon</div>
              <div>Tue</div>
              <div>Wed</div>
              <div>Thu</div>
              <div>Fri</div>
              <div>Sat</div>
            </div>
            <div className="calendar-grid">
              {calendarData.map((day, index) => (
                <div 
                  key={index} 
                  className={`calendar-cell ${!day.isCurrentMonth ? 'other-month' : ''} ${
                    day.date && day.date.toDateString() === new Date().toDateString() ? 'today' : ''
                  }`}
                >
                  {day.date && (
                    <>
                      <div className="calendar-date">{day.date.getDate()}</div>
                      <div className="calendar-cell-tasks">
                        {day.tasks.slice(0, 3).map((task, taskIndex) => (
                          <div 
                            key={taskIndex} 
                            className="calendar-task-item"
                            style={{ backgroundColor: getCategoryColor(task.category) }}
                            title={task.title}
                          >
                            {task.title}
                          </div>
                        ))}
                        {day.tasks.length > 3 && (
                          <div className="calendar-more-tasks">
                            +{day.tasks.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {calendarView === 'week' && renderWeekView()}
        
        {calendarView === 'day' && renderDayView()}
      </div>
    </div>
  );
};

export default TaskCalendar;
