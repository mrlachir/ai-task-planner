import React, { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/GmailTaskExtractor.css';

const GmailTaskExtractor = ({ onExtractTasks, onUserAuth, onViewTasks, currentUser }) => {
    const [isAuthorized, setIsAuthorized] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [emails, setEmails] = useState([]);
    const [extractedTasks, setExtractedTasks] = useState([]);
    const [isScanning, setIsScanning] = useState(false);
    const [userInfo, setUserInfo] = useState(null);
    const [token, setToken] = useState(null);

    // Client ID and API key from the Google Developer Console
    const CLIENT_ID = '233852782558-clap8gucqoj6a38ltesa6tbiq1dsc82c.apps.googleusercontent.com';
    const API_KEY = 'AIzaSyAdH_NTi6u23cwiDpPbJKWdSxP_GbD3rIc';
    
    // Track initialization status
    const [apiInitialized, setApiInitialized] = useState(false);
    const [authError, setAuthError] = useState("");
    
    // Default props for safety
    const safeOnExtractTasks = onExtractTasks || function() {};
    const safeOnUserAuth = onUserAuth || function() {};
    const safeOnViewTasks = onViewTasks || function() {};

    // Array of API discovery doc URLs for APIs used by the app
    const DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/gmail/v1/rest"];

    // Authorization scopes required by the API
    const SCOPES = 'https://www.googleapis.com/auth/gmail.readonly';

    let tokenClient;
    let gapiInited = false;
    let gisInited = false;

    // Add delay function
    const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    useEffect(() => {
        // Initialize Google APIs
        const initializeGoogleAPIs = () => {
            // Check if scripts are already loaded in the HTML
            if (window.gapi) {
                console.log('GAPI already available in window, initializing client...');
                window.gapi.load('client', initializeGapiClient);
            } else {
                console.log('Waiting for GAPI to be available...');
                setTimeout(initializeGoogleAPIs, 100);
            }
            
            if (window.google && window.google.accounts) {
                console.log('GIS already available in window, initializing...');
                gisLoaded();
            }
        };
        
        // Start initialization
        initializeGoogleAPIs();
        
        // Set a timeout to check initialization status after 5 seconds
        const timeoutId = setTimeout(() => {
            if (!apiInitialized) {
                console.log('API initialization timeout - attempting manual load');
                // Try to manually load scripts if they weren't loaded from HTML
                if (!window.gapi) {
                    const gapiScript = document.createElement('script');
                    gapiScript.src = 'https://apis.google.com/js/api.js';
                    gapiScript.async = true;
                    gapiScript.onload = () => {
                        console.log('GAPI manually loaded, initializing client...');
                        window.gapi.load('client', initializeGapiClient);
                    };
                    document.body.appendChild(gapiScript);
                }
                
                if (!window.google || !window.google.accounts) {
                    const gisScript = document.createElement('script');
                    gisScript.src = 'https://accounts.google.com/gsi/client';
                    gisScript.async = true;
                    gisScript.onload = () => {
                        console.log('GIS manually loaded, initializing...');
                        gisLoaded();
                    };
                    document.body.appendChild(gisScript);
                }
            }
        }, 5000);
        
        return () => {
            clearTimeout(timeoutId);
        };
    }, []);

    // Initialize the API client library
    const initializeGapiClient = async () => {
        console.log('Initializing GAPI client...');
        try {
            await window.gapi.client.init({
                apiKey: API_KEY,
                discoveryDocs: DISCOVERY_DOCS,
            });
            console.log('GAPI client initialized successfully');
            gapiInited = true;
            maybeEnableButtons();
            setApiInitialized(true);
        } catch (error) {
            console.error('Error initializing GAPI client:', error);
            setError(`Error initializing GAPI client: ${error.message}`);
        }
    };

    const gisLoaded = () => {
        if (!window.google || !window.google.accounts || !window.google.accounts.oauth2) {
            console.log('GIS not fully loaded yet, retrying...');
            setTimeout(gisLoaded, 100); // Try again in 100ms
            return;
        }
        
        try {
            console.log('Initializing token client...');
            tokenClient = window.google.accounts.oauth2.initTokenClient({
                client_id: CLIENT_ID,
                scope: SCOPES,
                callback: '', // defined later
            });
            
            console.log('Token client initialized successfully');
            gisInited = true;
            maybeEnableButtons();
            setApiInitialized(true);
        } catch (error) {
            console.error('Error initializing token client:', error);
            setError(`Error initializing authentication: ${error.message}`);
        }
    };

    const maybeEnableButtons = () => {
        console.log('Checking if APIs are initialized - GAPI:', gapiInited, 'GIS:', gisInited);
        if (gapiInited && gisInited) {
            console.log('Both APIs initialized, checking authorization status');
            try {
                const token = window.gapi.client.getToken();
                setIsAuthorized(token !== null);
                console.log('Authorization status:', token !== null ? 'Authorized' : 'Not authorized');
            } catch (error) {
                console.error('Error checking token:', error);
            }
        }
    };

    const handleAuthClick = () => {
        console.log('Auth click handler called, token client:', tokenClient ? 'exists' : 'not initialized');
        if (!tokenClient) {
            console.error('Token client not initialized');
            
            // Try to reinitialize if not available
            if (window.google && window.google.accounts && window.google.accounts.oauth2) {
                console.log('Reinitializing token client...');
                tokenClient = window.google.accounts.oauth2.initTokenClient({
                    client_id: CLIENT_ID,
                    scope: SCOPES,
                    callback: '', // defined later
                });
            } else {
                setError("Authentication not available. Please refresh the page and try again.");
                return;
            }
        }
        
        setIsLoading(true);
        setAuthError("");
        
        // Callback after user selects an account and provides consent
        tokenClient.callback = async (resp) => {
            console.log('Auth callback received, handling response...');
            if (resp.error) {
                console.error('Auth error:', resp.error);
                setAuthError(`Authentication failed: ${resp.error}`);
                setIsLoading(false);
                return;
            }
            
            console.log('Authentication successful, getting user profile...');
            setIsAuthorized(true);
            
            try {
                // Get user email from profile
                const userInfoResponse = await window.gapi.client.gmail.users.getProfile({
                    userId: 'me'
                });
                
                const userEmail = userInfoResponse.result.emailAddress;
                console.log('User email retrieved:', userEmail);
                
                // Authenticate or create user
                let user = null;
                if (safeOnUserAuth && userEmail) {
                    user = await safeOnUserAuth(userEmail);
                    console.log('User authenticated/created:', user);
                }
                
                // Store user info for later use
                setUserInfo({ email: userEmail });
                
                // Automatically fetch emails after successful authentication
                console.log('Fetching emails automatically after auth...');
                setIsLoading(true);
                setError(<div className="loading-text"><span className="loading-spinner"></span>Step 1/4: Fetching emails from Gmail...</div>);
                
                try {
                    // Add delay before fetching emails
                    await delay(1500);
                    
                    // Get emails from Gmail
                    console.log('Getting emails from Gmail...');
                    const response = await window.gapi.client.gmail.users.messages.list({
                        'userId': 'me',
                        'maxResults': 10, // Fetch 10 emails
                        'q': 'in:inbox' // Only fetch inbox emails
                    });
                    
                    if (!response || !response.result || !response.result.messages) {
                        console.log('No emails found');
                        setEmails([]);
                        setIsLoading(false);
                        setError("No emails found in your Gmail inbox.");
                        return;
                    }
                    
                    console.log(`Found ${response.result.messages.length} emails`);
                    
                    // Fetch detailed information for each email
                    const emailPromises = response.result.messages.map(message => 
                        window.gapi.client.gmail.users.messages.get({
                            'userId': 'me',
                            'id': message.id,
                            'format': 'full'
                        })
                    );
                    
                    const emailResponses = await Promise.all(emailPromises);
                    
                    // Create serializable email objects to avoid circular references
                    const parsedEmails = emailResponses.map(resp => {
                        const emailDetails = parseEmailDetails(resp.result);
                        return createSerializableEmail(emailDetails);
                    });
                    
                    console.log('Emails fetched and parsed:', parsedEmails.length);
                    setEmails(parsedEmails);
                    
                    // Add a short delay before automatically scanning for tasks
                    setError(<div className="loading-text"><span className="loading-spinner"></span>Step 2/4: Emails fetched successfully. Preparing for task extraction...</div>);
                    await delay(1500);
                    
                    // Automatically scan emails for tasks
                    if (parsedEmails.length > 0) {
                        console.log('Automatically scanning emails for tasks...');
                        setIsScanning(true);
                        setError(<div className="loading-text"><span className="loading-spinner"></span>Step 3/4: Extracting tasks from emails...</div>);
                        
                        setError(<div className="loading-text"><span className="loading-spinner"></span>Step 3/4: Extracting tasks from emails... (Loading AI model...)</div>);
                        await delay(1000);
                        
                        // Process emails with Gemini AI
                        setError(<div className="loading-text"><span className="loading-spinner"></span>Step 3/4: Extracting tasks from emails... (Analyzing content...)</div>);
                        const tasks = await extractTasksWithGeminiAI(parsedEmails, userEmail);
                        
                        if (tasks && tasks.length > 0) {
                            // Step 4: Save the extracted tasks to the server
                            setError(<div className="loading-text"><span className="loading-spinner"></span>Step 4/4: Saving {tasks.length} extracted tasks...</div>);
                            
                            // Save tasks directly to tasks.json using axios
                            const saveResponse = await axios.post('http://localhost:3001/api/tasks', { tasks: tasks });
                            
                            await delay(1500); // Wait 1.5 seconds after saving
                            
                            if (!saveResponse.data.success) {
                                throw new Error(`Failed to save tasks: ${saveResponse.status}`);
                            }
                            
                            console.log('Tasks saved successfully:', saveResponse.data);
                            setExtractedTasks(tasks);
                            setError(
                                <div className="loading-text" style={{ backgroundColor: '#e6f4ea', color: '#0f9d58' }}>
                                    <span className="loading-spinner" style={{ borderColor: '#0f9d58 transparent #0f9d58 transparent' }}></span>
                                    Success! {tasks.length} tasks extracted and saved successfully!
                                </div>
                            );
                            
                            // Switch to task list view
                            await delay(1500);
                            if (safeOnViewTasks) {
                                safeOnViewTasks();
                            }
                        } else {
                            setError(
                                <div className="loading-text" style={{ backgroundColor: '#fef7e0', color: '#f4b400' }}>
                                    No tasks found in your emails.
                                </div>
                            );
                        }
                        
                        setIsScanning(false);
                    } else {
                        setError(
                            <div className="loading-text" style={{ backgroundColor: '#fef7e0', color: '#f4b400' }}>
                                No emails found to scan for tasks.
                            </div>
                        );
                    }
                } catch (error) {
                    console.error('Error in automatic task extraction:', error);
                    setError(
                        <div className="loading-text" style={{ backgroundColor: '#fce8e6', color: '#db4437' }}>
                            Error: {error.message}
                        </div>
                    );
                }
                
                setIsLoading(false);
            } catch (error) {
                console.error("Error getting user profile:", error);
                setError("Failed to get user email. Please try again.");
                setIsLoading(false);
            }
        };

        if (window.gapi.client.getToken() === null) {
            // Prompt the user to select a Google Account and ask for consent to share their data
            tokenClient.requestAccessToken({prompt: 'consent'});
        } else {
            // Skip display of account chooser and consent dialog for an existing session
            tokenClient.requestAccessToken({prompt: ''});
        }
    };

    const handleSignOutClick = () => {
        if (window.gapi.client.getToken() !== null) {
            window.google.accounts.oauth2.revoke(window.gapi.client.getToken().access_token);
            window.gapi.client.setToken('');
            setIsAuthorized(false);
            setEmails([]);
            setExtractedTasks([]);
        }
    };

    // Helper function to parse email details
    const parseEmailDetails = (message) => {
        const headers = message.payload.headers;
        const subject = headers.find(header => header.name === "Subject")?.value || "(No Subject)";
        const from = headers.find(header => header.name === "From")?.value || "Unknown Sender";
        const dateStr = headers.find(header => header.name === "Date")?.value || "";
        const date = dateStr ? new Date(dateStr) : new Date();
        
        // Extract more complete message body if available
        let body = message.snippet || "";
        
        // Try to get the full message body if available
        if (message.payload.parts && message.payload.parts.length > 0) {
            // Look for text/plain parts first
            const textPart = message.payload.parts.find(part => part.mimeType === 'text/plain');
            if (textPart && textPart.body && textPart.body.data) {
                try {
                    // Decode the base64 encoded body
                    const decodedBody = atob(textPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                    body = decodedBody;
                } catch (e) {
                    console.log("Could not decode email body", e);
                }
            } else {
                // If no text/plain part, try to get HTML part
                const htmlPart = message.payload.parts.find(part => part.mimeType === 'text/html');
                if (htmlPart && htmlPart.body && htmlPart.body.data) {
                    try {
                        // Decode the base64 encoded body
                        const decodedBody = atob(htmlPart.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                        // Remove HTML tags for plain text
                        body = decodedBody.replace(/<[^>]*>?/gm, '');
                    } catch (e) {
                        console.log("Could not decode HTML email body", e);
                    }
                }
            }
        } else if (message.payload.body && message.payload.body.data) {
            // If no parts, try to get body directly
            try {
                // Decode the base64 encoded body
                const decodedBody = atob(message.payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
                body = decodedBody;
            } catch (e) {
                console.log("Could not decode direct email body", e);
            }
        }
        
        // Clean up the from field to show just the name or email
        let cleanFrom = from;
        if (from.includes('<')) {
            const match = from.match(/(.*?)\s*<.*>/);
            if (match && match[1]) {
                cleanFrom = match[1].trim();
            } else {
                cleanFrom = from.replace(/<|>/g, '');
            }
        }
        
        return {
            id: message.id,
            subject: subject,
            from: cleanFrom,
            date: date,
            snippet: body,
            originalFrom: from // Keep original for reference
        };
    };

    // Helper function to create a serializable email object
    const createSerializableEmail = (email) => {
        return {
            id: email.id,
            subject: email.subject || '(No Subject)',
            from: email.from || 'Unknown Sender',
            snippet: email.snippet || '',
            date: typeof email.date === 'object' ? email.date.toISOString() : email.date || new Date().toISOString()
        };
    };

    // Fetch emails from Gmail
    const fetchEmails = async () => {
        try {
            setIsLoading(true);
            setError("");
            
            if (!window.gapi || !window.gapi.client || !window.gapi.client.gmail) {
                console.error("Gmail API not loaded");
                setError("Gmail API not loaded. Please try again.");
                setIsLoading(false);
                return false;
            }
            
            console.log('Fetching emails...');
            setError("Step 1/4: Fetching emails from Gmail...");
            
            const response = await window.gapi.client.gmail.users.messages.list({
                'userId': 'me',
                'maxResults': 10, // Fetch 10 emails
                'q': 'in:inbox' // Only fetch inbox emails
            });
            
            if (!response || !response.result || !response.result.messages) {
                console.log('No emails found');
                setEmails([]);
                setIsLoading(false);
                setError("No emails found in your Gmail inbox.");
                return false; // Return false if no emails found
            }
            
            console.log(`Found ${response.result.messages.length} emails`);
            
            // Fetch detailed information for each email
            const emailPromises = response.result.messages.map(message => 
                window.gapi.client.gmail.users.messages.get({
                    'userId': 'me',
                    'id': message.id,
                    'format': 'full'
                })
            );
            
            const emailResponses = await Promise.all(emailPromises);
            
            // Create serializable email objects to avoid circular references
            const parsedEmails = emailResponses.map(resp => {
                const emailDetails = parseEmailDetails(resp.result);
                return createSerializableEmail(emailDetails);
            });
            
            console.log('Emails fetched and parsed:', parsedEmails.length);
            setEmails(parsedEmails);
            
            // Add a short delay before automatically scanning for tasks
            setError("Step 2/4: Emails fetched successfully. Preparing for task extraction...");
            await delay(2000);
            
            // Get user email from Gmail profile
            const userInfoResponse = await window.gapi.client.gmail.users.getProfile({
                userId: 'me'
            });
            const userEmail = userInfoResponse.result.emailAddress;
            
            // Automatically scan emails for tasks
            if (parsedEmails.length > 0) {
                console.log('Automatically scanning emails for tasks...');
                await scanEmailsForTasks(userEmail);
            } else {
                setError("No emails found to scan for tasks.");
                setIsLoading(false);
            }
            
            return true;
        } catch (error) {
            console.error('Error fetching emails:', error);
            setError(`Error fetching emails: ${error.message}`);
            setIsLoading(false);
            return false;
        }
    };

    // Process emails using Gemini AI directly
    const extractTasksWithGeminiAI = async (emailsToProcess, userEmail) => {
        try {
            console.log(`Processing ${emailsToProcess.length} emails for task extraction with Gemini AI`);
            
            // Create serializable email objects to avoid circular references
            const serializableEmails = emailsToProcess.map(email => createSerializableEmail(email));
            
            // Combine all emails into one text for analysis
            const combinedEmailText = serializableEmails.map(email => {
                return `
EMAIL FROM: ${email.from}
SUBJECT: ${email.subject}
CONTENT: ${email.snippet}
-------------------`;
            }).join('\n');
            
            console.log('Combined email text for Gemini AI analysis:', combinedEmailText);
            
            // Get current date and time for reference
            const currentDate = new Date();
            const year = currentDate.getFullYear();
            const month = currentDate.getMonth() + 1;
            const day = currentDate.getDate();
            const hours = currentDate.getHours();
            const minutes = currentDate.getMinutes();
            const seconds = currentDate.getSeconds();
            const currentTimeISO = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}T${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}Z`;
            
            // API key for Gemini AI
            const apiKey = 'AIzaSyAbkug1K5m_SydfEaFA3PdeqtO6wESv9Cw';
            
            // Call Gemini AI directly
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
                                    text: `Analyze the following emails and extract task details from them. Output each task as a valid JSON object with the following fields: "title", "description", "category" (one of: Work, Meeting, Study, Personal, Email, Review), "urgency" (on a scale of 1-5, default to 3), "start_at" (ISO 8601, infer, default to "${currentTimeISO}"), "end_at" (ISO 8601, infer, default to start_at + 1 day), and "deadline" (ISO 8601, infer, default to end of today). Enclose each JSON object within a Markdown code block (\`\`\`json ... \`\`\`). Separate each JSON code block by a newline. If no tasks are found in an email, don't create a task for it.

Emails to analyze: ${combinedEmailText}

Current Date and Time (for reference): ${currentTimeISO}`
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
            console.log('Gemini AI response:', data);
            
            if (data && data.candidates && data.candidates.length > 0 && data.candidates[0].content && data.candidates[0].content.parts) {
                const analysisResult = data.candidates[0].content.parts[0].text;
                console.log('Gemini AI analysis result:', analysisResult);
                
                const jsonBlockRegex = /```json\n([\s\S]*?)\n```/g;
                let match;
                const extractedTasks = [];
                
                while ((match = jsonBlockRegex.exec(analysisResult)) !== null) {
                    const jsonString = match[1];
                    try {
                        const taskJSON = JSON.parse(jsonString);
                        
                        // Add user_id to the task - make sure it matches the user in users.json
                        const userId = await getUserIdFromEmail(userEmail);
                        console.log(`Assigning user ID ${userId} to task: ${taskJSON.title}`);
                        taskJSON.user_id = userId;
                        
                        extractedTasks.push(taskJSON);
                    } catch (parseError) {
                        console.error("Error parsing JSON:", parseError, jsonString);
                    }
                }
                
                console.log('Extracted tasks from Gemini AI:', extractedTasks);
                return extractedTasks;
            } else {
                console.error("Could not parse the analysis results from Gemini AI.");
                return [];
            }
        } catch (error) {
            console.error('Error extracting tasks with Gemini AI:', error);
            throw error;
        }
    };
    
    // Enhanced function to extract tasks from a single email
    const extractTaskFromEmail = async (email, userEmail) => {
        try {
            const subject = email.subject.toLowerCase();
            const body = email.snippet.toLowerCase();
            const fullContent = subject + " " + body;
            
            // Enhanced task detection patterns
            const actionPhrases = [
                'task', 'todo', 'to-do', 'to do', 'action item', 'action required', 
                'please complete', 'please finish', 'please do', 'please handle',
                'deadline', 'due by', 'due date', 'by tomorrow', 'by monday', 'by tuesday',
                'by wednesday', 'by thursday', 'by friday', 'asap', 'urgent',
                'important', 'priority', 'follow up', 'review', 'complete',
                'finish', 'submit', 'send', 'prepare', 'create', 'update',
                'check', 'verify', 'confirm', 'schedule', 'arrange', 'organize',
                'call', 'email', 'contact', 'remind', 'remember', 'don\'t forget',
                'exam', 'assignment', 'homework', 'project', 'report', 'presentation',
                'meeting', 'appointment', 'interview', 'session', 'class', 'lecture'
            ];
            
            // Check if email contains action phrases
            const containsActionPhrase = actionPhrases.some(phrase => 
                fullContent.includes(phrase)
            );
            
            // Check for question marks which often indicate requests
            const containsQuestion = fullContent.includes('?');
            
            // Check for urgency indicators
            const urgencyPhrases = {
                5: ['urgent', 'asap', 'as soon as possible', 'immediately', 'right away', 'high priority', 'critical', 'emergency'],
                4: ['important', 'priority', 'soon', 'quickly', 'fast', 'prompt'],
                3: ['need', 'should', 'please', 'required'],
                2: ['when you can', 'at your convenience', 'sometime', 'eventually'],
                1: ['low priority', 'not urgent', 'whenever', 'no rush']
            };
            
            // Determine if this email likely contains a task
            if (containsActionPhrase || (containsQuestion && fullContent.length > 50) || subject.length > 10) {
                // Extract task details
                let taskTitle = email.subject;
                let taskDescription = `From: ${email.from} - ${email.snippet}`;
                
                // Limit description length to avoid overly long tasks
                if (taskDescription.length > 200) {
                    taskDescription = taskDescription.substring(0, 197) + '...';
                }
                
                // Determine urgency level (1-5)
                let urgencyLevel = 3; // Default: Medium priority
                for (const [level, phrases] of Object.entries(urgencyPhrases)) {
                    if (phrases.some(phrase => fullContent.includes(phrase))) {
                        urgencyLevel = parseInt(level);
                        break;
                    }
                }
                
                // Look for potential deadline in the email content
                let deadline = "";
                
                // Check for ISO dates YYYY-MM-DD
                const isoDateRegex = /\b(\d{4}-\d{2}-\d{2})\b/g;
                const isoMatches = fullContent.match(isoDateRegex);
                
                if (isoMatches && isoMatches.length > 0) {
                    deadline = isoMatches[0]; // Use the first ISO date found
                } else {
                    // Check for other date formats MM/DD/YYYY or DD/MM/YYYY
                    const dateRegex = /\b(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4})\b/g;
                    const dateMatches = fullContent.match(dateRegex);
                    
                    if (dateMatches && dateMatches.length > 0) {
                        try {
                            const dateParts = dateMatches[0].split(/[\/\-]/);
                            // Assuming MM/DD/YYYY format
                            if (dateParts.length === 3) {
                                const month = parseInt(dateParts[0]) - 1; // JS months are 0-indexed
                                const day = parseInt(dateParts[1]);
                                let year = parseInt(dateParts[2]);
                                
                                // Handle 2-digit years
                                if (year < 100) {
                                    year += 2000;
                                }
                                
                                deadline = new Date(year, month, day).toISOString().split('T')[0];
                            }
                        } catch (e) {
                            console.log("Could not parse date", e);
                        }
                    }
                }
                
                // Also look for common date phrases
                const datePhrases = {
                    'tomorrow': 1,
                    'next monday': getNextDayOfWeek(1),
                    'next tuesday': getNextDayOfWeek(2),
                    'next wednesday': getNextDayOfWeek(3),
                    'next thursday': getNextDayOfWeek(4),
                    'next friday': getNextDayOfWeek(5),
                    'next week': 7,
                    'in two days': 2,
                    'in 2 days': 2,
                    'in three days': 3,
                    'in 3 days': 3,
                    'next month': 30
                };
                
                if (!deadline) {
                    for (const [phrase, days] of Object.entries(datePhrases)) {
                        if (fullContent.includes(phrase)) {
                            const date = new Date();
                            if (typeof days === 'number') {
                                date.setDate(date.getDate() + days);
                            } else {
                                date.setDate(date.getDate() + days);
                            }
                            deadline = date.toISOString().split('T')[0];
                            break;
                        }
                    }
                }
                
                // Determine category based on content
                let category = "Email";
                const categoryPatterns = {
                    'Meeting': ['meeting', 'call', 'conference', 'zoom', 'teams', 'discuss', 'talk', 'conversation'],
                    'Work': ['report', 'document', 'presentation', 'project', 'task', 'assignment', 'work'],
                    'Study': ['study', 'exam', 'test', 'quiz', 'homework', 'assignment', 'class', 'course', 'lecture', 'pfa'],
                    'Review': ['review', 'feedback', 'check', 'evaluate', 'assess'],
                    'Personal': ['personal', 'family', 'friend', 'home', 'house', 'apartment']
                };
                
                for (const [cat, patterns] of Object.entries(categoryPatterns)) {
                    if (patterns.some(pattern => fullContent.includes(pattern))) {
                        category = cat;
                        break;
                    }
                }
                
                // Set start and end times
                const now = new Date();
                const tomorrow = new Date(now);
                tomorrow.setDate(tomorrow.getDate() + 1);
                
                // Get user ID for the task
                let userId = await getUserIdFromEmail(userEmail) || "1";
                
                // Create task object with the enhanced format
                return {
                    title: taskTitle,
                    description: taskDescription,
                    category: category,
                    urgency: String(urgencyLevel),
                    deadline: deadline,
                    start_at: now.toISOString(),
                    end_at: tomorrow.toISOString(),
                    user_id: userId
                };
            }
            
            return null; // No task found in this email
        } catch (error) {
            console.error('Error extracting task from email:', error);
            return null;
        }
    };
    
    const scanEmailsForTasks = async (userEmail = null) => {
        console.log(`Starting email scan with ${emails.length} emails`);
        try {
            setIsScanning(true);
            setExtractedTasks([]);
            setError(""); // Clear any previous errors
            
            // Step 1: Check if we have emails
            if (emails.length === 0) {
                // Try to fetch emails first if none are available
                console.log('No emails to scan, attempting to fetch emails first...');
                const fetchSuccess = await fetchEmails();
                // Wait 3 seconds after fetching emails
                await delay(3000);
                
                if (!fetchSuccess || emails.length === 0) {
                    setError("No emails to scan");
                    setIsScanning(false);
                    return false;
                }
            }
            
            // Step 2: Get the latest 5 emails to process
            const emailsToProcess = emails.slice(0, 5);
            console.log(`Processing the latest ${emailsToProcess.length} emails with Gemini AI`);
            setError("Step 1/3: Preparing emails for analysis...");
            await delay(3000); // Wait 3 seconds before proceeding to extraction
            
            try {
                // Step 3: Extract tasks using Gemini AI
                setError("Step 2/3: Analyzing emails with Gemini AI...");
                const tasks = await extractTasksWithGeminiAI(emailsToProcess, userEmail);
                await delay(3000); // Wait 3 seconds after extraction
                
                if (tasks.length === 0) {
                    console.log('No tasks found in emails by Gemini AI');
                    setError("No tasks found in the scanned emails");
                    setIsScanning(false);
                    return false;
                } 
                
                console.log(`Extracted ${tasks.length} tasks using Gemini AI`);
                
                // Step 4: Save the extracted tasks to the server
                try {
                    setError("Step 3/3: Saving extracted tasks...");
                    
                    // Save tasks directly to tasks.json using axios like in App.js
                    const saveResponse = await axios.post('http://localhost:3001/api/tasks', { tasks: tasks });
                    
                    await delay(3000); // Wait 3 seconds after saving
                    
                    if (!saveResponse.data.success) {
                        throw new Error(`Failed to save tasks: ${saveResponse.status}`);
                    }
                    
                    console.log('Tasks saved successfully:', saveResponse.data);
                    
                    console.log('Tasks extracted with Gemini AI:', tasks);
                    setExtractedTasks(tasks);
                    setError(""); // Clear error message on success
                    
                    // Pass the user email along with the tasks
                    if (safeOnExtractTasks) {
                        await safeOnExtractTasks(tasks, userEmail);
                    }
                    
                    setIsScanning(false);
                    return true;
                } catch (saveError) {
                    console.error('Error saving tasks:', saveError);
                    setError(`Error saving tasks: ${saveError.message}`);
                    setIsScanning(false);
                    return false;
                }
            } catch (aiError) {
                console.error('Error with Gemini AI task extraction:', aiError);
                setError(`Error extracting tasks: ${aiError.message}`);
                setIsScanning(false);
                return false;
            }
        } catch (error) {
            console.error("Error scanning emails:", error);
            setError("Failed to scan emails for tasks");
            setIsScanning(false);
            return false;
        }
    };
    
    // Helper function to get the next occurrence of a specific day of the week
    const getNextDayOfWeek = (dayOfWeek) => {
        const today = new Date();
        const targetDay = today.getDay() < dayOfWeek ? 
            dayOfWeek - today.getDay() : 
            7 + dayOfWeek - today.getDay();
        return targetDay;
    };
    
    // Helper function to get user ID from email
    const getUserIdFromEmail = async (email) => {
        try {
            // Default to user ID 1 if no email
            if (!email) return "1";
            
            console.log('Getting user ID for email:', email);
            
            // Call the API to get user by email
            const response = await axios.get(`http://localhost:3001/api/users?email=${encodeURIComponent(email)}`);
            
            console.log('User API response:', response.data);
            
            if (response.data && response.data.length > 0) {
                console.log(`Found user ID ${response.data[0].id} for email ${email}`);
                return response.data[0].id;
            }
            
            // If user not found, create a new user
            console.log('User not found, creating new user for:', email);
            const createResponse = await axios.post('http://localhost:3001/api/users', { email });
            
            if (createResponse.data && createResponse.data.id) {
                console.log('Created new user with ID:', createResponse.data.id);
                return createResponse.data.id;
            }
            
            console.log('Defaulting to user ID 1');
            return "1"; // Default to user ID 1 if user creation fails
        } catch (error) {
            console.error('Error getting user ID:', error);
            return "1"; // Default to user ID 1 on error
        }
    };

    // Render the component
    return (
        <div className="gmail-task-extractor">
            <h2>Gmail Task Extractor</h2>
            {(isLoading || isScanning) && (
                <div className="main-loading-indicator">
                    <div className="loading-spinner-large"></div>
                    <div className="loading-status">{error}</div>
                </div>
            )}
            
            {!apiInitialized ? (
                <div className="loading-api">
                    <p>Loading Google API...</p>
                </div>
            ) : !isAuthorized ? (
                <div className="auth-section">
                    <p>Sign in with your Google account to extract tasks from your Gmail.</p>
                    <button 
                        className="gmail-button" 
                        onClick={handleAuthClick}
                        disabled={isLoading}
                    >
                        {isLoading ? "Signing in..." : "Sign in with Gmail"}
                    </button>
                    {authError && <p className="error-message">{authError}</p>}
                </div>
            ) : (
                <div className="gmail-container">
                    <div className="gmail-header">
                        <div className="gmail-actions">
                            <button 
                                className="gmail-button" 
                                onClick={fetchEmails}
                                disabled={isLoading || isScanning}
                            >
                                Fetch Emails & Extract Tasks
                            </button>
                            <button 
                                className="gmail-button" 
                                onClick={handleSignOutClick}
                                disabled={isLoading || isScanning}
                            >
                                Sign Out
                            </button>
                        </div>
                    
                    <div className="gmail-content">
                        <div className="gmail-column">
                            {emails.length > 0 ? (
                                <div className="email-list">
                                    <h3>Latest Emails ({emails.length})</h3>
                                    {emails.map((email, index) => (
                                        <div key={index} className="email-item">
                                            <div className="email-header">
                                                <span className="email-from">{email.from}</span>
                                                <span className="email-date">{formatDate(new Date(email.date))}</span>
                                            </div>
                                            <div className="email-subject">{email.subject}</div>
                                            <div className="email-snippet">{email.snippet}</div>
                                        </div>
                                    ))}
                                </div>
                            ) : !isLoading && (
                                <div className="no-emails-message">
                                    <p>No emails found. Click "Refresh Emails" to try again.</p>
                                </div>
                            )}
                        </div>
                        
                        <div className="gmail-column">
                            {extractedTasks.length > 0 ? (
                                <div className="extracted-tasks">
                                    <h3>Extracted Tasks ({extractedTasks.length})</h3>
                                    <div className="task-list">
                                        {extractedTasks.map((task, index) => (
                                            <div key={index} className="task-card">
                                                <div className="task-title">{task.title}</div>
                                                <div className="task-description">{task.description}</div>
                                                <div className="task-details">
                                                    <span className="task-category">{task.category}</span>
                                                    <span className="task-urgency" style={{ backgroundColor: getUrgencyColor(task.urgency) }}>
                                                        {getUrgencyLabel(task.urgency)}
                                                    </span>
                                                    <span className="task-deadline">
                                                        {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ) : !isScanning && (
                                <div className="no-tasks-message">
                                    <p>No tasks have been extracted yet. Click "Scan Emails for Tasks" to analyze your emails.</p>
                                </div>
                            )}
                        </div>
                    </div>
                    </div>
                </div>
            )}
        </div>
    );
};

// Helper function to format date
const formatDate = (date) => {
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
        // Today's email
        return `Today, ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
        // Yesterday's email
        return `Yesterday, ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    } else {
        // Older emails
        const options = { month: 'short', day: 'numeric' };
        if (date.getFullYear() !== today.getFullYear()) {
            options.year = 'numeric';
        }
        return `${date.toLocaleDateString(undefined, options)}, ${date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`;
    }
};

// Helper function to get urgency label
const getUrgencyLabel = (urgency) => {
    const level = parseInt(urgency) || 3;
    switch(level) {
        case 5: return 'Critical';
        case 4: return 'High';
        case 3: return 'Medium';
        case 2: return 'Low';
        case 1: return 'Minimal';
        default: return 'Medium';
    }
};

// Helper function to get urgency color
const getUrgencyColor = (urgency) => {
    const level = parseInt(urgency) || 3;
    switch(level) {
        case 5: return '#DB4437'; // Red - Critical
        case 4: return '#F4B400'; // Orange/Yellow - High
        case 3: return '#4285F4'; // Blue - Medium
        case 2: return '#0F9D58'; // Green - Low
        case 1: return '#9E9E9E'; // Grey - Minimal
        default: return '#4285F4'; // Blue - Default
    }
};

export default GmailTaskExtractor;
