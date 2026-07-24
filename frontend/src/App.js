import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, NavLink, useNavigate } from 'react-router-dom';
import TrainingForm from './pages/TrainingForm';
import Dashboard from './pages/Dashboard';
import QRCodePage from './pages/QRCodePage';
import EmployeeManagement from './pages/EmployeeManagement';
import Leaderboard from './pages/Leaderboard';
import AdminSettings from './pages/AdminSettings';
import Reports from './pages/Reports';
import Login from './pages/Login';
import ProtectedRoute from './components/ProtectedRoute';
import './App.css';

function AppContent({ isAuthenticated, setIsAuthenticated }) {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('isAdminLoggedIn');
    setIsAuthenticated(false);
    navigate('/login');
  };

  return (
    <div className="app">
      {isAuthenticated && (
        <nav className="navbar">
          <div className="nav-container">
            <div className="nav-logo">
              <img src="/images/avani-logo.png" alt="Avani+ Samui" className="logo-image" />
              <span className="logo-divider">|</span>
              <span className="logo-text">Training Tracker</span>
            </div>
            <div className="nav-links">
              <NavLink to="/" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'} end>
                Dashboard
              </NavLink>
              <NavLink to="/form" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Training Form
              </NavLink>
              <NavLink to="/leaderboard" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Leaderboard
              </NavLink>
              <NavLink to="/employees" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Employees
              </NavLink>
              <NavLink to="/reports" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Reports
              </NavLink>
              <NavLink to="/admin" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                Admin
              </NavLink>
              <NavLink to="/qr" className={({ isActive }) => isActive ? 'nav-link active' : 'nav-link'}>
                QR Code
              </NavLink>
              <button onClick={handleLogout} className="nav-link logout-btn">
                Logout
              </button>
            </div>
          </div>
        </nav>
      )}

      <main className="main-content">
        <Routes>
          <Route path="/login" element={<Login onLogin={() => setIsAuthenticated(true)} />} />
          <Route path="/form" element={<TrainingForm />} />

          <Route path="/" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/leaderboard" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Leaderboard />
            </ProtectedRoute>
          } />
          <Route path="/employees" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <EmployeeManagement />
            </ProtectedRoute>
          } />
          <Route path="/reports" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <Reports />
            </ProtectedRoute>
          } />
          <Route path="/admin" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <AdminSettings />
            </ProtectedRoute>
          } />
          <Route path="/qr" element={
            <ProtectedRoute isAuthenticated={isAuthenticated}>
              <QRCodePage />
            </ProtectedRoute>
          } />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loggedIn = localStorage.getItem('isAdminLoggedIn') === 'true';
    setIsAuthenticated(loggedIn);
    setIsLoading(false);
  }, []);

  if (isLoading) {
    return (
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#FDFBF7'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '48px', marginBottom: '20px' }}>⏳</div>
          <div style={{ color: '#5C635D' }}>Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <AppContent isAuthenticated={isAuthenticated} setIsAuthenticated={setIsAuthenticated} />
    </Router>
  );
}

export default App;
