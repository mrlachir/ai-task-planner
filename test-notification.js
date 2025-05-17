const fs = require('fs');
const path = require('path');

// Define paths
const dbDir = path.join(__dirname, 'src', 'db');
const notificationsFilePath = path.join(dbDir, 'notifications.json');

// Create a test notification
const testNotification = {
    id: `test-notification-${Date.now()}`,
    title: 'Test Notification',
    message: 'This is a test notification',
    type: 'test',
    time: new Date().toISOString(),
    read: false,
    user_id: '1'
};

// Ensure notifications.json file exists
if (!fs.existsSync(notificationsFilePath)) {
    console.log(`Creating notifications file at: ${notificationsFilePath}`);
    fs.writeFileSync(notificationsFilePath, '[]', 'utf8');
}

// Read existing notifications
let notifications = [];
try {
    const notificationsData = fs.readFileSync(notificationsFilePath, 'utf8');
    console.log(`Read notifications data: ${notificationsData}`);
    notifications = JSON.parse(notificationsData || '[]');
    console.log(`Loaded ${notifications.length} existing notifications`);
} catch (parseError) {
    console.error(`Error parsing notifications JSON: ${parseError.message}`);
    console.log('Resetting to empty array');
    fs.writeFileSync(notificationsFilePath, '[]', 'utf8');
}

// Add the test notification
notifications.push(testNotification);

// Write the updated notifications back to the file
try {
    fs.writeFileSync(notificationsFilePath, JSON.stringify(notifications, null, 2), 'utf8');
    console.log(`Successfully added test notification to ${notificationsFilePath}`);
    console.log(`Total notifications: ${notifications.length}`);
} catch (writeError) {
    console.error(`Error writing notifications: ${writeError.message}`);
}
