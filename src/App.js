
import React, { useState, useEffect } from 'react';
import axios from 'axios'; // Import axios
import TaskInput from './components/TaskInput';
import TaskList from './components/TaskList';
import TaskCalendar from './components/TaskCalendar';
import Notifications from './components/Notifications';
import GmailTaskExtractor from './components/GmailTaskExtractor';
import './App.css';

const apiKey = 'AIzaSyAbkug1K5m_SydfEaFA3PdeqtO6wESv9Cw'; // **REPLACE WITH YOUR ACTUAL API KEY**
const userTimeZone = 'Africa/Casablanca';
const currentLocation = "Marrakesh, Marrakesh-Safi, Morocco";

function App() {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [saveStatus, setSaveStatus] = useState('');
    const [activeTab, setActiveTab] = useState('gmail');  // Default to 'gmail' tab
    const [currentUser, setCurrentUser] = useState(null); // Track current user

    // Function to save tasks to the backend JSON file
    const saveTasksToBackend = async (tasksToSave) => {
        if (!tasksToSave || tasksToSave.length === 0) {
            console.log('No new tasks to save to backend.');
            return 0;
        }
        try {
            console.log('Saving tasks to backend:', tasksToSave);
            // setSaveStatus('Saving to server...');
            
            // Send only the new tasks to the backend
            const response = await axios.post('http://localhost:3001/api/tasks', { tasks: tasksToSave });
            
            if (response.data.success) {
                // setSaveStatus(`Tasks saved to server! Total: ${response.data.count}`);
                // Fetch updated tasks to ensure UI consistency, especially if server modifies/adds IDs
                await loadTasksFromBackend(); 
            } else {
                throw new Error(response.data.error || 'Failed to save tasks to server');
            }
            
            setTimeout(() => setSaveStatus(''), 3000);
            return response.data.count; // Return the total count from the server
        } catch (error) {
            console.error('Error saving tasks to backend:', error);
            setSaveStatus('Error saving tasks to server: ' + (error.response?.data?.error || error.message));
            setTimeout(() => setSaveStatus(''), 3000);
            return 0;
        }
    };

    // Function to load tasks from the backend JSON file for a specific user
    const loadTasksFromBackend = async (userId = null) => {
        try {
            setLoading(true);
            setError(null);
            console.log('Loading tasks from backend...');
            
            // If userId is provided, load tasks for that user
            const url = userId ? `http://localhost:3001/api/tasks?user_id=${userId}` : 'http://localhost:3001/api/tasks';
            const response = await axios.get(url);
            
            if (response.data) {
                console.log(`Loaded ${response.data.length} tasks from backend`);
                setTasks(response.data);
            } else {
                console.log('No tasks found on backend or error in response');
                setTasks([]);
            }
            
            setLoading(false);
        } catch (error) {
            console.error('Error loading tasks from backend:', error);
            setError('Failed to load tasks from server: ' + (error.response?.data?.error || error.message));
            setLoading(false);
            setTasks([]); // Ensure tasks are cleared on error
        }
    };

    // Load current user and their tasks when the component mounts
    useEffect(() => {
        const checkCurrentUser = async () => {
            try {
                // Check if there's a current user in localStorage
                const savedUserId = localStorage.getItem('currentUserId');
                
                if (savedUserId) {
                    // Fetch user details
                    const userResponse = await axios.get(`http://localhost:3001/api/users/${savedUserId}`);
                    if (userResponse.data) {
                        setCurrentUser(userResponse.data);
                        // Load tasks for this user
                        loadTasksFromBackend(savedUserId);
                    } else {
                        // User not found, clear localStorage
                        localStorage.removeItem('currentUserId');
                    }
                } else {
                    // No user in localStorage, load default tasks
                    loadTasksFromBackend();
                }
            } catch (error) {
                console.error('Error checking current user:', error);
                setError('Failed to load user data: ' + (error.response?.data?.error || error.message));
                // Load default tasks on error
                loadTasksFromBackend();
            }
        };
        
        checkCurrentUser();
    }, []);

    // Reference to store previous tasks length to detect newly added tasks by the AI
    const prevTasksLengthRef = React.useRef(0);

    // Save only new tasks (generated by AI) to backend when tasks state changes
    useEffect(() => {
        // This effect is primarily for tasks generated by the AI via handleAnalyzeText
        // We compare current tasks length with the length before AI processing
        if (tasks.length > prevTasksLengthRef.current && prevTasksLengthRef.current !== 0) { // Avoid saving on initial load if tasks were fetched
            const newTasks = tasks.slice(prevTasksLengthRef.current);
            if (newTasks.length > 0) {
                console.log(`Detected ${newTasks.length} new tasks from AI to save...`);
                saveTasksToBackend(newTasks);
            }
        }
        // Update the ref to the current length *after* potential save operation
        // Or, more robustly, update it when tasks are set by AI analysis
        // For now, this simple update is fine, but could be refined if tasks can be modified elsewhere.
        // prevTasksLengthRef.current = tasks.length; // This will be updated in handleAnalyzeText
    }, [tasks, saveTasksToBackend]);

    const handleAnalyzeText = async (text) => {
        if (!text.trim()) {
            // setTasks([]); // Optionally clear tasks or handle as needed
            return;
        }

        setLoading(true);
        setError(null);
        // Store the current number of tasks before AI analysis
        prevTasksLengthRef.current = tasks.length;

        const currentDate = new Date();
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth() + 1;
        const day = currentDate.getDate();
        const hours = currentDate.getHours();
        const minutes = currentDate.getMinutes();
        const seconds = currentDate.getSeconds();
        const currentTimeISO = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}Z`;

        try {
            const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [
                        {
                            parts: [
                                {
                                    text: `Analyze the following text and extract the task details. Output each task as a valid JSON object with the following fields: "title", "description", "category" (default to "General"), "urgency" (on a scale of 1-5, default to 3), "start_at" (ISO 8601, infer, default to "${currentTimeISO}"), "end_at" (ISO 8601, infer, default to start_at + 1 hour), and "deadline" (ISO 8601, infer, default to end of today). Enclose each JSON object within a Markdown code block (\\\`\\\`\\\`json ... \\\`\\\`\\\`). Separate each JSON code block by a newline.\n\nText: ${text}\n\nCurrent Date and Time (for reference): ${currentTimeISO}\nCurrent Location (for context): ${currentLocation}`
                                }
                            ]
                        }
                    ],
                    generationConfig: {
                        maxOutputTokens: 700,
                    },
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status} - ${errorData?.error?.message || 'Unknown error'}`);
            }

            const data = await response.json();
            setLoading(false);

            if (data && data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts) {
                const analysisResult = data.candidates[0].content.parts[0].text;
                const jsonBlockRegex = /```json\n([\s\S]*?)\n```/g;
                let match;
                const extractedTasks = [];

                while ((match = jsonBlockRegex.exec(analysisResult)) !== null) {
                    const jsonString = match[1];
                    try {
                        const taskJSON = JSON.parse(jsonString);
                        extractedTasks.push(taskJSON);
                    } catch (parseError) {
                        console.error("Error parsing JSON:", parseError, jsonString);
                        setError("Error parsing the AI's response.");
                    }
                }
                
                if (extractedTasks.length > 0) {
                    // Append new tasks to existing tasks from the server
                    // setTasks(prevTasks => [...prevTasks, ...extractedTasks]);
                    // The useEffect above will handle saving these new tasks.
                    // Or, more directly:
                    console.log('New tasks extracted by AI:', extractedTasks);
                    await saveTasksToBackend(extractedTasks); // Directly save new tasks and reload
                } else {
                    setError("No tasks could be extracted from the AI's response.");
                    // No change to tasks if nothing extracted, prevTasksLengthRef remains relevant for next AI run
                }
            } else {
                setError("Could not parse the analysis results from the AI.");
                // No change to tasks, prevTasksLengthRef remains relevant
            }

        } catch (err) {
            setError(err.message);
            setLoading(false);
            // No change to tasks on error, prevTasksLengthRef remains relevant
        }
    };

    // Handle updating a task
    const handleUpdateTask = async (index, updatedTask) => {
        try {
            setSaveStatus('Updating task...');
            
            // Create a copy of the tasks array
            const updatedTasks = [...tasks];
            
            // Update the task at the specified index
            updatedTasks[index] = updatedTask;
            
            // Update the tasks in the backend
            const response = await axios.put(`http://localhost:3001/api/tasks/${index}`, { task: updatedTask });
            
            if (response.data.success) {
                // Update the tasks state with the updated tasks
                setTasks(updatedTasks);
                setSaveStatus('Task updated successfully!');
            } else {
                throw new Error(response.data.error || 'Failed to update task');
            }
            
            setTimeout(() => setSaveStatus(''), 3000);
        } catch (error) {
            console.error('Error updating task:', error);
            setSaveStatus('Error updating task: ' + (error.response?.data?.error || error.message));
            setTimeout(() => setSaveStatus(''), 3000);
        }
    };
    
    // Handle deleting a task
    const handleDeleteTask = async (index) => {
        try {
            setSaveStatus('Deleting task...');
            
            // Delete the task from the backend
            const response = await axios.delete(`http://localhost:3001/api/tasks/${index}`);
            
            if (response.data.success) {
                // Reload tasks from the backend to ensure indices are synchronized
                await loadTasksFromBackend();
                setSaveStatus('Task deleted successfully!');
            } else {
                throw new Error(response.data.error || 'Failed to delete task');
            }
            
            setTimeout(() => setSaveStatus(''), 3000);
        } catch (error) {
            console.error('Error deleting task:', error);
            setSaveStatus('Error deleting task: ' + (error.response?.data?.error || error.message));
            setTimeout(() => setSaveStatus(''), 3000);
        }
    };

    // Manual export to file for user convenience (downloads current client-side tasks)
    const handleExportToFile = () => {
        if (tasks.length > 0) {
            const jsonString = JSON.stringify(tasks, null, 2);
            const blob = new Blob([jsonString], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'tasks.json';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            alert('Current tasks exported to file successfully!');
        } else {
            alert('No tasks to export.');
        }
    };

    // Import tasks from a JSON file and append them to existing tasks on the server
    const handleImportFromFile = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = async (e) => {
                try {
                    const importedTasks = JSON.parse(e.target.result);
                    if (Array.isArray(importedTasks) && importedTasks.length > 0) {
                        console.log('Importing tasks from file:', importedTasks);
                        await saveTasksToBackend(importedTasks); // Save imported tasks to backend
                        alert(`${importedTasks.length} tasks imported and saved to server successfully!`);
                    } else {
                        alert('No valid tasks found in the file or file is empty.');
                    }
                } catch (parseError) {
                    console.error('Error parsing imported JSON file:', parseError);
                    alert('Error parsing JSON file. Please ensure it is a valid JSON array of tasks.');
                }
            };
            reader.readAsText(file);
        }
        // Reset file input to allow importing the same file again if needed
        event.target.value = null;
    };
    
    // Handle user creation or login when Gmail is connected
    const handleUserAuth = async (userEmail) => {
        try {
            console.log('Handling user authentication for email:', userEmail);
            // Check if user with this email already exists
            const response = await axios.get(`http://localhost:3001/api/users?email=${encodeURIComponent(userEmail)}`);
            
            let user;
            
            if (response.data && response.data.length > 0) {
                // User exists, use this user
                user = response.data[0];
                console.log('Existing user found:', user);
            } else {
                // Create new user
                console.log('Creating new user with email:', userEmail);
                const newUserResponse = await axios.post('http://localhost:3001/api/users', {
                    email: userEmail,
                    created_at: new Date().toISOString()
                });
                
                user = newUserResponse.data;
                console.log('New user created:', user);
            }
            
            // Set current user and save to localStorage
            setCurrentUser(user);
            localStorage.setItem('currentUserId', user.id);
            console.log('Current user set to:', user.id);
            
            // Load tasks for this user
            await loadTasksFromBackend(user.id);
            
            return user;
        } catch (error) {
            console.error('Error handling user authentication:', error);
            setError('Failed to authenticate user: ' + (error.response?.data?.error || error.message));
            return null;
        }
    };
    
    // Handle user logout
    const handleLogout = () => {
        setCurrentUser(null);
        localStorage.removeItem('currentUserId');
        setTasks([]);
        setActiveTab('gmail');
    };
    
    // Handle tasks extracted from Gmail emails
    const handleEmailTasks = async (emailTasks, userEmail) => {
        if (!emailTasks || emailTasks.length === 0) {
            console.log('No tasks extracted from emails');
            return;
        }
        
        try {
            console.log('Processing extracted email tasks with user email:', userEmail);
            // Ensure we have a user for these tasks
            let user = currentUser;
            if (!user && userEmail) {
                console.log('No current user, authenticating with email:', userEmail);
                user = await handleUserAuth(userEmail);
                if (!user) {
                    throw new Error('Failed to authenticate user');
                }
            }
            
            if (!user) {
                console.error('No user available for tasks');
                setSaveStatus('Error: No user account available for tasks');
                setTimeout(() => setSaveStatus(''), 3000);
                return;
            }
            
            // Add user_id to all tasks
            const tasksWithUserId = emailTasks.map(task => ({
                ...task,
                user_id: user.id
            }));
            
            console.log(`Adding tasks for user_id: ${user.id}`, tasksWithUserId);
            setSaveStatus('Saving tasks from emails...');
            
            // Save the extracted tasks to the backend
            const savedCount = await saveTasksToBackend(tasksWithUserId);
            
            if (savedCount > 0) {
                setSaveStatus(`${savedCount} tasks from emails saved successfully!`);
                // Switch to list tab to show the new tasks
                setActiveTab('list');
                
                // Reload tasks to ensure we have the latest
                await loadTasksFromBackend(user.id);
            } else {
                setSaveStatus('No new tasks from emails to save (possible duplicates)');
            }
            
            setTimeout(() => setSaveStatus(''), 3000);
        } catch (error) {
            console.error('Error saving tasks from emails:', error);
            setSaveStatus('Error saving tasks from emails: ' + error.message);
            setTimeout(() => setSaveStatus(''), 3000);
        }
    };

    return (
        <div className="App">
            <header className="App-header">
                <h1>AI Task Planner</h1>
                <div className="header-right">
                    {currentUser && (
                        <div className="user-info">
                            <span className="username">{currentUser.email}</span>
                            <button className="logout-button" onClick={handleLogout}>Logout</button>
                        </div>
                    )}
                    <Notifications tasks={tasks} currentUser={currentUser} />
                </div>
            </header>
            <main>
                {!currentUser && activeTab !== 'gmail' ? (
                    // If no user is logged in and not on Gmail tab, show message to connect Gmail first
                    <div className="connect-gmail-prompt">
                        <h2>Connect to Gmail First</h2>
                        <p>Please connect your Gmail account to get started with AI Task Planner.</p>
                        <button 
                            className="connect-gmail-button"
                            onClick={() => setActiveTab('gmail')}
                        >
                            Connect Gmail
                        </button>
                    </div>
                ) : (
                    <>
                        {currentUser && <TaskInput onAnalyze={handleAnalyzeText} />}
                        {error && <p className="error-message">Error: {error}</p>}
                        {saveStatus && <p className="save-status-message">{saveStatus}</p>}
                        
                        <div className="tab-navigation">
                            <button 
                                className={`tab-button ${activeTab === 'gmail' ? 'active' : ''}`}
                                onClick={() => setActiveTab('gmail')}
                            >
                                Gmail Tasks
                            </button>
                            <button 
                                className={`tab-button ${activeTab === 'list' ? 'active' : ''}`}
                                onClick={() => setActiveTab('list')}
                                disabled={!currentUser}
                            >
                                Task List
                            </button>
                            <button 
                                className={`tab-button ${activeTab === 'calendar' ? 'active' : ''}`}
                                onClick={() => setActiveTab('calendar')}
                                disabled={!currentUser}
                            >
                                Calendar View
                            </button>
                        </div>
                        
                        {activeTab === 'list' && currentUser ? (
                            <TaskList 
                                tasks={tasks} 
                                onUpdateTask={handleUpdateTask}
                                onDeleteTask={handleDeleteTask}
                            />
                        ) : activeTab === 'calendar' && currentUser ? (
                            <TaskCalendar tasks={tasks} />
                        ) : (
                            <GmailTaskExtractor 
                                onExtractTasks={handleEmailTasks} 
                                onUserAuth={handleUserAuth}
                                onViewTasks={() => setActiveTab('calendar')}
                                currentUser={currentUser}
                                onLogout={handleLogout}
                            />
                        )}
                        
                        {currentUser && (
                            <div className="actions-container">
                                <button onClick={handleExportToFile} className="action-button export-button">
                                    Export Current Tasks to File
                                </button>
                                <label htmlFor="import-file-input" className="action-button import-button">
                                    Import Tasks from File
                                </label>
                                <input 
                                    type="file" 
                                    id="import-file-input" 
                                    accept=".json" 
                                    onChange={handleImportFromFile} 
                                    style={{ display: 'none' }} 
                                />
                            </div>
                        )}
                    </>
                )}
            </main>
            <footer>
                <p>&copy; {new Date().getFullYear()} AI Task Planner. All rights reserved.</p>
            </footer>
        </div>
    );
}

export default App;