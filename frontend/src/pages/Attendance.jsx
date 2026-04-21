import { useState, useEffect } from 'react';
import { Clock, CheckCircle2, ArrowRightCircle } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Attendance() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [attendance, setAttendance] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    fetchAttendance();
  }, []);

  const fetchAttendance = async () => {
    setLoading(true);
    try {
      const res = await api.get('/attendance/');
      setAttendance(res.data);
    } catch (err) {
      console.error(err);
      setStatusMessage('Unable to load attendance. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckIn = async () => {
    setStatusMessage('');
    try {
      const res = await api.post('/attendance/checkin');
      setStatusMessage(res.data.message || 'Checked in successfully.');
      fetchAttendance();
    } catch (err) {
      setStatusMessage(err.response?.data?.error || 'Check-in failed');
    }
  };

  const handleCheckOut = async () => {
    setStatusMessage('');
    try {
      const res = await api.post('/attendance/checkout');
      setStatusMessage(res.data.message || 'Checked out successfully.');
      fetchAttendance();
    } catch (err) {
      setStatusMessage(err.response?.data?.error || 'Check-out failed');
    }
  };

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Track daily attendance by check-in/check-out. Admins can see all records.
          </p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn" onClick={handleCheckIn} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Clock size={18} /> Check In
          </button>
          <button className="btn btn-secondary" onClick={handleCheckOut} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ArrowRightCircle size={18} /> Check Out
          </button>
        </div>
        {statusMessage && (
          <div style={{ 
            padding: '0.5rem 1rem', 
            borderRadius: '8px', 
            backgroundColor: statusMessage.toLowerCase().includes('fail') || statusMessage.toLowerCase().includes('error') ? 'rgba(239, 68, 68, 0.1)' : 'var(--success-bg)',
            color: statusMessage.toLowerCase().includes('fail') || statusMessage.toLowerCase().includes('error') ? 'var(--danger)' : 'var(--success-text)',
            border: `1px solid ${statusMessage.toLowerCase().includes('fail') || statusMessage.toLowerCase().includes('error') ? 'rgba(239, 68, 68, 0.2)' : 'var(--success-text)30'}`,
            fontSize: '0.9rem',
            fontWeight: 600,
            animation: 'fadeIn 0.3s ease-in-out'
          }}>
            {statusMessage}
          </div>
        )}
      </div>

      <div className="stats-grid" style={{ marginBottom: '2rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
        <div className="stat-card" style={{ background: 'var(--card-gradient-1)', border: '1px solid var(--border)', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow)' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Total Presence</p>
          <h3 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--text-main)' }}>
            {attendance.filter(r => r.status === 'present').length} <span style={{ fontSize: '1rem', fontWeight: 500, color: 'var(--text-muted)' }}>days</span>
          </h3>
        </div>
        <div className="stat-card" style={{ background: 'var(--success-bg)', border: '1px solid var(--success-text)30', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow)' }}>
          <p style={{ color: 'var(--success-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Check-ins Today</p>
          <h3 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--success-text)' }}>
            {attendance.filter(r => r.date.split('T')[0] === new Date().toISOString().split('T')[0] && r.check_in).length}
          </h3>
        </div>
        <div className="stat-card" style={{ background: 'var(--warning-bg)', border: '1px solid var(--warning-text)30', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow)' }}>
          <p style={{ color: 'var(--warning-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Total Hours (Month)</p>
          <h3 style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--warning-text)' }}>
            {attendance
              .filter(r => {
                const d = new Date(r.date);
                const now = new Date();
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
              })
              .reduce((acc, r) => acc + (r.duration_hours || 0), 0).toFixed(1)}
          </h3>
        </div>
        <div className="stat-card" style={{ background: 'var(--info-bg)', border: '1px solid var(--info-text)30', padding: '1.5rem', borderRadius: '12px', boxShadow: 'var(--shadow)' }}>
          <p style={{ color: 'var(--info-text)', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>Attendance Status</p>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--info-text)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
            {attendance.some(r => r.date.split('T')[0] === new Date().toISOString().split('T')[0] && r.check_in) ? (
              <><CheckCircle2 size={24} color="var(--success-text)" /> Active Now</>
            ) : (
              <><Clock size={24} color="var(--text-muted)" /> Not Started</>
            )}
          </h3>
        </div>
      </div>

      <div className="table-container" style={{ background: 'var(--surface)', borderRadius: '12px', overflow: 'hidden', boxShadow: 'var(--shadow)', border: '1px solid var(--border)' }}>
        <table className="table">
          <thead>
            <tr style={{ backgroundColor: 'var(--surface-secondary)' }}>
              {isAdmin && <th>Employee</th>}
              <th>Date</th>
              <th>Check-In</th>
              <th>Check-Out</th>
              <th>Duration</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                <div className="spinner" style={{ margin: '0 auto 1rem' }}></div>
                Loading attendance records...
              </td></tr>
            ) : attendance.length === 0 ? (
              <tr><td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                No attendance data found for this period.
              </td></tr>
            ) : (
              attendance.map((item) => (
                <tr key={item.id} style={{ transition: 'background 0.2s' }} className="table-row-hover">
                  {isAdmin && <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{item.employee_name || 'N/A'}</td>}
                  <td style={{ color: 'var(--text-main)' }}>{new Date(item.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</td>
                  <td>
                    <span style={{ color: 'var(--success-text)', fontWeight: 600 }}>
                      {item.check_in ? new Date(item.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-muted)', fontWeight: 500 }}>
                      {item.check_out ? new Date(item.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '-'}
                    </span>
                  </td>
                  <td style={{ fontWeight: 700, color: 'var(--text-main)' }}>{item.duration_hours > 0 ? `${item.duration_hours.toFixed(2)}h` : '-'}</td>
                  <td>
                    <span style={{ 
                      display: 'inline-flex', 
                      alignItems: 'center', 
                      gap: '0.35rem', 
                      padding: '0.25rem 0.75rem', 
                      borderRadius: '9999px',
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      backgroundColor: item.status === 'present' ? 'var(--success-bg)' : 'rgba(239, 68, 68, 0.1)',
                      color: item.status === 'present' ? 'var(--success-text)' : 'var(--danger)',
                      border: `1px solid ${item.status === 'present' ? 'var(--success-text)30' : 'rgba(239, 68, 68, 0.2)'}`
                    }}>
                      <CheckCircle2 size={14} /> {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
