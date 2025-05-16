// src/TaskList.js
import React, { useState } from 'react';

function TaskList({ tasks }) {
    const [sortBy, setSortBy] = useState('deadline');
    const [filterCategory, setFilterCategory] = useState('all');

    if (!tasks || tasks.length === 0) {
        return (
            <div className="empty-state">
                <h2>Task Breakdown</h2>
                <div className="empty-state-content">
                    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M9 5H7C5.89543 5 5 5.89543 5 7V19C5 20.1046 5.89543 21 7 21H17C18.1046 21 19 20.1046 19 19V7C19 5.89543 18.1046 5 17 5H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M9 5C9 3.89543 9.89543 3 11 3H13C14.1046 3 15 3.89543 15 5V7H9V5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                        <path d="M9 12L11 14L15 10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <p>No tasks organized yet. Enter some text above to extract tasks.</p>
                </div>
            </div>
        );
    }

    // Get unique categories for filter
    const categories = ['all', ...new Set(tasks.map(task => task.category || 'General'))];

    // Filter tasks by category
    const filteredTasks = filterCategory === 'all' 
        ? tasks 
        : tasks.filter(task => (task.category || 'General') === filterCategory);

    // Sort tasks
    const sortedTasks = [...filteredTasks].sort((a, b) => {
        if (sortBy === 'urgency') {
            return (parseInt(b.urgency) || 3) - (parseInt(a.urgency) || 3);
        } else if (sortBy === 'deadline') {
            return new Date(a.deadline || 0) - new Date(b.deadline || 0);
        } else if (sortBy === 'title') {
            return (a.title || '').localeCompare(b.title || '');
        }
        return 0;
    });

    // Get urgency color
    const getUrgencyColor = (urgency) => {
        const level = parseInt(urgency) || 3;
        switch(level) {
            case 5: return 'var(--error-color)';
            case 4: return 'var(--warning-color)';
            case 3: return 'var(--primary-color)';
            case 2: return 'var(--secondary-color)';
            case 1: return 'var(--success-color)';
            default: return 'var(--primary-color)';
        }
    };

    // Get urgency label
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

    return (
        <div className="task-list-container">
            <div className="task-list-header">
                <h2>Task Breakdown</h2>
                <div className="task-controls">
                    <div className="filter-control">
                        <label htmlFor="category-filter">Category:</label>
                        <select 
                            id="category-filter" 
                            value={filterCategory} 
                            onChange={(e) => setFilterCategory(e.target.value)}
                        >
                            {categories.map(category => (
                                <option key={category} value={category}>
                                    {category === 'all' ? 'All Categories' : category}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="sort-control">
                        <label htmlFor="sort-by">Sort by:</label>
                        <select 
                            id="sort-by" 
                            value={sortBy} 
                            onChange={(e) => setSortBy(e.target.value)}
                        >
                            <option value="deadline">Deadline (Earliest)</option>
                            <option value="urgency">Urgency (Highest)</option>
                            <option value="title">Title (A-Z)</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="task-count">
                Showing {sortedTasks.length} of {tasks.length} tasks
            </div>

            <div className="task-grid">
                {sortedTasks.map((task, index) => (
                    <div key={index} className="task-card">
                        <div 
                            className="task-urgency-indicator" 
                            style={{ backgroundColor: getUrgencyColor(task.urgency) }}
                        ></div>
                        <div className="task-card-content">
                            <div className="task-title">{task.title || 'Untitled Task'}</div>
                            <div className="task-description">{task.description || 'No description provided.'}</div>
                            
                            <div className="task-meta">
                                <div className="task-category">{task.category || 'General'}</div>
                                <div className="task-urgency" style={{ color: getUrgencyColor(task.urgency) }}>
                                    {getUrgencyLabel(task.urgency)}
                                </div>
                            </div>
                            
                            <div className="task-times">
                                <div className="task-time-item">
                                    <span className="task-time-label">Start:</span>
                                    <span className="time-display">{formatISODateTime(task.start_at)}</span>
                                </div>
                                <div className="task-time-item">
                                    <span className="task-time-label">End:</span>
                                    <span className="time-display">{formatISODateTime(task.end_at)}</span>
                                </div>
                                <div className="task-time-item deadline">
                                    <span className="task-time-label">Deadline:</span>
                                    <span className="time-display">{formatISODateTime(task.deadline)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            <style jsx>{`
                .task-list-container {
                    margin-top: 2rem;
                }
                
                .task-list-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 1.5rem;
                    flex-wrap: wrap;
                    gap: 1rem;
                }
                
                .task-controls {
                    display: flex;
                    gap: 1rem;
                    flex-wrap: wrap;
                }
                
                .filter-control, .sort-control {
                    display: flex;
                    align-items: center;
                    gap: 0.5rem;
                }
                
                select {
                    padding: 0.5rem;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius);
                    background-color: var(--bg-secondary);
                    font-size: 0.9rem;
                    min-width: 150px;
                }
                
                .task-count {
                    font-size: 0.9rem;
                    color: var(--text-light);
                    margin-bottom: 1rem;
                }
                
                .task-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
                    gap: 1.5rem;
                }
                
                .task-card {
                    display: flex;
                    background-color: var(--bg-primary);
                    border-radius: var(--border-radius);
                    overflow: hidden;
                    box-shadow: var(--shadow-sm);
                    transition: var(--transition);
                    height: 100%;
                }
                
                .task-card:hover {
                    transform: translateY(-3px);
                    box-shadow: var(--shadow-md);
                }
                
                .task-urgency-indicator {
                    width: 8px;
                    background-color: var(--primary-color);
                }
                
                .task-card-content {
                    padding: 1.25rem;
                    flex: 1;
                    display: flex;
                    flex-direction: column;
                }
                
                .task-title {
                    font-weight: 600;
                    font-size: 1.1rem;
                    margin-bottom: 0.5rem;
                    color: var(--text-primary);
                }
                
                .task-description {
                    color: var(--text-secondary);
                    margin-bottom: 1rem;
                    font-size: 0.95rem;
                    flex: 1;
                }
                
                .task-meta {
                    display: flex;
                    justify-content: space-between;
                    margin-bottom: 1rem;
                }
                
                .task-category {
                    font-size: 0.85rem;
                    background-color: var(--bg-tertiary);
                    padding: 0.25rem 0.5rem;
                    border-radius: 4px;
                }
                
                .task-urgency {
                    font-size: 0.85rem;
                    font-weight: 600;
                }
                
                .task-times {
                    border-top: 1px solid var(--border-color);
                    padding-top: 0.75rem;
                    font-size: 0.9rem;
                }
                
                .task-time-item {
                    margin-bottom: 0.5rem;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .task-time-item.deadline {
                    font-weight: 500;
                }
                
                .task-time-label {
                    color: var(--text-light);
                    min-width: 70px;
                }
                
                .empty-state {
                    margin-top: 2rem;
                }
                
                .empty-state-content {
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    padding: 3rem;
                    background-color: var(--bg-primary);
                    border-radius: var(--border-radius);
                    box-shadow: var(--shadow-sm);
                    text-align: center;
                }
                
                .empty-state-content svg {
                    color: var(--text-light);
                    margin-bottom: 1rem;
                }
                
                .empty-state-content p {
                    color: var(--text-secondary);
                    max-width: 400px;
                }
                
                @media (max-width: 768px) {
                    .task-list-header {
                        flex-direction: column;
                        align-items: flex-start;
                    }
                    
                    .task-controls {
                        width: 100%;
                    }
                    
                    .filter-control, .sort-control {
                        flex: 1;
                    }
                    
                    select {
                        flex: 1;
                    }
                    
                    .task-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>
        </div>
    );
}

function formatISODateTime(isoString) {
    if (!isoString) return 'N/A';
    try {
        const date = new Date(isoString);
        const options = {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
            timeZoneName: 'short'
        };
        return date.toLocaleDateString(undefined, options);
    } catch (error) {
        console.error("Error formatting date:", error, isoString);
        return isoString; // Return the original if formatting fails
    }
}

export default TaskList;