import { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import api from '../services/api';

export default function Employees() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Employee Form
  const [formData, setFormData] = useState({
    user_id: '',
    name: '',
    role: '',
    department: '',
    salary: ''
  });

  useEffect(() => {
    fetchEmployees();
  }, []);

  const fetchEmployees = async () => {
    try {
      const response = await api.get('/employees/');
      setEmployees(response.data);
    } catch (error) {
      console.error('Error fetching employees:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/employees/', {
        ...formData,
        salary: parseFloat(formData.salary)
      });
      setShowModal(false);
      setFormData({ user_id: '', name: '', role: '', department: '', salary: '' });
      fetchEmployees();
    } catch (error) {
      console.error('Error adding employee:', error);
      alert(error.response?.data?.error || 'Failed to add employee');
    }
  };

  const filteredEmployees = employees.filter(emp => 
    emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    emp.department.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1 className="page-title">Employees</h1>
          <p style={{ color: 'var(--text-muted)' }}>Manage your workforce and team members.</p>
        </div>
        
        <button className="btn" onClick={() => setShowModal(true)}>
          <Plus size={18} style={{ marginRight: '0.5rem' }} />
          Add Employee
        </button>
      </div>

      <div className="table-container">
        <div style={{ padding: '1rem 1.5rem', display: 'flex', gap: '1rem', borderBottom: '1px solid var(--border)' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            <input 
              type="text" 
              placeholder="Search employees..." 
              className="form-input" 
              style={{ paddingLeft: '2.5rem' }}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>
        
        <table className="table">
          <thead>
            <tr>
              <th>Employee Name</th>
              <th>Role</th>
              <th>Department</th>
              <th>Status</th>
              <th>Salary</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>Loading employees...</td></tr>
            ) : filteredEmployees.length === 0 ? (
              <tr><td colSpan="6" style={{ textAlign: 'center', padding: '2rem' }}>No employees found.</td></tr>
            ) : (
              filteredEmployees.map((emp) => (
                <tr key={emp.id}>
                  <td>
                    <div style={{ fontWeight: 500 }}>{emp.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {emp.id}</div>
                  </td>
                  <td>{emp.role}</td>
                  <td>{emp.department}</td>
                  <td>
                    <span className={`badge ${emp.status === 'active' ? 'active' : 'inactive'}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>${emp.salary?.toLocaleString()}/yr</td>
                  <td style={{ textAlign: 'right' }}>
                    <button style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}>
                      <MoreVertical size={18} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal - A simple implementation for the PRD check */}
      {showModal && (
        <div style={{ 
          position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', 
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 
        }}>
          <div className="glass-card" style={{ maxWidth: '500px' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Add New Employee</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>User ID (Linked Account)</label>
                <input required type="number" className="form-input" value={formData.user_id} onChange={e => setFormData({...formData, user_id: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Full Name</label>
                <input required type="text" className="form-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Role</label>
                  <input required type="text" className="form-input" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input required type="text" className="form-input" value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})} />
                </div>
              </div>
              <div className="form-group">
                <label>Salary (Annual)</label>
                <input required type="number" className="form-input" value={formData.salary} onChange={e => setFormData({...formData, salary: e.target.value})} />
              </div>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                <button type="button" className="btn" style={{ backgroundColor: 'var(--surface-secondary)', color: 'var(--text-main)' }} onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn">Save Employee</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
