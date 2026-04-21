import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api';
import { TrendingUp, CheckCircle, XCircle, AlertCircle, Award } from 'lucide-react';

export default function Progress() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProgress = async () => {
      try {
        const response = await api.get('/tasks/progress');
        setProgressData(response.data);
      } catch (error) {
        console.error('Error fetching progress:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchProgress();
  }, []);

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '50vh' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--primary)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  const ProgressBar = ({ completed, total, percentage, name, promotionRecommended }) => {
    // Generate a sleek progress bar
    const barColor = percentage >= 80 ? '#10B981' : percentage >= 50 ? '#F59E0B' : '#EF4444';
    
    return (
      <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <TrendingUp size={20} color="var(--primary)" /> {name}
            {promotionRecommended && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', padding: '0.2rem 0.5rem', backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10B981', borderRadius: '1rem', marginLeft: '0.5rem' }}>
                <Award size={14} /> Promote
              </span>
            )}
          </h3>
          <span style={{ fontSize: '1.25rem', fontWeight: 700, color: barColor }}>{percentage}%</span>
        </div>
        
        <div style={{ height: '12px', backgroundColor: 'var(--surface-secondary)', borderRadius: '99px', overflow: 'hidden', marginBottom: '1rem' }}>
          <div 
            style={{ 
              height: '100%', 
              width: `${percentage}%`, 
              backgroundColor: barColor, 
              borderRadius: '99px',
              transition: 'width 1s ease-in-out'
            }} 
          />
        </div>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.875rem', color: 'var(--text-muted)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <CheckCircle size={16} color="#10B981" /> Completed: {completed}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <AlertCircle size={16} color="#3B82F6" /> Total Tasks: {total}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title">Performance Progress</h1>
          <p style={{ color: 'var(--text-muted)' }}>
            {isAdmin 
              ? 'Track the progress of all employees across their assigned tasks.'
              : 'Track your own performance and task completion progress.'}
          </p>
        </div>
      </div>

      {isAdmin && Array.isArray(progressData) && progressData.some(emp => emp.promotion_recommended) && (
        <div style={{ backgroundColor: 'rgba(16, 185, 129, 0.05)', border: '1px solid #10B981', padding: '1.5rem', borderRadius: '12px', marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: '#10B981', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
            <Award size={24} /> Promotion Recommendations Report
          </h3>
          <p style={{ color: 'var(--text-main)', marginBottom: '1rem' }}>
            Based on a comparison of task targets and completed work performance (&ge; 85% completion rate, zero missed deadlines), the following employees are highly recommended for a promotion or performance bonus:
          </p>
          <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
            {progressData.filter(emp => emp.promotion_recommended).map(emp => (
              <li key={emp.employee_id} style={{ backgroundColor: '#10B981', color: 'white', padding: '0.5rem 1rem', borderRadius: '99px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <CheckCircle size={16} /> {emp.name} ({emp.progress_percentage}%)
              </li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: isAdmin ? 'repeat(auto-fill, minmax(400px, 1fr))' : '1fr', gap: '1.5rem' }}>
        {isAdmin && Array.isArray(progressData) ? (
          progressData.length === 0 ? (
            <p style={{ color: 'var(--text-muted)' }}>No progress data available.</p>
          ) : (
            progressData.map((emp) => (
              <ProgressBar 
                key={emp.employee_id} 
                name={emp.name} 
                completed={emp.completed_tasks} 
                total={emp.total_tasks} 
                percentage={emp.progress_percentage} 
                promotionRecommended={emp.promotion_recommended}
              />
            ))
          )
        ) : (
          progressData && !Array.isArray(progressData) && (
            <div style={{ maxWidth: '600px' }}>
              <ProgressBar 
                name="My Progress" 
                completed={progressData.completed_tasks} 
                total={progressData.total_tasks} 
                percentage={progressData.progress_percentage} 
              />
              <div style={{ backgroundColor: 'var(--surface)', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)' }}>
                <h4 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '1rem' }}>Performance Insights</h4>
                <p style={{ color: 'var(--text-muted)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <XCircle size={18} color="#EF4444" /> Missed Deadlines: <strong>{progressData.missed_deadline}</strong>
                </p>
                {progressData.missed_deadline > 0 ? (
                  <p style={{ fontSize: '0.875rem', color: '#EF4444', backgroundColor: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>
                    You have tasks that missed the deadline. Try to prioritize pending tasks to improve your progress score.
                  </p>
                ) : (
                  <p style={{ fontSize: '0.875rem', color: '#10B981', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '8px' }}>
                    Great job! You have no missed deadlines. Keep up the good work!
                  </p>
                )}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
