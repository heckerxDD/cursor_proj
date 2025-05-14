const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3001;

app.use(cors());
app.use(express.json());

// Placeholder in-memory task store
const tasks = [];

// Generate subtasks for a given task name (placeholder logic)
function generateSubtasks(taskName, category) {
  if (category === 'signoff review') {
    return [
      { title: 'final IPO confirmation', status: 'in_progress' },
      { title: 'update IPO', status: 'awaiting' },
      { title: 'Launch timing run', status: 'awaiting' },
      { title: 'formal check', status: 'awaiting' },
      { title: 'top misc check', status: 'awaiting' },
      { title: 'NA check', status: 'awaiting' },
    ];
  }
  // Default subtasks
  return [
    { title: `Plan ${taskName}`, status: 'in_progress' },
    { title: `Execute ${taskName}`, status: 'awaiting' },
    { title: `Review ${taskName}`, status: 'awaiting' },
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