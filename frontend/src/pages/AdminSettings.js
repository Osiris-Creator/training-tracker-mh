import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import './AdminSettings.css';

function AdminSettings() {
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [resetting, setResetting] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    loadPreview();
  }, []);

  const loadPreview = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/admin/reset-preview`);
      setPreview(response.data);
    } catch (err) {
      console.error('Failed to load preview:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleResetClick = () => {
    setShowConfirmDialog(true);
    setConfirmText('');
    setMessage(null);
  };

  const handleConfirmReset = async () => {
    if (confirmText !== 'RESET ALL DATA') {
      setMessage({ type: 'error', text: 'Please type "RESET ALL DATA" exactly to confirm' });
      return;
    }

    setResetting(true);
    try {
      const response = await axios.delete(`${API_BASE_URL}/admin/reset-all-training`, {
        data: { confirm: 'RESET_ALL_DATA' }
      });

      setMessage({
        type: 'success',
        text: `Successfully deleted ${response.data.deleted_count} training records`
      });

      setShowConfirmDialog(false);
      loadPreview(); // Reload preview
    } catch (err) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to reset training data'
      });
    } finally {
      setResetting(false);
    }
  };

  const formatHours = (hours) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    if (h === 0 && m === 0) return '0 hrs';
    if (h === 0) return `${m} mins`;
    if (m === 0) return `${h} hrs`;
    return `${h} hrs ${m} mins`;
  };

  if (loading) {
    return (
      <div className="admin-loading">
        <div className="spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1 className="admin-title">
          Admin <em>Settings</em>
        </h1>
        <p className="admin-subtitle">Manage training data and system settings</p>
      </div>

      {message && (
        <div className={`alert alert-${message.type}`}>
          {message.text}
        </div>
      )}

      {/* Current Data Overview */}
      <section className="admin-section">
        <h2 className="section-title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path>
            <polyline points="13 2 13 9 20 9"></polyline>
          </svg>
          Current Training Data
        </h2>

        <div className="data-overview-grid">
          <div className="data-card">
            <div className="data-icon">📊</div>
            <div className="data-value">{preview?.totalRecords || 0}</div>
            <div className="data-label">Total Records</div>
          </div>

          <div className="data-card">
            <div className="data-icon">👥</div>
            <div className="data-value">{preview?.totalEmployeesWithTraining || 0}</div>
            <div className="data-label">Employees with Training</div>
          </div>

          <div className="data-card">
            <div className="data-icon">⏱️</div>
            <div className="data-value">{formatHours(preview?.totalHours || 0)}</div>
            <div className="data-label">Total Training Hours</div>
          </div>
        </div>
      </section>

      {/* Danger Zone */}
      <section className="admin-section danger-zone">
        <div className="danger-header">
          <h2 className="section-title">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
              <line x1="12" y1="9" x2="12" y2="13"></line>
              <line x1="12" y1="17" x2="12.01" y2="17"></line>
            </svg>
            Danger Zone
          </h2>
          <span className="danger-badge">Irreversible Actions</span>
        </div>

        <div className="danger-content">
          <div className="danger-info">
            <h3>Reset All Training Data</h3>
            <p>
              This will permanently delete <strong>all training records</strong> from the database.
              Employee information will be preserved, but all training history will be lost.
            </p>
            <ul className="warning-list">
              <li>⚠️ All training sessions will be deleted</li>
              <li>⚠️ All leaderboard data will be reset</li>
              <li>⚠️ This action cannot be undone</li>
              <li>✅ Employee profiles will remain intact</li>
            </ul>
          </div>

          <button
            className="reset-btn"
            onClick={handleResetClick}
            disabled={preview?.totalRecords === 0}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="1 4 1 10 7 10"></polyline>
              <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"></path>
            </svg>
            Reset All Training Data
          </button>
        </div>
      </section>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="modal-overlay" onClick={() => !resetting && setShowConfirmDialog(false)}>
          <div className="modal-content confirm-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>⚠️ Confirm Reset</h2>
            </div>

            <div className="modal-body">
              <p className="confirm-message">
                You are about to delete <strong>{preview?.totalRecords} training records</strong>.
                This action cannot be undone!
              </p>

              <div className="confirm-input-group">
                <label htmlFor="confirmText">
                  Type <code>RESET ALL DATA</code> to confirm:
                </label>
                <input
                  id="confirmText"
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  placeholder="RESET ALL DATA"
                  className="confirm-input"
                  disabled={resetting}
                  autoComplete="off"
                />
              </div>

              <div className="modal-actions">
                <button
                  className="cancel-btn"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={resetting}
                >
                  Cancel
                </button>
                <button
                  className="confirm-reset-btn"
                  onClick={handleConfirmReset}
                  disabled={resetting || confirmText !== 'RESET ALL DATA'}
                >
                  {resetting ? 'Resetting...' : 'Reset All Data'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminSettings;
