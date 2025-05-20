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
const PROJECT_OPTIONS = ['edm3tp', 'edm3tpl', 'edm5tr'];

function getDateString() {
  const now = new Date();
  const pad = n => n.toString().padStart(2, '0');
  return `${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function App() {
  const [priority, setPriority] = useState('Normal');
  const [category, setCategory] = useState(CATEGORY_OPTIONS[0]);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');
  const [project, setProject] = useState(PROJECT_OPTIONS[0]);
  const [block, setBlock] = useState('');
  const [ipo, setIpo] = useState('');
  const [layoutRev, setLayoutRev] = useState('');
  const [datecode, setDatecode] = useState('');
  const [blocksByProject, setBlocksByProject] = useState({});
  const [ipoByBlock, setIpoByBlock] = useState({});
  const [layoutRevByBlock, setLayoutRevByBlock] = useState({});
  const [blockInput, setBlockInput] = useState('');
  const [ipoInput, setIpoInput] = useState('');
  const [layoutRevInput, setLayoutRevInput] = useState('');
  const [datecodeByBlock, setDatecodeByBlock] = useState({});
  const [datecodeInput, setDatecodeInput] = useState('');
  const [refreshPopupVisible, setRefreshPopupVisible] = useState(false);

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
      body: JSON.stringify({ name: joinedName, priority, category, project, block, ipo, layoutRev, datecode }),
    })
      .then(res => res.json())
      .then(() => {
        setProject(PROJECT_OPTIONS[0]);
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

  function handleGenCmd(subtaskTitle, task, subactionTitle) {
    if (subtaskTitle === 'timing package review') {
      const block = task.block || '';
      const ipo = task.ipo || '';
      const project = task.project || '';
      const datecode = task.datecode || '';
      const layoutRev = task.layoutRev || '';
      const cmd = `${project}/timing_scripts/workflow/utils/timing_package_reviewer.py --block-name ${block} --ipo-number ${ipo} --project ${project} --datecode ${datecode} --rev ${layoutRev}`;
      setModalContent(cmd);
      setModalOpen(true);
      return;
    }
    if (subtaskTitle === 'review gca session') {
      const block = task.block || '';
      const ipo = task.ipo || '';
      const cmd = `ls -rtld save_session/*${block}*${ipo}*gca* | grep -v cmnone | awk -F '/' '{print "restore_session -constraints -session_name", $2}'`;
      setModalContent(cmd);
      setModalOpen(true);
      return;
    }
    if (subtaskTitle === 'ptc run' && subactionTitle === 'review gca session') {
      const block = task.block || '';
      const ipo = task.ipo || '';
      const cmd = `ls -rtld save_session/*${block}*${ipo}*gca* | grep -v cmnone | awk -F '/' '{print "restore_session -constraints -session_name", $2}'`;
      setModalContent(cmd);
      setModalOpen(true);
      return;
    }
    if (subtaskTitle === 'formal check') {
      const block = task.block || 'NV_NAFLL_digi_nafll_lvt';
      const layoutRev = task.layoutRev ? `${task.layoutRev}` : '';
      const dateStr = getDateString();
      const categoryStr = (task.category || '').replace(/\s+/g, '_');
      const commands = [
        {
          build: `${block}_${dateStr}_noscan2feflat_${categoryStr}`,
          golden: 'noscan',
          revised: 'feflat',
        },
        {
          build: `${block}_${dateStr}_noscan2ipo_${categoryStr}`,
          golden: 'noscan',
          revised: 'ipo',
        },
        {
          build: `${block}_${dateStr}_feflat2flat_${categoryStr}`,
          golden: 'feflat',
          revised: 'flat',
        },
        {
          build: `${block}_${dateStr}_flat2ipo_${categoryStr}`,
          golden: 'flat',
          revised: 'ipo',
        },
      ];
      const cmds = commands.map(c =>
        `formal_run -build ${c.build} -fv_golden_type ${c.golden} -fv_revised_type ${c.revised} -block ${block} -use_layout_rev ${layoutRev}  -use_64g_q 1`
      ).join('\n') + '\nget_status';
      setModalContent(cmds);
      setModalOpen(true);
    } else if (subtaskTitle === 'top misc check') {
      const base = `/home/scratch.${task.project || ''}_main/${task.project || ''}/${task.project || ''}/timing/${task.project || ''}/library/top_misc_check.medic`;
      const rev = task.layoutRev ? `-rev ${task.layoutRev}` : '';
      const block = task.block ? `-block ${task.block}` : '';
      const cmds = [
        `load_medic ${base} ${rev} ${block} -check SPARE`,
        `load_medic ${base} ${rev} ${block} -check UNCHAR`,
        `load_medic ${base} ${rev} ${block} -check PCS`,
        `load_medic ${base} ${rev} ${block} -check LIBOLA`,
      ].join('\n');
      setModalContent(cmds);
      setModalOpen(true);
    } else if (subtaskTitle === 'NA check' && subactionTitle === 'launch run') {
      const project = task.project || '';
      const block = task.block || '';
      const cmd = `load_medic /home/scratch.${project}_main/${project}/${project}/timing/na/da_hybrid_chiplet.${block}.medic`;
      setModalContent(cmd);
      setModalOpen(true);
      return;
    } else if (subtaskTitle === 'NA check' && subactionTitle === 'result reviewed') {
      const layoutRev = task.layoutRev || '';
      const block = task.block || '';
      const cmd = `grep -i "failed" log/design_audit.${layoutRev}.ipo_${block}_*/*.summary`;
      setModalContent(cmd);
      setModalOpen(true);
      return;
    } else if (subtaskTitle === 'CA check') {
      const layoutRev = task.layoutRev || '';
      const block = task.block || '';
      const datecode = task.datecode || '';
      const cmd = `grep 'ERROR' rep/clocks/${layoutRev}/${block}/${datecode}*/clockAuditor/*/*`;
      setModalContent(cmd);
      setModalOpen(true);
      return;
    } else if (subtaskTitle === 'uncertainty value check' && subactionTitle === 'run uncertainty sort') {
      const project = task.project || '';
      const block = task.block || '';
      const ipo = task.ipo || '';
      const cmd = `/home/scratch.${project}_main/${project}/${project}/timing/${project}/timing_scripts/workflow/utils/sort_uncertainty_reports.py ${project}/rep/special_checks/${block}/${ipo}/uncertainties/ ${block}`;
      setModalContent(cmd);
      setModalOpen(true);
      return;
    } else if (subtaskTitle === 'uncertainty value check' && subactionTitle === 'review report dir') {
      const block = task.block || '';
      const ipo = task.ipo || '';
      const cmd = `lr rep/special_checks/${block}/${ipo}/uncertainties/`;
      setModalContent(cmd);
      setModalOpen(true);
      return;
    } else {
      setModalContent('hello world');
      setModalOpen(true);
    }
  }

  function closeModal() {
    setModalOpen(false);
    setModalContent('');
  }

  function copyToClipboard() {
    if (modalContent) {
      navigator.clipboard.writeText(modalContent);
    }
  }

  function handleAddOption(type) {
    if (type === 'block' && blockInput) {
      setBlocksByProject(prev => {
        const blocks = prev[project] || [];
        if (!blocks.includes(blockInput)) {
          return { ...prev, [project]: [...blocks, blockInput] };
        }
        return prev;
      });
      setBlock(blockInput);
      setBlockInput('');
    } else if (type === 'ipo' && ipoInput && block) {
      setIpoByBlock(prev => {
        const ipos = prev[block] || [];
        if (!ipos.includes(ipoInput)) {
          return { ...prev, [block]: [...ipos, ipoInput] };
        }
        return prev;
      });
      setIpo(ipoInput);
      setIpoInput('');
    } else if (type === 'layoutRev' && layoutRevInput && block) {
      setLayoutRevByBlock(prev => {
        const revs = prev[block] || [];
        if (!revs.includes(layoutRevInput)) {
          return { ...prev, [block]: [...revs, layoutRevInput] };
        }
        return prev;
      });
      setLayoutRev(layoutRevInput);
      setLayoutRevInput('');
    } else if (type === 'datecode' && datecodeInput && block) {
      setDatecodeByBlock(prev => {
        const codes = prev[block] || [];
        if (!codes.includes(datecodeInput)) {
          return { ...prev, [block]: [...codes, datecodeInput] };
        }
        return prev;
      });
      setDatecode(datecodeInput);
      setDatecodeInput('');
    }
  }

  // Reset block, ipo, layoutRev when project/block changes
  function handleProjectChange(e) {
    setProject(e.target.value);
    setBlock('');
    setIpo('');
    setLayoutRev('');
    setDatecode('');
  }
  function handleBlockChange(e) {
    setBlock(e.target.value);
    setIpo('');
    setLayoutRev('');
    setDatecode('');
  }

  const blockOptions = blocksByProject[project] || [];
  const ipoOptions = ipoByBlock[block] || [];
  const layoutRevOptions = layoutRevByBlock[block] || [];
  const datecodeOptions = datecodeByBlock[block] || [];

  function handleRefreshTask(taskId) {
    fetch(`http://localhost:3001/api/tasks/${taskId}`)
      .then(res => res.json())
      .then(updatedTask => {
        setTasks(prevTasks => prevTasks.map(t => t.id === taskId ? updatedTask : t));
        setRefreshPopupVisible(true);
        setTimeout(() => setRefreshPopupVisible(false), 1500);
      });
  }

  return (
    <div className="App" style={{ background: '#f7f7f7', minHeight: '100vh', padding: 24 }}>
      {/* Modal Popup */}
      {modalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.3)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#fff', padding: 32, borderRadius: 12, minWidth: 240, minHeight: 80, boxShadow: '0 2px 16px rgba(0,0,0,0.15)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ marginBottom: 16, fontSize: 18, whiteSpace: 'pre-line' }}>{modalContent}</div>
            <div style={{ display: 'flex', gap: 12 }}>
              <button onClick={copyToClipboard} style={{ padding: '6px 18px', borderRadius: 6, border: 'none', background: '#52c41a', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Copy Cmd</button>
              <button onClick={closeModal} style={{ padding: '6px 18px', borderRadius: 6, border: 'none', background: '#1890ff', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Close</button>
            </div>
          </div>
        </div>
      )}
      {/* Refresh popup */}
      {refreshPopupVisible && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          background: '#1890ff',
          color: '#fff',
          padding: '24px 48px',
          borderRadius: 12,
          fontSize: 22,
          fontWeight: 700,
          zIndex: 2000,
          boxShadow: '0 2px 16px rgba(0,0,0,0.18)'
        }}>
          Page refreshed
        </div>
      )}
      <h1>Edm Task Manager</h1>
      <form onSubmit={handleCreateTask} style={{ marginBottom: 24, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <select value={project} onChange={handleProjectChange} disabled={loading}>
          {PROJECT_OPTIONS.map(opt => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <select value={block} onChange={handleBlockChange} disabled={loading} style={{ minWidth: 80 }}>
            <option value="">Select block</option>
            {blockOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            <input
              value={blockInput}
              onChange={e => setBlockInput(e.target.value)}
              placeholder="Add block"
              disabled={loading}
              style={{ minWidth: 80 }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddOption('block'); } }}
            />
            <button type="button" onClick={() => handleAddOption('block')} disabled={loading || !blockInput}>Add</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <select value={ipo} onChange={e => setIpo(e.target.value)} disabled={loading || !block} style={{ minWidth: 80 }}>
            <option value="">Select IPO</option>
            {ipoOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            <input
              value={ipoInput}
              onChange={e => setIpoInput(e.target.value)}
              placeholder="Add IPO"
              disabled={loading || !block}
              style={{ minWidth: 80 }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddOption('ipo'); } }}
            />
            <button type="button" onClick={() => handleAddOption('ipo')} disabled={loading || !ipoInput || !block}>Add</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <select value={layoutRev} onChange={e => setLayoutRev(e.target.value)} disabled={loading || !block} style={{ minWidth: 80 }}>
            <option value="">Select layout rev</option>
            {layoutRevOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            <input
              value={layoutRevInput}
              onChange={e => setLayoutRevInput(e.target.value)}
              placeholder="Add layout rev"
              disabled={loading || !block}
              style={{ minWidth: 80 }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddOption('layoutRev'); } }}
            />
            <button type="button" onClick={() => handleAddOption('layoutRev')} disabled={loading || !layoutRevInput || !block}>Add</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <select value={datecode} onChange={e => setDatecode(e.target.value)} disabled={loading || !block} style={{ minWidth: 80 }}>
            <option value="">Select datecode</option>
            {datecodeOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
          <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
            <input
              value={datecodeInput}
              onChange={e => setDatecodeInput(e.target.value)}
              placeholder="Add datecode"
              disabled={loading || !block}
              style={{ minWidth: 80 }}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddOption('datecode'); } }}
            />
            <button type="button" onClick={() => handleAddOption('datecode')} disabled={loading || !datecodeInput || !block}>Add</button>
          </div>
        </div>
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
              <button onClick={() => handleRefreshTask(task.id)} style={{ marginLeft: 12, padding: '4px 14px', borderRadius: 6, border: 'none', background: '#1890ff', color: '#fff', fontWeight: 600, cursor: 'pointer' }}>Refresh</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'stretch', justifyContent: 'center', marginTop: 16 }}>
              {task.subtasks.map((group, groupIdx) => (
                <div key={groupIdx} style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 18, color: '#333', marginBottom: 6, textTransform: 'capitalize' }}>{group.group}</div>
                  {group.subtasks.map((sub, idx) => {
                    const allSubactionsDone = sub.subactions && sub.subactions.length > 0 && sub.subactions.every(sa => sa.status === 'done');
                    const subtaskStatus = allSubactionsDone ? 'done' : sub.status;
                    // Compute flat subtask index
                    const flatSubtaskIndex = task.subtasks.slice(0, groupIdx).reduce((acc, g) => acc + g.subtasks.length, 0) + idx;
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
                                      <button onClick={() => handleGenCmd(sub.title, task, sa.title)} style={{ fontSize: 11, borderRadius: 3, padding: '1px 8px', border: 'none', background: '#888', color: '#fff', marginLeft: 2, cursor: 'pointer' }}>gen cmd</button>
                                      {['done', 'stuck'].filter(s => s !== sa.status).map(s => (
                                        <button
                                          key={s}
                                          style={{ fontSize: 11, borderRadius: 3, padding: '1px 6px', border: 'none', background: STATUS_COLORS[s], color: '#fff', marginLeft: 2, cursor: 'pointer' }}
                                          onClick={() => updateSubactionStatus(task.id, flatSubtaskIndex, saIdx, s)}
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
