// client/src/pages/Dashboard.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/client';
import Topbar from '../components/Topbar';

export default function Dashboard() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    loadProjects();
  }, []);

  async function loadProjects() {
    setLoading(true);
    const res = await api.get('/api/projects');
    setProjects(res.data.projects);
    setLoading(false);
  }

  async function handleCreate(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      const res = await api.post('/api/projects', { name, description });
      setProjects((prev) => [res.data.project, ...prev]);
      setName('');
      setDescription('');
      setShowForm(false);
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <Topbar />
      <div style={styles.container}>
        <div style={styles.header}>
          <div>
            <h1 style={styles.title}>Your projects</h1>
            <p style={styles.subtitle}>{projects.length} active {projects.length === 1 ? 'project' : 'projects'}</p>
          </div>
          <button className="btn btn-accent" onClick={() => setShowForm((s) => !s)}>
            + New project
          </button>
        </div>

        {showForm && (
          <form style={styles.formCard} onSubmit={handleCreate}>
            <input
              className="input"
              placeholder="Project name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
              required
            />
            <textarea
              className="input"
              placeholder="Description (optional)"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              style={{ marginTop: 10, resize: 'vertical' }}
            />
            <div style={styles.formActions}>
              <button type="button" className="btn btn-ghost" onClick={() => setShowForm(false)}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={creating}>
                {creating ? 'Creating...' : 'Create project'}
              </button>
            </div>
          </form>
        )}

        {loading ? (
          <p style={styles.empty}>Loading...</p>
        ) : projects.length === 0 ? (
          <div style={styles.emptyState}>
            <p>No projects yet. Create your first one to get started.</p>
          </div>
        ) : (
          <div style={styles.grid}>
            {projects.map((p) => (
              <div key={p._id} style={styles.card} onClick={() => navigate(`/projects/${p._id}`)}>
                <h3 style={styles.cardTitle}>{p.name}</h3>
                <p style={styles.cardDesc}>{p.description || 'No description'}</p>
                <div style={styles.cardFooter}>
                  <div style={styles.avatars}>
                    {p.members.slice(0, 4).map((m) => (
                      <span key={m._id} style={{ ...styles.avatar, background: m.avatarColor }} title={m.name}>
                        {m.name?.[0]?.toUpperCase()}
                      </span>
                    ))}
                  </div>
                  <span style={styles.memberCount}>{p.members.length} member{p.members.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const styles = {
  container: { maxWidth: 1000, margin: '0 auto', padding: '32px 24px' },
  header: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  title: { fontFamily: 'var(--display)', fontSize: '1.9rem', margin: 0 },
  subtitle: { color: 'var(--slate)', margin: '4px 0 0', fontSize: '0.92rem' },
  formCard: {
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius)',
    padding: 18,
    marginBottom: 24,
  },
  formActions: { display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 },
  card: {
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius)',
    padding: 18,
    cursor: 'pointer',
    transition: 'box-shadow 0.15s ease, transform 0.15s ease',
  },
  cardTitle: { fontFamily: 'var(--display)', fontSize: '1.15rem', margin: '0 0 6px' },
  cardDesc: {
    color: 'var(--slate)',
    fontSize: '0.88rem',
    margin: '0 0 16px',
    minHeight: 36,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    display: '-webkit-box',
    WebkitLineClamp: 2,
    WebkitBoxOrient: 'vertical',
  },
  cardFooter: { display: 'flex', justifyContent: 'space-between', alignItems: 'center' },
  avatars: { display: 'flex' },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '0.7rem',
    fontWeight: 700,
    marginLeft: -8,
    border: '2px solid var(--surface)',
  },
  memberCount: { fontSize: '0.78rem', color: 'var(--slate)' },
  empty: { color: 'var(--slate)' },
  emptyState: {
    textAlign: 'center',
    padding: '60px 20px',
    color: 'var(--slate)',
    border: '1px dashed var(--line)',
    borderRadius: 'var(--radius)',
  },
};