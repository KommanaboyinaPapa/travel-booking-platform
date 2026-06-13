import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';

const NAV_LINKS = [
  { to: '/',                  label: '🏠 Home' },
  { to: '/hotels',            label: '🏨 Hotels' },
  { to: '/flights',           label: '✈️ Flights' },
  { to: '/live-flight-status',label: '📡 Live Status' },
  { to: '/my-bookings',       label: '📋 My Bookings' },
  { to: '/dashboard',         label: '📊 Dashboard' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const initials = user?.name
    ? user.name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
    : '?';

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <NavLink to="/" className="brand" onClick={() => setMenuOpen(false)}>
          ✈️ TravelBook<span className="brand-dot" />
        </NavLink>

        <button className={`hamburger${menuOpen ? ' open' : ''}`} onClick={() => setMenuOpen(v => !v)} aria-label="Toggle navigation menu">
          <span /><span /><span />
        </button>

        <div className={`nav-menu${menuOpen ? ' open' : ''}`}>
          <div className="nav-links">
            {NAV_LINKS.map(link => (
              <NavLink key={link.to} to={link.to} end={link.to === '/'} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setMenuOpen(false)}>
                {link.label}
              </NavLink>
            ))}
            {user?.role === 'admin' && (
              <NavLink to="/admin-reviews" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setMenuOpen(false)}>
                🛡️ Admin
              </NavLink>
            )}
          </div>
          <div className="nav-user">
            {!user ? (
              <>
                <NavLink to="/login" className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`} onClick={() => setMenuOpen(false)}>Login</NavLink>
                <NavLink to="/register" className="button button-sm" style={{ background: '#f5a623', color: '#1a2340', borderRadius: '999px', padding: '7px 18px', fontWeight: 700, border: 'none' }} onClick={() => setMenuOpen(false)}>
                  Sign Up
                </NavLink>
              </>
            ) : (
              <>
                <span className="nav-username">{user.name}</span>
                <div className="nav-avatar" title={user.name}>{initials}</div>
                <button onClick={logout} className="button button-sm button-ghost" style={{ color: 'rgba(255,255,255,0.82)', borderColor: 'rgba(255,255,255,0.3)' }}>
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
