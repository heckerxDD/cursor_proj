const express = require('express');
const cors = require('cors');

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
  if (category === 'signoff review') {
    return [
      { title: 'final IPO confirmation', status: 'in_progress', subactions: generateSubactions() },
      { title: 'update IPO', status: 'awaiting', subactions: generateSubactions() },
      { title: 'Launch timing run', status: 'awaiting', subactions: generateSubactions() },
      { title: 'formal check', status: 'awaiting', subactions: generateSubactions() },
      { title: 'top misc check', status: 'awaiting', subactions: generateSubactions() },
      { title: 'NA check', status: 'awaiting', subactions: generateSubactions() },
    ];
  }
  // Default subtasks
  return [
    { title: `Plan ${taskName}`, status: 'in_progress', subactions: generateSubactions() },
    { title: `Execute ${taskName}`, status: 'awaiting', subactions: generateSubactions() },
    { title: `Review ${taskName}`, status: 'awaiting', subactions: generateSubactions() },
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

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
}); 