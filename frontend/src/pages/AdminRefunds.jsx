import { useEffect, useState } from 'react';
import { getAllRefunds, updateRefundStatus } from '../services/api.js';
import { useAuth } from '../hooks/useAuth.js';

export default function AdminRefunds() {
  const { user } = useAuth();
  const [refunds, setRefunds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [updatingRefundId, setUpdatingRefundId] = useState(null);

  useEffect(() => {
    if (user?.role !== 'admin') {
      setError('Access denied. Admin privileges required.');
      setLoading(false);
      return;
    }
    loadRefunds();
  }, [user]);

  async function loadRefunds() {
    try {
      const res = await getAllRefunds();
      setRefunds(res.refunds || []);
    } catch (err) {
      setError(err.message || 'Failed to load refunds.');
    } finally {
      setLoading(false);
    }
  }

  async function handleStatusUpdate(refundId, newStatus) {
    setUpdatingRefundId(refundId);
    try {
      await updateRefundStatus(refundId, newStatus);
      await loadRefunds();
      setMessage(`Refund #${refundId} status updated to ${newStatus}`);
      setTimeout(() => setMessage(''), 4000);
    } catch (err) {
      setError(err.message || 'Failed to update refund status.');
      setTimeout(() => setError(''), 5000);
    } finally {
      setUpdatingRefundId(null);
    }
  }

  // Filter refunds
  const filteredRefunds = refunds.filter(refund => {
    const matchesSearch = !searchTerm || 
      refund.bookingId.toString().includes(searchTerm) ||
      refund.userName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      refund.userEmail?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || refund.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  // Status badge helper
  function StatusBadge({ status }) {
    const styles = {
      Pending: { bg: '#fef3c7', text: '#92400e', icon: '⏳' },
      Processed: { bg: '#dbeafe', text: '#1e40af', icon: '⚙️' },
      Completed: { bg: '#d1fae5', text: '#065f46', icon: '✅' },
    };
    const style = styles[status] || styles.Pending;
    return (
      <span style={{ 
        background: style.bg, 
        color: style.text, 
        padding: '4px 12px', 
        borderRadius: '999px', 
        fontSize: '12px', 
        fontWeight: '700' 
      }}>
        {style.icon} {status}
      </span>
    );
  }

  if (user?.role !== 'admin') {
    return (
      <div className="page-card">
        <div className="alert alert-error">
          <span>⛔</span> Access denied. Admin privileges required.
        </div>
      </div>
    );
  }

  return (
    <div className="page-card">
      <div style={{ marginBottom: 'var(--sp-6)' }}>
        <h2 className="section-title">🛡️ Refund Management</h2>
        <p className="section-subtitle">Manage all refund requests and update statuses</p>
      </div>

      {message && <div className="alert alert-success"><span>✅</span> {message}</div>}
      {error && <div className="alert alert-error"><span>⚠️</span> {error}</div>}

      {/* Filters */}
      <div className="admin-filters" style={{ 
        display: 'flex', 
        gap: 'var(--sp-3)', 
        marginBottom: 'var(--sp-5)', 
        flexWrap: 'wrap' 
      }}>
        <div className="form-field" style={{ flex: '1 1 300px', margin: 0 }}>
          <label htmlFor="search">Search by Booking ID or User</label>
          <input
            id="search"
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="form-field" style={{ flex: '0 0 200px', margin: 0 }}>
          <label htmlFor="statusFilter">Filter by Status</label>
          <select id="statusFilter" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
            <option value="all">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Processed">Processed</option>
            <option value="Completed">Completed</option>
          </select>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="admin-stats-grid" style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: 'var(--sp-4)', 
        marginBottom: 'var(--sp-5)' 
      }}>
        <div className="stat-card" style={{ 
          background: '#fef3c7', 
          padding: 'var(--sp-4)', 
          borderRadius: 'var(--r-card)', 
          border: '2px solid #fbbf24' 
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 'var(--sp-2)' }}>⏳</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#92400e' }}>
            {refunds.filter(r => r.status === 'Pending').length}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#92400e', marginTop: 'var(--sp-1)' }}>
            Pending Refunds
          </div>
        </div>

        <div className="stat-card" style={{ 
          background: '#dbeafe', 
          padding: 'var(--sp-4)', 
          borderRadius: 'var(--r-card)', 
          border: '2px solid #3b82f6' 
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 'var(--sp-2)' }}>⚙️</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#1e40af' }}>
            {refunds.filter(r => r.status === 'Processed').length}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#1e40af', marginTop: 'var(--sp-1)' }}>
            Processing
          </div>
        </div>

        <div className="stat-card" style={{ 
          background: '#d1fae5', 
          padding: 'var(--sp-4)', 
          borderRadius: 'var(--r-card)', 
          border: '2px solid #10b981' 
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 'var(--sp-2)' }}>✅</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#065f46' }}>
            {refunds.filter(r => r.status === 'Completed').length}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#065f46', marginTop: 'var(--sp-1)' }}>
            Completed
          </div>
        </div>

        <div className="stat-card" style={{ 
          background: '#f3f4f6', 
          padding: 'var(--sp-4)', 
          borderRadius: 'var(--r-card)', 
          border: '2px solid #9ca3af' 
        }}>
          <div style={{ fontSize: '1.5rem', marginBottom: 'var(--sp-2)' }}>💰</div>
          <div style={{ fontSize: '1.8rem', fontWeight: '800', color: '#374151' }}>
            ${refunds.reduce((sum, r) => sum + Number(r.refundAmount), 0).toFixed(2)}
          </div>
          <div style={{ fontSize: '0.875rem', color: '#374151', marginTop: 'var(--sp-1)' }}>
            Total Refunds
          </div>
        </div>
      </div>

      {/* Refunds Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 'var(--sp-8)' }}>
          <div className="skeleton" style={{ height: '400px', borderRadius: 'var(--r-card)' }} />
        </div>
      ) : filteredRefunds.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 'var(--sp-8)', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 'var(--sp-3)' }}>📋</div>
          <p style={{ fontWeight: '700', fontSize: '1.1rem', color: 'var(--text-primary)' }}>
            {searchTerm || filterStatus !== 'all' ? 'No refunds match your filters' : 'No refunds found'}
          </p>
        </div>
      ) : (
        <div className="admin-refunds-table" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ 
                background: 'var(--bg-secondary)', 
                borderBottom: '2px solid var(--border)' 
              }}>
                <th style={{ padding: 'var(--sp-3)', textAlign: 'left', fontWeight: '700' }}>Booking ID</th>
                <th style={{ padding: 'var(--sp-3)', textAlign: 'left', fontWeight: '700' }}>User</th>
                <th style={{ padding: 'var(--sp-3)', textAlign: 'left', fontWeight: '700' }}>Amount</th>
                <th style={{ padding: 'var(--sp-3)', textAlign: 'left', fontWeight: '700' }}>Percentage</th>
                <th style={{ padding: 'var(--sp-3)', textAlign: 'left', fontWeight: '700' }}>Reason</th>
                <th style={{ padding: 'var(--sp-3)', textAlign: 'left', fontWeight: '700' }}>Status</th>
                <th style={{ padding: 'var(--sp-3)', textAlign: 'left', fontWeight: '700' }}>Expected Date</th>
                <th style={{ padding: 'var(--sp-3)', textAlign: 'left', fontWeight: '700' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRefunds.map(refund => (
                <tr key={refund.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: 'var(--sp-3)' }}>
                    <span className="tag tag-blue">#{refund.bookingId}</span>
                  </td>
                  <td style={{ padding: 'var(--sp-3)' }}>
                    <div style={{ fontSize: '0.875rem' }}>
                      <div style={{ fontWeight: '600' }}>{refund.userName || 'N/A'}</div>
                      <div className="text-muted" style={{ fontSize: '0.75rem' }}>{refund.userEmail || ''}</div>
                    </div>
                  </td>
                  <td style={{ padding: 'var(--sp-3)' }}>
                    <span style={{ fontWeight: '700', color: 'var(--brand-success)' }}>
                      ${Number(refund.refundAmount).toFixed(2)}
                    </span>
                  </td>
                  <td style={{ padding: 'var(--sp-3)' }}>
                    <span className="tag" style={{ background: '#f3f4f6', color: '#374151' }}>
                      {refund.refundPercentage}%
                    </span>
                  </td>
                  <td style={{ padding: 'var(--sp-3)', fontSize: '0.875rem' }}>
                    {refund.cancellationReason || '—'}
                  </td>
                  <td style={{ padding: 'var(--sp-3)' }}>
                    <StatusBadge status={refund.status} />
                  </td>
                  <td style={{ padding: 'var(--sp-3)', fontSize: '0.875rem' }}>
                    {new Date(refund.expectedCompletionDate).toLocaleDateString()}
                  </td>
                  <td style={{ padding: 'var(--sp-3)' }}>
                    <div style={{ display: 'flex', gap: 'var(--sp-2)', flexWrap: 'wrap' }}>
                      {refund.status === 'Pending' && (
                        <button
                          className="button button-sm button-primary"
                          onClick={() => handleStatusUpdate(refund.id, 'Processed')}
                          disabled={updatingRefundId === refund.id}
                        >
                          Process
                        </button>
                      )}
                      {refund.status === 'Processed' && (
                        <button
                          className="button button-sm"
                          style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #10b981' }}
                          onClick={() => handleStatusUpdate(refund.id, 'Completed')}
                          disabled={updatingRefundId === refund.id}
                        >
                          Complete
                        </button>
                      )}
                      {refund.status === 'Completed' && (
                        <span className="text-muted" style={{ fontSize: '0.875rem' }}>✓ Done</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
