import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import {
  Smartphone,
  TrendingUp,
  Clock,
  Bell,
  Moon,
  User,
  Briefcase,
  Activity,
  Grid3X3,
} from "lucide-react";
import "./mobileAddiction.css";
import { useNavigate } from "react-router-dom";

const MOBILE_STORAGE_KEY = "mobile_usage_last_prediction";

// Helper function to get local date string (YYYY-MM-DD)
const getLocalDateString = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get today's date in local timezone
const getTodayDateString = () => {
  return getLocalDateString();
};

// Get tomorrow's date in local timezone
const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return getLocalDateString(tomorrow);
};

// Get local timestamp for saving
const getLocalTimestamp = () => {
  const now = new Date();
  return {
    timestamp: now.getTime(), // Unix timestamp
    dateString: getLocalDateString(now),
    displayTime: now.toLocaleString() // For display purposes
  };
};

// Check if a timestamp is from today
const isFromToday = (timestamp) => {
  if (!timestamp) return false;
  
  const savedDate = new Date(timestamp);
  const today = new Date();
  
  return (
    savedDate.getFullYear() === today.getFullYear() &&
    savedDate.getMonth() === today.getMonth() &&
    savedDate.getDate() === today.getDate()
  );
};

const MobileUsageAnalyzer = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState("");
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    daily_screen_time: "",
    app_sessions: "",
    social_media_usage: "",
    gaming_time: "",
    notifications: "",
    night_usage: "",
    age: "",
    work_study_hours: "",
    stress_level: "",
    apps_installed: "",
  });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [predictionResult, setPredictionResult] = useState(null);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [todaysPrediction, setTodaysPrediction] = useState(null);
  const [validationErrors, setValidationErrors] = useState({});
  const [nextAvailableDate, setNextAvailableDate] = useState("");

  // Define field types
  const integerFields = [
    "app_sessions",
    "notifications",
    "age",
    "stress_level",
    "apps_installed",
  ];
  const floatFields = [
    "daily_screen_time",
    "social_media_usage",
    "gaming_time",
    "night_usage",
    "work_study_hours",
  ];

  const fields = [
    {
      key: "daily_screen_time",
      label: "Daily Screen Time",
      subtitle: "Average hours per day",
      type: "number",
      min: 0,
      max: 24,
      step: 0.1,
      icon: Clock,
      unit: "hours",
    },
    {
      key: "app_sessions",
      label: "App Sessions",
      subtitle: "How many times you open apps daily",
      type: "number",
      min: 0,
      max: 500,
      step: 1,
      icon: Smartphone,
      unit: "sessions",
    },
    {
      key: "social_media_usage",
      label: "Social Media Time",
      subtitle: "Hours spent on social platforms",
      type: "number",
      min: 0,
      max: 24,
      step: 0.1,
      icon: TrendingUp,
      unit: "hours",
    },
    {
      key: "gaming_time",
      label: "Gaming Time",
      subtitle: "Hours spent playing mobile games",
      type: "number",
      min: 0,
      max: 24,
      step: 0.1,
      icon: Activity,
      unit: "hours",
    },
    {
      key: "notifications",
      label: "Daily Notifications",
      subtitle: "Approximate number received per day",
      type: "number",
      min: 0,
      max: 1000,
      step: 1,
      icon: Bell,
      unit: "notifications",
    },
    {
      key: "night_usage",
      label: "Night Usage",
      subtitle: "Hours used between 10 PM - 6 AM",
      type: "number",
      min: 0,
      max: 8,
      step: 0.1,
      icon: Moon,
      unit: "hours",
    },
    {
      key: "age",
      label: "Your Age",
      subtitle: "This helps personalize insights",
      type: "number",
      min: 10,
      max: 100,
      step: 1,
      icon: User,
      unit: "years",
    },
    {
      key: "work_study_hours",
      label: "Work/Study Hours",
      subtitle: "Hours per day for productive activities",
      type: "number",
      min: 0,
      max: 24,
      step: 0.1,
      icon: Briefcase,
      unit: "hours",
    },
    {
      key: "stress_level",
      label: "Stress Level",
      subtitle: "Rate your average stress (1 = low, 10 = high)",
      type: "number",
      min: 1,
      max: 10,
      step: 1,
      icon: Activity,
      unit: "/10",
    },
    {
      key: "apps_installed",
      label: "Apps Installed",
      subtitle: "Total number of apps on your device",
      type: "number",
      min: 1,
      max: 500,
      step: 1,
      icon: Grid3X3,
      unit: "apps",
    },
  ];

  useEffect(() => {
    const storedUserId =
      localStorage.getItem("user_id") || sessionStorage.getItem("user_id");
    if (!storedUserId) {
      navigate("/login");
      return;
    }

    const verifyUser = async () => {
      try {
        setLoading(true);
        const response = await fetch(
          `http://localhost:5000/user/${storedUserId}`
        );

        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
          setUserId(storedUserId);
          console.log("User verified:", userData.full_name);

          // After successful authentication, check prediction status
          await checkPredictionLock(storedUserId);
        } else {
          navigate("/login");
        }
      } catch (error) {
        console.error("Error verifying user:", error);
        setAuthError("Failed to verify user. Redirecting to login...");
        setTimeout(() => navigate("/login"), 2000);
      } finally {
        setLoading(false);
      }
    };

    const checkPredictionLock = async (userId) => {
      try {
        const todayStr = getTodayDateString();
        const tomorrowStr = getTomorrowDateString();

        // Check local storage first
        const localPrediction = localStorage.getItem(
          `${MOBILE_STORAGE_KEY}_${userId}`
        );
        
        if (localPrediction) {
          try {
            const parsed = JSON.parse(localPrediction);
            
            // Check if the saved prediction is from today using proper date comparison
            if (parsed.timestamp && isFromToday(parsed.timestamp)) {
              console.log("Found today's prediction in local storage");
              setHasSubmittedToday(true);
              setTodaysPrediction(parsed);
              setNextAvailableDate(tomorrowStr);
              return;
            } else {
              // Remove old prediction from localStorage
              localStorage.removeItem(`${MOBILE_STORAGE_KEY}_${userId}`);
            }
          } catch (e) {
            console.error("Error parsing local prediction:", e);
            localStorage.removeItem(`${MOBILE_STORAGE_KEY}_${userId}`);
          }
        }

        // Check backend for today's prediction
        const response = await fetch(
          `http://localhost:5003/get_today_prediction?user_id=${userId}&date=${todayStr}`,
          {
            method: "GET",
          }
        );

        if (response.ok) {
          const data = await response.json();
          console.log("Found today's prediction in backend");
          setTodaysPrediction(data);
          setHasSubmittedToday(true);
          setNextAvailableDate(tomorrowStr);

          // Cache in localStorage with current timestamp
          const localTime = getLocalTimestamp();
          localStorage.setItem(
            `${MOBILE_STORAGE_KEY}_${userId}`,
            JSON.stringify({
              ...data,
              timestamp: localTime.timestamp,
              dateString: localTime.dateString,
              displayTime: localTime.displayTime
            })
          );
        } else if (response.status !== 404) {
          console.error("Error checking prediction lock:", response.status);
        }
      } catch (error) {
        console.error("Error checking prediction status:", error);
      }
    };

    verifyUser();
  }, [navigate]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));

    if (validationErrors[name]) {
      setValidationErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
    }
  };

  const validateCurrentField = () => {
    const currentField = fields[currentStep];
    const value = formData[currentField.key];

    if (!value || value === "") {
      setValidationErrors((prev) => ({
        ...prev,
        [currentField.key]: `${currentField.label} is required`,
      }));
      return false;
    }

    const numValue = Number.parseFloat(value);
    if (isNaN(numValue)) {
      setValidationErrors((prev) => ({
        ...prev,
        [currentField.key]: "Please enter a valid number",
      }));
      return false;
    }

    if (numValue < currentField.min || numValue > currentField.max) {
      setValidationErrors((prev) => ({
        ...prev,
        [currentField.key]: `Value must be between ${currentField.min} and ${currentField.max}`,
      }));
      return false;
    }

    return true;
  };

  const handleNext = () => {
    if (validateCurrentField()) {
      if (currentStep < fields.length - 1) {
        setCurrentStep(currentStep + 1);
      }
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (hasSubmittedToday) return;

    let hasErrors = false;
    const errors = {};

    fields.forEach((field) => {
      const value = formData[field.key];
      if (!value || value === "") {
        errors[field.key] = `${field.label} is required`;
        hasErrors = true;
      } else {
        const numValue = Number.parseFloat(value);
        if (isNaN(numValue) || numValue < field.min || numValue > field.max) {
          errors[field.key] = `Must be between ${field.min}-${field.max}`;
          hasErrors = true;
        }
      }
    });

    if (hasErrors) {
      setValidationErrors(errors);
      setError("Please fix the highlighted errors before submitting");
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Create a copy of formData to convert values
      const convertedData = { ...formData };

      // Convert integer fields to numbers
      integerFields.forEach((field) => {
        if (convertedData[field]) {
          convertedData[field] = parseInt(convertedData[field], 10);
        }
      });

      // Convert float fields to numbers
      floatFields.forEach((field) => {
        if (convertedData[field]) {
          convertedData[field] = parseFloat(convertedData[field]);
        }
      });

      // Get local timestamp for submission
      const localTime = getLocalTimestamp();

      const submissionData = {
        user_id: userId,
        ...convertedData,
        // Include local timestamp information
        submission_timestamp: localTime.timestamp,
        submission_date: localTime.dateString,
        local_time: localTime.displayTime
      };

      const response = await fetch(
        "http://localhost:5003/analyze_mobile_usage",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(submissionData),
        }
      );

      const data = await response.json();

      if (response.ok) {
        setPredictionResult(data);
        setHasSubmittedToday(true);
        setTodaysPrediction(data);

        // Save today's prediction with local timestamp
        localStorage.setItem(
          `${MOBILE_STORAGE_KEY}_${userId}`,
          JSON.stringify({
            ...data,
            timestamp: localTime.timestamp,
            dateString: localTime.dateString,
            displayTime: localTime.displayTime
          })
        );

        setNextAvailableDate(getTomorrowDateString());
      } else {
        setError(data.error || "Analysis failed. Please try again.");
      }
    } catch (error) {
      setError("Network error. Please check your connection.");
    } finally {
      setIsLoading(false);
    }
  };

  // Loading state during authentication
  if (loading) {
    return (
      <div className="app-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Verifying authentication...</p>
        </div>
      </div>
    );
  }

  // Authentication error state
  if (authError) {
    return (
      <div className="app-container">
        <div className="error-container">
          <p>{authError}</p>
        </div>
      </div>
    );
  }

  const renderFormCard = () => {
    const currentField = fields[currentStep];
    const IconComponent = currentField.icon;
    const progress = ((currentStep + 1) / fields.length) * 100;

    return (
      <div className="form-container">
        <div className="progress-section">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="step-counter">
            Step {currentStep + 1} of {fields.length}
          </div>
        </div>

        <div className="field-header">
          <div className="field-icon">
            <IconComponent size={32} />
          </div>
          <div className="field-titles">
            <h2 className="field-title">{currentField.label}</h2>
            <p className="field-subtitle">{currentField.subtitle}</p>
          </div>
        </div>

        <div className="input-section">
          <div className="input-wrapper">
            <input
              type={currentField.type}
              name={currentField.key}
              value={formData[currentField.key]}
              onChange={handleInputChange}
              min={currentField.min}
              max={currentField.max}
              step={currentField.step}
              placeholder={`Enter ${currentField.label.toLowerCase()}`}
              className="main-input"
              autoFocus
            />
            <span className="input-unit">{currentField.unit}</span>
          </div>
          {validationErrors[currentField.key] && (
            <div className="error-message">
              <span className="error-icon">⚠️</span>
              {validationErrors[currentField.key]}
            </div>
          )}
          <div className="input-hint">
            <span className="hint-icon">💡</span> Valid range:{" "}
            {currentField.min} - {currentField.max} {currentField.unit}
          </div>
        </div>

        <div className="navigation-buttons">
          {currentStep > 0 && (
            <button
              onClick={handleBack}
              disabled={isLoading}
              className="back-button"
            >
              <span className="button-icon">←</span> Back
            </button>
          )}

          {currentStep < fields.length - 1 ? (
            <button
              onClick={handleNext}
              disabled={isLoading}
              className="next-button"
            >
              Next <span className="button-icon">→</span>
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isLoading || hasSubmittedToday}
              className="submit-button"
            >
              {isLoading ? (
                <div className="loading-content">
                  <div className="spinner"></div>
                  Analyzing...
                </div>
              ) : (
                <>
                  <span className="button-text">Get Analysis</span>
                  <span className="button-icon">✨</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderPredictionResult = (result) => {
    return (
      <div className="results-container">
        <div className="results-header">
          <div className="results-icon">📱</div>
          <h2 className="results-title">Your Mobile Usage Analysis</h2>
          <p className="results-subtitle">Based on your usage patterns</p>
        </div>

        <div className="prediction-card">
          <div className="prediction-main">
            <h3 className="prediction-label">Prediction</h3>
            <div className="prediction-value">{result.prediction}</div>
            <div className="prediction-meta">
              <span className="status-badge">{result.status}</span>
            </div>
          </div>
        </div>

        {result.input_summary && (
          <div className="summary-section">
            <h4 className="section-title">Your Usage Summary</h4>
            <div className="summary-grid">
              <div className="summary-item">
                <span className="summary-label">Screen Time</span>
                <span className="summary-value">
                  {result.input_summary.daily_screen_time}h
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Social Media</span>
                <span className="summary-value">
                  {result.input_summary.social_media_usage}h
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Stress Level</span>
                <span className="summary-value">
                  {result.input_summary.stress_level}/10
                </span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Notifications</span>
                <span className="summary-value">
                  {result.input_summary.notifications}
                </span>
              </div>
            </div>
          </div>
        )}

        {result.personalized_tips && result.personalized_tips.length > 0 && (
          <div className="tips-section">
            <h4 className="section-title">Personalized Tips</h4>
            <div className="tips-list">
              {result.personalized_tips.map((tip, index) => (
                <div key={index} className="tip-item">
                  <span className="tip-number">{index + 1}</span>
                  <div className="tip-content">
                    <span className="tip-text">{tip}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {result.analysis_info && (
          <div className="analysis-info">
            <h4 className="section-title">Analysis Details</h4>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">Features Analyzed</span>
                <span className="info-value">
                  {result.analysis_info.features_analyzed}
                </span>
              </div>
              <div className="info-item">
                <span className="info-label">Analysis Time</span>
                <span className="info-value">
                  {result.displayTime || new Date(result.analysis_info?.timestamp || result.timestamp).toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        )}

        <div className="next-analysis-note">
          <div className="lock-icon">🔒</div>
          <p>
            You can submit a new analysis after midnight (12:00 AM).
            <br />
            Next available date: <strong>{nextAvailableDate}</strong>
          </p>
        </div>
      </div>
    );
  };

  // Lock screen if already submitted today
  if (hasSubmittedToday) {
    return (
      <div className="app-container">
        <Sidebar />
        <div className="main-content">
          <div className="content-wrapper">
            <div className="app-header">
              <h1 className="app-title">Mobile Usage Analyzer</h1>
              <p className="app-description">
                Get personalized insights about your mobile usage patterns and
                discover ways to improve your digital wellness.
              </p>
            </div>

            <div className="lock-notice">
              <div className="lock-icon">🔒</div>
              <h2 className="lock-title">Mobile Usage Analysis</h2>
              <div className="lock-message">
                You've already taken today's assessment.
                <br />
                You can take the next one after midnight (12:00 AM).
              </div>
            </div>

            {todaysPrediction && renderPredictionResult(todaysPrediction)}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar />

      <div className="main-content">
        <div className="content-wrapper">
          <div className="app-header">
            <h1 className="app-title">Mobile Usage Analyzer</h1>
            <p className="app-description">
              Get personalized insights about your mobile usage patterns and
              discover ways to improve your digital wellness.
            </p>
            </div>

          {error && (
            <div className="error-alert">
              <div className="error-icon">⚠️</div>
              <p>{error}</p>
            </div>
          )}

          {isLoading && !predictionResult && !todaysPrediction && (
            <div className="loading-container">
              <div className="spinner-large"></div>
              <p>Loading your data...</p>
            </div>
          )}

          {predictionResult ? (
            renderPredictionResult(predictionResult)
          ) : (
            <div className="assessment-section">
              <div className="intro-section">
                <div className="intro-icon">📊</div>
                <h2 className="intro-title">Let's Analyze Your Mobile Usage</h2>
                <p className="intro-text">
                  Answer a few questions about your mobile habits to get
                  personalized insights and recommendations for healthier device
                  usage.
                </p>
              </div>

              {renderFormCard()}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MobileUsageAnalyzer;