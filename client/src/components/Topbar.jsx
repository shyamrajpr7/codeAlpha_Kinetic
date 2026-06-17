// client/src/components/Topbar.jsx
import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../api/client';

export default function Topbar() {
  const { user, logout } = useAuth();
  const { notifications, setNotifications } = useSocket();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const panelRef = useRef(null);

  useEffect(() => {
    api.get('/api/notifications').then((res) => setNotifications(res.data.notifications));
  }, []);

  useEffect(() => {
    function onClick(e) {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  async function markAllRead() {
    await api.put('/api/notifications/read-all');
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  function handleLogout() {
    logout();
    navigate('/login');
  }

  return (
    <header style={styles.bar}>
      <Link to="/" style={styles.brand}>
        <span style={styles.brandMark}>B</span>
        Boardly
      </Link>

      <div style={styles.right}>
        <div ref={panelRef} style={{ position: 'relative' }}>
          <button style={styles.bellBtn} onClick={() => setOpen((o) => !o)} aria-label="Notifications">
            🔔
            {unreadCount > 0 && <span style={styles.badge}>{unreadCount}</span>}
          </button>
          {open && (
            <div style={styles.panel}>
              <div style={styles.panelHeader}>
                <strong>Notifications</strong>
                {unreadCount > 0 && (
                  <button style={styles.markRead} onClick={markAllRead}>
                    Mark all read
                  </button>
                )}
              </div>
              <div style={styles.panelList}>
                {notifications.length === 0 && <p style={styles.empty}>Nothing yet. You're all caught up.</p>}
                {notifications.map((n) => (
                  <div key={n._id} style={{ ...styles.notifItem, opacity: n.read ? 0.55 : 1 }}>
                    <p style={styles.notifMsg}>{n.message}</p>
                    <span style={styles.notifTime}>{new Date(n.createdAt).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={styles.userChip}>
          <span style={{ ...styles.avatar, background: user?.avatarColor }}>{user?.name?.[0]?.toUpperCase()}</span>
          <span>{user?.name}</span>
        </div>
        <button style={styles.logout} onClick={handleLogout}>
          Log out
        </button>
      </div>
    </header>
  );
}

const styles = {
  bar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '14px 28px',
    borderBottom: '1px solid var(--line)',
    background: 'var(--surface)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    fontFamily: 'var(--display)',
    fontSize: '1.3rem',
    fontWeight: 600,
    letterSpacing: '-0.02em',
  },
  brandMark: {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 28,
    height: 28,
    borderRadius: 7,
    background: 'var(--accent)',
    color: 'white',
    fontFamily: 'var(--display)',
    fontSize: '1rem',
  },
  right: { display: 'flex', alignItems: 'center', gap: 16 },
  bellBtn: { position: 'relative', fontSize: '1.1rem', padding: 6 },
  badge: {
    position: 'absolute',
    top: -2,
    right: -2,
    background: 'var(--accent)',
    color: 'white',
    borderRadius: '50%',
    fontSize: '0.65rem',
    width: 16,
    height: 16,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  panel: {
    position: 'absolute',
    right: 0,
    top: '120%',
    width: 320,
    background: 'var(--surface)',
    border: '1px solid var(--line)',
    borderRadius: 'var(--radius)',
    boxShadow: 'var(--shadow)',
    zIndex: 20,
  },
  panelHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 16px',
    borderBottom: '1px solid var(--line)',
  },
  markRead: { fontSize: '0.78rem', color: 'var(--accent)', fontWeight: 600 },
  panelList: { maxHeight: 320, overflowY: 'auto' },
  empty: { padding: 16, color: 'var(--slate)', fontSize: '0.85rem' },
  notifItem: { padding: '10px 16px', borderBottom: '1px solid var(--line)' },
  notifMsg: { margin: 0, fontSize: '0.85rem' },
  notifTime: { fontSize: '0.72rem', color: 'var(--slate)' },
  userChip: { display: 'flex', alignItems: 'center', gap: 8, fontSize: '0.88rem' },
  avatar: {
    width: 26,
    height: 26,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'white',
    fontSize: '0.75rem',
    fontWeight: 700,
  },
  logout: { fontSize: '0.85rem', color: 'var(--slate)' },
};