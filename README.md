# AI Task Planner

## Project Overview

AI Task Planner is a sophisticated task management application that leverages artificial intelligence to automate task extraction from Gmail emails and text inputs. The system provides a comprehensive suite of features for task management, including calendar views, notifications, and user authentication, all built on a modern web architecture using React for the frontend and Express.js for the backend.

![AI Task Planner Screenshot](https://via.placeholder.com/800x450.png?text=AI+Task+Planner+Screenshot)

## Features

### Gmail Integration
- **Email Scanning**: Connects to Gmail via OAuth2 authentication to scan emails for potential tasks
- **AI Task Extraction**: Uses Google's Generative AI (Gemini) to analyze email content and automatically extract tasks
- **Duplicate Prevention**: Maintains a scan history to prevent processing the same emails multiple times
- **Auto-Scanning**: Periodically scans for new emails to keep tasks up-to-date

### Task Management
- **Task Creation**: Create tasks manually through text input or automatically from emails
- **Task Properties**: Each task includes title, description, category, urgency level, start/end times, and deadlines
- **Task Editing**: Update task details including title, description, and scheduling information
- **Task Deletion**: Remove tasks with confirmation to prevent accidental deletion

### Calendar Views
- **Month View**: Traditional calendar grid showing tasks by day
- **Week View**: Detailed weekly schedule with time slots
- **Day View**: Hour-by-hour breakdown of daily tasks
- **Navigation**: Easily move between time periods (previous/next/today)

### Notification System
- **New Task Notifications**: Alerts when new tasks are added from emails or text
- **Reminder Notifications**: Timely alerts for upcoming tasks (10 minutes, 1 hour, 1 day before)
- **Notification Management**: Mark notifications as read/unread
- **User-specific Notifications**: Notifications are tied to specific user accounts

### User Authentication
- **Gmail Authentication**: Sign in with Google account
- **User Management**: Create and manage user profiles
- **Session Management**: Maintain user sessions with proper logout functionality

### Data Import/Export
- **Export Tasks**: Download current tasks as JSON files
- **Import Tasks**: Upload and merge task data from JSON files

## System Architecture

### Frontend (React)
The frontend is built using React.js with functional components and hooks for state management. Key components include:

1. **App.js**: The main application component that:
   - Manages global state (tasks, users, notifications)
   - Handles routing between different views
   - Coordinates data flow between components
   - Manages API communication with the backend

2. **GmailTaskExtractor.js**: Handles Gmail integration:
   - Implements OAuth2 authentication with Google
   - Fetches emails using Gmail API
   - Processes emails with Gemini AI
   - Manages scan history to prevent duplicates
   - Implements auto-scanning functionality

3. **TaskCalendar.js**: Provides calendar visualization:
   - Supports month, week, and day views
   - Renders tasks based on start/end times
   - Implements navigation between time periods
   - Color-codes tasks based on urgency

4. **TaskList.js**: Displays tasks in list format:
   - Supports sorting and filtering
   - Provides interfaces for editing and deleting tasks
   - Shows task details including deadlines and urgency

5. **TaskInput.js**: Handles manual task creation:
   - Text input for task description
   - AI-powered analysis to extract task properties
   - Form validation and submission

6. **Notifications.js**: Manages notification display:
   - Shows new task notifications
   - Displays task reminders
   - Supports marking notifications as read

### Backend (Express.js)
The backend server is built with Express.js and provides RESTful API endpoints for all application functions:

1. **Task Management API**:
   - `GET /api/tasks`: Retrieve tasks (filtered by user_id)
   - `POST /api/tasks`: Create new tasks
   - `PUT /api/tasks/:index`: Update existing tasks
   - `DELETE /api/tasks/:index`: Delete tasks

2. **User Management API**:
   - `GET /api/users`: List all users
   - `GET /api/users/:id`: Get specific user
   - `POST /api/users`: Create new user
   - `PUT /api/users/:id`: Update user information

3. **Notification API**:
   - `GET /api/notifications`: Get notifications (filtered by user_id)
   - `POST /api/notifications`: Create new notifications
   - `PUT /api/notifications/:id`: Update notification status

4. **Scan History API**:
   - `GET /api/scans`: Get scan history
   - `POST /api/scans`: Update scan history
   - `GET /api/scans/check`: Check if email has been scanned

5. **AI Integration**:
   - Uses Google's Generative AI (Gemini) for task extraction
   - Processes email content and text input
   - Generates structured task data with appropriate properties

## Database Structure

The application uses a file-based JSON database with four primary data stores:

### 1. tasks.json
Stores all user tasks with the following structure:
```json
[
  {
    "title": "Review LinkedIn Invitation",
    "description": "Sami Reb has sent a LinkedIn connection request.",
    "category": "Email",
    "urgency": 2,
    "start_at": "2025-05-17T22:09:55Z",
    "end_at": "2025-05-18T22:09:55Z",
    "deadline": "2025-05-17T23:59:59Z",
    "user_id": "1"
  }
]
```

**Field Descriptions**:
- `title`: Task name/title (string)
- `description`: Detailed task description (string)
- `category`: Task category (string: "Email", "Review", "Meeting", etc.)
- `urgency`: Priority level (number: 1-5, where 5 is highest)
- `start_at`: Task start time (ISO 8601 datetime string)
- `end_at`: Task end time (ISO 8601 datetime string)
- `deadline`: Task due date (ISO 8601 datetime string)
- `user_id`: Associated user identifier (string)

### 2. users.json
Stores user account information:
```json
[
  {
    "id": "1",
    "username": "default_user",
    "email": "user@example.com",
    "created_at": "2025-05-17T21:00:00.000Z"
  }
]
```

**Field Descriptions**:
- `id`: Unique user identifier (string)
- `username`: User's display name (string)
- `email`: User's email address (string)
- `created_at`: Account creation timestamp (ISO 8601 datetime string)

### 3. notifications.json
Stores system notifications and reminders:
```json
[
  {
    "id": "new-task-Review LinkedIn Invitation-1747516211317",
    "title": "New Task Added",
    "message": "\"Review LinkedIn Invitation\" has been added to your tasks",
    "type": "new-task",
    "time": "2025-05-17T21:10:11.318Z",
    "read": true,
    "user_id": "1"
  },
  {
    "id": "Review LinkedIn Invitation-1hour-1747516211320",
    "title": "Upcoming Task Soon",
    "message": "Task \"Review LinkedIn Invitation\" starts in about 1 hour",
    "type": "reminder",
    "reminderTime": "1hour",
    "time": "2025-05-17T21:10:11.321Z",
    "read": true,
    "user_id": "1"
  }
]
```

**Field Descriptions**:
- `id`: Unique notification identifier (string)
- `title`: Notification title (string)
- `message`: Notification content (string)
- `type`: Notification type (string: "new-task", "reminder")
- `reminderTime`: For reminder notifications, specifies timing (string: "10min", "1hour", "1day")
- `time`: Notification creation timestamp (ISO 8601 datetime string)
- `read`: Read status (boolean)
- `user_id`: Associated user identifier (string)

### 4. scans.json
Tracks email scan history to prevent duplicate processing:
```json
{
  "lastScanTime": "2025-05-17T21:10:13.659Z",
  "scannedEmails": [
    {
      "id": "196dff25834970db",
      "subject": "I want to connect",
      "from": "Sami Reb",
      "scannedAt": "2025-05-17T21:10:11.144Z"
    }
  ]
}
```

**Field Descriptions**:
- `lastScanTime`: Timestamp of most recent scan (ISO 8601 datetime string)
- `scannedEmails`: Array of processed emails
  - `id`: Unique email identifier from Gmail (string)
  - `subject`: Email subject line (string)
  - `from`: Sender name/email (string)
  - `scannedAt`: Processing timestamp (ISO 8601 datetime string)

## Data Flow and Relationships

### Entity Relationships
1. **User to Tasks**: One-to-many relationship
   - Each user can have multiple tasks
   - Tasks are associated with users via the `user_id` field

2. **User to Notifications**: One-to-many relationship
   - Each user receives multiple notifications
   - Notifications are associated with users via the `user_id` field

3. **Tasks to Notifications**: One-to-many relationship
   - Each task can generate multiple notifications (new task, reminders)
   - Task information is embedded in notification content

4. **User to Scanned Emails**: One-to-many relationship
   - Each user's Gmail account provides emails for scanning
   - Scan history is maintained to prevent duplicate processing

## Installation and Setup

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)
- Google API credentials (for Gmail and Generative AI access)

### Installation Steps

1. Clone the repository
```bash
git clone https://github.com/yourusername/ai-task-planner.git
cd ai-task-planner
```

2. Install dependencies
```bash
npm install
```

3. Set up Google API credentials
   - Create a project in Google Cloud Console
   - Enable Gmail API and Generative AI API
   - Create OAuth 2.0 credentials
   - Set up authorized JavaScript origins and redirect URIs

4. Configure the application
   - Update the API keys in `App.js` and `server.js`

5. Start the backend server
```bash
node server.js
```

6. Start the frontend development server
```bash
npm start
```

7. Access the application at http://localhost:3000

## Usage

### Connecting to Gmail
1. Click the "Connect Gmail" button
2. Sign in with your Google account
3. Grant the required permissions

### Scanning Emails for Tasks
1. After connecting to Gmail, click "Fetch Emails & Extract Tasks"
2. The application will scan your recent emails and extract tasks
3. Extracted tasks will appear in the task list

### Creating Tasks Manually
1. Navigate to the "Task List" tab
2. Enter task details in the text input field
3. Click "Analyze" to let AI extract task properties
4. Review and confirm the task details

### Managing Tasks
1. View tasks in the "Task List" or "Calendar View"
2. Edit tasks by clicking on them in the list view
3. Delete tasks using the delete button

### Viewing Notifications
1. Notifications appear in the header area
2. Click on a notification to mark it as read
3. Task reminders will appear automatically based on task start times

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Google for providing the Gmail API and Generative AI API
- React team for the amazing frontend framework
- Express.js team for the powerful backend framework
