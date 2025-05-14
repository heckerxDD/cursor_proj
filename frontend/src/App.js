import React, { useState, useEffect } from 'react';
import './App.css';

const STATUS = ['awaiting', 'in_progress', 'done'];
const STATUS_LABELS = {
  awaiting: 'Awaiting',
  in_progress: 'In Progress',
  done: 'Done',
};

function App() {
  const [taskName, setTaskName] = useState('');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTasks();
  }, []);

  function fetchTasks() {
    fetch('http://localhost:3001/api/tasks')
      .then(res => res.json())
      .then(setTasks);
  }

  function handleCreateTask(e) {
    e.preventDefault();
    if (!taskName.trim()) return;
    setLoading(true);
    fetch('http://localhost:3001/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: taskName }),
    })
      .then(res => res.json())
      .then(() => {
        setTaskName('');
        fetchTasks();
      })
      .finally(() => setLoading(false));
  }

  function updateSubtaskStatus(taskId, subtaskIndex, status) {
    fetch(`http://localhost:3001/api/tasks/${taskId}/subtasks/${subtaskIndex}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
      .then(res => res.json())
      .then(fetchTasks);
  }

  return (
    <div className="App">
      <h1>Task Tracker</h1>
      <form onSubmit={handleCreateTask} style={{ marginBottom: 24 }}>
        <input
          value={taskName}
          onChange={e => setTaskName(e.target.value)}
          placeholder="Enter task name"
          disabled={loading}
        />
        <button type="submit" disabled={loading || !taskName.trim()}>
          {loading ? 'Generating...' : 'Generate To-Dos'}
        </button>
      </form>
      <div style={{ display: 'flex', gap: 24, justifyContent: 'center' }}>
        {STATUS.map(status => (
          <div key={status} style={{ minWidth: 250 }}>
            <h2>{STATUS_LABELS[status]}</h2>
            {tasks.map(task => (
              <div key={task.id} style={{ marginBottom: 16 }}>
                <div style={{ fontWeight: 'bold' }}>{task.name}</div>
                {task.subtasks
                  .map((sub, idx) => ({ ...sub, idx }))
                  .filter(sub => sub.status === status)
                  .map(sub => (
                    <div key={sub.idx} style={{ background: '#f4f4f4', margin: '4px 0', padding: 8, borderRadius: 4 }}>
                      {sub.title}
                      <div style={{ marginTop: 4 }}>
                        {STATUS.filter(s => s !== status).map(s => (
                          <button
                            key={s}
                            style={{ marginRight: 4 }}
                            onClick={() => updateSubtaskStatus(task.id, sub.idx, s)}
                          >
                            Move to {STATUS_LABELS[s]}
                          </button>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
