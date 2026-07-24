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
      setError('กรุณาเลือกวันที่เริ่มต้นและสิ้นสุด');
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
      setError('ไม่สามารถโหลดข้อมูลได้: ' + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData || !reportData.records.length) {
      alert('ไม่มีข้อมูลสำหรับ Export');
      return;
    }

    // Prepare data for Excel
    const excelData = reportData.records.map((record, index) => ({
      'ลำดับ': index + 1,
      'รหัสพนักงาน': record.employee_id,
      'ชื่อพนักงาน': record.employee_name,
      'แผนก': record.department || '-',
      'ตำแหน่ง': record.position || '-',
      'ระดับ': record.level || '-',
      'บทบาท': record.role === 'trainer' ? 'วิทยากร' : 'ผู้เข้าอบรม',
      'วันที่': record.training_date,
      'หัวข้อการอบรม': record.training_topic,
      'จำนวนชั่วโมง': record.training_hours,
      'วิทยากร': record.trainer_name || '-',
      'หมายเหตุ': record.notes || '-'
    }));

    // Create workbook
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(excelData);

    // Set column widths
    ws['!cols'] = [
      { wch: 8 },  // ลำดับ
      { wch: 12 }, // รหัสพนักงาน
      { wch: 25 }, // ชื่อพนักงาน
      { wch: 20 }, // แผนก
      { wch: 25 }, // ตำแหน่ง
      { wch: 10 }, // ระดับ
      { wch: 12 }, // บทบาท
      { wch: 12 }, // วันที่
      { wch: 35 }, // หัวข้อการอบรม
      { wch: 12 }, // จำนวนชั่วโมง
      { wch: 25 }, // วิทยากร
      { wch: 30 }  // หมายเหตุ
    ];

    XLSX.utils.book_append_sheet(wb, ws, 'Training Report');

    // Add summary sheet
    const summaryData = [
      { 'รายการ': 'ช่วงวันที่', 'ข้อมูล': `${startDate} ถึง ${endDate}` },
      { 'รายการ': 'แผนก', 'ข้อมูล': department === 'all' ? 'ทั้งหมด' : department },
      { 'รายการ': 'บทบาท', 'ข้อมูล': role === 'all' ? 'ทั้งหมด' : (role === 'trainer' ? 'วิทยากร' : 'ผู้เข้าอบรม') },
      { 'รายการ': '', 'ข้อมูล': '' },
      { 'รายการ': 'จำนวนบันทึกทั้งหมด', 'ข้อมูล': reportData.summary.total_records },
      { 'รายการ': 'จำนวนชั่วโมงรวม', 'ข้อมูล': reportData.summary.total_hours.toFixed(2) },
      { 'รายการ': 'จำนวนพนักงาน', 'ข้อมูล': reportData.summary.unique_employees }
    ];

    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    wsSummary['!cols'] = [{ wch: 25 }, { wch: 30 }];
    XLSX.utils.book_append_sheet(wb, wsSummary, 'สรุป');

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
          <p className="page-subtitle">รายงานข้อมูลการอบรม</p>
        </div>
      </div>

      <div className="report-filters">
        <div className="filter-section">
          <h3>เลือกช่วงเวลา</h3>

          <div className="quick-dates">
            <button onClick={() => setQuickDate(7)} className="quick-date-btn">7 วันล่าสุด</button>
            <button onClick={() => setQuickDate(30)} className="quick-date-btn">30 วันล่าสุด</button>
            <button onClick={() => setQuickDate(90)} className="quick-date-btn">90 วันล่าสุด</button>
          </div>

          <div className="date-inputs">
            <div className="form-group">
              <label>วันที่เริ่มต้น</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="form-input"
              />
            </div>
            <div className="form-group">
              <label>วันที่สิ้นสุด</label>
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
          <h3>กรองข้อมูล</h3>
          <div className="filter-inputs">
            <div className="form-group">
              <label>แผนก</label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="form-input"
              >
                <option value="all">ทั้งหมด</option>
                {departments.map(dept => (
                  <option key={dept} value={dept}>{dept}</option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>บทบาท</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="form-input"
              >
                <option value="all">ทั้งหมด</option>
                <option value="trainee">ผู้เข้าอบรม</option>
                <option value="trainer">วิทยากร</option>
              </select>
            </div>
          </div>
        </div>

        <div className="filter-actions">
          <button onClick={fetchReport} className="fetch-btn" disabled={loading}>
            {loading ? 'กำลังโหลด...' : 'สร้างรายงาน'}
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
              <div className="summary-label">จำนวนบันทึก</div>
              <div className="summary-value">{reportData.summary.total_records}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">ชั่วโมงรวม</div>
              <div className="summary-value">{reportData.summary.total_hours.toFixed(2)}</div>
            </div>
            <div className="summary-card">
              <div className="summary-label">จำนวนพนักงาน</div>
              <div className="summary-value">{reportData.summary.unique_employees}</div>
            </div>
          </div>

          <div className="report-actions">
            <button onClick={exportToExcel} className="export-btn">
              📊 Export เป็น Excel
            </button>
          </div>

          <div className="report-table-container">
            <table className="report-table">
              <thead>
                <tr>
                  <th>ลำดับ</th>
                  <th>รหัสพนักงาน</th>
                  <th>ชื่อพนักงาน</th>
                  <th>แผนก</th>
                  <th>บทบาท</th>
                  <th>วันที่</th>
                  <th>หัวข้อ</th>
                  <th>ชั่วโมง</th>
                  <th>วิทยากร</th>
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
                        {record.role === 'trainer' ? 'วิทยากร' : 'ผู้เข้าอบรม'}
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
