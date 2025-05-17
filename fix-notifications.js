const fs = require('fs');
const path = require('path');

// Define paths
const dbDir = path.join(__dirname, 'src', 'db');
const tasksFilePath = path.join(dbDir, 'tasks.json');
const notificationsFilePath = path.join(dbDir, 'notifications.json');

console.log('Starting notification fix script...');
console.log(`Tasks file path: ${tasksFilePath}`);
console.log(`Notifications file path: ${notificationsFilePath}`);

// Ensure notifications.json file exists
if (!fs.existsSync(notificationsFilePath)) {
    console.log(`Creating notifications file at: ${notificationsFilePath}`);
    fs.writeFileSync(notificationsFilePath, '[]', 'utf8');
}

// Read existing tasks
let tasks = [];
try {
    const tasksData = fs.readFileSync(tasksFilePath, 'utf8');
    tasks = JSON.parse(tasksData || '[]');
    console.log(`Loaded ${tasks.length} tasks`);
} catch (parseError) {
    console.error(`Error parsing tasks: ${parseError.message}`);
    process.exit(1);
}

// Read existing notifications
let notifications = [];
try {
    const notificationsData = fs.readFileSync(notificationsFilePath, 'utf8');
    console.log(`Read notifications data: ${notificationsData}`);
    notifications = JSON.parse(notificationsData || '[]');
    console.log(`Loaded ${notifications.length} existing notifications`);
} catch (parseError) {
    console.error(`Error parsing notifications: ${parseError.message}`);
    fs.writeFileSync(notificationsFilePath, '[]', 'utf8');
    notifications = [];
}

// Create a notification for each task
const newNotifications = [];

// Create "New Task Added" notifications for all tasks
tasks.forEach(task => {
    // Generate a unique ID for this notification
    const notificationId = `new-task-${task.title}-${Date.now()}`;
    
    // Create the notification object
    const newTaskNotification = {
        id: notificationId,
        title: 'New Task Added',
        message: `"${task.title}" has been added to your tasks`,
        type: 'new-task',
        time: new Date().toISOString(),
        read: false,
        user_id: task.user_id || '1'
    };
    
    // Check if this notification already exists
    const isDuplicate = notifications.some(n => 
        (n.title === newTaskNotification.title && 
         n.message === newTaskNotification.message && 
         n.user_id === newTaskNotification.user_id && 
         n.type === newTaskNotification.type)
    );
    
    if (!isDuplicate) {
        console.log(`Creating new task notification for: ${task.title}`);
        newNotifications.push(newTaskNotification);
    }
});

// Create reminder notifications based on task start times
const now = new Date();
tasks.forEach(task => {
    if (task.start_at) {
        const taskStartTime = new Date(task.start_at);
        if (!isNaN(taskStartTime.getTime())) {
            const timeDiffStart = taskStartTime - now;
            const hoursDiffStart = timeDiffStart / (1000 * 60 * 60);
            
            // Choose only one reminder based on proximity to task start time
            let reminderCreated = false;
            
            // 10 minutes reminder (highest priority)
            if (hoursDiffStart > 0 && hoursDiffStart <= 0.18) {
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
                    user_id: task.user_id || '1'
                });
                reminderCreated = true;
            }
            
            // 1 hour reminder (medium priority)
            if (!reminderCreated && hoursDiffStart > 0.18 && hoursDiffStart <= 1.1) {
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
                    user_id: task.user_id || '1'
                });
                reminderCreated = true;
            }
            
            // 1 day reminder (lowest priority)
            if (!reminderCreated && hoursDiffStart > 1.1 && hoursDiffStart <= 25) {
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
                    user_id: task.user_id || '1'
                });
            }
        }
    }
});

// Add new notifications to existing ones and save to file
if (newNotifications.length > 0) {
    // Combine the arrays and save directly to file
    const updatedNotifications = [...notifications, ...newNotifications];
    console.log(`Writing ${updatedNotifications.length} notifications to ${notificationsFilePath}`);
    try {
        // Write the combined notifications directly to the file
        fs.writeFileSync(notificationsFilePath, JSON.stringify(updatedNotifications, null, 2), 'utf8');
        console.log(`Successfully saved ${newNotifications.length} notifications for tasks`);
    } catch (writeError) {
        console.error(`Error writing notifications to file: ${writeError.message}`);
    }
} else {
    console.log('No new notifications to create');
}

console.log('Notification fix script completed');
