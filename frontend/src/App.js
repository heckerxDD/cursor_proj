import React, { useState, useEffect } from 'react';
import './App.css';

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

const PRIORITY_COLORS = {
  'Critical': '#ff4d4f', // Red
  'High': '#fa8c16',    // Orange
  'Normal': '#1890ff',  // Blue
  'Low': '#bfbfbf',     // Gray
};

function getTaskColor(priority) {
  return PRIORITY_COLORS[priority] || PRIORITY_COLORS['Normal'];
}

const PRIORITY_OPTIONS = ['Low', 'Normal', 'High', 'Critical'];
const CATEGORY_OPTIONS = ['IPO timing', 'signoff review'];

function App() {
  const [priority, setPriority] = useState('Normal');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [project, setProject] = useState('');
  const [block, setBlock] = useState('');
  const [ipo, setIpo] = useState('');
  const [layoutRev, setLayoutRev] = useState('');
  const [datecode, setDatecode] = useState('');

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
    const joinedName = [project, block, ipo, layoutRev, datecode].filter(Boolean).join('_');
    if (!joinedName.trim()) return;
    setLoading(true);
    fetch('http://localhost:3001/api/tasks', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: joinedName, priority, category }),
    })
      .then(res => res.json())
      .then(() => {
        setProject('');
        setBlock('');
        setIpo('');
        setLayoutRev('');
        setDatecode('');
        setPriority('Normal');
        setCategory(CATEGORY_OPTIONS[0]);
        setTimeout(fetchTasks, 100);
      })
      .finally(() => setLoading(false));
  }

  function updateSubactionStatus(taskId, subtaskIndex, subactionIndex, status) {
    fetch(`http://localhost:3001/api/tasks/${taskId}/subtasks/${subtaskIndex}/subactions/${subactionIndex}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    })
      .then(res => res.json())
      .then(fetchTasks);
  }

  function removeTask(taskId) {
    fetch(`http://localhost:3001/api/tasks/${taskId}`, {
      method: 'DELETE',
    }).then(fetchTasks);
  }

  function handleGenCmd() {
    // Demo: hardcoded SSH info and command
    const sshPayload = {
      host: 'rno2-container-xterm-039.prd.it.nvidia.com',
      port: 5107,
      username: 'jaxing',
      password: 'Henchangjiandemima9!',
      command: 'echo hello world',
      identityFile: '/Users/jaxing/.ssh/id_rsa_nvidia',
    };
    // Host rno2-container-xterm-039
    // HostName rno2-container-xterm-039.prd.it.nvidia.com
    // User jaxing
    // Port 5107
    // IdentityFile ~/.ssh/id_rsa_nvidia
    setModalContent('Running command...');
    setModalOpen(true);
    fetch('http://localhost:3001/api/ssh-cmd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sshPayload),
    })
      .then(res => res.json())
      .then(data => {
        setModalContent(data.output || data.error || 'No output');
      })
      .catch(err => {
        setModalContent('Error: ' + err.message);
      });
  }

  function closeModal() {
    setModalOpen(false);
    setModalContent('');
  }

  return (
    <div className="App" style={{ background: '#f7f7f7', minHeight: '100vh', padding: 24 }}>
      {/* Modal Popup */}
      {modalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 12, minWidth: 240, minHeight: 80, boxShadow: '0 2px 16px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ marginBottom: 16, fontSize: 18 }}>{modalContent}</div>
            <button onClick={closeModal} style={{ padding: '6px 18px', borderRadius: 6, border: 'none', background: '#1890ff', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Close</button>
          </div>
        </div>
      )}
      <h1>Edm Task Manager</h1>
      <form onSubmit={handleCreateTask} style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          value={project}
          onChange={e => setProject(e.target.value)}
          placeholder="project"
          disabled={loading}
          style={{ minWidth: 80 }}
        />
        <input
          value={block}
          onChange={e => setBlock(e.target.value)}
          placeholder="block"
          disabled={loading}
          style={{ minWidth: 80 }}
        />
        <input
          value={ipo}
          onChange={e => setIpo(e.target.value)}
          placeholder="IPO"
          disabled={loading}
          style={{ minWidth: 80 }}
        />
        <input
          value={layoutRev}
          onChange={e => setLayoutRev(e.target.value)}
          placeholder="layout rev"
          disabled={loading}
          style={{ minWidth: 80 }}
        />
        <input
          value={datecode}
          onChange={e => setDatecode(e.target.value)}
          placeholder="datecode"
          disabled={loading}
          style={{ minWidth: 80 }}
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
        <button type="submit" disabled={loading || ![project, block, ipo, layoutRev, datecode].some(Boolean)}>
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
              background: getTaskColor(task.priority),
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'stretch', justifyContent: 'center', marginTop: 16 }}>
              {task.subtasks.map((sub, idx) => {
                const allSubactionsDone = sub.subactions && sub.subactions.length > 0 && sub.subactions.every(sa => sa.status === 'done');
                const subtaskStatus = allSubactionsDone ? 'done' : sub.status;
                return (
                  <div key={idx} style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', minHeight: 60, marginBottom: 2 }}>
                    <div
                      style={{
                        background: STATUS_COLORS[subtaskStatus],
                        color: subtaskStatus === 'awaiting' ? '#fff' : '#222',
                        borderRadius: 8,
                        padding: '12px 18px',
                        fontWeight: 600,
                        fontSize: 16,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.10)',
                        border: subtaskStatus === 'stuck' ? '2px solid #a020f0' : undefined,
                        minWidth: 220,
                        maxWidth: 220,
                        textAlign: 'center',
                        position: 'relative',
                        marginRight: 16,
                        flexShrink: 0,
                      }}
                    >
                      {sub.title}
                    </div>
                    <div style={{ flex: 1 }}>
                      {sub.subactions && sub.subactions.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'row', gap: 8 }}>
                          {sub.subactions.map((sa, saIdx) => (
                            <div key={saIdx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', fontSize: 12, background: '#f8f8f8', borderRadius: 4, margin: '2px 0', padding: '2px 6px', color: sa.status === 'done' ? STATUS_COLORS['done'] : sa.status === 'stuck' ? STATUS_COLORS['stuck'] : '#222', minWidth: 120 }}>
                              <span style={{ fontWeight: 500 }}>{sa.title}</span>
                              <span style={{ margin: '2px 0', fontWeight: 600, color: STATUS_COLORS[sa.status] }}>{STATUS_LABELS[sa.status]}</span>
                              {sa.status !== 'done' && (
                                <div style={{ display: 'flex', gap: 2 }}>
                                  <button onClick={handleGenCmd} style={{ fontSize: 11, borderRadius: 3, padding: '1px 8px', border: 'none', background: '#888', color: '#fff', marginLeft: 2, cursor: 'pointer' }}>gen cmd</button>
                                  {['done', 'stuck'].filter(s => s !== sa.status).map(s => (
                                    <button
                                      key={s}
                                      style={{ fontSize: 11, borderRadius: 3, padding: '1px 6px', border: 'none', background: STATUS_COLORS[s], color: '#fff', marginLeft: 2, cursor: 'pointer' }}
                                      onClick={() => updateSubactionStatus(task.id, idx, saIdx, s)}
                                    >
                                      {s === 'done' ? 'Done' : 'Stuck'}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
