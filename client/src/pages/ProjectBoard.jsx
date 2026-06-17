// client/src/pages/ProjectBoard.jsx
import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api/client';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';
import Topbar from '../components/Topbar';
import TaskModal from '../components/TaskModal';

export default function ProjectBoard() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTaskId, setActiveTaskId] = useState(null);
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteMsg, setInviteMsg] = useState('');
  const [addingTo, setAddingTo] = useState(null);
  const [newTitle, setNewTitle] = useState('');
  const [dragTaskId, setDragTaskId] = useState(null);

  useEffect(() => {
    loadAll();
  }, [id]);

  useEffect(() => {
    if (!socket) return;
    socket.emit('project:join', id);

    function onTaskCreated({ task }) {
      setTasks((prev) => (prev.some((t) => t._id === task._id) ? prev : [...prev, task]));
    }
    function onTaskUpdated({ task }) {
      setTasks((prev) => prev.map((t) => (t._id === task._id ? task : t)));
    }
    function onTaskDeleted({ taskId }) {
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    }
    function onProjectUpdated({ project: p }) {
      setProject(p);
    }
    function onMemberAdded({ user: newMember }) {
      setProject((prev) => (prev ? { ...prev, members: [...prev.members, newMember] } : prev));
    }

    socket.on('task:created', onTaskCreated);
    socket.on('task:updated', onTaskUpdated);
    socket.on('task:deleted', onTaskDeleted);
    socket.on('project:updated', onProjectUpdated);
    socket.on('project:memberAdded', onMemberAdded);

    return () => {
      socket.emit('project:leave', id);
      socket.off('task:created', onTaskCreated);
      socket.off('task:updated', onTaskUpdated);
      socket.off('task:deleted', onTaskDeleted);
      socket.off('project:updated', onProjectUpdated);
      socket.off('project:memberAdded', onMemberAdded);
    };
  }, [socket, id]);

  async function loadAll() {
    setLoading(true);
    try {
      const [projRes, tasksRes] = await Promise.all([
        api.get(`/api/projects/${id}`),
        api.get(`/api/tasks/project/${id}`),
      ]);
      setProject(projRes.data.project);
      setTasks(tasksRes.data.tasks);
    } catch (err) {
      navigate('/');
    } finally {
      setLoading(false);
    }
  }

  const tasksByColumn = useCallback(
    (col) => tasks.filter((t) => t.status === col).sort((a, b) => a.order - b.order),
    [tasks]
  );

  async function handleInvite(e) {
    e.preventDefault();
    setInviteMsg('');
    try {
      const res = await api.post(`/api/projects/${id}/members`, { email: inviteEmail });
      setProject(res.data.project);
      setInviteEmail('');
      setInviteMsg('Member added!');
    } catch (err) {
      setInviteMsg(err.response?.data?.message || 'Failed to add member');
    }
  }

  async function handleAddTask(column) {
    if (!newTitle.trim()) {
      setAddingTo(null);
      return;
    }
    const res = await api.post('/api/tasks', { project: id, title: newTitle, status: column });
    setTasks((prev) => [...prev, res.data.task]);
    setNewTitle('');
    setAddingTo(null);
  }

  function handleDrop(column) {
    if (!dragTaskId) return;
    const task = tasks.find((t) => t._id === dragTaskId);
    if (!task || task.status === column) {
      setDragTaskId(null);
      return;
    }
    const newOrder = tasksByColumn(column).length;
    setTasks((prev) => prev.map((t) => (t._id === dragTaskId ? { ...t, status: column, order: newOrder } : t)));
    api.put(`/api/tasks/${dragTaskId}`, { status: column, order: newOrder });
    setDragTaskId(null);
  }

  if (loading) return <div style={{ padding: 40 }}>Loading board...</div>;
  if (!project) return null;

  return (
    <div>
      <Topbar />
      <div style={styles.header}>
        <div>
          <button style={styles.backBtn} onClick={() => navigate('/')}>← All projects</button>
          <h1 style={styles.title}>{project.name}</h1>
          {project.description && <p style={styles.desc}>{project.description}</p>}
        </div>
        <div style={styles.headerActions}>
          <div style={styles.avatars}>
            {project.members.map((m) => (
              <span key={m._id} style={{ ...styles.avatar, background: m.avatarColor }} title={m.name}>
                {m.name?.[0]?.toUpperCase()}
              </span>
            ))}
          </div>
          <button className="btn btn-ghost" onClick={() => setShowInvite((s) => !s)}>+ Invite</button>
        </div>
      </div>

      {showInvite && (
        <form style={styles.inviteBar} onSubmit={handleInvite}>
          <input
            className="input"
            placeholder="teammate@email.com"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            style={{ maxWidth: 280 }}
            required
          />
          <button className="btn btn-primary" type="submit">Add</button>
          {inviteMsg && <span style={styles.inviteMsg}>{inviteMsg}</span>}
        </form>
      )}

      <div style={styles.board}>
        {project.columns.map((col) => (
          <div
            key={col}
            style={styles.column}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(col)}
          >
            <div style={styles.columnHeader}>
              <span>{col}</span>
              <span style={styles.count}>{tasksByColumn(col).length}</span>
            </div>

            <div style={styles.cardList}>
              {tasksByColumn(col).map((task) => (
                <div
                  key={task._id}
                  draggable
                  onDragStart={() => setDragTaskId(task._id)}
                  style={styles.card}
                  onClick={() => setActiveTaskId(task._id)}
                >
                  <p style={styles.cardTitle}>{task.title}</p>
                  <div style={styles.cardMeta}>
                    <span style={{ ...styles.priority, ...priorityStyle(task.priority) }}>{task.priority}</span>
                    {task.assignees?.length > 0 && (
                      <div style={styles.cardAvatars}>
                        {task.assignees.slice(0, 3).map((a) => (
                          <span key={a._id} style={{ ...styles.miniAvatar, background: a.avatarColor }} title={a.name}>
                            {a.name?.[0]?.toUpperCase()}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {addingTo === col ? (
              <div style={styles.addForm}>
                <input
                  className="input"
                  autoFocus
                  placeholder="Task title"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddTask(col)}
                />
                <div style={styles.addActions}>
                  <button className="btn btn-primary" onClick={() => handleAddTask(col)}>Add</button>
                  <button className="btn btn-ghost" onClick={() => { setAddingTo(null); setNewTitle(''); }}>Cancel</button>
                </div>
              </div>
            ) : (
              <button style={styles.addCardBtn} onClick={() => setAddingTo(col)}>+ Add task</button>
            )}
          </div>
        ))}
      </div>

      {activeTaskId && (
        <TaskModal
          taskId={activeTaskId}
          project={project}
          onClose={() => setActiveTaskId(null)}
          onDeleted={() => setActiveTaskId(null)}
        />
      )}
    </div>
  );
}

function priorityStyle(priority) {
  if (priority === 'High') return { background: '#fdecea', color: '#b3261e' };
  if (priority === 'Low') return { background: 'var(--moss-soft)', color: 'var(--moss)' };
  return { background: '#fff4e0', color: '#9a6700' };
}

const styles = {
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    padding: '24px 28px 12px',
  },
  backBtn: { fontSize: '0.82rem', color: 'var(--slate)', marginBottom: 8 },
  title: { fontFamily: 'var(--display)', fontSize: '1.7rem', margin: 0 },
  desc: { color: 'var(--slate)', margin: '4px 0 0', fontSize: '0.9rem' },
  headerActions: { display: 'flex', alignItems: 'center', gap: 14 },
  avatars: { display: 'flex' },
  avatar: {
    width: 30,
    height: 30,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: 700,
    marginLeft: -8,
    border: '2px solid var(--paper)',
  },
  inviteBar: { display: 'flex', alignItems: 'center', gap: 10, padding: '0 28px 16px' },
  inviteMsg: { fontSize: '0.85rem', color: 'var(--moss)' },
  board: { display: 'flex', gap: 16, padding: '0 28px 32px', overflowX: 'auto', alignItems: 'flex-start' },
  column: {
    background: '#f1efe8',
    borderRadius: 'var(--radius)',
    minWidth: 280,
    width: 280,
    padding: 12,
    flexShrink: 0,
  },
  columnHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    fontWeight: 700,
    fontSize: '0.85rem',
    padding: '4px 6px 10px',
    textTransform: 'uppercase',
    letterSpacing: '0.03em',
    color: 'var(--slate)',
  },
  count: {
    background: 'var(--surface)',
    borderRadius: 10,
    padding: '1px 8px',
    fontSize: '0.78rem',
  },
  cardList: { display: 'flex', flexDirection: 'column', gap: 8, minHeight: 10 },
  card: {
    background: 'var(--surface)',
    borderRadius: 8,
    padding: '10px 12px',
    boxShadow: '0 1px 2px rgba(20,21,26,0.06)',
    cursor: 'grab',
  },
  cardTitle: { margin: '0 0 8px', fontSize: '0.9rem', fontWeight: 500 },
  cardMeta: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  priority: { fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px', borderRadius: 6 },
  cardAvatars: { display: 'flex' },
  miniAvatar: {
    width: 20,
    height: 20,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '0.6rem',
    fontWeight: 700,
    marginLeft: -6,
    border: '1.5px solid var(--surface)',
  },
  addCardBtn: { width: '100%', textAlign: 'left', padding: '8px 6px', color: 'var(--slate)', fontSize: '0.85rem' },
  addForm: { marginTop: 6 },
  addActions: { display: 'flex', gap: 8, marginTop: 8 },
};