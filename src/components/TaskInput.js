// src/TaskInput.js
import React, { useState } from 'react';

function TaskInput({ onAnalyze }) {
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (event) => {
        setInputText(event.target.value);
    };

    const handleClick = () => {
        if (!inputText.trim()) return;
        setIsLoading(true);
        onAnalyze(inputText);
        // Clear input after analysis
        setInputText('');
        // Reset loading state after a short delay to show feedback
        setTimeout(() => setIsLoading(false), 500);
    };

    const handleKeyDown = (event) => {
        // Submit on Ctrl+Enter or Cmd+Enter
        if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
            handleClick();
        }
    };

    return (
        <div className="task-input-container">
            <h2>Task Extraction</h2>
            <p className="input-description">
                Enter the text containing your tasks, and let the AI organize them for you.
                <span className="input-tip">Tip: Include details like deadlines, priorities, and categories for better results.</span>
            </p>
            
            <div className="textarea-wrapper">
                <textarea
                    id="inputText"
                    placeholder="Example: Finish quarterly report by Monday 5 PM (high priority). Reply to John's email tomorrow morning. Schedule team meeting for Wednesday at 10 AM."
                    value={inputText}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    className={isLoading ? 'loading' : ''}
                />
                {inputText.length > 0 && (
                    <div className="character-count">
                        {inputText.length} characters
                    </div>
                )}
            </div>
            
            <div className="input-actions">
                <button 
                    onClick={handleClick} 
                    disabled={!inputText.trim() || isLoading}
                    className={`analyze-button ${isLoading ? 'loading' : ''}`}
                >
                    {isLoading ? 'Processing...' : 'Extract Tasks'}
                </button>
                <div className="keyboard-shortcut">
                    Press Ctrl+Enter to extract
                </div>
            </div>
            
            <style jsx>{`
                .task-input-container {
                    margin-bottom: 2rem;
                }
                
                .input-description {
                    margin-bottom: 1rem;
                    display: flex;
                    flex-direction: column;
                    gap: 0.5rem;
                }
                
                .input-tip {
                    font-size: 0.9rem;
                    color: var(--text-light);
                    font-style: italic;
                }
                
                .textarea-wrapper {
                    position: relative;
                    margin-bottom: 1rem;
                }
                
                textarea.loading {
                    opacity: 0.7;
                }
                
                .character-count {
                    position: absolute;
                    bottom: 0.5rem;
                    right: 0.5rem;
                    font-size: 0.8rem;
                    color: var(--text-light);
                    background-color: var(--bg-secondary);
                    padding: 0.2rem 0.5rem;
                    border-radius: 4px;
                }
                
                .input-actions {
                    display: flex;
                    align-items: center;
                    gap: 1rem;
                }
                
                .analyze-button {
                    min-width: 150px;
                }
                
                .analyze-button.loading {
                    background-color: var(--primary-light);
                    cursor: wait;
                }
                
                .keyboard-shortcut {
                    font-size: 0.8rem;
                    color: var(--text-light);
                }
                
                @media (max-width: 768px) {
                    .input-actions {
                        flex-direction: column;
                        align-items: flex-start;
                        gap: 0.5rem;
                    }
                    
                    .analyze-button {
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}

export default TaskInput;