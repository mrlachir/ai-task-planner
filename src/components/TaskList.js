// src/TaskList.js
import React from 'react';

function TaskList({ tasks }) {
    if (!tasks || tasks.length === 0) {
        return <p>No tasks organized yet.</p>;
    }

    return (
        <div>
            <h2>Task Breakdown</h2>
            {tasks.map((task, index) => (
                <div key={index} className="task-item">
                    <strong>Task {index + 1}:</strong><br />
                    <strong>Title:</strong> {task.title || 'N/A'}<br />
                    <strong>Description:</strong> {task.description || 'N/A'}<br />
                    <strong>Category:</strong> {task.category || 'General'}<br />
                    <strong>Urgency:</strong> {task.urgency || '3'}<br />
                    <strong>Start At:</strong> <span className="time-display">{formatISODateTime(task.start_at)}</span><br />
                    <strong>End At:</strong> <span className="time-display">{formatISODateTime(task.end_at)}</span><br />
                    <strong>Deadline:</strong> <span className="time-display">{formatISODateTime(task.deadline)}</span><br />
                </div>
            ))}
        </div>
    );
}

function formatISODateTime(isoString) {
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        const options = {
            year: 'numeric', month: 'long', day: 'numeric',
            hour: '2-digit', minute: '2-digit', second: '2-digit',
            timeZoneName: 'short'
        };
        return date.toLocaleDateString(undefined, options);
    } catch (error) {
        console.error("Error formatting date:", error, isoString);
        return isoString; // Return the original if formatting fails
    }
}

export default TaskList;