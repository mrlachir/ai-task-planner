// src/TaskInput.js
import React, { useState } from 'react';

function TaskInput({ onAnalyze }) {
    const [inputText, setInputText] = useState('');

    const handleChange = (event) => {
        setInputText(event.target.value);
    };

    const handleClick = () => {
        onAnalyze(inputText);
        setInputText(''); // Clear input after analysis
    };

    return (
        <div>
            <p>Enter the text containing your tasks, and let the AI organize them for you:</p>
            <textarea
                id="inputText"
                placeholder="Example: Finish report by Monday 5 PM (high). Reply to John's email tomorrow. Study session Wednesday morning."
                value={inputText}
                onChange={handleChange}
            />
            <button onClick={handleClick}>Organize Tasks</button>
        </div>
    );
}

export default TaskInput;