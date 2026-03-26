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

      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
        <button className="btn" onClick={handleCheckIn}>
          <Clock size={16} style={{ marginRight: '0.35rem' }} /> Check In
        </button>
        <button className="btn" onClick={handleCheckOut}>
          <ArrowRightCircle size={16} style={{ marginRight: '0.35rem' }} /> Check Out
        </button>
        {statusMessage && (
          <span style={{ marginTop: '0.25rem', color: '#0f172a', fontWeight: 600 }}>{statusMessage}</span>
        )}
      </div>

      <div className="stats-grid" style={{ marginBottom: '1rem' }}>
        <div className="stat-card" style={{ border: '1px solid var(--border)' }}>
          <p>Records</p>
          <h3>{attendance.length}</h3>
        </div>
        <div className="stat-card" style={{ border: '1px solid var(--border)' }}>
          <p>Checked In today</p>
          <h3>{attendance.filter(r => r.date === new Date().toISOString().split('T')[0] && r.check_in).length}</h3>
        </div>
        <div className="stat-card" style={{ border: '1px solid var(--border)' }}>
          <p>Checked Out today</p>
          <h3>{attendance.filter(r => r.date === new Date().toISOString().split('T')[0] && r.check_out).length}</h3>
        </div>
      </div>

      <div className="table-container">
        <table className="table">
          <thead>
            <tr>
              {isAdmin && <th>Employee</th>}
              <th>Day</th>
              <th>Check-In</th>
              <th>Check-Out</th>
              <th>Duration (hrs)</th>
              <th>Status</th>
            </tr>
          </thead>

          <tbody>
            {loading ? (
              <tr><td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '2rem' }}>Loading attendance...</td></tr>
            ) : attendance.length === 0 ? (
              <tr><td colSpan={isAdmin ? 6 : 5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>No attendance data available.</td></tr>
            ) : (
              attendance.map((item) => (
                <tr key={item.id}>
                  {isAdmin && <td>{item.employee_name || item.employee_id}</td>}
                  <td>{new Date(item.date).toLocaleDateString()}</td>
                  <td>{item.check_in ? new Date(item.check_in).toLocaleTimeString() : '-'} </td>
                  <td>{item.check_out ? new Date(item.check_out).toLocaleTimeString() : '-'} </td>
                  <td>{item.duration_hours?.toFixed(2) || '-'}</td>
                  <td style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', fontWeight: 600 }}>
                    <CheckCircle2 size={14} color={item.status === 'present' ? '#10B981' : '#EF4444'} /> {item.status}
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
