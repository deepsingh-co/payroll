import { useState, useEffect } from 'react';
import { Plus, Search, MoreVertical, Edit2, Trash2 } from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../contexts/AuthContext';

export default function Employees() {
  const { user: currentUser } = useAuth();
  const isAdmin = currentUser?.role === 'admin';
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // New Employee Form
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    user_role: 'employee',
    name: '',
    role: '',
    department: '',
    salary: '',
    bank_account_number: '',
    bank_ifsc: '',
    bank_name: ''
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
      setFormData({ email: '', password: '', user_role: 'employee', name: '', role: '', department: '', salary: '', bank_account_number: '', bank_ifsc: '', bank_name: '' });
      fetchEmployees();
    } catch (error) {
      console.error('Error adding employee:', error);
      alert(error.response?.data?.error || 'Failed to add employee');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to remove this employee? This will also delete their user account.')) return;
    
    try {
      await api.delete(`/employees/${id}`);
      setEmployees(employees.filter(emp => emp.id !== id));
    } catch (error) {
      console.error('Error deleting employee:', error);
      alert(error.response?.data?.error || 'Failed to delete employee');
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
                    <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{emp.name}</div>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>ID: {emp.id}</div>
                  </td>
                  <td>{emp.role}</td>
                  <td>{emp.department}</td>
                  <td>
                    <span className={`badge ${emp.status === 'active' ? 'active' : 'inactive'}`}>
                      {emp.status}
                    </span>
                  </td>
                  <td style={{ fontWeight: 500 }}>₹{emp.salary?.toLocaleString('en-IN')}/yr</td>
                  <td style={{ textAlign: 'right' }}>
                    {isAdmin && (
                      <button 
                        onClick={() => handleDelete(emp.id)}
                        className="btn-icon" 
                        style={{ color: '#EF4444', backgroundColor: 'rgba(239,68,68,0.1)', border: 'none', borderRadius: '6px', padding: '0.5rem', cursor: 'pointer' }}
                        title="Delete Employee"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
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
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem'
        }}>
          <div className="glass-card" style={{ maxWidth: '500px', width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Add New Employee</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Email Address</label>
                <input required type="email" className="form-input" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Password</label>
                <input required type="password" className="form-input" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
              </div>
              <div className="form-group">
                <label>System Role</label>
                <select className="form-input" value={formData.user_role} onChange={e => setFormData({...formData, user_role: e.target.value})}>
                  <option value="employee">Employee</option>
                  <option value="admin">Manager/Admin</option>
                </select>
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

              <h3 style={{ marginTop: '1rem', marginBottom: '0.5rem', fontSize: '1.1rem', color: 'var(--text-main)' }}>Bank Details</h3>
              <div className="form-group">
                <label>Bank Name</label>
                <input type="text" className="form-input" value={formData.bank_name} onChange={e => setFormData({...formData, bank_name: e.target.value})} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label>Account Number</label>
                  <input type="text" className="form-input" value={formData.bank_account_number} onChange={e => setFormData({...formData, bank_account_number: e.target.value})} />
                </div>
                <div className="form-group">
                  <label>IFSC Code</label>
                  <input type="text" className="form-input" value={formData.bank_ifsc} onChange={e => setFormData({...formData, bank_ifsc: e.target.value})} />
                </div>
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
