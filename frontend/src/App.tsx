import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetch('/api/hello')
      .then(response => response.text())
      .then(data => setMessage(data))
      .catch(error => console.error('Error:', error));
  }, []);

  return (
    <div className="App">
      <header className="App-header">
        <h1>React + Spring Boot Demo</h1>
        <p>{message || 'Loading...'}</p>
      </header>
    </div>
  );
}

export default App;
