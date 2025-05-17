import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/Notifications.css';

const Notifications = ({ tasks, currentUser }) => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [newNotificationCount, setNewNotificationCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Get user ID from currentUser, but only if there is a currentUser
  const userId = currentUser?.id || null;

  // Fetch notifications from the server or localStorage
  const fetchNotifications = async () => {
    // If no user is logged in, don't fetch notifications
    if (!userId) {
      console.log('No user ID available, skipping notification fetch');
      setNotifications([]);
      setNewNotificationCount(0);
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      console.log(`Fetching notifications for user ${userId}`);
      
      try {
        // Try to get notifications from server first
        const response = await axios.get(`http://localhost:3001/api/notifications?user_id=${userId}`);
        if (response.data && Array.isArray(response.data)) {
          // Sort notifications by time (newest first)
          const sortedNotifications = response.data.sort((a, b) => {
            return new Date(b.time) - new Date(a.time);
          });
          
          setNotifications(sortedNotifications);
          
          // Save to localStorage as backup
          localStorage.setItem(`notifications_${userId}`, JSON.stringify(sortedNotifications));
          console.log(`Saved ${sortedNotifications.length} notifications to localStorage`);
          
          // Count unread notifications
          const unreadCount = sortedNotifications.filter(n => !n.read).length;
          setNewNotificationCount(unreadCount);
          console.log(`User has ${unreadCount} unread notifications`);
        }
      } catch (serverErr) {
        console.warn('Could not fetch from server, using localStorage:', serverErr);
        
        // Fallback to localStorage
        const storedNotifications = localStorage.getItem(`notifications_${userId}`);
        if (storedNotifications) {
          try {
            const parsedNotifications = JSON.parse(storedNotifications);
            setNotifications(parsedNotifications);
            
            // Count unread notifications
            const unreadCount = parsedNotifications.filter(n => !n.read).length;
            setNewNotificationCount(unreadCount);
            console.log(`Using ${parsedNotifications.length} notifications from localStorage (${unreadCount} unread)`);
          } catch (parseErr) {
            console.error('Error parsing notifications from localStorage:', parseErr);
            setNotifications([]);
            setNewNotificationCount(0);
            localStorage.setItem(`notifications_${userId}`, '[]');
          }
        } else {
          console.log('No notifications found in localStorage');
          setNotifications([]);
          setNewNotificationCount(0);
        }
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching notifications:', err);
      setError('Failed to load notifications');
      setLoading(false);
    }
  };
  
  // Load notifications when component mounts or user changes
  useEffect(() => {
    // Only fetch notifications if there's a logged-in user
    if (userId) {
      fetchNotifications();
      
      // Set up interval to check for new notifications more frequently (every 15 seconds)
      // This ensures new notifications from email or text extraction appear quickly
      const intervalId = setInterval(fetchNotifications, 15000);
      return () => clearInterval(intervalId);
    }
  }, [userId]);
  
  // Also refresh notifications when tasks change
  useEffect(() => {
    if (userId && tasks && tasks.length > 0) {
      fetchNotifications();
    }
  }, [tasks, userId]);
  
  // Check for upcoming tasks and create notifications
  useEffect(() => {
    // Only process tasks if there's a logged-in user and tasks exist
    if (!tasks || tasks.length === 0 || !userId || !currentUser) {
      return;
    }

    const processTasksAndCreateNotifications = () => {
      const now = new Date();
      const newNotifications = [];
      
      // Only process tasks belonging to the current user
      const userTasks = tasks.filter(task => task.user_id === userId);
      console.log(`Processing ${userTasks.length} tasks for user ${userId}`);
      
      userTasks.forEach(task => {
        // Skip tasks without start time
        if (!task.start_at) {
          console.log(`Task ${task.title} has no start time, skipping reminder check`);
          return;
        }
        
        try {
          const taskStartTime = new Date(task.start_at);
          const taskDeadline = task.deadline ? new Date(task.deadline) : null;
          
          // Skip if dates are invalid
          if (isNaN(taskStartTime.getTime())) {
            console.warn(`Task ${task.title} has invalid start time: ${task.start_at}`);
            return;
          }
          
          const timeDiffStart = taskStartTime - now;
          const timeDiffDeadline = taskDeadline ? (taskDeadline - now) : null;
          
          // Convert to hours
          const hoursDiffStart = timeDiffStart / (1000 * 60 * 60);
          const hoursDiffDeadline = timeDiffDeadline ? (timeDiffDeadline / (1000 * 60 * 60)) : null;
          
          // For testing purposes, create notifications for tasks that are coming up soon
          // This helps ensure notifications are working correctly
          const createTestNotifications = false; // Set to false in production
          
          // Choose only one reminder based on proximity to task start time
          let reminderCreated = false;
          
          // Notification 10 minutes before task start (highest priority)
          if ((hoursDiffStart > 0.15 && hoursDiffStart < 0.18) || (createTestNotifications && !reminderCreated)) {
            const uniqueId = `${task.title}-10min-${Date.now()}`;
            console.log(`Creating 10-minute reminder for task: ${task.title}`);
            newNotifications.push({
              id: uniqueId,
              title: 'Task Starting Soon',
              message: `Task "${task.title}" starts in about 10 minutes`,
              type: 'reminder',
              reminderTime: '10min',
              time: new Date().toISOString(),
              read: false,
              urgent: true,
              user_id: userId
            });
            reminderCreated = true;
          }
          
          // Notification 1 hour before task start (medium priority)
          if (!reminderCreated && ((hoursDiffStart > 0.9 && hoursDiffStart < 1.1) || createTestNotifications)) {
            const uniqueId = `${task.title}-1hour-${Date.now()}`;
            console.log(`Creating 1-hour reminder for task: ${task.title}`);
            newNotifications.push({
              id: uniqueId,
              title: 'Upcoming Task Soon',
              message: `Task "${task.title}" starts in about 1 hour`,
              type: 'reminder',
              reminderTime: '1hour',
              time: new Date().toISOString(),
              read: false,
              user_id: userId
            });
            reminderCreated = true;
          }
          
          // Notification 1 day before task start (lowest priority)
          if (!reminderCreated && ((hoursDiffStart > 23 && hoursDiffStart < 25) || createTestNotifications)) {
            const uniqueId = `${task.title}-1day-${Date.now()}`;
            console.log(`Creating 1-day reminder for task: ${task.title}`);
            newNotifications.push({
              id: uniqueId,
              title: 'Upcoming Task',
              message: `Task "${task.title}" starts in about 1 day`,
              type: 'reminder',
              reminderTime: '1day',
              time: new Date().toISOString(),
              read: false,
              user_id: userId
            });
            reminderCreated = true;
          }
          
          // Notification for approaching deadline (1 day before)
          if (taskDeadline && ((hoursDiffDeadline > 23 && hoursDiffDeadline < 25) || createTestNotifications)) {
            const uniqueId = `${task.title}-deadline-1day-${Date.now()}`;
            console.log(`Creating deadline reminder for task: ${task.title}`);
            newNotifications.push({
              id: uniqueId,
              title: 'Deadline Approaching',
              message: `Deadline for "${task.title}" is in about 1 day`,
              type: 'deadline',
              reminderTime: '1day',
              time: new Date().toISOString(),
              read: false,
              user_id: userId
            });
          }
        } catch (error) {
          console.error(`Error processing reminders for task ${task.title}:`, error);
        }
      });
      
      // If we have notifications, save them using a non-blocking approach
      if (newNotifications.length > 0) {
        // Save notifications to server one by one
        newNotifications.forEach(notification => {
          // Ensure notification has user_id
          notification.user_id = userId;
          
          // Use axios without await (non-blocking)
          axios.post('http://localhost:3001/api/notifications', notification)
            .then(response => {
              if (response.data.duplicate) {
                console.log(`Notification already exists: ${notification.title}`);
              } else {
                console.log(`Saved notification to server: ${notification.title}`);
              }
            })
            .catch(serverErr => {
              console.warn(`Could not save notification to server: ${notification.title}`, serverErr);
              
              // Save to localStorage as a fallback
              try {
                const storedNotifications = JSON.parse(localStorage.getItem(`notifications_${userId}`) || '[]');
                const isDuplicate = storedNotifications.some(n => 
                  n.id === notification.id || 
                  (n.title === notification.title && 
                   n.message === notification.message && 
                   n.type === notification.type)
                );
                
                if (!isDuplicate) {
                  storedNotifications.push(notification);
                  localStorage.setItem(`notifications_${userId}`, JSON.stringify(storedNotifications));
                  console.log(`Saved notification to localStorage as fallback: ${notification.title}`);
                }
              } catch (localErr) {
                console.error('Error saving to localStorage:', localErr);
              }
            });
        });
        
        // Refresh notifications after a short delay
        setTimeout(fetchNotifications, 1000);
      }
    };
    
    // Execute the function
    processTasksAndCreateNotifications();
  }, [userId]);

  // Check for upcoming tasks and create notifications
  useEffect(() => {
    // Only process tasks if there's a logged-in user and tasks exist
    if (!tasks || tasks.length === 0 || !userId || !currentUser) {
      return;
    }

    const now = new Date();
    const newNotifications = [];
    
    // Only process tasks belonging to the current user
    const userTasks = tasks.filter(task => task.user_id === userId);
    console.log(`Processing ${userTasks.length} tasks for user ${userId}`);
    
    userTasks.forEach(task => {
      // Skip tasks without start time
      if (!task.start_at) {
        console.log(`Task ${task.title} has no start time, skipping reminder check`);
        return;
      }
      
      try {
        const taskStartTime = new Date(task.start_at);
        const taskDeadline = task.deadline ? new Date(task.deadline) : null;
        
        // Skip if dates are invalid
        if (isNaN(taskStartTime.getTime())) {
          console.warn(`Task ${task.title} has invalid start time: ${task.start_at}`);
          return;
        }
        
        const timeDiffStart = taskStartTime - now;
        const timeDiffDeadline = taskDeadline ? (taskDeadline - now) : null;
        
        // Convert to hours
        const hoursDiffStart = timeDiffStart / (1000 * 60 * 60);
        const hoursDiffDeadline = timeDiffDeadline ? (timeDiffDeadline / (1000 * 60 * 60)) : null;
        
        // For testing purposes, create notifications for tasks that are coming up soon
        // This helps ensure notifications are working correctly
        const createTestNotifications = false; // Set to false in production
        
        // Choose only one reminder based on proximity to task start time
        let reminderCreated = false;
        
        // Notification 10 minutes before task start (highest priority)
        if ((hoursDiffStart > 0.15 && hoursDiffStart < 0.18) || (createTestNotifications && !reminderCreated)) {
          const uniqueId = `${task.title}-10min-${Date.now()}`;
          console.log(`Creating 10-minute reminder for task: ${task.title}`);
          newNotifications.push({
            id: uniqueId,
            title: 'Task Starting Soon',
            message: `Task "${task.title}" starts in about 10 minutes`,
            type: 'reminder',
            reminderTime: '10min',
            time: new Date().toISOString(),
            read: false,
            urgent: true,
            user_id: userId
          });
          reminderCreated = true;
        }
        
        // Notification 1 hour before task start (medium priority)
        if (!reminderCreated && ((hoursDiffStart > 0.9 && hoursDiffStart < 1.1) || createTestNotifications)) {
          const uniqueId = `${task.title}-1hour-${Date.now()}`;
          console.log(`Creating 1-hour reminder for task: ${task.title}`);
          newNotifications.push({
            id: uniqueId,
            title: 'Upcoming Task Soon',
            message: `Task "${task.title}" starts in about 1 hour`,
            type: 'reminder',
            reminderTime: '1hour',
            time: new Date().toISOString(),
            read: false,
            user_id: userId
          });
          reminderCreated = true;
        }
        
        // Notification 1 day before task start (lowest priority)
        if (!reminderCreated && ((hoursDiffStart > 23 && hoursDiffStart < 25) || createTestNotifications)) {
          const uniqueId = `${task.title}-1day-${Date.now()}`;
          console.log(`Creating 1-day reminder for task: ${task.title}`);
          newNotifications.push({
            id: uniqueId,
            title: 'Upcoming Task',
            message: `Task "${task.title}" starts in about 1 day`,
            type: 'reminder',
            reminderTime: '1day',
            time: new Date().toISOString(),
            read: false,
            user_id: userId
          });
          reminderCreated = true;
        }
        
        // Notification for approaching deadline (1 day before)
        if (taskDeadline && ((hoursDiffDeadline > 23 && hoursDiffDeadline < 25) || createTestNotifications)) {
          const uniqueId = `${task.title}-deadline-1day-${Date.now()}`;
          console.log(`Creating deadline reminder for task: ${task.title}`);
          newNotifications.push({
            id: uniqueId,
            title: 'Deadline Approaching',
            message: `Deadline for "${task.title}" is in about 1 day`,
            type: 'deadline',
            reminderTime: '1day',
            time: new Date().toISOString(),
            read: false,
            user_id: userId
          });
        }
      } catch (error) {
        console.error(`Error processing reminders for task ${task.title}:`, error);
      }
    });

    // Save new notifications to the server and localStorage
    const saveNotifications = async (newNotifications) => {
      if (!newNotifications || newNotifications.length === 0 || !userId) {
        console.log('No notifications to save or no user ID');
        return;
      }
      
      try {
        console.log(`Saving ${newNotifications.length} notifications for user ${userId}`);
        
        // Create a small delay between notifications to avoid race conditions
        const saveWithDelay = async (notifications) => {
          for (const notification of notifications) {
            try {
              // Ensure notification has user_id
              notification.user_id = userId;
              
              console.log(`Saving notification: ${notification.title} - ${notification.message}`);
              const response = await axios.post('http://localhost:3001/api/notifications', notification);
              
              if (response.data.duplicate) {
                console.log(`Notification already exists: ${notification.title}`);
              } else {
                console.log(`Saved notification to server: ${notification.title}`);
              }
              
              // Small delay to avoid overwhelming the server
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (serverErr) {
              console.warn(`Could not save notification to server: ${notification.title}`, serverErr);
              
              // Save to localStorage as a fallback
              try {
                const storedNotifications = JSON.parse(localStorage.getItem(`notifications_${userId}`) || '[]');
                const isDuplicate = storedNotifications.some(n => 
                  n.id === notification.id || 
                  (n.title === notification.title && 
                   n.message === notification.message && 
                   n.type === notification.type)
                );
                
                if (!isDuplicate) {
                  storedNotifications.push(notification);
                  localStorage.setItem(`notifications_${userId}`, JSON.stringify(storedNotifications));
                  console.log(`Saved notification to localStorage as fallback: ${notification.title}`);
                }
              } catch (localErr) {
                console.error('Error saving to localStorage:', localErr);
              }
            }
          }
        };
        
        // Save notifications with a delay between each
        await saveWithDelay(newNotifications);
        
        // Refresh notifications to ensure we have the latest state
        await fetchNotifications();
      } catch (err) {
        console.error('Error in saveNotifications function:', err);
      }
    };
    
    // Execute immediately
    if (newNotifications.length > 0) {
      saveNotifications(newNotifications);
    }
  }, [tasks, userId, currentUser]);

  // Effect to process new tasks when they are added
  useEffect(() => {
    // Only run if we have a user and tasks
    if (!userId || !currentUser || !tasks || tasks.length === 0) {
      console.log('Skipping new task detection - missing user or tasks');
      return;
    }
    
    // Get tasks from localStorage to compare with current tasks
    let lastProcessedTasks = [];
    try {
      const storedTasks = localStorage.getItem(`last_processed_tasks_${userId}`);
      lastProcessedTasks = storedTasks ? JSON.parse(storedTasks) : [];
    } catch (error) {
      console.error('Error parsing last processed tasks:', error);
      lastProcessedTasks = [];
    }
    
    // Filter tasks for current user
    const userTasks = tasks.filter(task => task.user_id === userId);
    
    // First time running - save current tasks and create notifications for all
    if (lastProcessedTasks.length === 0 && userTasks.length > 0) {
      console.log(`First run - creating notifications for all ${userTasks.length} tasks`);
      
      // Create notifications for all tasks
      const createAndSaveNotifications = async () => {
        try {
          const newNotifications = [];
          console.log(`Creating notifications for ${userTasks.length} tasks`);
          
          // Create notification objects for all tasks
          for (const task of userTasks) {
            const uniqueId = `new-task-${task.title}-${Date.now()}`;
            console.log(`Creating notification for task: ${task.title}`);
            
            // Create notification object
            const notification = {
              id: uniqueId,
              title: 'New Task Added',
              message: `"${task.title}" has been added to your tasks`,
              type: 'new-task',
              time: new Date().toISOString(),
              read: false,
              user_id: userId
            };
            
            newNotifications.push(notification);
            
            // Save each notification immediately to ensure it's saved
            try {
              console.log(`Saving new task notification: ${notification.message}`);
              const response = await axios.post('http://localhost:3001/api/notifications', { notification });
              console.log('Saved new task notification to server:', response.data);
              
              // Small delay to avoid overwhelming the server
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (serverErr) {
              console.warn('Could not save notification to server:', serverErr);
            }
          }
          
          // Always save to localStorage as a fallback
          if (newNotifications.length > 0) {
            const existingNotificationsStr = localStorage.getItem(`notifications_${userId}`);
            const existingNotifications = existingNotificationsStr ? JSON.parse(existingNotificationsStr) : [];
            
            // Add new notifications
            const updatedNotifications = [...newNotifications, ...existingNotifications];
            localStorage.setItem(`notifications_${userId}`, JSON.stringify(updatedNotifications));
            console.log('Saved new task notifications to localStorage');
            
            // Refresh notifications
            await fetchNotifications();
          }
        } catch (err) {
          console.error('Error saving new task notifications:', err);
        }
      };
      
      createAndSaveNotifications();
      
      // Save current tasks as processed
      localStorage.setItem(`last_processed_tasks_${userId}`, JSON.stringify(userTasks));
      return;
    }
    
    // Find new tasks by comparing with last processed tasks
    const newTasks = userTasks.filter(currentTask => {
      return !lastProcessedTasks.some(lastTask => 
        lastTask.title === currentTask.title && 
        lastTask.description === currentTask.description
      );
    });
    
    if (newTasks.length > 0) {
      console.log(`Found ${newTasks.length} new tasks to create notifications for`);
      
      // Create notifications for new tasks
      const createAndSaveNotifications = async () => {
        try {
          for (const task of newTasks) {
            const uniqueId = `new-task-${task.title}-${Date.now()}`;
            console.log(`Creating notification for new task: ${task.title}`);
            
            // Create notification object
            const notification = {
              id: uniqueId,
              title: 'New Task Added',
              message: `"${task.title}" has been added to your tasks`,
              type: 'new-task',
              time: new Date().toISOString(),
              read: false,
              user_id: userId
            };
            
            // Save notification immediately to ensure it's saved
            try {
              console.log(`Saving new task notification: ${notification.message}`);
              const response = await axios.post('http://localhost:3001/api/notifications', { notification });
              console.log('Saved new task notification to server:', response.data);
            } catch (serverErr) {
              console.warn('Could not save notification to server:', serverErr);
              
              // Save to localStorage as a fallback
              const existingNotificationsStr = localStorage.getItem(`notifications_${userId}`);
              const existingNotifications = existingNotificationsStr ? JSON.parse(existingNotificationsStr) : [];
              
              // Add new notification
              const updatedNotifications = [notification, ...existingNotifications];
              localStorage.setItem(`notifications_${userId}`, JSON.stringify(updatedNotifications));
              console.log('Saved new task notification to localStorage');
            }
          }
        } catch (err) {
          console.error('Error saving new task notifications:', err);
        }
      };
      
      createAndSaveNotifications();
    } else {
      console.log('No new tasks detected');
    }
  }, [tasks, userId, currentUser]);

  const toggleNotifications = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications) {
      // Mark all as read when opening
      setNewNotificationCount(0);
      
      // Update read status on server and localStorage for all notifications
      const markAllAsRead = async () => {
        try {
          const updatedNotifications = notifications.map(notification => ({
            ...notification,
            read: true
          }));
          
          // Update local state
          setNotifications(updatedNotifications);
          setNewNotificationCount(0);
          
          // Update in localStorage
          localStorage.setItem(`notifications_${userId}`, JSON.stringify(updatedNotifications));
          
          // Update on server (if possible)
          try {
            // For each notification, update its read status on the server
            for (const notification of updatedNotifications) {
              await axios.put(`http://localhost:3001/api/notifications/${notification.id}`, {
                ...notification,
                read: true
              });
            }
            console.log('Updated read status on server');
          } catch (serverErr) {
            console.warn('Could not update read status on server:', serverErr);
          }
        } catch (err) {
          console.error('Error marking notifications as read:', err);
        }
      };
      
      markAllAsRead();
    }
  };

  const markAsRead = async (notificationId) => {
    try {
      // Find the notification
      const notification = notifications.find(n => n.id === notificationId);
      if (!notification) return;
      
      // Update the notification
      const updatedNotification = { ...notification, read: true };
      
      // Update local state
      const updatedNotifications = notifications.map(n => 
        n.id === notificationId ? updatedNotification : n
      );
      setNotifications(updatedNotifications);
      
      // Update unread count
      const unreadCount = updatedNotifications.filter(n => !n.read).length;
      setNewNotificationCount(unreadCount);
      
      // Update in localStorage
      localStorage.setItem(`notifications_${userId}`, JSON.stringify(updatedNotifications));
      
      // Update on server
      try {
        await axios.put(`http://localhost:3001/api/notifications/${notificationId}`, updatedNotification);
        console.log(`Marked notification ${notificationId} as read on server`);
      } catch (serverErr) {
        console.warn(`Could not mark notification ${notificationId} as read on server:`, serverErr);
        console.log('Updated read status in localStorage');
      }
    } catch (err) {
      console.error('Error marking notification as read:', err);
    }
  };

  const clearAllNotifications = async () => {
    try {
      // Try to clear notifications on the server
      try {
        await axios.delete(`http://localhost:3001/api/notifications?user_id=${userId}`);
        console.log('Cleared notifications on server');
      } catch (serverErr) {
        console.warn('Could not clear notifications on server:', serverErr);
      }
      
      // Always clear in localStorage as a fallback
      localStorage.setItem(`notifications_${userId}`, JSON.stringify([]));
      console.log('Cleared notifications in localStorage');
      
      // Update local state
      setNotifications([]);
      setNewNotificationCount(0);
    } catch (err) {
      console.error('Error clearing notifications:', err);
    }
  };

  const removeNotification = async (notificationId) => {
    try {
      // Try to remove notification from server
      try {
        await axios.delete(`http://localhost:3001/api/notifications/${notificationId}?user_id=${userId}`);
        console.log('Removed notification from server');
      } catch (serverErr) {
        console.warn('Could not remove notification from server:', serverErr);
      }
      
      // Update local state
      const updatedNotifications = notifications.filter(notification => notification.id !== notificationId);
      setNotifications(updatedNotifications);
      
      // Always update localStorage as a fallback
      localStorage.setItem(`notifications_${userId}`, JSON.stringify(updatedNotifications));
      console.log('Updated notifications in localStorage after removal');
    } catch (err) {
      console.error('Error removing notification:', err);
    }
  };

  // Format time to display
  const formatTime = (date) => {
    try {
      // Convert string date to Date object if needed
      const dateObj = typeof date === 'string' ? new Date(date) : date;
      
      // Check if date is valid
      if (isNaN(dateObj.getTime())) {
        console.warn('Invalid date provided to formatTime:', date);
        return 'Invalid date';
      }
      
      return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch (error) {
      console.error('Error formatting time:', error, date);
      return 'Unknown time';
    }
  };

  // Only render the notifications component if there's a logged-in user
  if (!currentUser) {
    return null; // Don't render anything if no user is logged in
  }
  
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
