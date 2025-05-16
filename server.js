const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

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

// Middleware
app.use(cors());
app.use(express.json());

// Define paths
const dbDir = path.join(__dirname, 'src', 'db');
const tasksFilePath = path.join(dbDir, 'tasks.json');

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

    // Path to the tasks.json file is already defined above

    // Initialize the tasks.json file if it doesn't exist
    if (!fs.existsSync(tasksFilePath)) {
        log('Creating tasks.json file...');
        fs.writeFileSync(tasksFilePath, '[]', 'utf8');
        log('tasks.json file created successfully');
    } else {
        log('tasks.json file already exists');
    }
} catch (error) {
    log('Error setting up file structure: ' + error.message);
}

// API endpoint to get tasks
app.get('/api/tasks', (req, res) => {
    try {
        // Read the tasks from the file
        const tasks = JSON.parse(fs.readFileSync(tasksFilePath, 'utf8'));
        res.json(tasks);
    } catch (error) {
        console.error('Error reading tasks:', error);
        res.status(500).json({ error: 'Failed to read tasks' });
    }
});

// API endpoint to save tasks
app.post('/api/tasks', (req, res) => {
    try {
        const { tasks } = req.body;
        log('Received tasks to save:', tasks);
        
        // Read existing tasks if the file exists
        let existingTasks = [];
        if (fs.existsSync(tasksFilePath)) {
            try {
                const fileContent = fs.readFileSync(tasksFilePath, 'utf8');
                existingTasks = JSON.parse(fileContent);
                log('Existing tasks loaded:', existingTasks.length);
            } catch (readError) {
                log('Error reading existing tasks: ' + readError.message);
                // If there's an error reading the file, we'll just use an empty array
                existingTasks = [];
            }
        }
        
        // Filter out duplicate tasks from the received tasks
        const newTasksToAdd = tasks.filter(newTask => {
            const isDuplicate = existingTasks.some(existingTask =>
                existingTask.title === newTask.title &&
                existingTask.description === newTask.description &&
                existingTask.category === newTask.category &&
                existingTask.urgency === newTask.urgency &&
                existingTask.start_at === newTask.start_at &&
                existingTask.end_at === newTask.end_at &&
                existingTask.deadline === newTask.deadline
            );
            if (isDuplicate) {
                log('Duplicate task detected:', newTask.title);
            }
            return !isDuplicate;
        });

        // Append only unique new tasks to existing tasks
        if (newTasksToAdd.length > 0) {
            const updatedTasks = [...existingTasks, ...newTasksToAdd];
            log('New tasks to add after filtering duplicates:', newTasksToAdd.length);
            log('Total tasks after update:', updatedTasks.length);
            
            // Write the combined tasks to the file
            fs.writeFileSync(tasksFilePath, JSON.stringify(updatedTasks, null, 2), 'utf8');
            log('Tasks saved successfully to:', tasksFilePath);
            
            res.json({ success: true, message: 'Tasks saved successfully', count: updatedTasks.length });
        } else {
            res.json({ success: true, message: 'No new tasks to save', count: existingTasks.length });
        }
    } catch (error) {
        log('Error saving tasks: ' + error.message);
        res.status(500).json({ error: 'Failed to save tasks' });
    }
});

// Serve static files from the React app in production
if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.join(__dirname, 'build')));
    app.get('*', (req, res) => {
        res.sendFile(path.join(__dirname, 'build', 'index.html'));
    });
}

app.listen(PORT, () => {
    log(`Server is running on port ${PORT}`);
    log(`DB directory: ${dbDir}`);
    log(`Tasks file path: ${tasksFilePath}`);
    log(`Check if DB directory exists: ${fs.existsSync(dbDir)}`);
    log(`Check if tasks.json exists: ${fs.existsSync(tasksFilePath)}`);
    
    // Force create directory and file if they don't exist
    if (!fs.existsSync(dbDir)) {
        try {
            fs.mkdirSync(dbDir, { recursive: true });
            log('Created DB directory manually on server start');
        } catch (error) {
            log('Failed to create DB directory: ' + error.message);
        }
    }
    
    if (!fs.existsSync(tasksFilePath)) {
        try {
            fs.writeFileSync(tasksFilePath, '[]', 'utf8');
            log('Created tasks.json file manually on server start');
        } catch (error) {
            log('Failed to create tasks.json file: ' + error.message);
        }
    }
});
