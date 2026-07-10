import React, { useState, useEffect } from 'react';
import { getEmployees, API_BASE_URL } from '../utils/api';
import axios from 'axios';
import './EmployeeManagement.css';

function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);
  const [formData, setFormData] = useState({
    employee_id: '',
    employee_name: '',
    position: '',
    department: '',
    level: '',
    email: '',
    phone: ''
  });
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadEmployees();
  }, []);

  const loadEmployees = async () => {
    try {
      const response = await getEmployees();
      setEmployees(response.data);
      setLoading(false);
    } catch (err) {
      setError('Failed to load employees');
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingEmployee(null);
    setFormData({
      employee_id: '',
      employee_name: '',
      position: '',
      department: '',
      level: '',
      email: '',
      phone: ''
    });
    setShowModal(true);
  };

  const handleEdit = (employee) => {
    setEditingEmployee(employee);
    setFormData({
      employee_id: employee.employee_id,
      employee_name: employee.employee_name,
      position: employee.position || '',
      department: employee.department || '',
      level: employee.level || '',
      email: employee.email || '',
      phone: employee.phone || ''
    });
    setShowModal(true);
  };

  const handleDelete = async (employeeId) => {
    if (!window.confirm('Are you sure you want to delete this employee?')) {
      return;
    }

    try {
      await axios.delete(`${API_BASE_URL}/employees/${employeeId}`);
      setSuccess('Employee deleted successfully');
      loadEmployees();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError('Failed to delete employee');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      if (editingEmployee) {
        // Update existing employee
        await axios.put(`${API_BASE_URL}/employees/${editingEmployee.employee_id}`, formData);
        setSuccess('Employee updated successfully');
      } else {
        // Add new employee
        await axios.post(`${API_BASE_URL}/employees`, formData);
        setSuccess('Employee added successfully');
      }

      setShowModal(false);
      loadEmployees();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save employee');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Loading employees...</p>
      </div>
    );
  }

  return (
    <div className="employee-management">
      <div className="page-header">
        <div>
          <span className="eyebrow-pill">Administration</span>
          <h1 className="page-title">
            Employee <em>Management</em>
          </h1>
        </div>
        <button onClick={handleAdd} className="add-button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Employee
        </button>
      </div>

      {success && (
        <div className="alert alert-success">
          ✓ {success}
        </div>
      )}

      {error && (
        <div className="alert alert-error">
          ✗ {error}
        </div>
      )}

      <div className="employee-table-container">
        <table className="employee-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Position</th>
              <th>Department</th>
              <th>Level</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {employees.map(emp => (
              <tr key={emp.employee_id}>
                <td>{emp.employee_id}</td>
                <td>{emp.employee_name}</td>
                <td>{emp.position}</td>
                <td>{emp.department}</td>
                <td>{emp.level}</td>
                <td>{emp.email}</td>
                <td>{emp.phone}</td>
                <td>
                  <div className="action-buttons">
                    <button onClick={() => handleEdit(emp)} className="edit-btn" title="Edit">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                      </svg>
                    </button>
                    <button onClick={() => handleDelete(emp.employee_id)} className="delete-btn" title="Delete">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                      </svg>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingEmployee ? 'Edit Employee' : 'Add New Employee'}</h2>
              <button onClick={() => setShowModal(false)} className="close-btn">×</button>
            </div>

            <form onSubmit={handleSubmit} className="modal-form">
              <div className="form-row">
                <div className="form-group">
                  <label>Employee ID <span className="required">*</span></label>
                  <input
                    type="text"
                    name="employee_id"
                    value={formData.employee_id}
                    onChange={handleInputChange}
                    disabled={!!editingEmployee}
                    required
                    className="form-input"
                    placeholder="e.g., 059395"
                  />
                </div>

                <div className="form-group">
                  <label>Full Name <span className="required">*</span></label>
                  <input
                    type="text"
                    name="employee_name"
                    value={formData.employee_name}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Position</label>
                  <input
                    type="text"
                    name="position"
                    value={formData.position}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Department</label>
                  <input
                    type="text"
                    name="department"
                    value={formData.department}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Level</label>
                  <input
                    type="text"
                    name="level"
                    value={formData.level}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Phone</label>
                <input
                  type="text"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="form-input"
                />
              </div>

              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="cancel-btn">
                  Cancel
                </button>
                <button type="submit" className="submit-btn">
                  {editingEmployee ? 'Update' : 'Add'} Employee
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default EmployeeManagement;
