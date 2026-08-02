import { useState, useEffect, createContext, useContext } from 'react';
import { BrowserRouter, Routes, Route, NavLink, Navigate, useNavigate } from 'react-router-dom';
import { api } from './api';
import Dashboard from './pages/Dashboard';
import CategoryPage from './pages/CategoryPage';
import CreditCardsPage from './pages/CreditCardsPage';
import SettingsPage from './pages/SettingsPage';
import './index.css';

// ─── THEME CONTEXT ───────────────────────────────────────────
export const ThemeContext = createContext(null);
export const useTheme = () => useContext(ThemeContext);

function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(t => (t === 'light' ? 'dark' : 'light'));

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

// ─── AUTH CONTEXT ────────────────────────────────────────────
const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.me().then(setUser).catch(() => setUser(null)).finally(() => setLoading(false));
    const handleLogout = () => setUser(null);
    window.addEventListener('auth:logout', handleLogout);
    return () => window.removeEventListener('auth:logout', handleLogout);
  }, []);

  const login = async (username, password) => {
    const u = await api.login(username, password);
    setUser(u);
    return u;
  };

  const register = async (username, displayName, password) => {
    const u = await api.register(username, displayName, password);
    setUser(u);
    return u;
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
  };

  if (loading) {
    return (
      <div className="login-page">
        <div style={{ textAlign: 'center' }}>
          <div className="login-logo-icon" style={{ margin: '0 auto 16px', fontSize: 32 }}>₩</div>
          <div style={{ color: 'var(--text-muted)', fontSize: 14 }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// ─── TOAST SYSTEM ────────────────────────────────────────────
const ToastContext = createContext(null);
export const useToast = () => useContext(ToastContext);

function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 3500);
  };

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast toast-${t.type}`}>
            {t.type === 'success' ? '✓' : '✕'} {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// ─── LOGIN PAGE ──────────────────────────────────────────────
function LoginPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      if (isRegister) {
        await register(username, displayName || username, password);
      } else {
        await login(username, password);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card animate-in">
        <div className="login-logo">
          <div className="login-logo-icon">₩</div>
          <div className="login-logo-text">WealthPulse</div>
          <div className="login-logo-sub">Personal Finance Tracker</div>
        </div>
        <form className="login-form" onSubmit={handleSubmit}>
          {error && <div className="login-error">{error}</div>}
          <div className="input-group">
            <label className="input-label">Username</label>
            <input className="input" type="text" value={username} onChange={e => setUsername(e.target.value)} placeholder="Enter username" required autoFocus />
          </div>
          {isRegister && (
            <div className="input-group">
              <label className="input-label">Display Name</label>
              <input className="input" type="text" value={displayName} onChange={e => setDisplayName(e.target.value)} placeholder="Your name" />
            </div>
          )}
          <div className="input-group">
            <label className="input-label">Password</label>
            <input className="input" type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter password" required />
          </div>
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? 'Please wait...' : (isRegister ? 'Create Account' : 'Sign In')}
          </button>
          <div className="login-toggle">
            {isRegister ? 'Already have an account? ' : "Don't have an account? "}
            <a onClick={() => { setIsRegister(!isRegister); setError(''); }}>
              {isRegister ? 'Sign In' : 'Register'}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── SIDEBAR ─────────────────────────────────────────────────
function Sidebar({ categories }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const investmentCats = categories.filter(c => c.category_type === 'investment');
  const otherCats = categories.filter(c => c.category_type !== 'investment');

  return (
    <div className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-icon">₩</div>
        <div className="sidebar-brand-text">WealthPulse</div>
      </div>

      <nav className="sidebar-nav">
        <NavLink to="/" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="sidebar-link-icon">🏠</span>
          <span className="sidebar-link-text">Dashboard</span>
        </NavLink>

        <div className="sidebar-section-label">Investments</div>
        {investmentCats.map(cat => (
          <NavLink key={cat.id} to={`/category/${cat.slug}`} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-link-icon">{cat.icon}</span>
            <span className="sidebar-link-text">{cat.name}</span>
          </NavLink>
        ))}

        <div className="sidebar-section-label">Finance</div>
        {otherCats.map(cat => {
          const path = cat.category_type === 'credit_card' ? `/credit-cards/${cat.slug}` : `/category/${cat.slug}`;
          return (
            <NavLink key={cat.id} to={path} className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-link-icon">{cat.icon}</span>
              <span className="sidebar-link-text">{cat.name}</span>
            </NavLink>
          );
        })}

        <div className="sidebar-section-label">System</div>
        <NavLink to="/settings" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
          <span className="sidebar-link-icon">⚙️</span>
          <span className="sidebar-link-text">Settings</span>
        </NavLink>
        <a className="sidebar-link" onClick={() => api.exportExcel()} style={{ cursor: 'pointer' }}>
          <span className="sidebar-link-icon">⬇️</span>
          <span className="sidebar-link-text">Export All</span>
        </a>
      </nav>

      <div className="sidebar-footer">
        <div className="sidebar-user" onClick={() => { if (confirm('Logout?')) { logout(); navigate('/'); } }}>
          <div className="sidebar-user-avatar">{user?.display_name?.[0]?.toUpperCase() || 'U'}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.display_name}</div>
            <div className="sidebar-user-role">@{user?.username}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────
function AppRoutes() {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    if (user) {
      api.getCategories().then(setCategories).catch(console.error);
    }
  }, [user]);

  const refreshCategories = () => api.getCategories().then(setCategories);

  if (!user) return <LoginPage />;

  return (
    <div className="app-layout">
      <Sidebar categories={categories} />
      <div className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard categories={categories} />} />
          <Route path="/category/:slug" element={<CategoryPage categories={categories} />} />
          <Route path="/credit-cards/:slug" element={<CreditCardsPage categories={categories} />} />
          <Route path="/settings" element={<SettingsPage categories={categories} onRefresh={refreshCategories} />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <AuthProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </AuthProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
