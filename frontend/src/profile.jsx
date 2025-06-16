import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, MapPin, Briefcase, Award, RotateCcw, Save, Loader2 } from 'lucide-react';
import Sidebar from "./components/Sidebar";
import './ProfilePage.css';

const ProfilePage = () => {
  const userId = localStorage.getItem("user_id") || "default_user";
  
  const [profileData, setProfileData] = useState({
    full_name: '',
    email: '',
    age: '',
    gender: '',
    occupation_or_academic_level: '',
    country: '',
    current_streak: 0,
    max_streak: 0,
    last_login_date: '',
    created_at: '',
    remaining_streak_resets: 0
  });
  
  const [formData, setFormData] = useState({
    full_name: '',
    age: '',
    gender: '',
    occupation_or_academic_level: '',
    country: '',
    password: ''
  });
  
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [restoring, setRestoring] = useState(false);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState({});
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

          useEffect(() => {
          document.title = 'Mentora | Profile';
        }, []);

  useEffect(() => {
    if (userId !== "default_user") {
      fetchProfileData();
    } else {
      setMessage('Please log in to view your profile');
      setLoading(false);
    }
  }, [userId]);

  const fetchProfileData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`http://localhost:5000/profile/${userId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (response.ok) {
        const data = await response.json();
        setProfileData(data);
        setFormData({
          full_name: data.full_name || '',
          age: data.age ? data.age.toString() : '',
          gender: data.gender || '',
          occupation_or_academic_level: data.occupation_or_academic_level || '',
          country: data.country || '',
          password: ''
        });
      } else {
        const errorData = await response.json();
        setMessage(errorData.message || 'Failed to load profile data');
      }
    } catch (error) {
      setMessage('Error connecting to server. Please check if the server is running.');
      console.error('Profile fetch error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const handleUpdateProfile = async () => {
    setUpdating(true);
    setMessage('');
    setErrors({});

    try {
      const updateData = {};
      if (formData.full_name.trim()) updateData.full_name = formData.full_name.trim();
      if (formData.age.trim()) updateData.age = formData.age.trim();
      if (formData.gender.trim()) updateData.gender = formData.gender.trim();
      if (formData.occupation_or_academic_level.trim()) updateData.occupation_or_academic_level = formData.occupation_or_academic_level.trim();
      if (formData.country.trim()) updateData.country = formData.country.trim();
      if (formData.password.trim()) updateData.password = formData.password.trim();

      const response = await fetch(`http://localhost:5000/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData),
      });

      const responseData = await response.json();

      if (response.ok) {
        setMessage(responseData.message || 'Profile updated successfully');
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), 3000);
        setFormData(prev => ({ ...prev, password: '' }));
        await fetchProfileData();
      } else {
        if (responseData.errors) setErrors(responseData.errors);
        else setMessage(responseData.message || 'Failed to update profile');
      }
    } catch (error) {
      setMessage('Error connecting to server. Please check if the server is running.');
      console.error('Profile update error:', error);
    } finally {
      setUpdating(false);
    }
  };

  const handleRestoreStreak = async () => {
    if (profileData.remaining_streak_resets <= 0) {
      setMessage('No streak resets remaining this month');
      return;
    }

    setRestoring(true);
    setMessage('');

    try {
      const response = await fetch(`http://localhost:5000/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_streak: profileData.max_streak }),
      });

      const responseData = await response.json();

      if (response.ok) {
        setMessage('Streak restored successfully');
        setShowSuccessAnimation(true);
        setTimeout(() => setShowSuccessAnimation(false), 3000);
        await fetchProfileData();
      } else {
        setMessage(responseData.message || responseData.errors?.current_streak || 'Failed to restore streak');
      }
    } catch (error) {
      setMessage('Error connecting to server. Please check if the server is running.');
      console.error('Streak restore error:', error);
    } finally {
      setRestoring(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (error) {
      return 'Invalid date';
    }
  };

  const StatCard = ({ icon: Icon, label, value, color = "primary" }) => (
    <div className={`stat-card stat-card--${color}`}>
      <div className="stat-card__icon">
        <Icon size={24} />
      </div>
      <div className="stat-card__content">
        <div className="stat-card__label">{label}</div>
        <div className="stat-card__value">{value}</div>
      </div>
    </div>
  );

  const ProfileField = ({ icon: Icon, label, value }) => (
    <div className="profile-field">
      <div className="profile-field__icon">
        <Icon size={18} />
      </div>
      <div className="profile-field__content">
        <div className="profile-field__label">{label}</div>
        <div className="profile-field__value">{value || 'Not set'}</div>
      </div>
    </div>
  );

  return (
    <div className="profile-page">
      <div className="neural-bg">
        <div className="neural-network"></div>
      </div>
      
      <Sidebar />
      
      <div className="main-content">
        {loading ? (
          <div className="loading-container">
            <div className="loading-spinner">
              <Loader2 className="spinner-icon" size={48} />
            </div>
            <h3 className="loading-text">Loading your profile...</h3>
            <p className="loading-subtext">Please wait while we fetch your data</p>
          </div>
        ) : userId === "default_user" ? (
          <div className="auth-required">
            <div className="auth-card">
              <User size={64} className="auth-icon" />
              <h2>Authentication Required</h2>
              <p>{message}</p>
              <button className="btn btn--primary">Sign In</button>
            </div>
          </div>
        ) : (
          <div className="profile-container">
            <div className="profile-header">
              <h1 className="page-title">
                <User className="title-icon" />
                Profile Settings
              </h1>
              <p className="page-subtitle">Manage your account information and preferences</p>
            </div>
            
            {message && (
              <div className={`alert ${showSuccessAnimation ? 'alert--success-animated' : ''} ${
                message.includes('Error') || message.includes('Failed') ? 'alert--error' : 'alert--success'
              }`}>
                <div className="alert__content">
                  {message}
                </div>
              </div>
            )}
            
            <div className="profile-grid">
              <div className="profile-info-section">
                <div className="section-header">
                  <h2>Current Profile</h2>
                  <p>Your current account information</p>
                </div>
                
                <div className="profile-fields">
                  <ProfileField icon={User} label="Full Name" value={profileData.full_name} />
                  <ProfileField icon={Mail} label="Email Address" value={profileData.email} />
                  <ProfileField icon={Calendar} label="Age" value={profileData.age} />
                  <ProfileField icon={User} label="Gender" value={profileData.gender} />
                  <ProfileField icon={Briefcase} label="Occupation" value={profileData.occupation_or_academic_level} />
                  <ProfileField icon={MapPin} label="Country" value={profileData.country} />
                </div>
              </div>
              
              <div className="stats-section">
                <div className="section-header">
                  <h2>Account Statistics</h2>
                  <p>Your progress and achievements</p>
                </div>
                
                <div className="stats-grid">
                  <StatCard 
                    icon={Award} 
                    label="Current Streak" 
                    value={`${profileData.current_streak} days`}
                    color="primary"
                  />
                  <StatCard 
                    icon={Award} 
                    label="Best Streak" 
                    value={`${profileData.max_streak} days`}
                    color="success"
                  />
                  <StatCard 
                    icon={Calendar} 
                    label="Last Login" 
                    value={formatDate(profileData.last_login_date)}
                    color="info"
                  />
                  <StatCard 
                    icon={RotateCcw} 
                    label="Resets Left" 
                    value={`${profileData.remaining_streak_resets}/3`}
                    color="warning"
                  />
                </div>
                
                <button
                  onClick={handleRestoreStreak}
                  disabled={restoring || profileData.remaining_streak_resets <= 0}
                  className={`btn btn--restore ${profileData.remaining_streak_resets <= 0 ? 'btn--disabled' : ''}`}
                >
                  {restoring ? (
                    <>
                      <Loader2 className="btn-icon spinning" size={18} />
                      Restoring Streak...
                    </>
                  ) : (
                    <>
                      <RotateCcw className="btn-icon" size={18} />
                      Restore Previous Streak
                    </>
                  )}
                </button>
                
                {profileData.remaining_streak_resets <= 0 && (
                  <p className="restore-info">No streak resets remaining this month</p>
                )}
              </div>
              
              <div className="update-section">
                <div className="section-header">
                  <h2>Update Profile</h2>
                  <p>Modify your account information</p>
                </div>
                
                <form className="update-form" onSubmit={(e) => e.preventDefault()}>
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="full_name">Full Name</label>
                      <input
                        id="full_name"
                        type="text"
                        name="full_name"
                        value={formData.full_name}
                        onChange={handleInputChange}
                        placeholder="Enter your full name"
                        className={errors.full_name ? 'input--error' : ''}
                      />
                      {errors.full_name && <span className="error-message">{errors.full_name}</span>}
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="age">Age</label>
                      <input
                        id="age"
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleInputChange}
                        min="1"
                        max="120"
                        placeholder="Enter your age"
                        className={errors.age ? 'input--error' : ''}
                      />
                      {errors.age && <span className="error-message">{errors.age}</span>}
                    </div>
                  </div>
                  
                  <div className="form-row">
                    <div className="form-group">
                      <label htmlFor="gender">Gender</label>
                      <select
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className={errors.gender ? 'input--error' : ''}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.gender && <span className="error-message">{errors.gender}</span>}
                    </div>
                    
                    <div className="form-group">
                      <label htmlFor="country">Country</label>
                      <input
                        id="country"
                        type="text"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        placeholder="Enter your country"
                        className={errors.country ? 'input--error' : ''}
                      />
                      {errors.country && <span className="error-message">{errors.country}</span>}
                    </div>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="occupation">Occupation/Academic Level</label>
                    <input
                      id="occupation"
                      type="text"
                      name="occupation_or_academic_level"
                      value={formData.occupation_or_academic_level}
                      onChange={handleInputChange}
                      placeholder="e.g., Student, Software Engineer, etc."
                      className={errors.occupation_or_academic_level ? 'input--error' : ''}
                    />
                    {errors.occupation_or_academic_level && (
                      <span className="error-message">{errors.occupation_or_academic_level}</span>
                    )}
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      id="email"
                      type="email"
                      value={profileData.email}
                      disabled
                      placeholder="Email cannot be changed"
                      className="input--disabled"
                    />
                    <span className="form-help">Email address cannot be modified</span>
                  </div>
                  
                  <div className="form-group">
                    <label htmlFor="password">New Password</label>
                    <input
                      id="password"
                      type="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      placeholder="Leave blank to keep current password"
                      className={errors.password ? 'input--error' : ''}
                    />
                    {errors.password && <span className="error-message">{errors.password}</span>}
                    <span className="form-help">Leave blank if you don't want to change your password</span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleUpdateProfile}
                    disabled={updating}
                    className="btn btn--primary btn--large"
                  >
                    {updating ? (
                      <>
                        <Loader2 className="btn-icon spinning" size={18} />
                        Updating Profile...
                      </>
                    ) : (
                      <>
                        <Save className="btn-icon" size={18} />
                        Update Profile
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;