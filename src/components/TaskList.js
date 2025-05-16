// src/TaskList.js
import React, { useState, useEffect } from 'react';

function TaskList({ tasks, onUpdateTask, onDeleteTask }) {
    const [editingTask, setEditingTask] = useState(null);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editFormData, setEditFormData] = useState({});
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [taskToDelete, setTaskToDelete] = useState(null);
    const [sortBy, setSortBy] = useState('deadline');
    const [filterCategory, setFilterCategory] = useState('all');
    
    // Handle edit button click
    const handleEditClick = (task, index) => {
        setEditingTask({ ...task, index });
        setEditFormData({ ...task });
        setShowEditModal(true);
    };
    
    // Handle form field changes
    const handleEditFormChange = (e) => {
        const { name, value } = e.target;
        setEditFormData(prev => ({
            ...prev,
            [name]: value
        }));
    };
    
    // Handle form submission
    const handleEditSubmit = (e) => {
        e.preventDefault();
        
        // Convert datetime-local input values to ISO strings
        const updatedTask = {
            ...editFormData,
            start_at: convertLocalToISO(editFormData.start_at),
            end_at: convertLocalToISO(editFormData.end_at),
            deadline: convertLocalToISO(editFormData.deadline),
            urgency: parseInt(editFormData.urgency) || 3
        };
        
        if (onUpdateTask) {
            onUpdateTask(editingTask.index, updatedTask);
        }
        
        setShowEditModal(false);
    };
    
    // Handle delete button click
    const handleDeleteClick = (task, index) => {
        setTaskToDelete({ ...task, index });
        setShowDeleteConfirm(true);
    };
    
    // Confirm task deletion
    const confirmDelete = () => {
        if (onDeleteTask && taskToDelete) {
            onDeleteTask(taskToDelete.index);
        }
        setShowDeleteConfirm(false);
    };

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
                            
                            <div className="task-actions">
                                <button 
                                    className="task-action-btn edit-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleEditClick(task, index);
                                    }}
                                >
                                    <i className="fas fa-edit"></i> Edit
                                </button>
                                <button 
                                    className="task-action-btn delete-btn"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteClick(task, index);
                                    }}
                                >
                                    <i className="fas fa-trash-alt"></i> Delete
                                </button>
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

            {/* Edit Task Modal */}
            {showEditModal && (
                <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Edit Task</h3>
                            <button className="modal-close" onClick={() => setShowEditModal(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <form onSubmit={handleEditSubmit}>
                                <div className="form-group">
                                    <label htmlFor="edit-title">Title</label>
                                    <input
                                        id="edit-title"
                                        type="text"
                                        name="title"
                                        value={editFormData.title || ''}
                                        onChange={handleEditFormChange}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="edit-description">Description</label>
                                    <textarea
                                        id="edit-description"
                                        name="description"
                                        value={editFormData.description || ''}
                                        onChange={handleEditFormChange}
                                        rows="3"
                                    ></textarea>
                                </div>
                                <div className="form-row">
                                    <div className="form-group">
                                        <label htmlFor="edit-category">Category</label>
                                        <input
                                            id="edit-category"
                                            type="text"
                                            name="category"
                                            value={editFormData.category || ''}
                                            onChange={handleEditFormChange}
                                        />
                                    </div>
                                    <div className="form-group">
                                        <label htmlFor="edit-urgency">Urgency (1-5)</label>
                                        <select
                                            id="edit-urgency"
                                            name="urgency"
                                            value={editFormData.urgency || '3'}
                                            onChange={handleEditFormChange}
                                        >
                                            <option value="1">1 - Minimal</option>
                                            <option value="2">2 - Low</option>
                                            <option value="3">3 - Medium</option>
                                            <option value="4">4 - High</option>
                                            <option value="5">5 - Critical</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="form-group">
                                    <label htmlFor="edit-start-at">Start Time</label>
                                    <input
                                        id="edit-start-at"
                                        type="datetime-local"
                                        name="start_at"
                                        value={formatDateForInput(editFormData.start_at)}
                                        onChange={handleEditFormChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="edit-end-at">End Time</label>
                                    <input
                                        id="edit-end-at"
                                        type="datetime-local"
                                        name="end_at"
                                        value={formatDateForInput(editFormData.end_at)}
                                        onChange={handleEditFormChange}
                                    />
                                </div>
                                <div className="form-group">
                                    <label htmlFor="edit-deadline">Deadline</label>
                                    <input
                                        id="edit-deadline"
                                        type="datetime-local"
                                        name="deadline"
                                        value={formatDateForInput(editFormData.deadline)}
                                        onChange={handleEditFormChange}
                                    />
                                </div>
                                <div className="form-actions">
                                    <button type="button" onClick={() => setShowEditModal(false)} className="cancel-btn">
                                        Cancel
                                    </button>
                                    <button type="submit" className="save-btn">
                                        Save Changes
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
                    <div className="modal-content delete-confirm-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3>Confirm Deletion</h3>
                            <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>&times;</button>
                        </div>
                        <div className="modal-body">
                            <p>Are you sure you want to delete the task <strong>"{taskToDelete?.title}"</strong>?</p>
                            <p className="warning-text">This action cannot be undone.</p>
                            <div className="form-actions">
                                <button onClick={() => setShowDeleteConfirm(false)} className="cancel-btn">
                                    Cancel
                                </button>
                                <button onClick={confirmDelete} className="delete-btn">
                                    Delete Task
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
                
                .task-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 0.5rem;
                    margin-top: 0.5rem;
                    padding-top: 0.5rem;
                    border-top: 1px dashed var(--border-color);
                }
                
                .task-action-btn {
                    padding: 0.3rem 0.6rem;
                    font-size: 0.8rem;
                    background-color: transparent;
                    color: var(--text-secondary);
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius);
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 0.3rem;
                    box-shadow: none;
                }
                
                .task-action-btn:hover {
                    background-color: var(--bg-tertiary);
                    transform: none;
                    box-shadow: none;
                }
                
                .edit-btn:hover {
                    color: var(--primary-color);
                    border-color: var(--primary-color);
                }
                
                .delete-btn:hover {
                    color: var(--error-color);
                    border-color: var(--error-color);
                }
                
                /* Modal Styles */
                .modal-overlay {
                    position: fixed;
                    top: 0;
                    left: 0;
                    right: 0;
                    bottom: 0;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    z-index: 1000;
                }
                
                .modal-content {
                    background-color: var(--bg-primary);
                    border-radius: var(--border-radius);
                    width: 90%;
                    max-width: 600px;
                    max-height: 90vh;
                    overflow-y: auto;
                    box-shadow: var(--shadow-lg);
                    animation: modalFadeIn 0.3s;
                }
                
                .delete-confirm-modal {
                    max-width: 400px;
                }
                
                @keyframes modalFadeIn {
                    from { opacity: 0; transform: translateY(-20px); }
                    to { opacity: 1; transform: translateY(0); }
                }
                
                .modal-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 1rem 1.5rem;
                    border-bottom: 1px solid var(--border-color);
                }
                
                .modal-header h3 {
                    margin: 0;
                    color: var(--text-primary);
                }
                
                .modal-close {
                    background: none;
                    border: none;
                    font-size: 1.5rem;
                    cursor: pointer;
                    color: var(--text-light);
                    padding: 0;
                    box-shadow: none;
                }
                
                .modal-close:hover {
                    color: var(--text-primary);
                    background: none;
                    transform: none;
                    box-shadow: none;
                }
                
                .modal-body {
                    padding: 1.5rem;
                }
                
                .form-group {
                    margin-bottom: 1rem;
                }
                
                .form-row {
                    display: flex;
                    gap: 1rem;
                    margin-bottom: 1rem;
                }
                
                .form-row .form-group {
                    flex: 1;
                    margin-bottom: 0;
                }
                
                .form-group label {
                    display: block;
                    margin-bottom: 0.5rem;
                    font-weight: 500;
                    color: var(--text-primary);
                }
                
                .form-group input,
                .form-group textarea,
                .form-group select {
                    width: 100%;
                    padding: 0.75rem;
                    border: 1px solid var(--border-color);
                    border-radius: var(--border-radius);
                    font-size: 1rem;
                    background-color: var(--bg-secondary);
                    color: var(--text-primary);
                    font-family: inherit;
                }
                
                .form-group input:focus,
                .form-group textarea:focus,
                .form-group select:focus {
                    outline: none;
                    border-color: var(--primary-color);
                    box-shadow: 0 0 0 3px rgba(67, 97, 238, 0.1);
                }
                
                .form-actions {
                    display: flex;
                    justify-content: flex-end;
                    gap: 1rem;
                    margin-top: 1.5rem;
                }
                
                .cancel-btn {
                    background-color: var(--bg-tertiary);
                    color: var(--text-primary);
                }
                
                .cancel-btn:hover {
                    background-color: var(--bg-tertiary-dark);
                }
                
                .save-btn {
                    background-color: var(--primary-color);
                }
                
                .save-btn:hover {
                    background-color: var(--primary-dark);
                }
                
                .delete-btn {
                    background-color: var(--error-color);
                }
                
                .delete-btn:hover {
                    background-color: var(--error-dark);
                }
                
                .warning-text {
                    color: var(--error-color);
                    font-style: italic;
                    margin-top: 0.5rem;
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
        // Parse the ISO string directly without automatic timezone conversion
        const date = new Date(isoString);
        
        // Create options with timeZone: 'UTC' to prevent local timezone adjustment
        const options = {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit',
            timeZone: 'UTC',
            timeZoneName: 'short'
        };
        
        return date.toLocaleDateString(undefined, options);
    } catch (error) {
        console.error("Error formatting date:", error, isoString);
        return isoString; // Return the original if formatting fails
    }
}

// Format date for datetime-local input
function formatDateForInput(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        // Format as YYYY-MM-DDThh:mm
        return date.toISOString().slice(0, 16);
    } catch (error) {
        console.error("Error formatting date for input:", error, dateString);
        return '';
    }
}

// Convert local datetime-local input value to ISO string
function convertLocalToISO(localDateString) {
    if (!localDateString) return null;
    try {
        const date = new Date(localDateString);
        return date.toISOString();
    } catch (error) {
        console.error("Error converting local date to ISO:", error, localDateString);
        return null;
    }
}

export default TaskList;