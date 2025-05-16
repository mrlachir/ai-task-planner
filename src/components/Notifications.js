import React, { useState, useEffect } from 'react';
import '../styles/Notifications.css';

const Notifications = ({ tasks }) => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newNotificationCount, setNewNotificationCount] = useState(0);

  // Check for upcoming tasks and create notifications
  useEffect(() => {
    if (!tasks || tasks.length === 0) return;

    const now = new Date();
    const newNotifications = [];
    
    tasks.forEach(task => {
      const taskStartTime = new Date(task.start_at);
      const taskDeadline = new Date(task.deadline);
      const timeDiffStart = taskStartTime - now;
      const timeDiffDeadline = taskDeadline - now;
      
      // Convert to hours
      const hoursDiffStart = timeDiffStart / (1000 * 60 * 60);
      const hoursDiffDeadline = timeDiffDeadline / (1000 * 60 * 60);
      
      // Notification 1 day before task start
      if (hoursDiffStart > 23 && hoursDiffStart < 25) {
        newNotifications.push({
          id: `${task.title}-1day`,
          title: 'Upcoming Task',
          message: `Task "${task.title}" starts in about 1 day`,
          type: 'reminder',
          time: new Date(),
          read: false
        });
      }
      
      // Notification 1 hour before task start
      if (hoursDiffStart > 0.9 && hoursDiffStart < 1.1) {
        newNotifications.push({
          id: `${task.title}-1hour`,
          title: 'Upcoming Task Soon',
          message: `Task "${task.title}" starts in about 1 hour`,
          type: 'reminder',
          time: new Date(),
          read: false
        });
      }
      
      // Notification 10 minutes before task start
      if (hoursDiffStart > 0.15 && hoursDiffStart < 0.18) {
        newNotifications.push({
          id: `${task.title}-10min`,
          title: 'Task Starting Soon',
          message: `Task "${task.title}" starts in about 10 minutes`,
          type: 'reminder',
          time: new Date(),
          read: false,
          urgent: true
        });
      }
      
      // Notification for approaching deadline (1 day before)
      if (hoursDiffDeadline > 23 && hoursDiffDeadline < 25) {
        newNotifications.push({
          id: `${task.title}-deadline-1day`,
          title: 'Deadline Approaching',
          message: `Deadline for "${task.title}" is in about 1 day`,
          type: 'deadline',
          time: new Date(),
          read: false
        });
      }
    });

    // Add new notifications to existing ones, avoiding duplicates
    if (newNotifications.length > 0) {
      setNotifications(prevNotifications => {
        const existingIds = prevNotifications.map(n => n.id);
        const uniqueNewNotifications = newNotifications.filter(n => !existingIds.includes(n.id));
        
        if (uniqueNewNotifications.length > 0) {
          setNewNotificationCount(count => count + uniqueNewNotifications.length);
        }
        
        return [...uniqueNewNotifications, ...prevNotifications];
      });
    }
  }, [tasks]);

  // Create a ref to track previous tasks count
  const prevTasksCountRef = React.useRef(0);
  
  // Add notification when a new task is added
  useEffect(() => {
    // This will run when tasks change
    if (tasks.length > prevTasksCountRef.current) {
      // New task(s) added
      const newTasksCount = tasks.length - prevTasksCountRef.current;
      
      if (newTasksCount > 0) {
        const newTaskNotifications = tasks.slice(prevTasksCountRef.current).map(task => ({
          id: `new-task-${task.title}-${Date.now()}`,
          title: 'New Task Added',
          message: `"${task.title}" has been added to your tasks`,
          type: 'new-task',
          time: new Date(),
          read: false
        }));
        
        setNotifications(prev => [...newTaskNotifications, ...prev]);
        setNewNotificationCount(count => count + newTaskNotifications.length);
      }
    }
    
    prevTasksCountRef.current = tasks.length;
  }, [tasks]);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      // Mark all as read when opening
      setNewNotificationCount(0);
    }
  };

  const markAsRead = (notificationId) => {
    setNotifications(notifications.map(notification => 
      notification.id === notificationId 
        ? { ...notification, read: true } 
        : notification
    ));
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    setNewNotificationCount(0);
  };

  const removeNotification = (notificationId) => {
    setNotifications(notifications.filter(notification => notification.id !== notificationId));
  };

  // Format time to display
  const formatTime = (date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="notifications-container">
      <div className="notifications-icon" onClick={toggleNotifications}>
        <i className="fa fa-bell"></i>
        {newNotificationCount > 0 && (
          <span className="notification-badge">{newNotificationCount}</span>
        )}
      </div>
      
      {showNotifications && (
        <div className="notifications-panel">
          <div className="notifications-header">
            <h3>Notifications</h3>
            {notifications.length > 0 && (
              <button className="clear-all-btn" onClick={clearAllNotifications}>
                Clear All
              </button>
            )}
          </div>
          
          <div className="notifications-list">
            {notifications.length === 0 ? (
              <div className="no-notifications">No notifications</div>
            ) : (
              notifications.map(notification => (
                <div 
                  key={notification.id} 
                  className={`notification-item ${notification.read ? 'read' : 'unread'} ${notification.urgent ? 'urgent' : ''} ${notification.type}`}
                  onClick={() => markAsRead(notification.id)}
                >
                  <div className="notification-content">
                    <div className="notification-title">{notification.title}</div>
                    <div className="notification-message">{notification.message}</div>
                    <div className="notification-time">{formatTime(notification.time)}</div>
                  </div>
                  <button 
                    className="notification-dismiss" 
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                  >
                    ×
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
