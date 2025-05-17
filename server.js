const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bodyParser = require('body-parser');

// Import Google Generative AI
try {
    var { GoogleGenerativeAI } = require('@google/generative-ai');
    console.log('Successfully imported Google Generative AI package');
} catch (error) {
    console.error('Error importing Google Generative AI package:', error.message);
    console.error('Please run: npm install @google/generative-ai');
}

// Setup logging to file
const logFile = path.join(__dirname, 'server-log.txt');
const log = (message) => {
    const timestamp = new Date().toISOString();
    const logMessage = `${timestamp}: ${message}
`;
    console.log(message);
    fs.appendFileSync(logFile, logMessage);
};

// Clear log file on startup
fs.writeFileSync(logFile, '', 'utf8');
log('Server starting...');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize the Google Generative AI with API key
let genAI;
try {
    genAI = new GoogleGenerativeAI('AIzaSyAbkug1K5m_SydfEaFA3PdeqtO6wESv9Cw');
    log('Successfully initialized Google Generative AI');
} catch (error) {
    log(`Error initializing Google Generative AI: ${error.message}`);
}

// Middleware
app.use(cors());
app.use(express.json());

// Define paths
const dbDir = path.join(__dirname, 'src', 'db');
const tasksFilePath = path.join(dbDir, 'tasks.json');
const usersFilePath = path.join(dbDir, 'users.json');
const notificationsFilePath = path.join(dbDir, 'notifications.json');
const scansFilePath = path.join(dbDir, 'scans.json');

log('DB directory path:', dbDir);
log('Tasks file path:', tasksFilePath);

try {
    if (!fs.existsSync(dbDir)) {
        log('Creating db directory...');
        fs.mkdirSync(dbDir, { recursive: true });
        log('DB directory created successfully');
    } else {
        log('DB directory already exists');
    }

    // Initialize the tasks.json file if it doesn't exist
    if (!fs.existsSync(tasksFilePath)) {
        log('Creating tasks.json file...');
        fs.writeFileSync(tasksFilePath, '[]', 'utf8');
        log('tasks.json file created successfully');
    } else {
        log('tasks.json file already exists');
    }
    
    // Initialize the users.json file if it doesn't exist
    if (!fs.existsSync(usersFilePath)) {
        log('Creating users.json file...');
        const defaultUser = [
            {
                "id": "1",
                "username": "default_user",
                "email": "user@example.com",
                "created_at": new Date().toISOString()
            }
        ];
        fs.writeFileSync(usersFilePath, JSON.stringify(defaultUser, null, 2), 'utf8');
        log('users.json file created successfully');
    } else {
        log('users.json file already exists');
    }
    
    // Initialize the notifications.json file if it doesn't exist
    if (!fs.existsSync(notificationsFilePath)) {
        log('Creating notifications.json file...');
        fs.writeFileSync(notificationsFilePath, '[]', 'utf8');
        log('notifications.json file created successfully');
    } else {
        log('notifications.json file already exists');
    }
} catch (error) {
    log('Error setting up file structure: ' + error.message);
}

// API endpoint to get tasks
app.get('/api/tasks', (req, res) => {
    try {
        // Get user_id from query params, default to 1 if not provided
        const userId = req.query.user_id || '1';
        log(`Getting tasks for user_id: ${userId}`);
        
        // Read the tasks from the file
        const tasks = JSON.parse(fs.readFileSync(tasksFilePath, 'utf8'));
        log(`Total tasks in database: ${tasks.length}`);
        
        // Filter tasks by user_id if provided
        const userTasks = tasks.filter(task => {
            // If task has no user_id, assign it to default user (id: 1)
            if (!task.user_id) {
                task.user_id = '1';
                return userId === '1';
            }
            return task.user_id === userId;
        });
        
        log(`Filtered ${userTasks.length} tasks for user ${userId}`);
        res.json(userTasks);
    } catch (error) {
        log('Error reading tasks:', error);
        res.status(500).json({ error: 'Failed to read tasks' });
    }
});

// API endpoint to save tasks
app.post('/api/tasks', (req, res) => {
    try {
        const { tasks } = req.body;
        const userId = req.query.user_id || '1'; // Default to user_id 1 if not provided
        
        log(`Received tasks to save for user ${userId}:`, JSON.stringify(tasks));
        
        // Verify user exists
        let users = [];
        if (fs.existsSync(usersFilePath)) {
            users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
            log(`Loaded ${users.length} users from ${usersFilePath}`);
        } else {
            log(`Users file does not exist at ${usersFilePath}, creating default user`);
            // Create default user if it doesn't exist
            users = [{ id: '1', email: 'default@example.com', created_at: new Date().toISOString() }];
            fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
        }
        
        const userExists = users.some(user => user.id === userId);
        if (!userExists && userId !== '1') { // Allow default user ID 1
            log(`User ID ${userId} does not exist`);
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        
        // Read existing tasks if the file exists
        let existingTasks = [];
        if (fs.existsSync(tasksFilePath)) {
            try {
                const fileContent = fs.readFileSync(tasksFilePath, 'utf8');
                existingTasks = JSON.parse(fileContent);
                log(`Existing tasks loaded: ${existingTasks.length} from ${tasksFilePath}`);
            } catch (readError) {
                log('Error reading existing tasks: ' + readError.message);
                // If there's an error reading the file, we'll just use an empty array
                existingTasks = [];
            }
        } else {
            log(`Tasks file does not exist at ${tasksFilePath}, creating empty file`);
            fs.writeFileSync(tasksFilePath, '[]', 'utf8');
        }
        
        // Add user_id to each task if not already present
        const tasksWithUserId = tasks.map(task => ({
            ...task,
            user_id: task.user_id || userId
        }));
        
        // Filter out duplicate tasks from the received tasks
        const newTasksToAdd = tasksWithUserId.filter(newTask => {
            const isDuplicate = existingTasks.some(existingTask =>
                existingTask.title === newTask.title &&
                existingTask.description === newTask.description &&
                existingTask.category === newTask.category &&
                existingTask.urgency === newTask.urgency &&
                existingTask.start_at === newTask.start_at &&
                existingTask.end_at === newTask.end_at &&
                existingTask.deadline === newTask.deadline &&
                existingTask.user_id === newTask.user_id
            );
            if (isDuplicate) {
                log(`Duplicate task detected: ${newTask.title}`);
            }
            return !isDuplicate;
        });

        // Append only unique new tasks to existing tasks
        if (newTasksToAdd.length > 0) {
            const updatedTasks = [...existingTasks, ...newTasksToAdd];
            log(`New tasks to add after filtering duplicates: ${newTasksToAdd.length}`);
            log(`Total tasks after update: ${updatedTasks.length}`);
            
            // Write the combined tasks to the file
            fs.writeFileSync(tasksFilePath, JSON.stringify(updatedTasks, null, 2), 'utf8');
            log(`Tasks saved successfully to: ${tasksFilePath}`);
            
            // Create notifications for new tasks
            log('Creating notifications for new tasks...');
            
            // Ensure notifications.json file exists
            if (!fs.existsSync(notificationsFilePath)) {
                log(`Notifications file does not exist at ${notificationsFilePath}, creating empty file`);
                fs.writeFileSync(notificationsFilePath, '[]', 'utf8');
            }
            
            // Read existing notifications directly from file
            let notifications = [];
            try {
                const notificationsData = fs.readFileSync(notificationsFilePath, 'utf8');
                log(`Read notifications data: ${notificationsData}`);
                // Ensure we have valid JSON data and it's an array
                if (notificationsData && notificationsData.trim() !== '') {
                    const parsedData = JSON.parse(notificationsData);
                    notifications = Array.isArray(parsedData) ? parsedData : [];
                }
                log(`Loaded ${notifications.length} existing notifications`);
            } catch (parseError) {
                log(`Error parsing notifications JSON, resetting to empty array: ${parseError.message}`);
                fs.writeFileSync(notificationsFilePath, '[]', 'utf8');
                notifications = [];
            }
            
            // Create a notification for each new task
            const newNotifications = [];
            
            // First, create "New Task Added" notifications
            newTasksToAdd.forEach(task => {
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
                    user_id: task.user_id
                };
                
                // Check if this notification already exists
                // Make sure notifications is an array before using some()
                const isDuplicate = Array.isArray(notifications) && notifications.length > 0 ? 
                    notifications.some(n => 
                        n && n.title === newTaskNotification.title && 
                        n.message === newTaskNotification.message && 
                        n.user_id === newTaskNotification.user_id && 
                        n.type === newTaskNotification.type
                    ) : false;
                
                if (!isDuplicate) {
                    log(`Creating new task notification for: ${task.title}`);
                    newNotifications.push(newTaskNotification);
                }
            });
            
            // Then, create reminder notifications based on task start times
            const now = new Date();
            newTasksToAdd.forEach(task => {
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
                            log(`Creating 10-minute reminder for task: ${task.title}`);
                            newNotifications.push({
                                id: uniqueId,
                                title: 'Task Starting Soon',
                                message: `Task "${task.title}" starts in about 10 minutes`,
                                type: 'reminder',
                                reminderTime: '10min',
                                time: new Date().toISOString(),
                                read: false,
                                urgent: true,
                                user_id: task.user_id
                            });
                            reminderCreated = true;
                        }
                        
                        // 1 hour reminder (medium priority)
                        if (!reminderCreated && hoursDiffStart > 0.18 && hoursDiffStart <= 1.1) {
                            const uniqueId = `${task.title}-1hour-${Date.now()}`;
                            log(`Creating 1-hour reminder for task: ${task.title}`);
                            newNotifications.push({
                                id: uniqueId,
                                title: 'Upcoming Task Soon',
                                message: `Task "${task.title}" starts in about 1 hour`,
                                type: 'reminder',
                                reminderTime: '1hour',
                                time: new Date().toISOString(),
                                read: false,
                                user_id: task.user_id
                            });
                            reminderCreated = true;
                        }
                        
                        // 1 day reminder (lowest priority)
                        if (!reminderCreated && hoursDiffStart > 1.1 && hoursDiffStart <= 25) {
                            const uniqueId = `${task.title}-1day-${Date.now()}`;
                            log(`Creating 1-day reminder for task: ${task.title}`);
                            newNotifications.push({
                                id: uniqueId,
                                title: 'Upcoming Task',
                                message: `Task "${task.title}" starts in about 1 day`,
                                type: 'reminder',
                                reminderTime: '1day',
                                time: new Date().toISOString(),
                                read: false,
                                user_id: task.user_id
                            });
                        }
                    }
                }
            });
            
            // Add new notifications to existing ones and save to file
            if (newNotifications.length > 0) {
                try {
                    // Combine the arrays and save directly to file
                    const updatedNotifications = [...notifications, ...newNotifications];
                    log(`Writing ${updatedNotifications.length} notifications to ${notificationsFilePath}`);
                    
                    // Ensure the notifications directory exists
                    if (!fs.existsSync(path.dirname(notificationsFilePath))) {
                        log(`Creating notifications directory: ${path.dirname(notificationsFilePath)}`);
                        fs.mkdirSync(path.dirname(notificationsFilePath), { recursive: true });
                    }
                    
                    // Write the combined notifications directly to the file
                    fs.writeFileSync(notificationsFilePath, JSON.stringify(updatedNotifications, null, 2), 'utf8');
                    log(`Successfully saved ${newNotifications.length} notifications for new tasks`);
                    
                    // Also create individual notifications via the notifications endpoint
                    // This is a backup method to ensure notifications are created
                    newNotifications.forEach(notification => {
                        try {
                            // Make a direct POST request to the notifications endpoint
                            const options = {
                                hostname: 'localhost',
                                port: PORT,
                                path: '/api/notifications',
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                }
                            };
                            
                            const req = require('http').request(options, (res) => {
                                let data = '';
                                res.on('data', (chunk) => {
                                    data += chunk;
                                });
                                res.on('end', () => {
                                    log(`Notification endpoint response: ${data}`);
                                });
                            });
                            
                            req.on('error', (error) => {
                                log(`Error sending notification to endpoint: ${error.message}`);
                            });
                            
                            req.write(JSON.stringify(notification));
                            req.end();
                        } catch (endpointError) {
                            log(`Error calling notifications endpoint: ${endpointError.message}`);
                        }
                    });
                } catch (writeError) {
                    log(`Error writing notifications to file: ${writeError.message}`);
                }
            } else {
                log('No new notifications to create');
            }
            
            res.json({ 
                success: true, 
                message: 'Tasks saved successfully', 
                count: updatedTasks.length,
                notifications_created: newNotifications.length
            });
        } else {
            log('No new tasks to save');
            res.json({ success: true, message: 'No new tasks to save', count: existingTasks.length });
        }
    } catch (error) {
        log(`Error saving tasks: ${error.message}`);
        res.status(500).json({ error: 'Failed to save tasks' });
    }
});

// API endpoint to update a task by index
app.put('/api/tasks/:index', (req, res) => {
    try {
        const taskIndex = parseInt(req.params.index);
        const { task } = req.body;
        const userId = req.query.user_id || '1'; // Default to user_id 1 if not provided
        
        // Ensure task has a user_id
        const updatedTask = {
            ...task,
            user_id: task.user_id || userId
        };
        
        log(`Updating task at index ${taskIndex}:`, updatedTask);
        
        // Read existing tasks
        let tasks = [];
        if (fs.existsSync(tasksFilePath)) {
            const fileContent = fs.readFileSync(tasksFilePath, 'utf8');
            tasks = JSON.parse(fileContent);
        }
        
        // Check if the index is valid
        if (taskIndex < 0 || taskIndex >= tasks.length) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        // Check if the user has permission to update this task
        // For now, we'll allow any authenticated user to update tasks
        // If stricter permissions are needed, this can be modified later
        // if (tasks[taskIndex].user_id && tasks[taskIndex].user_id !== userId) {
        //     return res.status(403).json({ error: 'Not authorized to update this task' });
        // }
        
        // Check if this task already exists elsewhere in the array (to prevent duplicates)
        const duplicateIndex = tasks.findIndex((existingTask, idx) => 
            idx !== taskIndex && // Skip comparing with itself
            existingTask.title === updatedTask.title && 
            existingTask.description === updatedTask.description &&
            existingTask.user_id === updatedTask.user_id
        );
        
        // If a duplicate exists, remove it
        if (duplicateIndex !== -1) {
            log(`Found duplicate task at index ${duplicateIndex}, removing it`);
            tasks.splice(duplicateIndex, 1);
        }
        
        // Update the task at the specified index
        tasks[taskIndex] = updatedTask;
        
        // Write the updated tasks back to the file
        fs.writeFileSync(tasksFilePath, JSON.stringify(tasks, null, 2), 'utf8');
        log('Task updated successfully');
        
        res.json({ success: true, message: 'Task updated successfully' });
    } catch (error) {
        log('Error updating task: ' + error.message);
        res.status(500).json({ error: 'Failed to update task' });
    }
});

// API endpoint to delete a task by index
app.delete('/api/tasks/:index', (req, res) => {
    try {
        const taskIndex = parseInt(req.params.index);
        const userId = req.query.user_id || '1'; // Default to user_id 1 if not provided
        
        log(`Deleting task at index ${taskIndex}`);
        
        // Read existing tasks
        let tasks = [];
        if (fs.existsSync(tasksFilePath)) {
            const fileContent = fs.readFileSync(tasksFilePath, 'utf8');
            tasks = JSON.parse(fileContent);
        }
        
        // Check if the index is valid
        if (taskIndex < 0 || taskIndex >= tasks.length) {
            return res.status(404).json({ error: 'Task not found' });
        }
        
        // Check if the user has permission to delete this task
        // For now, we'll allow any authenticated user to delete tasks
        // If stricter permissions are needed, this can be modified later
        // if (tasks[taskIndex].user_id && tasks[taskIndex].user_id !== userId) {
        //     return res.status(403).json({ error: 'Not authorized to delete this task' });
        // }
        
        // Remove the task at the specified index
        tasks.splice(taskIndex, 1);
        
        // Write the updated tasks back to the file
        fs.writeFileSync(tasksFilePath, JSON.stringify(tasks, null, 2), 'utf8');
        log('Task deleted successfully');
        
        res.json({ success: true, message: 'Task deleted successfully' });
    } catch (error) {
        log('Error deleting task: ' + error.message);
        res.status(500).json({ error: 'Failed to delete task' });
    }
});

// API endpoints for users

// API endpoint to get users by email
app.get('/api/users', (req, res) => {
    try {
        const { email } = req.query;
        
        // Read users from the file
        const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
        
        // If email is provided, filter users by email
        if (email) {
            const filteredUsers = users.filter(user => 
                user.email.toLowerCase() === email.toLowerCase()
            );
            log(`Found ${filteredUsers.length} users with email ${email}`);
            return res.json(filteredUsers);
        }
        
        // Otherwise return all users
        log(`Returning all ${users.length} users`);
        res.json(users);
    } catch (error) {
        log('Error reading users:', error);
        res.status(500).json({ error: 'Failed to read users' });
    }
});

// API endpoint to extract tasks from emails using Gemini AI
app.post('/api/extract-tasks', async (req, res) => {
    try {
        const { emails, userEmail } = req.body;
        
        log(`Received task extraction request with ${emails ? emails.length : 0} emails for user ${userEmail || 'unknown'}`);
        
        if (!emails || !Array.isArray(emails) || emails.length === 0) {
            log('No emails provided for task extraction');
            return res.status(400).json({ error: 'No emails provided for task extraction' });
        }
        
        // Check if Gemini AI is initialized
        if (!genAI) {
            log('Gemini AI not initialized, using fallback extraction method');
            // Fallback to simple task extraction if Gemini is not available
            const tasks = extractTasksWithFallbackMethod(emails, userEmail);
            return res.json({ success: true, tasks, method: 'fallback' });
        }
        
        log(`Extracting tasks from ${emails.length} emails for user ${userEmail || 'unknown'} using Gemini AI`);
        
        try {
            // Get Gemini model
            const model = genAI.getGenerativeModel({ model: "gemini-pro" });
            log('Successfully initialized Gemini model');
            
            // Process emails and extract tasks
            const tasks = [];
            
            for (const email of emails) {
                try {
                    log(`Processing email: ${email.subject}`);
                    
                    // Create prompt for Gemini
                    const prompt = `
                    Extract task information from this email. If there's no task, return null.
                    
                    Email Subject: ${email.subject}
                    Email From: ${email.from}
                    Email Content: ${email.snippet}
                    
                    If there's a task, extract the following information in JSON format:
                    1. title: A clear, concise title for the task
                    2. description: A detailed description of what needs to be done
                    3. category: One of [Work, Meeting, Study, Personal, Email, Review]
                    4. urgency: A number from 1-5 (1=lowest, 5=highest) based on urgency terms like ASAP, urgent, etc.
                    5. deadline: If there's a specific date mentioned (in ISO format YYYY-MM-DD), otherwise empty string
                    6. start_at: If there's a start time mentioned (in ISO format), otherwise current time
                    7. end_at: If there's an end time mentioned (in ISO format), otherwise start_time + 1 day
                    
                    Example output format:
                    {
                      "title": "pfa exam",
                      "description": "do the exam of PFA",
                      "category": "Study",
                      "urgency": 5,
                      "start_at": "2025-05-16T17:01:56.541Z",
                      "end_at": "2025-05-17T17:01:56.541Z",
                      "deadline": "2025-05-18T17:01:56.541Z"
                    }
                    
                    If no task is found, just return: null
                    `;
                    
                    // Generate content using Gemini
                    log('Sending prompt to Gemini AI');
                    const result = await model.generateContent(prompt);
                    const response = await result.response;
                    const text = response.text();
                    log('Received response from Gemini AI');
                    
                    // Parse the response
                    try {
                        // Extract JSON from the response (it might be wrapped in markdown code blocks)
                        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || 
                                         text.match(/```\n([\s\S]*?)\n```/) || 
                                         text.match(/{[\s\S]*?}/);
                                         
                        const jsonString = jsonMatch ? jsonMatch[1] || jsonMatch[0] : text;
                        log(`Extracted JSON string: ${jsonString.substring(0, 100)}...`);
                        
                        // Handle the case where Gemini says there's no task
                        if (jsonString.includes('null') || jsonString.trim() === 'null') {
                            log('No task found in this email by Gemini');
                            continue;
                        }
                        
                        // Parse the JSON
                        const taskData = JSON.parse(jsonString);
                        log('Successfully parsed JSON response');
                        
                        // Get user ID for the task
                        let userId = "1"; // Default user ID
                        if (userEmail) {
                            // Read users from the file
                            const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
                            const user = users.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
                            if (user) {
                                userId = user.id;
                                log(`Found user ID ${userId} for email ${userEmail}`);
                            } else {
                                log(`User not found for email ${userEmail}, using default ID`);
                            }
                        }
                        
                        // Ensure all required fields are present
                        const task = {
                            title: taskData.title || email.subject,
                            description: taskData.description || `From: ${email.from} - ${email.snippet}`,
                            category: taskData.category || 'Email',
                            urgency: String(taskData.urgency || 3),
                            deadline: taskData.deadline || '',
                            start_at: taskData.start_at || new Date().toISOString(),
                            end_at: taskData.end_at || new Date(Date.now() + 86400000).toISOString(), // +1 day
                            user_id: userId
                        };
                        
                        tasks.push(task);
                        log(`Task extracted: ${task.title}`);
                    } catch (parseError) {
                        log(`Error parsing Gemini response: ${parseError.message}`);
                        log(`Raw response: ${text}`);
                    }
                } catch (emailError) {
                    log(`Error processing email: ${emailError.message}`);
                }
            }
            
            // Save the extracted tasks to the tasks.json file
            if (tasks.length > 0) {
                try {
                    // Read existing tasks
                    const tasksFilePath = path.join(__dirname, 'src', 'db', 'tasks.json');
                    let existingTasks = [];
                    
                    try {
                        existingTasks = JSON.parse(fs.readFileSync(tasksFilePath, 'utf8'));
                    } catch (readError) {
                        log(`Error reading tasks file: ${readError.message}`);
                        // If file doesn't exist or is invalid, start with empty array
                    }
                    
                    // Add new tasks
                    const updatedTasks = [...existingTasks, ...tasks];
                    
                    // Write back to file
                    fs.writeFileSync(tasksFilePath, JSON.stringify(updatedTasks, null, 2));
                    log(`Successfully saved ${tasks.length} tasks to tasks.json`);
                } catch (saveError) {
                    log(`Error saving tasks to file: ${saveError.message}`);
                }
            }
            
            res.json({ success: true, tasks, method: 'gemini' });
        } catch (geminiError) {
            log(`Error with Gemini AI: ${geminiError.message}`);
            // Fallback to simple task extraction
            const tasks = extractTasksWithFallbackMethod(emails, userEmail);
            res.json({ success: true, tasks, method: 'fallback', error: geminiError.message });
        }
    } catch (error) {
        log(`Error extracting tasks: ${error.message}`);
        res.status(500).json({ error: 'Failed to extract tasks' });
    }
});

// Fallback method for task extraction when Gemini AI is not available
function extractTasksWithFallbackMethod(emails, userEmail) {
    log('Using fallback task extraction method');
    const tasks = [];
    
    // Get user ID for the task
    let userId = "1"; // Default user ID
    if (userEmail) {
        try {
            // Read users from the file
            const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
            const user = users.find(u => u.email.toLowerCase() === userEmail.toLowerCase());
            if (user) {
                userId = user.id;
            }
        } catch (error) {
            log(`Error getting user ID: ${error.message}`);
        }
    }
    
    // Process each email
    for (const email of emails) {
        try {
            const subject = email.subject.toLowerCase();
            const snippet = email.snippet.toLowerCase();
            
            // Simple heuristic to detect tasks
            const taskKeywords = ['task', 'todo', 'to-do', 'to do', 'action', 'please', 'urgent', 'asap',
                                'deadline', 'due', 'complete', 'finish', 'submit', 'review', 'check',
                                'meeting', 'appointment', 'exam', 'assignment', 'homework'];
            
            const hasTaskKeyword = taskKeywords.some(keyword => 
                subject.includes(keyword) || snippet.includes(keyword)
            );
            
            if (hasTaskKeyword || subject.length > 10) {
                // Create a simple task
                const now = new Date();
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                
                const task = {
                    title: email.subject,
                    description: `From: ${email.from} - ${email.snippet}`,
                    category: 'Email',
                    urgency: '3',
                    deadline: '',
                    start_at: now.toISOString(),
                    end_at: tomorrow.toISOString(),
                    user_id: userId
                };
                
                tasks.push(task);
                log(`Task extracted with fallback method: ${task.title}`);
            }
        } catch (error) {
            log(`Error in fallback extraction: ${error.message}`);
        }
    }
    
    // Save the extracted tasks to the tasks.json file
    if (tasks.length > 0) {
        try {
            // Read existing tasks
            const tasksFilePath = path.join(__dirname, 'src', 'db', 'tasks.json');
            let existingTasks = [];
            
            try {
                existingTasks = JSON.parse(fs.readFileSync(tasksFilePath, 'utf8'));
            } catch (readError) {
                log(`Error reading tasks file: ${readError.message}`);
                // If file doesn't exist or is invalid, start with empty array
            }
            
            // Add new tasks
            const updatedTasks = [...existingTasks, ...tasks];
            
            // Write back to file
            fs.writeFileSync(tasksFilePath, JSON.stringify(updatedTasks, null, 2));
            log(`Successfully saved ${tasks.length} tasks to tasks.json with fallback method`);
        } catch (saveError) {
            log(`Error saving tasks to file: ${saveError.message}`);
        }
    }
    
    return tasks;
}

// Get user by ID
app.get('/api/users/:id', (req, res) => {
    try {
        const userId = req.params.id;
        const users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        res.json(user);
    } catch (error) {
        log('Error reading user:', error);
        res.status(500).json({ error: 'Failed to read user' });
    }
});

// Create new user
app.post('/api/users', (req, res) => {
    try {
        const { email, created_at } = req.body;
        
        if (!email) {
            log('Missing email in user creation request');
            return res.status(400).json({ error: 'Email is required' });
        }
        
        log(`Attempting to create user with email: ${email}`);
        
        // Read existing users
        let users = [];
        if (fs.existsSync(usersFilePath)) {
            const fileContent = fs.readFileSync(usersFilePath, 'utf8');
            users = JSON.parse(fileContent);
            log(`Loaded ${users.length} existing users`);
        }
        
        // Check if user already exists
        const existingUser = users.find(u => u.email.toLowerCase() === email.toLowerCase());
        if (existingUser) {
            log(`User with email ${email} already exists, returning existing user`);
            return res.json(existingUser);
        }
        
        // Create new user with a unique ID
        const maxId = users.reduce((max, user) => Math.max(max, parseInt(user.id) || 0), 0);
        const newUser = {
            id: String(maxId + 1),
            email,
            created_at: created_at || new Date().toISOString()
        };
        
        log(`Creating new user with ID: ${newUser.id}`);
        users.push(newUser);
        
        // Write the updated users back to the file
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
        log('User created successfully');
        
        res.json(newUser);
    } catch (error) {
        log('Error creating user:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});

// Update user
app.put('/api/users/:id', (req, res) => {
    try {
        const userId = req.params.id;
        const { username, email } = req.body;
        
        // Read existing users
        let users = [];
        if (fs.existsSync(usersFilePath)) {
            const fileContent = fs.readFileSync(usersFilePath, 'utf8');
            users = JSON.parse(fileContent);
        }
        
        // Find the user to update
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Check if username or email already exists for another user
        const existingUser = users.find(u => u.id !== userId && (u.username === username || u.email === email));
        if (existingUser) {
            return res.status(400).json({ error: 'Username or email already exists' });
        }
        
        // Update the user
        users[userIndex] = {
            ...users[userIndex],
            username: username || users[userIndex].username,
            email: email || users[userIndex].email,
            updated_at: new Date().toISOString()
        };
        
        // Write the updated users back to the file
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
        log('User updated successfully');
        
        res.json({ success: true, user: users[userIndex] });
    } catch (error) {
        log('Error updating user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});

// Delete user
app.delete('/api/users/:id', (req, res) => {
    try {
        const userId = req.params.id;
        
        // Read existing users
        let users = [];
        if (fs.existsSync(usersFilePath)) {
            const fileContent = fs.readFileSync(usersFilePath, 'utf8');
            users = JSON.parse(fileContent);
        }
        
        // Find the user to delete
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex === -1) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Don't allow deleting the default user
        if (userId === '1') {
            return res.status(403).json({ error: 'Cannot delete the default user' });
        }
        
        // Remove the user
        users.splice(userIndex, 1);
        
        // Write the updated users back to the file
        fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
        log('User deleted successfully');
        
        // Also delete or reassign all tasks for this user
        let tasks = [];
        if (fs.existsSync(tasksFilePath)) {
            const fileContent = fs.readFileSync(tasksFilePath, 'utf8');
            tasks = JSON.parse(fileContent);
            
            // Reassign tasks to the default user (id: 1)
            const updatedTasks = tasks.map(task => {
                if (task.user_id === userId) {
                    return { ...task, user_id: '1' };
                }
                return task;
            });
            
            fs.writeFileSync(tasksFilePath, JSON.stringify(updatedTasks, null, 2), 'utf8');
            log(`Reassigned ${updatedTasks.filter(t => t.user_id === '1').length} tasks to the default user`);
        }
        
        res.json({ success: true, message: 'User deleted successfully' });
    } catch (error) {
        log('Error deleting user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'build')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'build', 'index.html'));
    });
}

// API endpoints for notifications

// Get notifications with optional user_id filter
app.get('/api/notifications', async (req, res) => {
    try {
        const { user_id } = req.query;
        log(`Getting notifications${user_id ? ` for user ${user_id}` : ' for all users'}`);
        
        // Read notifications from file
        let notifications = [];
        if (fs.existsSync(notificationsFilePath)) {
            log(`Notifications file exists at: ${notificationsFilePath}`);
            const notificationsData = fs.readFileSync(notificationsFilePath, 'utf8');
            log(`Raw notifications data: ${notificationsData}`);
            notifications = JSON.parse(notificationsData || '[]');
        } else {
            log(`Notifications file does not exist, creating empty file at: ${notificationsFilePath}`);
            fs.writeFileSync(notificationsFilePath, '[]', 'utf8');
        }
        
        // Filter by user_id if provided
        if (user_id) {
            notifications = notifications.filter(notification => notification.user_id === user_id);
            log(`Found ${notifications.length} notifications for user ${user_id}`);
        }
        
        res.json(notifications);
    } catch (error) {
        log('Error reading notifications:', error);
        res.status(500).json({ error: 'Failed to read notifications' });
    }
});

// API endpoint to add a notification
app.post('/api/notifications', async (req, res) => {
    try {
        const notification = req.body;
        log(`Adding notification: ${notification.title} for user ${notification.user_id}`);
        
        // Validate notification
        if (!notification.title || !notification.message) {
            return res.status(400).json({ error: 'Notification must have title and message' });
        }
        
        // Verify user_id exists and is valid
        const userId = notification.user_id || req.query.user_id;
        if (!userId) {
            return res.status(400).json({ error: 'User ID is required' });
        }
        
        // Verify the user exists
        let users = [];
        if (fs.existsSync(usersFilePath)) {
            users = JSON.parse(fs.readFileSync(usersFilePath, 'utf8'));
        } else {
            // Create default user if it doesn't exist
            users = [{ id: '1', email: 'default@example.com', created_at: new Date().toISOString() }];
            fs.writeFileSync(usersFilePath, JSON.stringify(users, null, 2), 'utf8');
            log('Created default user with ID 1');
        }
        
        const userExists = users.some(user => user.id === userId);
        if (!userExists && userId !== '1') { // Allow default user ID 1
            log(`User ID ${userId} does not exist`);
            return res.status(400).json({ error: 'Invalid user ID' });
        }
        
        // Ensure notification has the correct user_id
        notification.user_id = userId;
        
        // Ensure notification has an ID
        if (!notification.id) {
            notification.id = `${notification.title}-${notification.type || 'general'}-${Date.now()}`;
            log(`Generated ID for notification: ${notification.id}`);
        }
        
        // Ensure notifications.json file exists
        if (!fs.existsSync(notificationsFilePath)) {
            log(`Notifications file does not exist, creating empty file at: ${notificationsFilePath}`);
            fs.writeFileSync(notificationsFilePath, '[]', 'utf8');
        }
        
        // Read existing notifications
        let notifications = [];
        try {
            const notificationsData = fs.readFileSync(notificationsFilePath, 'utf8');
            log(`Read notifications data: ${notificationsData}`);
            notifications = JSON.parse(notificationsData || '[]');
            log(`Loaded ${notifications.length} existing notifications`);
        } catch (parseError) {
            log(`Error parsing notifications JSON, resetting to empty array: ${parseError.message}`);
            fs.writeFileSync(notificationsFilePath, '[]', 'utf8');
        }
        
        // Check for duplicates with more precise criteria
        const isDuplicate = notifications.some(n => 
            n.id === notification.id || 
            (n.title === notification.title && 
             n.message === notification.message && 
             n.user_id === notification.user_id && 
             n.type === notification.type &&
             // If it's a reminder, also check the timing information
             (n.type !== 'reminder' || 
              (n.reminderTime === notification.reminderTime)))
        );
        
        if (!isDuplicate) {
            // Add timestamp if not provided
            if (!notification.time) {
                notification.time = new Date().toISOString();
            }
            
            // Add read status if not provided
            if (notification.read === undefined) {
                notification.read = false;
            }
            
            // Add notification to array
            notifications.push(notification);
            
            // Save to file
            try {
                log(`Writing ${notifications.length} notifications to ${notificationsFilePath}`);
                fs.writeFileSync(notificationsFilePath, JSON.stringify(notifications, null, 2));
                log(`Notification saved successfully: ${notification.title}`);
                res.json({ success: true, notification });
            } catch (error) {
                log(`Error saving notification: ${error.message}`);
                res.status(500).json({ error: 'Failed to save notification' });
            }
        } else {
            log(`Duplicate notification detected: ${notification.title}`);
            res.json({ success: true, duplicate: true, notification });
        }
    } catch (error) {
        log(`Error processing notification: ${error.message}`);
        res.status(500).json({ error: 'Failed to process notification' });
    }
});

// API endpoint to get notifications
app.get('/api/notifications', async (req, res) => {
    try {
        const { user_id } = req.query;
        log(`Getting notifications for user_id: ${user_id}`);
        
        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' });
        }
        
        // Read the notifications from the file
        if (!fs.existsSync(notificationsFilePath)) {
            log('Notifications file does not exist, creating empty file');
            fs.writeFileSync(notificationsFilePath, '[]', 'utf8');
            return res.json([]);
        }
        
        const notificationsData = fs.readFileSync(notificationsFilePath, 'utf8');
        let notifications = [];
        
        try {
            notifications = JSON.parse(notificationsData || '[]');
        } catch (parseError) {
            log('Error parsing notifications JSON, resetting to empty array:', parseError);
            fs.writeFileSync(notificationsFilePath, '[]', 'utf8');
        }
        
        // Filter notifications by user_id
        const userNotifications = notifications.filter(notification => notification.user_id === user_id);
        log(`Found ${userNotifications.length} notifications for user ${user_id}`);
        
        // Sort notifications by time (newest first)
        userNotifications.sort((a, b) => {
            return new Date(b.time) - new Date(a.time);
        });
        
        res.json(userNotifications);
    } catch (error) {
        log('Error getting notifications:', error);
        res.status(500).json({ error: 'Failed to get notifications' });
    }
});

// Update a notification (for marking as read)
app.put('/api/notifications/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updatedNotification = req.body;
        const { user_id } = req.query || updatedNotification.user_id;
        
        log(`Updating notification ${id} for user ${user_id}`);
        
        // Validate notification
        if (!updatedNotification) {
            return res.status(400).json({ error: 'Updated notification data is required' });
        }
        
        // Read existing notifications
        if (!fs.existsSync(notificationsFilePath)) {
            return res.status(404).json({ error: 'Notifications file not found' });
        }
        
        const notificationsData = fs.readFileSync(notificationsFilePath, 'utf8');
        let notifications = [];
        
        try {
            notifications = JSON.parse(notificationsData || '[]');
        } catch (parseError) {
            log('Error parsing notifications JSON:', parseError);
            return res.status(500).json({ error: 'Failed to parse notifications data' });
        }
        
        // Find the notification index
        const notificationIndex = notifications.findIndex(n => 
            n.id === id && (!user_id || n.user_id === user_id)
        );
        
        if (notificationIndex === -1) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        
        // Update the notification
        notifications[notificationIndex] = {
            ...notifications[notificationIndex],
            ...updatedNotification,
            id: id // Ensure ID doesn't change
        };
        
        // Save to file
        fs.writeFileSync(notificationsFilePath, JSON.stringify(notifications, null, 2));
        
        log(`Successfully updated notification ${id}`);
        res.json({ success: true, notification: notifications[notificationIndex] });
    } catch (error) {
        log('Error updating notification:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});

// Remove a notification
app.delete('/api/notifications/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { user_id } = req.query;
        log(`Removing notification ${id}${user_id ? ` for user ${user_id}` : ''}`);
        
        // Read existing notifications
        if (!fs.existsSync(notificationsFilePath)) {
            return res.status(404).json({ error: 'Notifications file not found' });
        }
        
        const notificationsData = fs.readFileSync(notificationsFilePath, 'utf8');
        let notifications = JSON.parse(notificationsData || '[]');
        
        // Find the notification index
        const notificationIndex = notifications.findIndex(n => 
            n.id === id && (!user_id || n.user_id === user_id)
        );
        
        if (notificationIndex === -1) {
            return res.status(404).json({ error: 'Notification not found' });
        }
        
        // Remove the notification
        notifications.splice(notificationIndex, 1);
        
        // Save to file
        fs.writeFileSync(notificationsFilePath, JSON.stringify(notifications, null, 2));
        
        res.json({ success: true });
    } catch (error) {
        log('Error removing notification:', error);
        res.status(500).json({ error: 'Failed to remove notification' });
    }
});

// Clear all notifications for a user
app.delete('/api/notifications', async (req, res) => {
    try {
        const { user_id } = req.query;
        
        if (!user_id) {
            return res.status(400).json({ error: 'user_id is required' });
        }
        
        log(`Clearing all notifications for user ${user_id}`);
        
        // Read existing notifications
        if (!fs.existsSync(notificationsFilePath)) {
            return res.json({ success: true, count: 0 });
        }
        
        const notificationsData = fs.readFileSync(notificationsFilePath, 'utf8');
        let notifications = JSON.parse(notificationsData || '[]');
        
        // Filter out notifications for the specified user
        const initialCount = notifications.length;
        notifications = notifications.filter(n => n.user_id !== user_id);
        const removedCount = initialCount - notifications.length;
        
        // Save to file
        fs.writeFileSync(notificationsFilePath, JSON.stringify(notifications, null, 2));
        
        res.json({ success: true, count: removedCount });
    } catch (error) {
        log('Error clearing notifications:', error);
        res.status(500).json({ error: 'Failed to clear notifications' });
    }
});

// API endpoint to get scan history
app.get('/api/scans', (req, res) => {
    try {
        if (!fs.existsSync(scansFilePath)) {
            log('Scans file does not exist, creating default file...');
            const defaultScansData = {
                lastScanTime: new Date().toISOString(),
                scannedEmails: []
            };
            fs.writeFileSync(scansFilePath, JSON.stringify(defaultScansData, null, 2), 'utf8');
        }
        
        const scansData = fs.readFileSync(scansFilePath, 'utf8');
        const scans = JSON.parse(scansData);
        log(`Returning scan history: ${JSON.stringify(scans)}`);
        res.json(scans);
    } catch (error) {
        log(`Error getting scan history: ${error.message}`);
        res.status(500).json({ error: 'Failed to get scan history' });
    }
});

// API endpoint to update scan history
app.post('/api/scans', (req, res) => {
    try {
        const { lastScanTime, scannedEmail } = req.body;
        log(`Updating scan history with lastScanTime: ${lastScanTime}, scannedEmail: ${scannedEmail}`);
        
        if (!lastScanTime) {
            return res.status(400).json({ error: 'lastScanTime is required' });
        }
        
        // Read existing scan history
        let scans = { lastScanTime: new Date().toISOString(), scannedEmails: [] };
        if (fs.existsSync(scansFilePath)) {
            const scansData = fs.readFileSync(scansFilePath, 'utf8');
            try {
                scans = JSON.parse(scansData);
            } catch (parseError) {
                log(`Error parsing scans JSON, resetting to default: ${parseError.message}`);
            }
        }
        
        // Update lastScanTime
        scans.lastScanTime = lastScanTime;
        
        // Add scannedEmail to history if provided
        if (scannedEmail) {
            // Check if email already exists in history
            const emailExists = scans.scannedEmails.some(email => 
                email.id === scannedEmail.id || email.emailId === scannedEmail.emailId
            );
            
            if (!emailExists) {
                // Add timestamp to scannedEmail
                scannedEmail.scannedAt = new Date().toISOString();
                scans.scannedEmails.push(scannedEmail);
                
                // Keep only the last 100 scanned emails
                if (scans.scannedEmails.length > 100) {
                    scans.scannedEmails = scans.scannedEmails.slice(-100);
                }
            }
        }
        
        // Save updated scan history
        fs.writeFileSync(scansFilePath, JSON.stringify(scans, null, 2), 'utf8');
        log(`Scan history updated successfully`);
        res.json({ success: true, scans });
    } catch (error) {
        log(`Error updating scan history: ${error.message}`);
        res.status(500).json({ error: 'Failed to update scan history' });
    }
});

// API endpoint to check if an email has been scanned
app.get('/api/scans/check', (req, res) => {
    try {
        const { emailId } = req.query;
        log(`Checking if email ${emailId} has been scanned`);
        
        if (!emailId) {
            return res.status(400).json({ error: 'emailId is required' });
        }
        
        // Read scan history
        if (!fs.existsSync(scansFilePath)) {
            return res.json({ scanned: false });
        }
        
        const scansData = fs.readFileSync(scansFilePath, 'utf8');
        const scans = JSON.parse(scansData);
        
        // Check if email exists in history
        const emailScanned = scans.scannedEmails.some(email => 
            email.id === emailId || email.emailId === emailId
        );
        
        log(`Email ${emailId} has${emailScanned ? '' : ' not'} been scanned before`);
        res.json({ scanned: emailScanned });
    } catch (error) {
        log(`Error checking scan history: ${error.message}`);
        res.status(500).json({ error: 'Failed to check scan history' });
    }
});

app.listen(PORT, () => {
    log(`Server is running on port ${PORT}`);
    log('Initializing database...');
    if (!fs.existsSync(dbDir)) {
        log('DB directory does not exist, creating...');
        fs.mkdirSync(dbDir, { recursive: true });
    }

    if (!fs.existsSync(tasksFilePath)) {
        log('tasks.json file does not exist, creating empty file...');
        fs.writeFileSync(tasksFilePath, '[]', 'utf8');
    }

    if (!fs.existsSync(usersFilePath)) {
        log('users.json file does not exist, creating empty file...');
        fs.writeFileSync(usersFilePath, '[]', 'utf8');
    }

    if (!fs.existsSync(notificationsFilePath)) {
        log('notifications.json file does not exist, creating empty file...');
        fs.writeFileSync(notificationsFilePath, '[]', 'utf8');
    }

    if (!fs.existsSync(scansFilePath)) {
        log('scans.json file does not exist, creating default file...');
        const defaultScansData = {
            lastScanTime: new Date().toISOString(),
            scannedEmails: []
        };
        fs.writeFileSync(scansFilePath, JSON.stringify(defaultScansData, null, 2), 'utf8');
    }
});
