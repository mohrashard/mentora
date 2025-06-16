import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Brain, 
  Heart, 
  Smartphone, 
  GraduationCap, 
  User, 
  LogOut,
  Menu,
  X
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const navigationItems = [
    { 
      name: 'Dashboard', 
      icon: LayoutDashboard, 
      color: '#0d9488', 
      path: '/dashboard',
      gradient: 'linear-gradient(135deg, #0d9488, #14b8a6)'
    },
    { 
      name: 'Stress Predictions', 
      icon: Brain, 
      color: '#7e22ce', 
      path: '/stress',
      gradient: 'linear-gradient(135deg, #7e22ce, #a855f7)'
    },
    { 
      name: 'Mental Health', 
      icon: Heart, 
      color: '#4f46e5', 
      path: '/mentalHealth',
      gradient: 'linear-gradient(135deg, #4f46e5, #6366f1)'
    },
    { 
      name: 'Mobile Addiction', 
      icon: Smartphone, 
      color: '#ec4899', 
      path: '/mobileAddiction',
      gradient: 'linear-gradient(135deg, #ec4899, #f472b6)'
    },
    { 
      name: 'Academic Performance', 
      icon: GraduationCap, 
      color: '#10b981', 
      path: '/academicPerformance',
      gradient: 'linear-gradient(135deg, #10b981, #34d399)'
    },
    { 
      name: 'Profile', 
      icon: User, 
      color: '#06b6d4', 
      path: '/profile',
      gradient: 'linear-gradient(135deg, #06b6d4, #22d3ee)'
    }
  ];

  const handleItemClick = (path) => {
    navigate(path);
    if (window.innerWidth <= 768) {
      setIsOpen(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userData');
    navigate('/login');
    if (window.innerWidth <= 768) {
      setIsOpen(false);
    }
  };

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  return (
    <>
      <button
        className="hamburger-btn"
        onClick={toggleSidebar}
        aria-label={isOpen ? 'Close sidebar' : 'Open sidebar'}
        aria-expanded={isOpen}
      >
        {isOpen ? <X className="hamburger-icon" /> : <Menu className="hamburger-icon" />}
      </button>
      <div className={`sidebar ${isOpen ? 'open' : ''}`}>
        <div className="sidebar-header">
          <div className="logo">
            <div className="logo-container">
              <img 
                src="/MentoraLogo.png" 
                alt="NeuroHealth Logo" 
                className="logo-image"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
              />
              <div className="logo-fallback">
                <Brain className="logo-icon" />
              </div>
            </div>
            <div className="logo-text-container">
              <h2 className="logo-text">Mentora</h2>
              <p className="logo-subtitle">Mental Health Mentor</p>
            </div>
          </div>
        </div>

        <nav className="sidebar-nav">
          <ul className="nav-list">
            {navigationItems.map((item) => {
              const IconComponent = item.icon;
              const isActive = location.pathname === item.path;
              
              return (
                <li key={item.name} className="nav-item">
                  <button
                    className={`nav-link ${isActive ? 'active' : ''}`}
                    onClick={() => handleItemClick(item.path)}
                    style={{ 
                      '--item-color': item.color,
                      '--item-gradient': item.gradient
                    }}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    <div className="nav-icon-container">
                      <IconComponent className="nav-icon" />
                    </div>
                    <span className="nav-text">{item.name}</span>
                    <div className="nav-indicator"></div>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="sidebar-footer">
          <button className="logout-btn" onClick={handleLogout}>
            <div className="nav-icon-container">
              <LogOut className="nav-icon" />
            </div>
            <span className="nav-text">Logout</span>
          </button>
        </div>
      </div>
    </>
  );
};

export default Sidebar;