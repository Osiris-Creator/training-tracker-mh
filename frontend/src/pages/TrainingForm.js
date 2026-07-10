import React, { useState, useEffect } from 'react';
import { getEmployees, submitTraining, API_BASE_URL } from '../utils/api';
import axios from 'axios';
import './TrainingForm.css';

function TrainingForm() {
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filteredEmployees, setFilteredEmployees] = useState([]);
  const [trainerTopics, setTrainerTopics] = useState([]);
  const [selectedTrainer, setSelectedTrainer] = useState(null);
  const [todaySessions, setTodaySessions] = useState([]);
  const [joinedSessionId, setJoinedSessionId] = useState(null);
  const [attachmentFile, setAttachmentFile] = useState(null);
  const [attachmentPreview, setAttachmentPreview] = useState(null);
  const [formData, setFormData] = useState({
    department: '',
    employee_id: '',
    role: 'trainee', // 'trainer' or 'trainee'
    training_date: new Date().toISOString().split('T')[0],
    training_topic: '',
    training_hours: '',
    training_minutes: '',
    trainer_name: '',
    notes: ''
  });
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadEmployees();
    loadTodaySessions();
  }, []);

  useEffect(() => {
    // Load trainer topics when trainer_name changes
    if (formData.trainer_name && formData.trainer_name.trim() !== '') {
      loadTrainerTopics(formData.trainer_name);
    } else {
      setTrainerTopics([]);
      setSelectedTrainer(null);
    }
  }, [formData.trainer_name]);

  // Reload today's sessions when role changes to trainee
  useEffect(() => {
    if (formData.role === 'trainee') {
      loadTodaySessions();

      // Auto-refresh every minute to update timers and remove expired sessions
      const interval = setInterval(() => {
        loadTodaySessions();
      }, 60000); // 60 seconds

      return () => clearInterval(interval);
    }
  }, [formData.role]);

  const loadTodaySessions = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/training/today-sessions`);
      setTodaySessions(response.data.sessions || []);
    } catch (err) {
      console.error('Failed to load today sessions:', err);
      setTodaySessions([]);
    }
  };

  const formatTimeRemaining = (minutes) => {
    if (minutes <= 0) return 'Expired';
    if (minutes < 60) return `${minutes} min left`;

    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (mins === 0) return `${hours}h left`;
    return `${hours}h ${mins}m left`;
  };

  const loadTrainerTopics = async (trainerName) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/training/trainer-topics/${encodeURIComponent(trainerName)}`);
      setTrainerTopics(response.data.topics || []);
      setSelectedTrainer(trainerName);
    } catch (err) {
      console.error('Failed to load trainer topics:', err);
      setTrainerTopics([]);
    }
  };

  const handleJoinSession = (session) => {
    // Convert decimal hours to hours and minutes
    const totalHours = session.training_hours;
    const hours = Math.floor(totalHours);
    const minutes = Math.round((totalHours - hours) * 60);

    setFormData(prev => ({
      ...prev,
      training_topic: session.training_topic,
      training_hours: hours.toString(),
      training_minutes: minutes.toString(),
      trainer_name: session.trainer_name,
      training_date: session.training_date,
      notes: session.notes || ''
    }));

    // Store session ID to link trainee with trainer
    setJoinedSessionId(session.id);

    // Scroll to form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const loadEmployees = async () => {
    try {
      const response = await getEmployees();
      setEmployees(response.data);

      // Extract unique departments
      const uniqueDepts = [...new Set(response.data.map(emp => emp.department))].sort();
      setDepartments(uniqueDepts);
    } catch (err) {
      setError('Failed to load employee data');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));

    if (name === 'department') {
      // Filter employees by department
      const filtered = employees.filter(emp => emp.department === value);
      setFilteredEmployees(filtered);
      // Reset employee selection when department changes
      setFormData(prev => ({ ...prev, employee_id: '' }));
      setSelectedEmployee(null);
    }

    if (name === 'employee_id') {
      const emp = employees.find(e => e.employee_id === parseInt(value));
      setSelectedEmployee(emp || null);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    // Convert hours and minutes to decimal hours
    const hours = parseInt(formData.training_hours) || 0;
    const minutes = parseInt(formData.training_minutes) || 0;
    const totalHours = hours + (minutes / 60);

    if (totalHours <= 0) {
      setError('Please enter training duration');
      setLoading(false);
      return;
    }

    try {
      const formDataToSend = new FormData();
      formDataToSend.append('employee_id', formData.employee_id);
      formDataToSend.append('role', formData.role);
      formDataToSend.append('training_date', formData.training_date);
      formDataToSend.append('training_topic', formData.training_topic);
      formDataToSend.append('training_hours', totalHours);
      formDataToSend.append('trainer_name', formData.trainer_name);
      formDataToSend.append('notes', formData.notes);
      if (joinedSessionId) {
        formDataToSend.append('session_id', joinedSessionId);
      }
      if (attachmentFile) {
        formDataToSend.append('attachment', attachmentFile);
      }

      await submitTraining(formDataToSend);

      setSuccess(true);
      setFormData({
        department: '',
        employee_id: '',
        role: 'trainee',
        training_date: new Date().toISOString().split('T')[0],
        training_topic: '',
        training_hours: '',
        training_minutes: '',
        trainer_name: '',
        notes: ''
      });
      setSelectedEmployee(null);
      setFilteredEmployees([]);
      setJoinedSessionId(null);
      setAttachmentFile(null);
      setAttachmentPreview(null);

      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      setError('Failed to save training record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <div className="form-card">
        <div className="form-header">
          <span className="eyebrow-pill">Training Record</span>
          <h1 className="form-title">
            Log Your <em>Training</em> Hours
          </h1>
          <p className="form-subtitle">Record your training and skill development activities</p>
        </div>

        {success && (
          <div className="alert alert-success">
            ✓ Training record saved successfully
          </div>
        )}

        {error && (
          <div className="alert alert-error">
            ✗ {error}
          </div>
        )}

        {/* Today's Training Sessions - Only show for trainees */}
        {formData.role === 'trainee' && todaySessions.length > 0 && (
          <div className="today-sessions-section">
            <div className="sessions-header">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
              <h3>Today's Training Sessions</h3>
              <span className="sessions-badge">{todaySessions.length}</span>
            </div>
            <div className="sessions-list">
              {todaySessions.map((session) => (
                <div key={session.id} className="session-card" onClick={() => handleJoinSession(session)}>
                  <div className="session-main">
                    <div className="session-topic">{session.training_topic}</div>
                    <div className="session-trainer">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                        <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                      </svg>
                      by {session.trainer_name}
                    </div>
                  </div>
                  <div className="session-info">
                    <div className="session-time-info">
                      <div className="session-hours">
                        {(() => {
                          const h = Math.floor(session.training_hours);
                          const m = Math.round((session.training_hours - h) * 60);
                          return h > 0 && m > 0 ? `${h}h ${m}m` : h > 0 ? `${h}h` : `${m}m`;
                        })()}
                      </div>
                      {session.time_remaining_minutes && (
                        <div className="session-timer">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="10"></circle>
                            <polyline points="12 6 12 12 16 14"></polyline>
                          </svg>
                          {formatTimeRemaining(session.time_remaining_minutes)}
                        </div>
                      )}
                    </div>
                    <button type="button" className="join-btn">
                      Join →
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Joined Session Indicator */}
        {joinedSessionId && (
          <div className="joined-session-indicator">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
              <polyline points="22 4 12 14.01 9 11.01"></polyline>
            </svg>
            <span>Joined a training session - form pre-filled!</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="training-form">
          <div className="form-group">
            <label htmlFor="department" className="form-label">
              Department <span className="required">*</span>
            </label>
            <select
              id="department"
              name="department"
              value={formData.department}
              onChange={handleInputChange}
              required
              className="form-select"
            >
              <option value="">Select Department</option>
              {departments.map(dept => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="employee_id" className="form-label">
              Employee Name <span className="required">*</span>
            </label>
            <select
              id="employee_id"
              name="employee_id"
              value={formData.employee_id}
              onChange={handleInputChange}
              required
              disabled={!formData.department}
              className="form-select"
            >
              <option value="">
                {formData.department ? 'Select Employee' : 'Select department first'}
              </option>
              {filteredEmployees.map(emp => (
                <option key={emp.employee_id} value={emp.employee_id}>
                  {emp.employee_name}
                </option>
              ))}
            </select>
          </div>

          {selectedEmployee && (
            <div className="employee-info">
              <div className="info-item">
                <span className="info-label">Position:</span>
                <span>{selectedEmployee.position}</span>
              </div>
              <div className="info-item">
                <span className="info-label">Department:</span>
                <span>{selectedEmployee.department}</span>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              Your Role <span className="required">*</span>
            </label>
            <div className="role-selector">
              <label className="role-option">
                <input
                  type="radio"
                  name="role"
                  value="trainee"
                  checked={formData.role === 'trainee'}
                  onChange={handleInputChange}
                  className="role-radio"
                />
                <span className="role-label">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                    <circle cx="9" cy="7" r="4"></circle>
                    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
                    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
                  </svg>
                  <span>
                    <strong>Trainee</strong>
                    <small>I attended the training</small>
                  </span>
                </span>
              </label>
              <label className="role-option">
                <input
                  type="radio"
                  name="role"
                  value="trainer"
                  checked={formData.role === 'trainer'}
                  onChange={handleInputChange}
                  className="role-radio"
                />
                <span className="role-label">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                    <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
                  </svg>
                  <span>
                    <strong>Trainer</strong>
                    <small>I conducted the training</small>
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="training_date" className="form-label">
              Training Date <span className="required">*</span>
            </label>
            <input
              type="date"
              id="training_date"
              name="training_date"
              value={formData.training_date}
              onChange={handleInputChange}
              required
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label htmlFor="training_topic" className="form-label">
              Training Topic <span className="required">*</span>
            </label>
            <input
              type="text"
              id="training_topic"
              name="training_topic"
              value={formData.training_topic}
              onChange={handleInputChange}
              required
              placeholder="e.g., Customer Service Excellence"
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">
              Training Duration <span className="required">*</span>
            </label>
            <div className="duration-inputs">
              <div className="duration-field">
                <input
                  type="number"
                  id="training_hours"
                  name="training_hours"
                  value={formData.training_hours}
                  onChange={handleInputChange}
                  min="0"
                  max="24"
                  placeholder="0"
                  className="form-input"
                />
                <span className="duration-label">Hours</span>
              </div>
              <div className="duration-separator">:</div>
              <div className="duration-field">
                <input
                  type="number"
                  id="training_minutes"
                  name="training_minutes"
                  value={formData.training_minutes}
                  onChange={handleInputChange}
                  min="0"
                  max="59"
                  placeholder="0"
                  className="form-input"
                />
                <span className="duration-label">Minutes</span>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="trainer_name" className="form-label">
              {formData.role === 'trainer' ? 'Co-Trainer Name (if any)' : 'Trainer Name'}
            </label>
            <input
              type="text"
              id="trainer_name"
              name="trainer_name"
              value={formData.trainer_name}
              onChange={handleInputChange}
              placeholder={formData.role === 'trainer' ? 'Name of co-trainer' : 'Name of the trainer'}
              className="form-input"
            />

            {/* Show trainer's topics if trainee and trainer is selected */}
            {formData.role === 'trainee' && trainerTopics.length > 0 && (
              <div className="trainer-topics-box">
                <div className="trainer-topics-header">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5M2 12l10 5 10-5"></path>
                  </svg>
                  <span>Topics taught by {selectedTrainer}:</span>
                </div>
                <div className="trainer-topics-list">
                  {trainerTopics.map((topic, index) => (
                    <div
                      key={index}
                      className="topic-chip"
                      onClick={() => setFormData(prev => ({ ...prev, training_topic: topic.training_topic }))}
                      title="Click to select this topic"
                    >
                      <span className="topic-name">{topic.training_topic}</span>
                      <span className="topic-count">{topic.count}×</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="form-group">
            <label htmlFor="notes" className="form-label">
              Notes
            </label>
            <textarea
              id="notes"
              name="notes"
              value={formData.notes}
              onChange={handleInputChange}
              rows="3"
              placeholder="Additional information (optional)"
              className="form-textarea"
            ></textarea>
          </div>

          <div className="form-group">
            <label htmlFor="attachment" className="form-label">
              Attachment (Optional)
            </label>
            <p className="form-helper-text">Upload photo or document as evidence (Max 5MB: JPG, PNG, PDF, DOC, DOCX)</p>
            <input
              type="file"
              id="attachment"
              accept=".jpg,.jpeg,.png,.pdf,.doc,.docx"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  if (file.size > 5 * 1024 * 1024) {
                    setError('File size must be less than 5MB');
                    e.target.value = null;
                    return;
                  }
                  setAttachmentFile(file);
                  setError('');

                  // Preview for images
                  if (file.type.startsWith('image/')) {
                    const reader = new FileReader();
                    reader.onloadend = () => {
                      setAttachmentPreview(reader.result);
                    };
                    reader.readAsDataURL(file);
                  } else {
                    setAttachmentPreview(null);
                  }
                }
              }}
              className="form-input"
            />
            {attachmentFile && (
              <div className="attachment-preview">
                {attachmentPreview ? (
                  <img src={attachmentPreview} alt="Preview" className="preview-image" />
                ) : (
                  <div className="file-info">
                    <span className="file-icon">📄</span>
                    <span className="file-name">{attachmentFile.name}</span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAttachmentFile(null);
                    setAttachmentPreview(null);
                    document.getElementById('attachment').value = null;
                  }}
                  className="remove-attachment-btn"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="submit-button"
          >
            {loading ? 'Saving...' : 'Submit Training Record'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default TrainingForm;
