import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './RegistrationForm.css';

const RegistrationForm = () => {
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    age: '',
    gender: '',
    occupation_or_academic_level: '',
    country: ''
  });

  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const navigate = useNavigate();

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setErrors({});
    setSuccessMessage('');

    try {
      const response = await fetch('http://localhost:5000/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage(data.message);
        setFormData({
          full_name: '',
          email: '',
          password: '',
          age: '',
          gender: '',
          occupation_or_academic_level: '',
          country: ''
        });
      } else {
        if (data.errors) {
          setErrors(data.errors);
        } else {
          setErrors({ general: data.message });
        }
      }
    } catch (error) {
      console.error('Registration error:', error);
      setErrors({ general: 'Network error. Please check your connection and try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  const redirectToLogin = () => {
    navigate('/login');
  };

  const goToHome = () => {
    navigate('/');
  };

  return (
    <>
      {/* Home Button */}
      <button 
        onClick={goToHome}
        className="home-button"
        type="button"
        aria-label="Go to homepage"
      >
        Home
      </button>

      <div className="registration-container">
        <h2>Create Account</h2>
        
        {successMessage && (
          <div className="success-message">
            {successMessage}
          </div>
        )}

        {errors.general && (
          <div className="general-error">
            {errors.general}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="full_name">Full Name</label>
            <input
              type="text"
              id="full_name"
              name="full_name"
              value={formData.full_name}
              onChange={handleChange}
              className={errors.full_name ? 'error' : ''}
              required
            />
            {errors.full_name && (
              <span className="error-message">{errors.full_name}</span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="email">Email Address</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? 'error' : ''}
              required
            />
            {errors.email && (
              <span className="error-message">{errors.email}</span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? 'error' : ''}
              required
            />
            {errors.password && (
              <span className="error-message">{errors.password}</span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="age">Age</label>
            <input
              type="number"
              id="age"
              name="age"
              value={formData.age}
              onChange={handleChange}
              min="1"
              max="120"
              className={errors.age ? 'error' : ''}
              required
            />
            {errors.age && (
              <span className="error-message">{errors.age}</span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="gender">Gender</label>
            <select
              id="gender"
              name="gender"
              value={formData.gender}
              onChange={handleChange}
              className={errors.gender ? 'error' : ''}
              required
            >
              <option value="">Select Gender</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
              <option value="Other">Other</option>
              <option value="Prefer not to say">Prefer not to say</option>
            </select>
            {errors.gender && (
              <span className="error-message">{errors.gender}</span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="occupation_or_academic_level">Occupation/Academic Level</label>
            <input
              type="text"
              id="occupation_or_academic_level"
              name="occupation_or_academic_level"
              value={formData.occupation_or_academic_level}
              onChange={handleChange}
              placeholder="e.g., Student, Engineer, Teacher"
              className={errors.occupation_or_academic_level ? 'error' : ''}
              required
            />
            {errors.occupation_or_academic_level && (
              <span className="error-message">{errors.occupation_or_academic_level}</span>
            )}
          </div>

          <div className="form-field">
            <label htmlFor="country">Country</label>
            <input
              type="text"
              id="country"
              name="country"
              value={formData.country}
              onChange={handleChange}
              className={errors.country ? 'error' : ''}
              required
            />
            {errors.country && (
              <span className="error-message">{errors.country}</span>
            )}
          </div>

          <button 
            type="submit"
            disabled={isLoading}
            className={`submit-button ${isLoading ? 'loading' : ''}`}
          >
            {isLoading ? 'Creating Account...' : 'Sign Up'}
          </button>
        </form>

        <div className="login-redirect">
          <p>Already have an account?</p>
          <button 
            type="button"
            onClick={redirectToLogin}
            className="login-button"
          >
            Login
          </button>
        </div>
      </div>
    </>
  );
};

export default RegistrationForm;