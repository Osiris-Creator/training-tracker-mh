import React, { useState, useEffect } from 'react';
import { getEmployees, API_BASE_URL } from '../utils/api';
import axios from 'axios';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './EmployeeManagement.css';

function EmployeeManagement() {
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState(null);

  // Filter states
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [formData, setFormData] = useState({
    employee_id: '',
    employee_name: '',
    position: '',
    department: '',
    level: '',
    email: '',
    phone: ''
  });

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

  // Get unique departments
  const departments = ['all', ...new Set(employees.map(e => e.department).filter(Boolean))].sort((a, b) =>
    a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b)
  );

  // Get unique levels
  const levels = ['all', ...new Set(employees.map(e => e.level).filter(Boolean))].sort((a, b) =>
    a === 'all' ? -1 : b === 'all' ? 1 : a.localeCompare(b)
  );

  // Filter employees
  const filteredEmployees = employees.filter(emp => {
    const matchDept = selectedDepartment === 'all' || emp.department === selectedDepartment;
    const matchLevel = selectedLevel === 'all' || emp.level === selectedLevel;
    const matchSearch = !searchQuery ||
      emp.employee_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employee_id?.toString().includes(searchQuery) ||
      emp.position?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchDept && matchLevel && matchSearch;
  });

  const handleAdd = () => {
    setEditingEmployee(null);
    setFormData({ employee_id: '', employee_name: '', position: '', department: '', level: '', email: '', phone: '' });
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
    if (!window.confirm('Are you sure you want to delete this employee?')) return;
    try {
      await axios.delete(`${API_BASE_URL}/employees/${employeeId}`);
      setSuccess('Employee deleted successfully');
      loadEmployees();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete employee');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      if (editingEmployee) {
        await axios.put(`${API_BASE_URL}/employees/${editingEmployee.employee_id}`, formData);
        setSuccess('Employee updated successfully');
      } else {
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Export to Excel
  const exportToExcel = () => {
    const data = filteredEmployees.map((emp, i) => ({
      'No.': i + 1,
      'Employee ID': emp.employee_id,
      'Name': emp.employee_name,
      'Position': emp.position || '-',
      'Department': emp.department || '-',
      'Level': emp.level || '-',
      'Email': emp.email || '-',
      'Phone': emp.phone || '-'
    }));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(data);
    ws['!cols'] = [
      { wch: 6 }, { wch: 14 }, { wch: 25 }, { wch: 28 },
      { wch: 20 }, { wch: 8 }, { wch: 30 }, { wch: 15 }
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'Employees');

    const deptLabel = selectedDepartment === 'all' ? 'All_Departments' : selectedDepartment.replace(/[^a-zA-Z0-9]/g, '_');
    XLSX.writeFile(wb, `Employees_${deptLabel}.xlsx`);
  };

  // Export to PDF
  const exportToPDF = () => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

    // Header
    doc.setFontSize(18);
    doc.setTextColor(212, 115, 94);
    doc.text('Employee List', 14, 16);

    doc.setFontSize(11);
    doc.setTextColor(100);
    const deptLabel = selectedDepartment === 'all' ? 'All Departments' : selectedDepartment;
    doc.text(`Department: ${deptLabel}   |   Total: ${filteredEmployees.length} employees`, 14, 24);

    // Table
    autoTable(doc, {
      startY: 30,
      head: [['No.', 'Employee ID', 'Name', 'Position', 'Department', 'Level', 'Email', 'Phone']],
      body: filteredEmployees.map((emp, i) => [
        i + 1,
        emp.employee_id,
        emp.employee_name,
        emp.position || '-',
        emp.department || '-',
        emp.level || '-',
        emp.email || '-',
        emp.phone || '-'
      ]),
      styles: { fontSize: 9, cellPadding: 3 },
      headStyles: { fillColor: [212, 115, 94], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [250, 248, 245] },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 24 },
        2: { cellWidth: 40 },
        3: { cellWidth: 45 },
        4: { cellWidth: 28 },
        5: { cellWidth: 14 },
        6: { cellWidth: 50 },
        7: { cellWidth: 26 }
      },
      margin: { left: 14, right: 14 }
    });

    const deptFile = selectedDepartment === 'all' ? 'All_Departments' : selectedDepartment.replace(/[^a-zA-Z0-9]/g, '_');
    doc.save(`Employees_${deptFile}.pdf`);
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
          <h1 className="page-title">Employee <em>Management</em></h1>
        </div>
        <button onClick={handleAdd} className="add-button">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="12" y1="5" x2="12" y2="19"></line>
            <line x1="5" y1="12" x2="19" y2="12"></line>
          </svg>
          Add Employee
        </button>
      </div>

      {success && <div className="alert alert-success">✓ {success}</div>}
      {error && <div className="alert alert-error">✗ {error}</div>}

      {/* Filter & Export Bar */}
      <div className="filter-export-bar">
        <div className="filter-group">
          <div className="search-wrapper">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search name, ID or position..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>

          <select
            value={selectedDepartment}
            onChange={(e) => setSelectedDepartment(e.target.value)}
            className="dept-select"
          >
            {departments.map(dept => (
              <option key={dept} value={dept}>
                {dept === 'all' ? 'All Departments' : dept}
              </option>
            ))}
          </select>

          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            className="dept-select"
          >
            {levels.map(lvl => (
              <option key={lvl} value={lvl}>
                {lvl === 'all' ? 'All Levels' : lvl}
              </option>
            ))}
          </select>

          <div className="filter-count">
            <span>{filteredEmployees.length} of {employees.length} employees</span>
          </div>
        </div>

        <div className="export-group">
          <button onClick={exportToExcel} className="export-btn excel-btn" title="Export to Excel">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
            Excel
          </button>
          <button onClick={exportToPDF} className="export-btn pdf-btn" title="Export to PDF">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
            </svg>
            PDF
          </button>
        </div>
      </div>

      {/* Table */}
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
            {filteredEmployees.length === 0 ? (
              <tr>
                <td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: '#6B6B6B', fontStyle: 'italic' }}>
                  No employees found
                </td>
              </tr>
            ) : (
              filteredEmployees.map(emp => (
                <tr key={emp.employee_id}>
                  <td>{emp.employee_id}</td>
                  <td>{emp.employee_name}</td>
                  <td>{emp.position}</td>
                  <td>
                    <span className="dept-badge">{emp.department}</span>
                  </td>
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
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
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
                  <input type="text" name="employee_id" value={formData.employee_id}
                    onChange={handleInputChange} disabled={!!editingEmployee}
                    required className="form-input" placeholder="e.g., 00059395" />
                </div>
                <div className="form-group">
                  <label>Full Name <span className="required">*</span></label>
                  <input type="text" name="employee_name" value={formData.employee_name}
                    onChange={handleInputChange} required className="form-input" />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Position</label>
                  <input type="text" name="position" value={formData.position}
                    onChange={handleInputChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <select name="department" value={formData.department}
                    onChange={handleInputChange} className="form-input">
                    <option value="">Select Department</option>
                    {departments
                      .filter(d => d !== 'all')
                      .map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))
                    }
                  </select>
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Level</label>
                  <input type="text" name="level" value={formData.level}
                    onChange={handleInputChange} className="form-input" />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input type="email" name="email" value={formData.email}
                    onChange={handleInputChange} className="form-input" />
                </div>
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input type="text" name="phone" value={formData.phone}
                  onChange={handleInputChange} className="form-input" />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)} className="cancel-btn">Cancel</button>
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
