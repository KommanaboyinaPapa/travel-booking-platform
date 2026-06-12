import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth.js';
import RecommendationSection from '../components/RecommendationSection.jsx';

const FEATURES = [
  { icon: '🏨', title: 'Hotels',   desc: 'Curated stays for every budget — beachside, mountain, urban.', to: '/hotels',   cta: 'Browse Hotels' },
  { icon: '✈️', title: 'Flights',  desc: 'Compare fares, check live status, freeze prices before booking.', to: '/flights',  cta: 'Search Flights' },
  { icon: '📋', title: 'Bookings', desc: 'All your reservations in one place with instant cancel & refund.', to: '/my-bookings', cta: 'My Bookings' },
  { icon: '📡', title: 'Live Status', desc: 'Real-time flight tracking with boarding & delay alerts.', to: '/live-flight-status', cta: 'Track Flights' },
];

const INTERNSHIP_FEATURES = [
  { icon: '💸', title: 'Cancellation & Refund', desc: 'Automated policy-based refunds processed instantly.', to: '/my-bookings' },
  { icon: '⭐', title: 'Reviews & Ratings', desc: 'Verified user reviews with helpfulness voting and admin moderation.', to: '/hotels' },
  { icon: '📡', title: 'Live Flight Status', desc: 'Real-time updates, delay tracking, and boarding alerts.', to: '/live-flight-status' },
  { icon: '💺', title: 'Seat & Room Selection', desc: 'Visual interactive seat maps and room availability previews.', to: '/flights' },
  { icon: '📊', title: 'Dynamic Pricing', desc: 'Demand-based pricing algorithm with 30-minute price freeze.', to: '/hotels' },
  { icon: '🧠', title: 'Personalized Recommendations', desc: 'AI-driven suggestions based on your unique booking history.', to: '/dashboard' },
];

export default function Home() {
  const { user } = useAuth();

  return (
    <div>
      {/* ── Hero ── */}
      <div className="hero-panel">
        <h1>Your World.<br />One Platform.</h1>
        <p className="hero-tagline">
          Search hotels & flights, select seats, freeze prices, and manage
          every trip — all from a single, beautifully simple dashboard.
        </p>
        <div className="hero-actions">
          <Link to="/hotels"  className="hero-btn-white">🏨 Browse Hotels</Link>
          <Link to="/flights" className="hero-btn-outline">✈️ Search Flights</Link>
        </div>
        <div className="hero-stats">
          <div className="hero-stat-item"><span className="hero-stat-value">500+</span><span className="hero-stat-label">Hotels</span></div>
          <div className="hero-stat-item"><span className="hero-stat-value">1,200+</span><span className="hero-stat-label">Flights</span></div>
          <div className="hero-stat-item"><span className="hero-stat-value">98%</span><span className="hero-stat-label">Satisfaction</span></div>
          <div className="hero-stat-item"><span className="hero-stat-value">24/7</span><span className="hero-stat-label">Support</span></div>
        </div>
      </div>

      {/* ── Internship Features Showcase ── */}
      <div style={{ marginTop: '40px' }}>
        <h2 className="section-title">Internship Features Showcase</h2>
        <p className="section-subtitle">Explore the 6 core capabilities built during this internship.</p>
        <div className="grid-list" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
          {INTERNSHIP_FEATURES.map(f => (
            <Link to={f.to} key={f.title} className="card feature-card" style={{ textDecoration: 'none', gap: '16px' }}>
              <div style={{ fontSize: '2.5rem' }}>{f.icon}</div>
              <div>
                <h3 style={{ marginBottom: '8px', color: 'var(--brand-primary)', fontSize: '1.2rem' }}>{f.title}</h3>
                <p className="text-muted" style={{ fontSize: '0.95rem', lineHeight: '1.5', margin: 0 }}>{f.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recommendations (auth only) ── */}
      {user && (
        <div className="page-card" style={{ marginTop: '24px' }}>
          <RecommendationSection compact />
        </div>
      )}

      {/* ── Feature cards ── */}
      <div style={{ marginTop: '28px' }}>
        <h2 className="section-title">Everything You Need</h2>
        <p className="section-subtitle">A complete platform for the modern traveller.</p>
        <div className="grid-list card-grid">
          {FEATURES.map(f => (
            <div key={f.title} className="card" style={{ gap: '12px' }}>
              <div style={{ fontSize: '2rem' }}>{f.icon}</div>
              <div>
                <h3 style={{ marginBottom: '6px' }}>{f.title}</h3>
                <p className="text-muted" style={{ fontSize: '0.875rem' }}>{f.desc}</p>
              </div>
              <div className="card-actions" style={{ marginTop: 'auto' }}>
                <Link to={f.to} className="button button-outline button-sm">{f.cta}</Link>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Why TravelBook ── */}
      <div className="page-card" style={{ marginTop: '28px', background: 'linear-gradient(135deg,#f0f4ff,#e8f0fe)' }}>
        <h2 className="section-title" style={{ textAlign: 'center' }}>Why TravelBook?</h2>
        <div className="grid-list" style={{ gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: '20px', marginTop: '20px' }}>
          {[
            { icon: '🔒', label: 'Price Freeze',     desc: 'Lock today\'s price for 30 min — no surprises at checkout.' },
            { icon: '📊', label: 'Dynamic Pricing',  desc: 'See exactly why a price moved with a full breakdown.' },
            { icon: '🌟', label: 'AI Recommendations',desc: 'Personalised picks that learn from your travel history.' },
            { icon: '💸', label: 'Smart Refunds',     desc: 'Cancel anytime — automatic refund calculation.' },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center', padding: '16px 8px' }}>
              <div style={{ fontSize: '2rem', marginBottom: '8px' }}>{item.icon}</div>
              <p style={{ fontWeight: 700, marginBottom: '6px', color: 'var(--text-primary)' }}>{item.label}</p>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
