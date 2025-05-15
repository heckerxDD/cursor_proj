const express = require('express');
const cors = require('cors');
const { Client } = require('ssh2');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Placeholder in-memory task store
const tasks = [];

function generateSubactions() {
  return [
    { title: 'sub action1', status: 'awaiting' },
    { title: 'sub action2', status: 'awaiting' },
    { title: 'sub action3', status: 'awaiting' },
  ];
}

function generateSubtasks(taskName, category) {
  function withResultReviewed(subactions) {
    return [
      ...subactions,
      { title: 'result reviewed', status: 'awaiting' },
    ];
  }
  if (category === 'signoff review') {
    return [
      { title: 'final IPO confirmation', status: 'awaiting', subactions: withResultReviewed([
        { title: 'receive notification from PnR', status: 'awaiting' },
      ]) },
      { title: 'update IPO', status: 'awaiting', subactions: withResultReviewed([
        { title: 'run script', status: 'awaiting' },
        { title: 'p4 diff psyaml', status: 'awaiting' },
        { title: 'submit psyaml', status: 'awaiting' },
      ]) },
      { title: 'Launch timing run', status: 'awaiting', subactions: withResultReviewed([
        { title: 'verify SOL config', status: 'awaiting' },
      ]) },
      { title: 'formal check', status: 'awaiting', subactions: withResultReviewed([
        { title: 'launch run', status: 'awaiting' },
      ]) },
      { title: 'top misc check', status: 'awaiting', subactions: withResultReviewed([
        { title: 'launch run', status: 'awaiting' },
      ]) },
      { title: 'NA check', status: 'awaiting', subactions: withResultReviewed([
        { title: 'launch run', status: 'awaiting' },
      ]) },
    ];
  }
  // Default subtasks
  return [
    { title: `Plan ${taskName}`, status: 'awaiting', subactions: withResultReviewed(generateSubactions()) },
    { title: `Execute ${taskName}`, status: 'awaiting', subactions: withResultReviewed(generateSubactions()) },
    { title: `Review ${taskName}`, status: 'awaiting', subactions: withResultReviewed(generateSubactions()) },
  ];
}

// Create a new task and auto-generate subtasks
app.post('/api/tasks', (req, res) => {
  const { name, priority, category } = req.body;
  if (!name) return res.status(400).json({ error: 'Task name required' });
  const subtasks = generateSubtasks(name, category);
  const task = { id: tasks.length + 1, name, priority: priority || 'Normal', category: category || '', subtasks };
  tasks.push(task);
  res.status(201).json(task);
});

// Get all tasks
app.get('/api/tasks', (req, res) => {
  res.json(tasks);
});

// Update subtask status
app.patch('/api/tasks/:taskId/subtasks/:subtaskIndex', (req, res) => {
  const { taskId, subtaskIndex } = req.params;
  const { status } = req.body;
  const task = tasks.find(t => t.id === parseInt(taskId));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  if (!['awaiting', 'in_progress', 'done', 'stuck'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  if (!task.subtasks[subtaskIndex]) {
    return res.status(404).json({ error: 'Subtask not found' });
  }
  task.subtasks[subtaskIndex].status = status;
  res.json(task);
});

// Update subaction status
app.patch('/api/tasks/:taskId/subtasks/:subtaskIndex/subactions/:subactionIndex', (req, res) => {
  const { taskId, subtaskIndex, subactionIndex } = req.params;
  const { status } = req.body;
  const task = tasks.find(t => t.id === parseInt(taskId));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  const subtask = task.subtasks[subtaskIndex];
  if (!subtask) return res.status(404).json({ error: 'Subtask not found' });
  if (!subtask.subactions || !subtask.subactions[subactionIndex]) {
    return res.status(404).json({ error: 'Subaction not found' });
  }
  if (!['awaiting', 'done', 'stuck'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  subtask.subactions[subactionIndex].status = status;
  res.json(task);
});

// Delete a task by ID
app.delete('/api/tasks/:taskId', (req, res) => {
  const { taskId } = req.params;
  const idx = tasks.findIndex(t => t.id === parseInt(taskId));
  if (idx === -1) return res.status(404).json({ error: 'Task not found' });
  tasks.splice(idx, 1);
  res.status(204).end();
});

// SSH command execution endpoint
app.post('/api/ssh-cmd', async (req, res) => {
  const { host, port, username, password, command, privateKey } = req.body;
  if (!host || !username || !command) {
    return res.status(400).json({ error: 'Missing SSH connection or command parameters' });
  }
  let pemKey = privateKey;
  let tempFiles = [];
  try {
    if (privateKey && privateKey.includes('BEGIN OPENSSH PRIVATE KEY')) {
      // Write OpenSSH key to temp file
      const tmpOpenSSH = path.join(os.tmpdir(), `openssh_key_${Date.now()}`);
      fs.writeFileSync(tmpOpenSSH, privateKey, { mode: 0o600 });
      tempFiles.push(tmpOpenSSH);
      // Convert to PEM using ssh-keygen
      const tmpPEM = path.join(os.tmpdir(), `pem_key_${Date.now()}`);
      execSync(`ssh-keygen -p -m PEM -N "" -f ${tmpOpenSSH} -P "" -q -y > ${tmpPEM}`);
      pemKey = fs.readFileSync(tmpPEM, 'utf8');
      tempFiles.push(tmpPEM);
    }
    const conn = new Client();
    let output = '';
    const connectConfig = {
      host,
      port: port || 22,
      username,
    };
    if (pemKey) {
      connectConfig.privateKey = pemKey;
    } else if (password) {
      connectConfig.password = password;
    } else {
      return res.status(400).json({ error: 'No authentication method provided' });
    }
    conn.on('ready', () => {
      conn.exec(command, (err, stream) => {
        if (err) {
          conn.end();
          return res.status(500).json({ error: err.message });
        }
        stream.on('close', (code, signal) => {
          conn.end();
          res.json({ output });
        }).on('data', (data) => {
          output += data.toString();
        }).stderr.on('data', (data) => {
          output += data.toString();
        });
      });
    }).on('error', (err) => {
      res.status(500).json({ error: err.message });
    }).connect(connectConfig);
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    // Clean up temp files
    for (const file of tempFiles) {
      try { fs.unlinkSync(file); } catch {}
    }
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
}); 