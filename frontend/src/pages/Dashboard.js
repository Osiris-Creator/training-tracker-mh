import React, { useState, useEffect } from 'react';
import { getDashboardStats, API_BASE_URL } from '../utils/api';
import axios from 'axios';
import './Dashboard.css';

// Helper function to format hours and minutes
const formatDuration = (hours) => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);

  if (h === 0 && m === 0) return '0 hrs';
  if (h === 0) return `${m} mins`;
  if (m === 0) return `${h} hrs`;
  return `${h} hrs ${m} mins`;
};

function Dashboard() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedSession, setSelectedSession] = useState(null);
  const [sessionDetails, setSessionDetails] = useState(null);
  const [loadingDetails, setLoadingDetails] = useState(false);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await getDashboardStats();
      setStats(response.data);
    } catch (err) {
      setError('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadSessionDetails = async (sessionId) => {
    setLoadingDetails(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/training/session/${sessionId}`);
      setSessionDetails(response.data);
    } catch (err) {
      console.error('Failed to load session details:', err);
    } finally {
      setLoadingDetails(false);
    }
  };

  const handleSessionClick = (session) => {
    setSelectedSession(session);
    loadSessionDetails(session.session_id);
  };

  const closeModal = () => {
    setSelectedSession(null);
    setSessionDetails(null);
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="spinner"></div>
        <p>Loading data...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <p>{error}</p>
        <button onClick={loadStats} className="retry-button">Try Again</button>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <div className="dashboard-header">
        <span className="eyebrow-pill">Analytics</span>
        <h1 className="dashboard-title">
          Training <em>Overview</em>
        </h1>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#F2E3D6', color: '#C4612F' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
              <circle cx="9" cy="7" r="4"></circle>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalEmployees}</div>
            <div className="stat-label">Total Employees</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#d4edda', color: '#155724' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10"></circle>
              <polyline points="12 6 12 12 16 14"></polyline>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatDuration(stats.totalHours)}</div>
            <div className="stat-label">Total Training Time</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#cce5ff', color: '#004085' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
              <polyline points="14 2 14 8 20 8"></polyline>
              <line x1="16" y1="13" x2="8" y2="13"></line>
              <line x1="16" y1="17" x2="8" y2="17"></line>
              <polyline points="10 9 9 9 8 9"></polyline>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalRecords}</div>
            <div className="stat-label">Training Sessions</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon" style={{ backgroundColor: '#fff3cd', color: '#856404' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23"></line>
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
            </svg>
          </div>
          <div className="stat-content">
            <div className="stat-value">{formatDuration(stats.avgHoursPerEmployee)}</div>
            <div className="stat-label">Average per Employee</div>
          </div>
        </div>
      </div>

      <div className="dashboard-sections">
        <section className="dashboard-section">
          <h2 className="section-title">By Department</h2>
          <div className="department-list">
            {stats.byDepartment && stats.byDepartment.length > 0 ? (
              stats.byDepartment.map((dept, index) => (
                <div key={index} className="department-item">
                  <div className="department-info">
                    <div className="department-name">{dept.department}</div>
                    <div className="department-meta">
                      {dept.employee_count} {dept.employee_count === 1 ? 'employee' : 'employees'}
                    </div>
                  </div>
                  <div className="department-hours">
                    {formatDuration(dept.total_hours)}
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">No data available</p>
            )}
          </div>
        </section>

        <section className="dashboard-section">
          <h2 className="section-title">Training Sessions</h2>
          <div className="sessions-grid">
            {stats.trainingSessions && stats.trainingSessions.length > 0 ? (
              stats.trainingSessions.map((session) => (
                <div
                  key={session.session_id}
                  className="session-card-dashboard"
                  onClick={() => handleSessionClick(session)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="session-header">
                    <div className="session-topic-main">{session.training_topic}</div>
                    <div className="session-date">
                      {new Date(session.training_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                  <div className="session-body">
                    <div className="session-trainer-info">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                        <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                      </svg>
                      <span>{session.trainer_name}</span>
                    </div>
                    <div className="session-stats">
                      <div className="stat-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                          <circle cx="9" cy="7" r="4"></circle>
                          <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>
                        </svg>
                        <span>{session.trainee_count} {session.trainee_count === 1 ? 'trainee' : 'trainees'}</span>
                      </div>
                      <div className="stat-item">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <circle cx="12" cy="12" r="10"></circle>
                          <polyline points="12 6 12 12 16 14"></polyline>
                        </svg>
                        <span>{formatDuration(session.training_hours)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">No training sessions yet</p>
            )}
          </div>
        </section>

        <section className="dashboard-section">
          <h2 className="section-title">Recent Training</h2>
          <div className="training-list">
            {stats.recentTraining && stats.recentTraining.length > 0 ? (
              stats.recentTraining.map((record) => (
                <div key={record.id} className="training-item">
                  <div className="training-main">
                    <div className="training-topic">{record.training_topic}</div>
                    <div className="training-meta">
                      {record.employee_name} · {record.department}
                      {record.role && (
                        <span className={`role-badge ${record.role}`}>
                          {record.role === 'trainer' ? '👨‍🏫 Trainer' : '👤 Trainee'}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="training-details">
                    <div className="training-date">
                      {new Date(record.training_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </div>
                    <div className="training-hours-badge">
                      {formatDuration(record.training_hours)}
                    </div>
                    {record.attachment_url && (
                      <a
                        href={`${API_BASE_URL.replace('/api', '')}/api/attachment/preview?url=${encodeURIComponent(record.attachment_url)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="attachment-link"
                        title="View attachment"
                      >
                        📎
                      </a>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="empty-state">No data available</p>
            )}
          </div>
        </section>
      </div>

      {/* Session Details Modal */}
      {selectedSession && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content session-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedSession.training_topic}</h2>
              <button className="close-btn" onClick={closeModal}>×</button>
            </div>

            <div className="modal-body">
              <div className="session-info-row">
                <div className="info-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                  </svg>
                  <div>
                    <div className="info-label">Trainer</div>
                    <div className="info-value">{selectedSession.trainer_name}</div>
                  </div>
                </div>

                <div className="info-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                    <line x1="16" y1="2" x2="16" y2="6"></line>
                    <line x1="8" y1="2" x2="8" y2="6"></line>
                    <line x1="3" y1="10" x2="21" y2="10"></line>
                  </svg>
                  <div>
                    <div className="info-label">Date</div>
                    <div className="info-value">
                      {new Date(selectedSession.training_date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </div>
                  </div>
                </div>

                <div className="info-item">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10"></circle>
                    <polyline points="12 6 12 12 16 14"></polyline>
                  </svg>
                  <div>
                    <div className="info-label">Duration</div>
                    <div className="info-value">{formatDuration(selectedSession.training_hours)}</div>
                  </div>
                </div>
              </div>

              <div className="trainees-section">
                <h3 className="trainees-title">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  Participants ({selectedSession.trainee_count})
                </h3>

                {loadingDetails ? (
                  <div className="loading-trainees">
                    <div className="spinner-small"></div>
                    <span>Loading participants...</span>
                  </div>
                ) : sessionDetails && sessionDetails.trainees.length > 0 ? (
                  <div className="trainees-list">
                    {sessionDetails.trainees.map((trainee, index) => (
                      <div key={trainee.id} className="trainee-item">
                        <div className="trainee-number">{index + 1}</div>
                        <div className="trainee-info">
                          <div className="trainee-name">{trainee.employee_name}</div>
                          <div className="trainee-meta">
                            {trainee.department} · ID: {trainee.employee_id}
                          </div>
                        </div>
                        <div className="trainee-hours">
                          {formatDuration(trainee.training_hours)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="no-trainees">No participants yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
