import React from "react";
import { useNavigate } from "react-router-dom";


const Unauthorized = () => {
  const navigate = useNavigate();

  return (
    <div>
    <div className="unauthorized-container">
      <div className="unauthorized-content">
        {/* Animated lock icon */}
        <div className="lock-icon">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M18 11H6C4.89543 11 4 11.8954 4 13V19C4 20.1046 4.89543 21 6 21H18C19.1046 21 20 20.1046 20 19V13C20 11.8954 19.1046 11 18 11Z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
            <path 
              d="M7 11V7C7 5.67392 7.52678 4.40215 8.46447 3.46447C9.40215 2.52678 10.6739 2 12 2C13.3261 2 14.5979 2.52678 15.5355 3.46447C16.4732 4.40215 17 5.67392 17 7V11" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1>Access Denied</h1>
        
        {/* Status message with warning icon */}
        <div className="status-message">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M12 9V13M12 17H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
          Unauthorized Access
        </div>
        
        <p>You don't have permission to view this page. Please log in with valid credentials to continue.</p>
        
        {/* Enhanced login button with arrow icon */}
        <button className="login-button" onClick={() => navigate("/login")}>
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path 
              d="M15 3H19C19.5304 3 20.0391 3.21071 20.4142 3.58579C20.7893 3.96086 21 4.46957 21 5V19C21 19.5304 20.7893 20.0391 20.4142 20.4142C20.0391 20.7893 19.5304 21 19 21H15M10 17L15 12L10 7M15 12H3" 
              stroke="currentColor" 
              strokeWidth="2" 
              strokeLinecap="round" 
              strokeLinejoin="round"
            />
          </svg>
          Go to Login
        </button>
        
        {/* Help text with info icon */}
        <div className="help-text">
          <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
            <path d="M9,9 C9,5.13 14.87,5.13 14.87,9 C14.87,11.5 12,10.5 12,15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="12" y1="19" x2="12.01" y2="19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Need help? Contact your administrator
        </div>
      </div>
    </div>

     <style>{`
/* Unauthorized Page Styles */
.unauthorized-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: var(--spacing-lg);
  background: linear-gradient(135deg, var(--primary-dark) 0%, var(--primary-light) 100%);
  position: relative;
  overflow: hidden;
}

/* Animated background particles */
.unauthorized-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: 
    radial-gradient(circle at 20% 20%, rgba(20, 184, 166, 0.1) 0%, transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 40%),
    radial-gradient(circle at 60% 40%, rgba(59, 130, 246, 0.05) 0%, transparent 30%),
    radial-gradient(circle at 30% 70%, rgba(244, 114, 182, 0.08) 0%, transparent 35%);
  animation: backgroundFloat 20s ease-in-out infinite;
  pointer-events: none;
}

@keyframes backgroundFloat {
  0%, 100% { 
    background: 
      radial-gradient(circle at 20% 20%, rgba(20, 184, 166, 0.1) 0%, transparent 40%),
      radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.1) 0%, transparent 40%),
      radial-gradient(circle at 60% 40%, rgba(59, 130, 246, 0.05) 0%, transparent 30%),
      radial-gradient(circle at 30% 70%, rgba(244, 114, 182, 0.08) 0%, transparent 35%);
  }
  25% { 
    background: 
      radial-gradient(circle at 30% 30%, rgba(20, 184, 166, 0.12) 0%, transparent 45%),
      radial-gradient(circle at 70% 70%, rgba(139, 92, 246, 0.12) 0%, transparent 45%),
      radial-gradient(circle at 50% 50%, rgba(59, 130, 246, 0.06) 0%, transparent 35%),
      radial-gradient(circle at 40% 60%, rgba(244, 114, 182, 0.09) 0%, transparent 40%);
  }
  50% { 
    background: 
      radial-gradient(circle at 80% 20%, rgba(20, 184, 166, 0.08) 0%, transparent 35%),
      radial-gradient(circle at 20% 80%, rgba(139, 92, 246, 0.15) 0%, transparent 50%),
      radial-gradient(circle at 70% 30%, rgba(59, 130, 246, 0.04) 0%, transparent 25%),
      radial-gradient(circle at 10% 40%, rgba(244, 114, 182, 0.11) 0%, transparent 45%);
  }
  75% { 
    background: 
      radial-gradient(circle at 60% 80%, rgba(20, 184, 166, 0.14) 0%, transparent 48%),
      radial-gradient(circle at 40% 20%, rgba(139, 92, 246, 0.09) 0%, transparent 38%),
      radial-gradient(circle at 80% 60%, rgba(59, 130, 246, 0.07) 0%, transparent 32%),
      radial-gradient(circle at 20% 30%, rgba(244, 114, 182, 0.06) 0%, transparent 28%);
  }
}

/* Main content card */
.unauthorized-content {
  background: var(--glass-bg);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid var(--glass-border);
  border-radius: var(--radius-xl);
  padding: var(--spacing-xl);
  text-align: center;
  box-shadow: var(--shadow-lg);
  position: relative;
  z-index: 1;
  max-width: 500px;
  width: 100%;
}

/* Lock icon container */
.lock-icon {
  width: 120px;
  height: 120px;
  margin: 0 auto var(--spacing-lg);
  background: linear-gradient(135deg, var(--primary-teal) 0%, var(--neural-cyan) 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-glow);
  position: relative;
  animation: pulse 3s ease-in-out infinite;
}

.lock-icon::before {
  content: '';
  position: absolute;
  top: -5px;
  left: -5px;
  right: -5px;
  bottom: -5px;
  background: linear-gradient(135deg, var(--primary-teal), var(--neural-cyan), var(--primary-purple));
  border-radius: 50%;
  z-index: -1;
  opacity: 0.3;
  animation: rotate 6s linear infinite;
}

.lock-icon svg {
  width: 48px;
  height: 48px;
  color: white;
  filter: drop-shadow(0 2px 8px rgba(0, 0, 0, 0.3));
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    box-shadow: var(--shadow-glow);
  }
  50% {
    transform: scale(1.05);
    box-shadow: 0 12px 40px rgba(20, 184, 166, 0.25);
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.unauthorized-container h1 {
  font-family: "Poppins", sans-serif;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 700;
  color: var(--text-primary);
  text-align: center;
  margin-bottom: var(--spacing-sm);
  background: linear-gradient(135deg, var(--primary-teal) 0%, var(--primary-purple) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  position: relative;
  z-index: 1;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* Status message */
.status-message {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  font-size: 1.1rem;
  font-weight: 500;
  color: var(--text-secondary);
  margin-bottom: var(--spacing-lg);
  padding: var(--spacing-sm);
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.2);
  border-radius: var(--radius-md);
  backdrop-filter: blur(10px);
}

.status-message svg {
  width: 20px;
  height: 20px;
  color: #ef4444;
  flex-shrink: 0;
}

.unauthorized-container p {
  font-size: 1.125rem;
  font-weight: 400;
  color: var(--text-muted);
  text-align: center;
  margin-bottom: var(--spacing-xl);
  line-height: 1.7;
  position: relative;
  z-index: 1;
}

/* Enhanced button with icon */
.login-button {
  background: linear-gradient(135deg, var(--primary-teal) 0%, var(--neural-cyan) 100%);
  color: white;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.1rem;
  font-weight: 600;
  font-family: "Inter", sans-serif;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: var(--transition-smooth);
  box-shadow: var(--shadow-md);
  position: relative;
  z-index: 1;
  overflow: hidden;
  min-width: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  text-decoration: none;
}

.login-button svg {
  width: 18px;
  height: 18px;
  transition: var(--transition-smooth);
}

.login-button::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: var(--transition-smooth);
}

.login-button:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-lg);
  filter: brightness(1.15);
}

.login-button:hover svg {
  transform: translateX(2px);
}

.login-button:hover::before {
  left: 100%;
}

.login-button:active {
  transform: translateY(-1px);
  transition: var(--transition-fast);
}

.login-button:focus {
  outline: none;
  box-shadow: var(--shadow-lg), 0 0 0 3px rgba(20, 184, 166, 0.4);
}

/* Additional visual elements */
.help-text {
  margin-top: var(--spacing-md);
  padding-top: var(--spacing-md);
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--spacing-xs);
  font-size: 0.9rem;
  color: var(--text-muted);
}

.help-text svg {
  width: 16px;
  height: 16px;
  color: var(--mental-health-blue);
}

/* Responsive Design */
@media (max-width: 768px) {
  .unauthorized-container {
    padding: var(--spacing-md);
  }
  
  .unauthorized-content {
    padding: var(--spacing-lg);
    margin: var(--spacing-sm);
  }
  
  .lock-icon {
    width: 100px;
    height: 100px;
    margin-bottom: var(--spacing-md);
  }
  
  .lock-icon svg {
    width: 40px;
    height: 40px;
  }
  
  .unauthorized-container h1 {
    font-size: 2rem;
    margin-bottom: var(--spacing-xs);
  }
  
  .status-message {
    font-size: 1rem;
    margin-bottom: var(--spacing-md);
  }
  
  .unauthorized-container p {
    font-size: 1rem;
    margin-bottom: var(--spacing-lg);
  }
  
  .login-button {
    padding: 1rem 1.75rem;
    font-size: 1rem;
    width: 100%;
    max-width: 280px;
  }
}

@media (max-width: 480px) {
  .unauthorized-container {
    padding: var(--spacing-sm);
  }
  
  .unauthorized-content {
    padding: var(--spacing-md);
  }
  
  .lock-icon {
    width: 80px;
    height: 80px;
  }
  
  .lock-icon svg {
    width: 32px;
    height: 32px;
  }
  
  .unauthorized-container h1 {
    font-size: 1.75rem;
  }
  
  .status-message {
    font-size: 0.9rem;
    padding: var(--spacing-xs);
  }
  
  .unauthorized-container p {
    font-size: 0.95rem;
  }
  
  .help-text {
    font-size: 0.8rem;
  }
}

/* Accessibility improvements */
@media (prefers-reduced-motion: reduce) {
  .lock-icon,
  .lock-icon::before,
  .login-button,
  .login-button svg,
  .login-button::before,
  .unauthorized-container::before {
    animation: none;
    transition: none;
  }
  
  .login-button:hover,
  .lock-icon {
    transform: none;
  }
}

/* High contrast mode */
@media (prefers-contrast: high) {
  .unauthorized-content {
    background: var(--primary-light);
    border: 2px solid var(--primary-teal);
  }
  
  .status-message {
    background: rgba(239, 68, 68, 0.2);
    border: 2px solid #ef4444;
  }
  
  .login-button {
    border: 2px solid white;
  }
}
      `}</style>

      </div>

    
  );
};



export default Unauthorized;