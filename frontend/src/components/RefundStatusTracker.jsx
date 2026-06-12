import { useEffect, useState } from 'react';
import { getRefundDetails } from '../services/api.js';

export default function RefundStatusTracker({ bookingId, booking }) {
  const [refund, setRefund] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadRefund() {
      try {
        const response = await getRefundDetails(bookingId);
        setRefund(response.refund);
      } catch (err) {
        setError('Unable to load refund details.');
      } finally {
        setLoading(false);
      }
    }

    loadRefund();
  }, [bookingId]);

  if (loading) {
    return (
      <div className="refund-tracker-premium">
        <div className="skeleton" style={{ height: '100px', borderRadius: '12px' }} />
        <div className="skeleton" style={{ height: '80px', borderRadius: '12px' }} />
      </div>
    );
  }

  if (error || !refund) {
    return (
      <div className="alert alert-error" style={{ margin: 0, padding: '12px 16px', fontSize: '13px' }}>
        <span>⚠️</span> {error || 'No active refund process found.'}
      </div>
    );
  }

  const steps = [
    { id: 'Pending', label: 'Pending', icon: '⏳' },
    { id: 'Processed', label: 'Processed', icon: '⚙️' },
    { id: 'Completed', label: 'Completed', icon: '✅' },
  ];
  const currentStatus = refund.status || 'Pending';
  const activeIndex = steps.findIndex(s => s.id === currentStatus);
  const progressPercent = activeIndex === -1 ? 0 : activeIndex * 50;

  const createdDate = new Date(refund.createdAt);
  const completionDate = new Date(refund.expectedCompletionDate);
  const daysDiff = Math.ceil((completionDate - createdDate) / (1000 * 60 * 60 * 24));
  const businessDays = Math.max(3, Math.min(daysDiff, 7));

  return (
    <div className="refund-tracker-premium">
      
      {/* 1. Refund Stepper */}
      <div className="refund-stepper">
        <div className="refund-stepper-progress" style={{ width: `${progressPercent}%` }} />
        {steps.map((step, index) => {
          let stepClass = 'refund-step-item';
          if (index === activeIndex) {
            stepClass += ' active';
            if (step.id === 'Pending') stepClass += ' pending-state';
          }
          else if (index < activeIndex) stepClass += ' completed';

          return (
            <div key={step.id} className={stepClass}>
              <div className="refund-step-icon">
                {index < activeIndex ? '✓' : step.icon}
              </div>
              <div className="refund-step-label">{step.label}</div>
            </div>
          );
        })}
      </div>

      {/* 2. Refund Summary Grid */}
      <div className="refund-summary-card">
        <div className="refund-summary-item">
          <span className="refund-summary-label">Original Amount</span>
          <span className="refund-summary-value">${Number(booking?.totalPrice || 0).toFixed(2)}</span>
        </div>
        <div className="refund-summary-item">
          <span className="refund-summary-label">Refund Amount</span>
          <span className="refund-summary-value">${Number(refund.refundAmount).toFixed(2)}</span>
        </div>
        <div className="refund-summary-item">
          <span className="refund-summary-label">Refund %</span>
          <span className="refund-summary-value">{refund.refundPercentage}%</span>
        </div>
        <div className="refund-summary-item">
          <span className="refund-summary-label">Status</span>
          <span className={`refund-summary-value highlight-${currentStatus}`}>{currentStatus}</span>
        </div>
      </div>

      {/* 3. Timeline / Details Box */}
      <div className="refund-timeline-box">
        <div className="timeline-row">
          <div className="timeline-bullet" style={{ background: '#ef4444' }} />
          <div className="timeline-content">
            <span className="timeline-title">Booking Cancelled</span>
            <span className="timeline-desc">{createdDate.toLocaleDateString()} — {refund.cancellationReason || 'User request'}</span>
          </div>
        </div>
        <div className="timeline-row">
          <div className="timeline-bullet" style={{ background: '#3b82f6' }} />
          <div className="timeline-content">
            <span className="timeline-title">Refund Processing</span>
            <span className="timeline-desc">Est. {businessDays} business days to original payment method</span>
          </div>
        </div>
        <div className="timeline-row">
          <div className="timeline-bullet" style={{ background: '#10b981' }} />
          <div className="timeline-content">
            <span className="timeline-title">Expected Completion</span>
            <span className="timeline-desc">{completionDate.toLocaleDateString()}</span>
          </div>
        </div>
      </div>

    </div>
  );
}
