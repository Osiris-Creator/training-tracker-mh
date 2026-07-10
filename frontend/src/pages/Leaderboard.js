import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../utils/api';
import './Leaderboard.css';

function Leaderboard() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [topTrainees, setTopTrainees] = useState([]);
  const [topTrainers, setTopTrainers] = useState([]);
  const [topDepartments, setTopDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadLeaderboards();
  }, []);

  const loadLeaderboards = async () => {
    setLoading(true);
    try {
      const [traineesRes, trainersRes, departmentsRes] = await Promise.all([
        axios.get(`${API_BASE_URL}/training/leaderboard/trainees?limit=10`),
        axios.get(`${API_BASE_URL}/training/leaderboard/trainers?limit=10`),
        axios.get(`${API_BASE_URL}/training/leaderboard/departments?limit=10`)
      ]);

      setTopTrainees(traineesRes.data.leaderboard || []);
      setTopTrainers(trainersRes.data.leaderboard || []);
      setTopDepartments(departmentsRes.data.leaderboard || []);
    } catch (err) {
      console.error('Failed to load leaderboards:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      alert('Please enter a search term');
      return;
    }

    setSearching(true);
    try {
      const response = await axios.get(`${API_BASE_URL}/training/search?query=${encodeURIComponent(searchQuery)}`);
      console.log('Search response:', response.data);
      setSearchResults(response.data.results || []);
    } catch (err) {
      console.error('Search failed:', err);
      alert('Search failed: ' + (err.response?.data?.error || err.message));
      setSearchResults([]);
    } finally {
      setSearching(false);
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
      <div className="leaderboard-loading">
        <div className="spinner"></div>
        <p>Loading leaderboards...</p>
      </div>
    );
  }

  return (
    <div className="leaderboard-container">
      <div className="leaderboard-header">
        <h1 className="leaderboard-title">
          Training <em>Leaderboard</em>
        </h1>
        <p className="leaderboard-subtitle">Track training performance and achievements</p>
      </div>

      {/* Search Section */}
      <section className="search-section">
        <form onSubmit={handleSearch} className="search-form">
          <div className="search-input-wrapper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"></circle>
              <path d="m21 21-4.35-4.35"></path>
            </svg>
            <input
              type="text"
              placeholder="Search by employee name or ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
          <button type="submit" className="search-btn" disabled={searching}>
            {searching ? 'Searching...' : 'Search'}
          </button>
        </form>

        {/* Search Results */}
        {searchQuery && searchResults.length === 0 && !searching && (
          <div className="no-results">
            <p>No results found for "{searchQuery}"</p>
          </div>
        )}

        {searchResults.length > 0 && (
          <div className="search-results">
            <h3 className="results-title">Search Results ({searchResults.length})</h3>
            <div className="results-list">
              {searchResults.map((emp) => (
                <div key={emp.employee_id} className="result-card">
                  <div className="result-header">
                    <div className="result-name">{emp.employee_name}</div>
                    <div className="result-id">ID: {emp.employee_id}</div>
                  </div>
                  <div className="result-meta">
                    {emp.department} · {emp.position}
                  </div>
                  <div className="result-stats">
                    <div className="stat-box trainee">
                      <div className="stat-label">As Trainee</div>
                      <div className="stat-value">{formatHours(emp.total_trainee_hours)}</div>
                      <div className="stat-count">{emp.trainee_count} sessions</div>
                    </div>
                    <div className="stat-box trainer">
                      <div className="stat-label">As Trainer</div>
                      <div className="stat-value">{formatHours(emp.total_trainer_hours)}</div>
                      <div className="stat-count">{emp.trainer_count} sessions</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Leaderboards */}
      <div className="leaderboards-grid">
        {/* Top Trainees */}
        <section className="leaderboard-section">
          <div className="section-header">
            <h2 className="section-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
              </svg>
              Top Trainees
            </h2>
            <span className="section-badge">Most Training Hours</span>
          </div>

          <div className="leaderboard-list">
            {topTrainees.map((trainee, index) => (
              <div key={trainee.employee_id} className={`leaderboard-item rank-${index + 1}`}>
                <div className="rank-badge">
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index > 2 && `#${index + 1}`}
                </div>
                <div className="item-info">
                  <div className="item-name">{trainee.employee_name}</div>
                  <div className="item-meta">{trainee.department}</div>
                </div>
                <div className="item-stats">
                  <div className="item-hours">{formatHours(trainee.total_hours)}</div>
                  <div className="item-count">{trainee.training_count} sessions</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Top Trainers */}
        <section className="leaderboard-section">
          <div className="section-header">
            <h2 className="section-title">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 10v6M2 10l10-5 10 5-10 5z"></path>
                <path d="M6 12v5c3 3 9 3 12 0v-5"></path>
              </svg>
              Top Trainers
            </h2>
            <span className="section-badge">Most Teaching Hours</span>
          </div>

          <div className="leaderboard-list">
            {topTrainers.map((trainer, index) => (
              <div key={trainer.employee_id} className={`leaderboard-item rank-${index + 1}`}>
                <div className="rank-badge">
                  {index === 0 && '🥇'}
                  {index === 1 && '🥈'}
                  {index === 2 && '🥉'}
                  {index > 2 && `#${index + 1}`}
                </div>
                <div className="item-info">
                  <div className="item-name">{trainer.employee_name}</div>
                  <div className="item-meta">{trainer.department}</div>
                </div>
                <div className="item-stats">
                  <div className="item-hours">{formatHours(trainer.total_hours)}</div>
                  <div className="item-count">{trainer.sessions_count} sessions · {trainer.total_trainees} trainees</div>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Top Departments */}
      <section className="leaderboard-section full-width">
        <div className="section-header">
          <h2 className="section-title">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            Top Departments
          </h2>
          <span className="section-badge">Most Active Departments</span>
        </div>

        <div className="departments-grid">
          {topDepartments.map((dept, index) => (
            <div key={dept.department} className={`department-card rank-${index + 1}`}>
              <div className="department-rank">
                {index === 0 && '🥇'}
                {index === 1 && '🥈'}
                {index === 2 && '🥉'}
                {index > 2 && `#${index + 1}`}
              </div>
              <div className="department-content">
                <div className="department-name">{dept.department}</div>
                <div className="department-stats-grid">
                  <div className="dept-stat">
                    <div className="dept-stat-label">Total Hours</div>
                    <div className="dept-stat-value">{formatHours(dept.total_hours)}</div>
                  </div>
                  <div className="dept-stat">
                    <div className="dept-stat-label">Employees</div>
                    <div className="dept-stat-value">{dept.employee_count}</div>
                  </div>
                  <div className="dept-stat">
                    <div className="dept-stat-label">Sessions</div>
                    <div className="dept-stat-value">{dept.total_sessions}</div>
                  </div>
                  <div className="dept-stat">
                    <div className="dept-stat-label">Avg/Session</div>
                    <div className="dept-stat-value">{formatHours(dept.avg_hours_per_session)}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

export default Leaderboard;
