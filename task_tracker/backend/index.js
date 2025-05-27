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

function addUniversalSubactionToGroups(groups) {
  return groups.map(group => ({
    ...group,
    subtasks: group.subtasks.map(subtask => ({
      ...subtask,
      subactions: [
        ...(subtask.subactions || []),
        { title: 'nvbug needed?', status: 'awaiting' }
      ]
    }))
  }));
}

function generateSubtasks(taskName, category) {
  function withResultReviewed(subactions) {
    return [
      ...subactions,
      { title: 'result reviewed', status: 'awaiting' },
    ];
  }
  if (category === 'signoff review') {
    const timingSubtasks = [
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
      { title: 'ptc run', status: 'awaiting', subactions: withResultReviewed([
        { title: 'launch run', status: 'awaiting' },
        { title: 'review gca session', status: 'awaiting' },
      ]) },
      { title: 'CA check', status: 'awaiting', subactions: withResultReviewed([
        // No subactions here, only the universal subaction will be appended
      ]) },
      { title: 'IR STA', status: 'awaiting', subactions: withResultReviewed([
        { title: 'launch timing run', status: 'awaiting' },
      ]) },
      { title: 'MCP glitch check', status: 'awaiting', subactions: withResultReviewed([
        { title: 'check endpoint report', status: 'awaiting' },
        { title: 'launch mcp glitch run', status: 'awaiting' },
      ]) },
    ];
    const collateralsSubtasks = [
      { title: 'formal check', status: 'awaiting', subactions: withResultReviewed([
        { title: 'launch run', status: 'awaiting' },
      ]) },
      { title: 'top misc check', status: 'awaiting', subactions: withResultReviewed([
        { title: 'launch run', status: 'awaiting' },
      ]) },
      { title: 'NA check', status: 'awaiting', subactions: withResultReviewed([
        { title: 'launch run', status: 'awaiting' },
      ]) },
      { title: 'uncertainty value check', status: 'awaiting', subactions: withResultReviewed([
        { title: 'review report dir', status: 'awaiting' },
        { title: 'run uncertainty sort', status: 'awaiting' },
      ]) },
      { title: 'gen signoff page', status: 'awaiting', subactions: withResultReviewed([
        { title: 'run script', status: 'awaiting' },
        { title: 'finess details', status: 'awaiting' },
      ]) },
    ];
    const reportNavigationSubtasks = [
      { title: 'timing package review', status: 'awaiting', subactions: withResultReviewed([
        // No subactions here, only the universal subaction will be appended
      ]) },
      { title: 'special checks', status: 'awaiting', subactions: withResultReviewed([
        { title: 'review results', status: 'awaiting' },
      ]) },
    ];
    return addUniversalSubactionToGroups([
      { group: 'timing', subtasks: timingSubtasks },
      { group: 'collaterals', subtasks: collateralsSubtasks },
      { group: 'report navigation', subtasks: reportNavigationSubtasks },
    ]);
  }
  // Default subtasks
  return addUniversalSubactionToGroups([
    { group: 'timing', subtasks: [
      { title: `Plan ${taskName}`, status: 'awaiting', subactions: withResultReviewed(generateSubactions()) },
      { title: `Execute ${taskName}`, status: 'awaiting', subactions: withResultReviewed(generateSubactions()) },
      { title: `Review ${taskName}`, status: 'awaiting', subactions: withResultReviewed(generateSubactions()) },
    ]}
  ]);
}

// Create a new task and auto-generate subtasks
app.post('/api/tasks', (req, res) => {
  const { name, priority, category, project, block, ipo, layoutRev, datecode } = req.body;
  if (!name) return res.status(400).json({ error: 'Task name required' });
  const subtasks = generateSubtasks(name, category);
  const task = {
    id: tasks.length + 1,
    name,
    priority: priority || 'Normal',
    category: category || '',
    project: project || '',
    block: block || '',
    ipo: ipo || '',
    layoutRev: layoutRev || '',
    datecode: datecode || '',
    subtasks
  };
  tasks.push(task);
  res.status(201).json(task);
});

// Get all tasks
app.get('/api/tasks', (req, res) => {
  res.json(tasks);
});

// Get a single task by ID
app.get('/api/tasks/:taskId', (req, res) => {
  const { taskId } = req.params;
  const task = tasks.find(t => t.id === parseInt(taskId));
  if (!task) return res.status(404).json({ error: 'Task not found' });
  res.json(task);
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
  // Flatten all group.subtasks into a single array
  const allSubtasks = Array.isArray(task.subtasks)
    ? task.subtasks.flatMap(g => g.subtasks)
    : [];
  const subtask = allSubtasks[subtaskIndex];
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