// client/src/components/TaskModal.jsx
import { useEffect, useState, useRef } from 'react';
import api from '../api/client';
import { useSocket } from '../context/SocketContext';
import { useAuth } from '../context/AuthContext';

export default function TaskModal({ taskId, project, onClose, onDeleted }) {
  const { socket } = useSocket();
  const { user } = useAuth();
  const [task, setTask] = useState(null);
  const [comments, setComments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [commentText, setCommentText] = useState('');
  const [posting, setPosting] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const scrollRef = useRef(null);

  useEffect(() => {
    load();
  }, [taskId]);

  useEffect(() => {
    if (!socket) return;
    function onCommentNew({ taskId: tId, comment }) {
      if (tId === taskId) setComments((prev) => [...prev, comment]);
    }
    function onTaskUpdated({ task: t }) {
      if (t._id === taskId) setTask(t);
    }
    socket.on('comment:new', onCommentNew);
    socket.on('task:updated', onTaskUpdated);
    return () => {
      socket.off('comment:new', onCommentNew);
      socket.off('task:updated', onTaskUpdated);
    };
  }, [socket, taskId]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [comments.length]);

  async function load() {
    setLoading(true);
    const res = await api.get(`/api/tasks/${taskId}`);
    setTask(res.data.task);
    setComments(res.data.comments);
    setDescDraft(res.data.task.description || '');
    setLoading(false);
  }

  async function handlePostComment(e) {
    e.preventDefault();
    if (!commentText.trim()) return;
    setPosting(true);
    try {
      const res = await api.post(`/api/tasks/${taskId}/comments`, { text: commentText });
      setComments((prev) => (prev.some((c) => c._id === res.data.comment._id) ? prev : [...prev, res.data.comment]));
      setCommentText('');
    } finally {
      setPosting(false);
    }
  }

  async function toggleAssignee(memberId) {
    const current = task.assignees.map((a) => a._id);
    const next = current.includes(memberId) ? current.filter((id) => id !== memberId) : [...current, memberId];
    const res = await api.put(`/api/tasks/${taskId}`, { assignees: next });
    setTask(res.data.task);
  }

  async function changePriority(priority) {
    const res = await api.put(`/api/tasks/${taskId}`, { priority });
    setTask(res.data.task);
  }

  async function changeStatus(status) {
    const res = await api.put(`/api/tasks/${taskId}`, { status, order: 999 });
    setTask(res.data.task);
  }

  async function saveDescription() {
    const res = await api.put(`/api/tasks/${taskId}`, { description: descDraft });
    setTask(res.data.task);
    setEditingDesc(false);
  }

  async function handleDelete() {
    if (!window.confirm('Delete this task? This cannot be undone.')) return;
    await api.delete(`/api/tasks/${taskId}`);
    onDeleted();
  }

  return (
    <div style={styles.overlay} onClick={onClose}>
      <div style={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button style={styles.closeBtn} onClick={onClose}>✕</button>

        {loading || !task ? (
          <p style={{ padding: 24 }}>Loading...</p>
        ) : (
          <div style={styles.body}>
            <div style={styles.main}>
              <input
                className="input"
                style={styles.titleInput}
                value={task.title}
                onChange={(e) => setTask({ ...task, title: e.target.value })}
                onBlur={(e) => api.put(`/api/tasks/${taskId}`, { title: e.target.value })}
              />

              <div style={styles.section}>
                <label style={styles.label}>Description</label>
                {editingDesc ? (
                  <div>
                    <textarea
                      className="input"
                      rows={4}
                      value={descDraft}
                      onChange={(e) => setDescDraft(e.target.value)}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                      <button className="btn btn-primary" onClick={saveDescription}>Save</button>
                      <button className="btn btn-ghost" onClick={() => setEditingDesc(false)}>Cancel</button>
                    </div>
                  </div>
                ) : (
                  <p
                    style={styles.descText}
                    onClick={() => { setDescDraft(task.description || ''); setEditingDesc(true); }}
                  >
                    {task.description || 'Click to add a description...'}
                  </p>
                )}
              </div>

              <div style={styles.section}>
                <label style={styles.label}>Comments</label>
                <div ref={scrollRef} style={styles.commentList}>
                  {comments.length === 0 && <p style={styles.noComments}>No comments yet. Start the discussion.</p>}
                  {comments.map((c) => (
                    <div key={c._id} style={styles.comment}>
                      <span style={{ ...styles.commentAvatar, background: c.author.avatarColor }}>
                        {c.author.name?.[0]?.toUpperCase()}
                      </span>
                      <div style={styles.commentBody}>
                        <div style={styles.commentHeader}>
                          <strong style={styles.commentAuthor}>{c.author.name}</strong>
                          <span style={styles.commentTime}>{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <p style={styles.commentText}>{c.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={handlePostComment} style={styles.commentForm}>
                  <input
                    className="input"
                    placeholder="Write a comment..."
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                  />
                  <button className="btn btn-accent" type="submit" disabled={posting}>Send</button>
                </form>
              </div>
            </div>

            <div style={styles.sidebar}>
              <div style={styles.sideSection}>
                <label style={styles.label}>Status</label>
                <select className="input" value={task.status} onChange={(e) => changeStatus(e.target.value)}>
                  {project.columns.map((col) => (
                    <option key={col} value={col}>{col}</option>
                  ))}
                </select>
              </div>

              <div style={styles.sideSection}>
                <label style={styles.label}>Priority</label>
                <select className="input" value={task.priority} onChange={(e) => changePriority(e.target.value)}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>

              <div style={styles.sideSection}>
                <label style={styles.label}>Assignees</label>
                <div style={styles.assigneeList}>
                  {project.members.map((m) => {
                    const checked = task.assignees.some((a) => a._id === m._id);
                    return (
                      <label key={m._id} style={styles.assigneeRow}>
                        <input type="checkbox" checked={checked} onChange={() => toggleAssignee(m._id)} />
                        <span style={{ ...styles.miniAvatar, background: m.avatarColor }}>
                          {m.name?.[0]?.toUpperCase()}
                        </span>
                        {m.name}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div style={styles.sideSection}>
                <label style={styles.label}>Created by</label>
                <p style={{ fontSize: '0.85rem', margin: 0 }}>{task.createdBy?.name}</p>
              </div>

              <button style={styles.deleteBtn} onClick={handleDelete}>Delete task</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: 'fixed',
    inset: 0,
    background: 'rgba(20,21,26,0.45)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    padding: 20,
  },
  modal: {
    background: 'var(--surface)',
    borderRadius: 'var(--radius)',
    width: '100%',
    maxWidth: 760,
    maxHeight: '85vh',
    overflowY: 'auto',
    position: 'relative',
    boxShadow: 'var(--shadow)',
  },
  closeBtn: { position: 'absolute', top: 14, right: 14, fontSize: '1.1rem', color: 'var(--slate)', zIndex: 1 },
  body: { display: 'flex', gap: 0 },
  main: { flex: 1, padding: '28px 24px', minWidth: 0 },
  sidebar: { width: 220, padding: '28px 20px', borderLeft: '1px solid var(--line)', flexShrink: 0 },
  titleInput: { fontFamily: 'var(--display)', fontSize: '1.3rem', border: 'none', padding: '4px 0', marginBottom: 16 },
  section: { marginTop: 20 },
  label: { display: 'block', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.03em', color: 'var(--slate)', marginBottom: 8 },
  descText: { fontSize: '0.9rem', color: 'var(--ink)', cursor: 'pointer', padding: '8px 0', minHeight: 20, whiteSpace: 'pre-wrap' },
  commentList: { maxHeight: 260, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 12 },
  noComments: { color: 'var(--slate)', fontSize: '0.85rem' },
  comment: { display: 'flex', gap: 10 },
  commentAvatar: { width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.72rem', fontWeight: 700, flexShrink: 0 },
  commentBody: { flex: 1 },
  commentHeader: { display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' },
  commentAuthor: { fontSize: '0.85rem' },
  commentTime: { fontSize: '0.7rem', color: 'var(--slate)' },
  commentText: { margin: '2px 0 0', fontSize: '0.88rem', whiteSpace: 'pre-wrap' },
  commentForm: { display: 'flex', gap: 8 },
  sideSection: { marginBottom: 22 },
  assigneeList: { display: 'flex', flexDirection: 'column', gap: 8 },
  assigneeRow: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.85rem', cursor: 'pointer' },
  miniAvatar: { width: 20, height: 20, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.6rem', fontWeight: 700 },
  deleteBtn: { color: '#b3261e', fontSize: '0.85rem', marginTop: 8 },
};