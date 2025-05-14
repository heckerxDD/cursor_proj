import React, { useState, useEffect } from 'react';
import './App.css';

const STATUS = ['awaiting', 'in_progress', 'done', 'stuck'];
const STATUS_LABELS = {
  awaiting: 'Awaiting',
  in_progress: 'In Progress',
  done: 'Done',
  stuck: 'Stuck',
};
const STATUS_COLORS = {
  awaiting: '#ff4d4f', // Red
  in_progress: '#ffd700', // Yellow
  done: '#52c41a', // Green
  stuck: '#a020f0', // Purple
};

const TASK_COLORS = [
  '#FFB6C1', // Light Pink
  '#B0E0E6', // Powder Blue
  '#FFD700', // Gold
  '#90EE90', // Light Green
  '#FFA07A', // Light Salmon
  '#DDA0DD', // Plum
  '#87CEFA', // Light Sky Blue
  '#FFDEAD', // Navajo White
  '#AFEEEE', // Pale Turquoise
  '#F08080', // Light Coral
];

function getTaskColor(index) {
  return TASK_COLORS[index % TASK_COLORS.length];
}

const PRIORITY_OPTIONS = ['Low', 'Normal', 'High', 'Critical'];
const CATEGORY_OPTIONS = ['IPO timing', 'signoff review'];

function App() {
  const [taskName, setTaskName] = useState('');
  const [priority, setPriority] = useState('Normal');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = 'edm test tracker';
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
      body: JSON.stringify({ name: taskName, priority, category }),
    })
      .then(res => res.json())
      .then(() => {
        setTaskName('');
        setPriority('Normal');
        setCategory(CATEGORY_OPTIONS[0]);
        setTimeout(fetchTasks, 100);
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
      .then((updatedTask) => {
        // If marking as done, set next subtask to in_progress if it is awaiting
        if (status === 'done') {
          const nextIdx = parseInt(subtaskIndex) + 1;
          if (updatedTask && updatedTask.subtasks && updatedTask.subtasks[nextIdx] && updatedTask.subtasks[nextIdx].status === 'awaiting') {
            fetch(`http://localhost:3001/api/tasks/${taskId}/subtasks/${nextIdx}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ status: 'in_progress' }),
            }).then(() => fetchTasks());
            return;
          }
        }
        fetchTasks();
      });
  }

  function removeTask(taskId) {
    fetch(`http://localhost:3001/api/tasks/${taskId}`, {
      method: 'DELETE',
    }).then(fetchTasks);
  }

  return (
    <div className="App" style={{ background: '#f7f7f7', minHeight: '100vh', padding: 24 }}>
      <h1>Task Tracker</h1>
      <form onSubmit={handleCreateTask} style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center' }}>
        <input
          value={taskName}
          onChange={e => setTaskName(e.target.value)}
          placeholder="Enter task name"
          disabled={loading}
        />
        <select value={category} onChange={e => setCategory(e.target.value)} disabled={loading}>
          {CATEGORY_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <select value={priority} onChange={e => setPriority(e.target.value)} disabled={loading}>
          {PRIORITY_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <button type="submit" disabled={loading || !taskName.trim()}>
          {loading ? 'Generating...' : 'Generate To-Dos'}
        </button>
      </form>
      <div style={{ marginBottom: 24 }}>
        <span style={{ marginRight: 16 }}><span style={{ display: 'inline-block', width: 16, height: 16, background: STATUS_COLORS['in_progress'], borderRadius: 4, marginRight: 4, verticalAlign: 'middle' }} /> In Progress</span>
        <span style={{ marginRight: 16 }}><span style={{ display: 'inline-block', width: 16, height: 16, background: STATUS_COLORS['done'], borderRadius: 4, marginRight: 4, verticalAlign: 'middle' }} /> Done</span>
        <span style={{ marginRight: 16 }}><span style={{ display: 'inline-block', width: 16, height: 16, background: STATUS_COLORS['awaiting'], borderRadius: 4, marginRight: 4, verticalAlign: 'middle' }} /> Awaiting</span>
        <span><span style={{ display: 'inline-block', width: 16, height: 16, background: STATUS_COLORS['stuck'], borderRadius: 4, marginRight: 4, verticalAlign: 'middle' }} /> Stuck</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 32 }}>
        {tasks.map((task, taskIdx) => (
          <div
            key={task.id}
            style={{
              background: getTaskColor(taskIdx),
              borderRadius: 16,
              padding: 20,
              minWidth: 800,
              boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
              marginBottom: 24,
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 'bold', fontSize: 22, letterSpacing: 1 }}>{task.name}</span>
              <span style={{ fontSize: 16, fontWeight: 500, background: '#fff', borderRadius: 8, padding: '4px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginLeft: 8 }}>
                Category: {task.category || '-'}
              </span>
              <span style={{ fontSize: 16, fontWeight: 500, background: '#fff', borderRadius: 8, padding: '4px 12px', boxShadow: '0 1px 3px rgba(0,0,0,0.06)', marginLeft: 8 }}>
                Priority: {task.priority || 'Normal'}
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'row', gap: 24, alignItems: 'center', justifyContent: 'center', marginTop: 16 }}>
              {task.subtasks.map((sub, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 180 }}>
                  <div
                    style={{
                      background: STATUS_COLORS[sub.status],
                      color: sub.status === 'awaiting' ? '#fff' : '#222',
                      borderRadius: 8,
                      padding: '12px 18px',
                      fontWeight: 600,
                      fontSize: 16,
                      boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
                      border: sub.status === 'stuck' ? '2px solid #a020f0' : undefined,
                      marginBottom: 8,
                      minWidth: 120,
                      textAlign: 'center',
                      position: 'relative',
                    }}
                  >
                    {sub.title}
                  </div>
                  <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', justifyContent: 'center' }}>
                    {STATUS.filter(s => s !== sub.status && s !== 'in_progress' && s !== 'awaiting').map(s => (
                      (s !== 'stuck' || sub.status !== 'done') && (
                        <button
                          key={s}
                          style={{ fontSize: 12, borderRadius: 4, padding: '2px 8px', border: 'none', background: STATUS_COLORS[s], color: s === 'awaiting' ? '#fff' : '#222', marginRight: 2, marginBottom: 2, cursor: 'pointer' }}
                          onClick={() => updateSubtaskStatus(task.id, idx, s)}
                        >
                          {s === 'stuck' ? 'Mark Stuck' : `Set ${STATUS_LABELS[s]}`}
                        </button>
                      )
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 12 }}>
              <button onClick={() => removeTask(task.id)} style={{ background: '#ff4d4f', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 16px', fontWeight: 600, cursor: 'pointer' }}>
                Confirm Complete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
