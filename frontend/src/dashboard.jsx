import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import './Dashboard.css';

const Dashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const userId = localStorage.getItem('user_id') || sessionStorage.getItem('user_id');
    if (!userId) {
      navigate('/login');
      return;
    }

    const verifyUser = async () => {
      try {
        setLoading(true);
        const response = await fetch(`http://localhost:5000/user/${userId}`);
        
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          console.log('User verified:', userData.full_name);
        } else {
          navigate('/login');
        }
      } catch (error) {
        console.error('Error verifying user:', error);
        setError('Failed to verify user. Redirecting to login...');
        setTimeout(() => navigate('/login'), 2000);
      } finally {
        setLoading(false);
      }
    };

    verifyUser();
  }, [navigate]);

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Verifying authentication...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error-container">
          <p>{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <Sidebar />
      <div className="main-content">
        <div className="welcome-banner">
          <h1>Welcome, {user?.full_name}!</h1>
          <p>Your current streak: {user?.current_streak} days</p>
          <div className="dashboard-card">
            <p>Start by exploring your stress levels or checking your progress</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;