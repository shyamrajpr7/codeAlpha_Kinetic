// client/src/pages/Login.jsx
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={styles.page}>
      <form style={styles.card} onSubmit={handleSubmit}>
        <div style={styles.brand}>
          <span style={styles.brandMark}>B</span>
          Boardly
        </div>
        <h1 style={styles.title}>Welcome back</h1>
        <p style={styles.subtitle}>Log in to your projects</p>

        {error && <div style={styles.error}>{error}</div>}

        <label style={styles.label}>Email</label>
        <input
          className="input"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoFocus
        />

        <label style={styles.label}>Password</label>
        <input
          className="input"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <button className="btn btn-accent" style={styles.submit} disabled={loading} type="submit">
          {loading ? 'Logging in...' : 'Log in'}
        </button>

        <p style={styles.footer}>
          No account? <Link to="/register" style={styles.link}>Create one</Link>
        </p>
      </form>
    </div>
  );
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'var(--paper)',
    padding: 20,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
    padding: '32px 28px',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontFamily: 'var(--display)',
    fontSize: '1.2rem',
    fontWeight: 600,
    marginBottom: 28,
  },
  brandMark: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 26,
    height: 26,
    borderRadius: 7,
    background: 'var(--accent)',
    color: 'white',
    fontFamily: 'var(--display)',
    fontSize: '0.95rem',
  },
  title: { fontFamily: 'var(--display)', fontSize: '1.6rem', margin: '0 0 4px' },
  subtitle: { color: 'var(--slate)', margin: '0 0 20px', fontSize: '0.92rem' },
  label: { display: 'block', fontSize: '0.82rem', fontWeight: 600, margin: '14px 0 6px' },
  submit: { width: '100%', justifyContent: 'center', marginTop: 22, padding: '11px 16px' },
  footer: { textAlign: 'center', fontSize: '0.88rem', color: 'var(--slate)', marginTop: 18 },
  link: { color: 'var(--accent)', fontWeight: 600 },
  error: {
    background: '#fdecea',
    color: '#b3261e',
    padding: '9px 12px',
    borderRadius: 8,
    fontSize: '0.85rem',
    marginBottom: 14,
  },
};