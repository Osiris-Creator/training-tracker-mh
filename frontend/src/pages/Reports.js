import React, { useState, useEffect } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import './Reports.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

function Reports() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [department, setDepartment] = useState('all');
  const [role, setRole] = useState('all');
  const [departments, setDepartments] = useState([]);
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Set default dates (last 30 days)
  useEffect(() => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - 30);

    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  }, []);

  // Fetch departments
  useEffect(() => {
    const fetchDepartments = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/employees`);
        const uniqueDepts = [...new Set(response.data.map(emp => emp.department).filter(Boolean))];
        setDepartments(uniqueDepts.sort());
      } catch (err) {
        console.error('Error fetching departments:', err);
      }
    };
    fetchDepartments();
  }, []);

  const fetchReport = async () => {
    if (!startDate || !endDate) {
      setError('Please select start and end dates');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        start_date: startDate,
        end_date: endDate,
        department: department,
        role: role
      });

      const response = await axios.get(`${API_BASE_URL}/training/report?${params}`);
      setReportData(response.data);
    } catch (err) {
      setError('Failed to load data: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData || !reportData.records.length) {
      alert('No data to export');
      return;
    }

    // Prepare data for Excel
    const excelData = reportData.records.map((record, index) => ({
      'No.': index + 1,
      'Employee ID': record.employee_id,
      'Employee Name': record.employee_name,
      'Department': record.department || '-',
      'Position': record.position || '-',
      'Level': record.level || '-',
      'Role': record.role === 'trainer' ? 'Trainer' : 'Trainee',
      'Date': record.training_date,
      'Training Topic': record.training_topic,
      'Hours': record.training_hours,
      'Trainer': record.trainer_name || '-',
      'Notes': record.notes || '-'
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 8 },  // No.
      { wch: 12 }, // Employee ID
      { wch: 25 }, // Employee Name
      { wch: 20 }, // Department
      { wch: 25 }, // Position
      { wch: 10 }, // Level
      { wch: 12 }, // Role
      { wch: 12 }, // Date
      { wch: 35 }, // Training Topic
      { wch: 12 }, // Hours
      { wch: 25 }, // Trainer
      { wch: 30 }  // Notes
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Training Report');

    // Add summary sheet
    const summaryData = [
      { 'Item': 'Date Range', 'Value': `${startDate} to ${endDate}` },
      { 'Item': 'Department', 'Value': department === 'all' ? 'All' : department },
      { 'Item': 'Role', 'Value': role === 'all' ? 'All' : (role === 'trainer' ? 'Trainer' : 'Trainee') },
      { 'Item': '', 'Value': '' },
      { 'Item': 'Total Records', 'Value': reportData.summary.total_records },
      { 'Item': 'Total Hours', 'Value': reportData.summary.total_hours.toFixed(2) },
      { 'Item': 'Total Employees', 'Value': reportData.summary.unique_employees }
    ];

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

    // Generate filename
    const filename = `Training_Report_${startDate}_to_${endDate}.xlsx`;

    // Download
    XLSX.writeFile(wb, filename);
  };

  const setQuickDate = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);

    setEndDate(end.toISOString().split('T')[0]);
    setStartDate(start.toISOString().split('T')[0]);
  };

  return (
    <div className="reports-container">
      <div className="reports-header">
        <div>
          <h1 className="page-title">
            Training <em>Reports</em>
          </h1>
          <p className="page-subtitle">Training data reports</p>
        </div>
      </div>

      <div className="report-filters">
        <div className="filter-section">
          <h3>Select Period</h3>

          <div className="quick-dates">
            <button onClick={() => setQuickDate(7)} className="quick-date-btn">Last 7 Days</button>
            <button onClick={() => setQuickDate(30)} className="quick-date-btn">Last 30 Days</button>
            <button onClick={() => setQuickDate(90)} className="quick-date-btn">Last 90 Days</button>
          </div>

          <div className="date-inputs">
            <div className="form-group">
              <label>Start Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>End Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="form-input"
              />
            </div>
          </div>
        </div>

        <div className="filter-section">
          <h3>Filter Data</h3>
          <div className="filter-inputs">
            <div className="form-group">
              <label>Department</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="form-input"
              >
                <option value="all">All</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Role</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="form-input"
              >
                <option value="all">All</option>
                <option value="trainee">Trainee</option>
                <option value="trainer">Trainer</option>
              </select>
            </div>
          </div>
        </div>

        <div className="filter-actions">
          <button onClick={fetchReport} className="fetch-btn" disabled={loading}>
            {loading ? 'Loading...' : 'Generate Report'}
          </button>
        </div>
      </div>

      {error && (
        <div className="alert alert-error">{error}</div>
      )}

      {reportData && (
        <>
          <div className="report-summary">
            <div className="summary-card">
              <div className="summary-label">Total Records</div>
              <div className="summary-value">{reportData.summary.total_records}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Total Hours</div>
              <div className="summary-value">{reportData.summary.total_hours.toFixed(2)}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">Total Employees</div>
              <div className="summary-value">{reportData.summary.unique_employees}</div>
            </div>
          </div>

          <div className="report-actions">
            <button onClick={exportToExcel} className="export-btn">
              📊 Export to Excel
            </button>
          </div>

          <div className="report-table-container">
            <table className="report-table">
              <thead>
                <tr>
                  <th>No.</th>
                  <th>Employee ID</th>
                  <th>Employee Name</th>
                  <th>Department</th>
                  <th>Role</th>
                  <th>Date</th>
                  <th>Topic</th>
                  <th>Hours</th>
                  <th>Trainer</th>
                </tr>
              </thead>
              <tbody>
                {reportData.records.map((record, index) => (
                  <tr key={record.id}>
                    <td>{index + 1}</td>
                    <td>{record.employee_id}</td>
                    <td>{record.employee_name}</td>
                    <td>{record.department || '-'}</td>
                    <td>
                      <span className={`role-badge ${record.role}`}>
                        {record.role === 'trainer' ? 'Trainer' : 'Trainee'}
                      </span>
                    </td>
                    <td>{record.training_date}</td>
                    <td>{record.training_topic}</td>
                    <td>{record.training_hours}</td>
                    <td>{record.trainer_name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

export default Reports;
