import React, { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "./components/Sidebar";
import "./stress.css";

const StressPrediction = () => {

      useEffect(() => {
      document.title = 'Mentora | Stress Prediction';
    }, []);
  // Get current user ID
  const userId = localStorage.getItem("user_id") || "default_user";
  
  // Create user-specific keys
  const stepKey = `stressStep_${userId}`;
  const lastPredictionKey = `lastStressPrediction_${userId}`;
  const historyKey = `stressPredictionHistory_${userId}`;

  // Initial form state
  const initialFormState = {
    sleep_duration: "",
    quality_of_sleep: "",
    physical_activity_level: "",
    daily_steps: "",
    heart_rate_level: "",
    blood_pressure_level: "",
    height_cm: "",
    weight_kg: "",
    has_sleep_disorder: false,
  };

  // Load currentStep from localStorage if available
  const [currentStep, setCurrentStep] = useState(() => {
    const savedStep = localStorage.getItem(stepKey);
    return savedStep ? parseInt(savedStep) : 1;
  });
  
  const [loading, setLoading] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [error, setError] = useState("");
  const [canPredict, setCanPredict] = useState(true);
  const [lastPrediction, setLastPrediction] = useState(null);
  const [history, setHistory] = useState([]);
  const [weeklyInsight, setWeeklyInsight] = useState(null);
  const [activeTab, setActiveTab] = useState("assessment");
  const [formData, setFormData] = useState(initialFormState);

  const prevUserIdRef = useRef(userId);

  const heartRateMapping = {
    slow: 55,
    normal: 75,
    fast: 95,
  };

  const bloodPressureMapping = {
    low: { systolic: 90, diastolic: 60 },
    normal: { systolic: 120, diastolic: 80 },
    high: { systolic: 140, diastolic: 90 },
  };

   const resetForm = useCallback(() => {
  setFormData({
    sleep_duration: "",
    quality_of_sleep: "",
    physical_activity_level: "",
    daily_steps: "",
    heart_rate_level: "",
    blood_pressure_level: "",
    height_cm: "",
    weight_kg: "",
    has_sleep_disorder: false,
  });
  setCurrentStep(1);
  setError("");
}, []);

  const checkPredictionAvailability = useCallback(() => {
    const lastPredictionData = localStorage.getItem(lastPredictionKey);
    if (lastPredictionData) {
      const data = JSON.parse(lastPredictionData);
      const lastDate = new Date(data.timestamp);
      const now = new Date();
      
      // Check if we're on a new day (after midnight)
      const isNewDay = now.getDate() !== lastDate.getDate() || 
                      now.getMonth() !== lastDate.getMonth() || 
                      now.getFullYear() !== lastDate.getFullYear();

      if (isNewDay) {
        // New day detected - reset everything
        setCanPredict(true);
        setPrediction(null);
        setLastPrediction(null);
        resetForm();
        localStorage.removeItem(lastPredictionKey);
      } else {
        setCanPredict(false);
        setLastPrediction(data);
        setPrediction(data);
      }
    } else {
      setCanPredict(true);
    }
  }, [lastPredictionKey, resetForm]);



// Add this useEffect to reset at midnight
useEffect(() => {
  const checkForNewDay = () => {
    const now = new Date();
    if (now.getHours() === 0 && now.getMinutes() === 0) {
      checkPredictionAvailability();
    }
  };

  // Check every minute if it's midnight
  const midnightCheckInterval = setInterval(checkForNewDay, 60000);
  
  return () => clearInterval(midnightCheckInterval);
}, [checkPredictionAvailability]);

  useEffect(() => {
    // Reset state if user changed
    if (prevUserIdRef.current !== userId) {
      setCurrentStep(1);
      setPrediction(null);
      setError("");
      setCanPredict(true);
      setLastPrediction(null);
      setHistory([]);
      setWeeklyInsight(null);
      setActiveTab("assessment");
      resetForm();
      localStorage.removeItem(stepKey);
      prevUserIdRef.current = userId;
    }

    checkPredictionAvailability();
    loadHistory();

    // Set up interval to check for new day every minute
    const intervalId = setInterval(() => {
      checkPredictionAvailability();
    }, 60000);

    return () => clearInterval(intervalId);
  }, [userId, checkPredictionAvailability]);

  // Save current step to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(stepKey, currentStep.toString());
  }, [currentStep, stepKey]);

  // Set active tab based on prediction availability
  useEffect(() => {
    if (!canPredict && prediction) {
      setActiveTab("results");
    }
  }, [canPredict, prediction]);

  const loadHistory = () => {
    const historyData = localStorage.getItem(historyKey);
    if (historyData) {
      const parsedHistory = JSON.parse(historyData);
      setHistory(parsedHistory);

      if (parsedHistory.length > 0) {
        const lastEntry = parsedHistory[0];
        const now = new Date();
        const lastDate = new Date(lastEntry.timestamp);
        const daysDiff = Math.floor((now - lastDate) / (1000 * 60 * 60 * 24));

        if (daysDiff >= 7 && parsedHistory.length > 1) {
          const previousEntry = parsedHistory.find((entry) => {
            const entryDate = new Date(entry.timestamp);
            const entryDaysDiff = Math.floor(
              (now - entryDate) / (1000 * 60 * 60 * 24)
            );
            return entryDaysDiff >= 7;
          });

          if (previousEntry) {
            const improvement =
              ((previousEntry.stress_level - lastEntry.stress_level) /
                previousEntry.stress_level) *
              100;
            setWeeklyInsight({
              lastWeek: previousEntry.stress_level,
              thisWeek: lastEntry.stress_level,
              improvement: Math.round(improvement),
            });
          }
        }
      }
    }
  };

  const saveToHistory = (predictionData) => {
    const newEntry = {
      ...predictionData,
      timestamp: new Date().toISOString(),
    };

    const existingHistory = JSON.parse(
      localStorage.getItem(historyKey) || "[]"
    );
    const updatedHistory = [newEntry, ...existingHistory].slice(0, 10);

    localStorage.setItem(
      historyKey,
      JSON.stringify(updatedHistory)
    );
    localStorage.setItem(lastPredictionKey, JSON.stringify(newEntry));

    setHistory(updatedHistory);
    setLastPrediction(newEntry);
  };

  const handleInputChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const nextStep = () => {
    if (currentStep < 4) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSubmit = async () => {
    if (!canPredict) {
      setError(
        "You've already submitted your stress check today. Come back after midnight to track your progress."
      );
      return;
    }

    setLoading(true);
    setError("");

    try {
      const userId = localStorage.getItem("user_id") || "default_user";

      const heartRate = heartRateMapping[formData.heart_rate_level];
      const bloodPressure = bloodPressureMapping[formData.blood_pressure_level];

      const payload = {
        user_id: userId,
        sleep_duration: parseFloat(formData.sleep_duration),
        quality_of_sleep: parseInt(formData.quality_of_sleep),
        physical_activity_level: parseInt(formData.physical_activity_level),
        daily_steps: parseInt(formData.daily_steps),
        heart_rate: heartRate,
        systolic_bp: bloodPressure.systolic,
        diastolic_bp: bloodPressure.diastolic,
        height_cm: parseFloat(formData.height_cm),
        weight_kg: parseFloat(formData.weight_kg),
        has_sleep_disorder: formData.has_sleep_disorder,
      };

      const response = await fetch("http://localhost:5001/predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (data.success) {
        setPrediction(data.prediction);
        saveToHistory(data.prediction);
        setCanPredict(false);
        setCurrentStep(5);
        setActiveTab("results");
      } else {
        setError(data.error || "Prediction failed. Please try again.");
      }
    } catch (error) {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };


  const getStressTips = (stressLevel) => {
    if (stressLevel <= 3) {
      return [
        "Keep maintaining your healthy habits - you're doing great!",
        "Continue your regular exercise routine",
        "Practice gratitude daily to maintain your positive mindset",
        "Stay connected with loved ones",
      ];
    } else if (stressLevel <= 6) {
      return [
        "Try 10 minutes of deep breathing exercises daily",
        "Aim for 7-8 hours of quality sleep each night",
        "Take short breaks every hour during work or study",
        "Consider talking to a friend or counselor about your feelings",
        "Engage in activities that bring you joy",
      ];
    } else {
      return [
        "Prioritize rest and recovery - your wellbeing matters",
        "Consider speaking with a mental health professional",
        "Practice stress-reduction techniques like meditation daily",
        "Limit caffeine and create a calming bedtime routine",
        "Reach out to trusted friends or family for support",
        "Remember: seeking help is a sign of strength, not weakness",
      ];
    }
  };

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  const renderTabs = () => (
    <div className="tabs-container">
      <div className="tabs-header">
        <button
          className={`tab-button ${activeTab === "assessment" ? "active" : ""}`}
          onClick={() => handleTabClick("assessment")}
        >
          New Assessment
        </button>
        <button
          className={`tab-button ${activeTab === "results" ? "active" : ""}`}
          onClick={() => handleTabClick("results")}
          disabled={!prediction}
        >
          Current Results
        </button>
        <button
          className={`tab-button ${activeTab === "history" ? "active" : ""}`}
          onClick={() => handleTabClick("history")}
        >
          History & Progress
        </button>
        <button
          className={`tab-button ${activeTab === "tips" ? "active" : ""}`}
          onClick={() => handleTabClick("tips")}
        >
          Wellness Tips
        </button>
      </div>
    </div>
  );

  const renderStep1 = () => (
    <div className="step-container">
      <div className="step-header">
        <h2 className="step-title">Let's start with your sleep</h2>
        <p className="step-subtitle">
          Good sleep is the foundation of managing stress. We're here to help
          you understand your stress better.
        </p>
      </div>

      <div className="input-group">
        <label className="input-label">
          How many hours did you sleep last night?
        </label>
        <input
          type="number"
          className="input-field"
          placeholder="e.g., 7.5"
          min="1"
          max="15"
          step="0.5"
          value={formData.sleep_duration}
          onChange={(e) => handleInputChange("sleep_duration", e.target.value)}
        />
      </div>

      <div className="input-group">
        <label className="input-label">
          How would you rate your sleep quality?
        </label>
        <div className="rating-cards">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((rating) => (
            <div
              key={rating}
              className={`rating-card ${
                formData.quality_of_sleep == rating ? "selected" : ""
              }`}
              onClick={() => handleInputChange("quality_of_sleep", rating)}
            >
              {rating}
            </div>
          ))}
        </div>
        <small className="helper-text">1 = Very Poor, 10 = Excellent</small>
      </div>

      <div className="checkbox-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={formData.has_sleep_disorder}
            onChange={(e) =>
              handleInputChange("has_sleep_disorder", e.target.checked)
            }
          />
          <span className="checkbox-text">
            I have a diagnosed sleep disorder
          </span>
        </label>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="step-container">
      <div className="step-header">
        <h2 className="step-title">Tell us about your activity</h2>
        <p className="step-subtitle">
          Physical activity is a great stress reliever. Let's take it one step
          at a time.
        </p>
      </div>

      <div className="input-group">
        <label className="input-label">How active would you say you are?</label>
        <div className="activity-cards">
          <div
            className={`activity-card ${
              formData.physical_activity_level == 25 ? "selected" : ""
            }`}
            onClick={() => handleInputChange("physical_activity_level", 25)}
          >
            <div className="card-title">Low Activity</div>
            <div className="card-description">
              Mostly sitting, little exercise
            </div>
          </div>
          <div
            className={`activity-card ${
              formData.physical_activity_level == 50 ? "selected" : ""
            }`}
            onClick={() => handleInputChange("physical_activity_level", 50)}
          >
            <div className="card-title">Moderate Activity</div>
            <div className="card-description">
              Some walking, occasional exercise
            </div>
          </div>
          <div
            className={`activity-card ${
              formData.physical_activity_level == 75 ? "selected" : ""
            }`}
            onClick={() => handleTabClick("physical_activity_level", 75)}
          >
            <div className="card-title">High Activity</div>
            <div className="card-description">
              Regular exercise, very active
            </div>
          </div>
        </div>
      </div>

      <div className="input-group">
        <label className="input-label">
          About how many steps do you take daily?
        </label>
        <input
          type="number"
          className="input-field"
          placeholder="e.g., 8000"
          min="0"
          value={formData.daily_steps}
          onChange={(e) => handleInputChange("daily_steps", e.target.value)}
        />
        <small className="helper-text">
          Most phones can track this automatically
        </small>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="step-container">
      <div className="step-header">
        <h2 className="step-title">A few health indicators</h2>
        <p className="step-subtitle">
          Don't worry - you don't need exact medical numbers. Just tell us how
          you generally feel.
        </p>
      </div>

      <div className="input-group">
        <label className="input-label">
          How does your heart rate usually feel?
        </label>
        <div className="health-cards">
          <div
            className={`health-card ${
              formData.heart_rate_level === "slow" ? "selected" : ""
            }`}
            onClick={() => handleInputChange("heart_rate_level", "slow")}
          >
            <div className="card-title">Slow & Calm</div>
            <div className="card-description">Feels relaxed and steady</div>
          </div>
          <div
            className={`health-card ${
              formData.heart_rate_level === "normal" ? "selected" : ""
            }`}
            onClick={() => handleInputChange("heart_rate_level", "normal")}
          >
            <div className="card-title">Normal</div>
            <div className="card-description">Feels just right</div>
          </div>
          <div
            className={`health-card ${
              formData.heart_rate_level === "fast" ? "selected" : ""
            }`}
            onClick={() => handleInputChange("heart_rate_level", "fast")}
          >
            <div className="card-title">Fast</div>
            <div className="card-description">Often feels racing or quick</div>
          </div>
        </div>
      </div>

      <div className="input-group">
        <label className="input-label">
          How is your blood pressure typically?
        </label>
        <div className="health-cards">
          <div
            className={`health-card ${
              formData.blood_pressure_level === "low" ? "selected" : ""
            }`}
            onClick={() => handleInputChange("blood_pressure_level", "low")}
          >
            <div className="card-title">Low</div>
            <div className="card-description">
              Sometimes feel dizzy when standing
            </div>
          </div>
          <div
            className={`health-card ${
              formData.blood_pressure_level === "normal" ? "selected" : ""
            }`}
            onClick={() => handleInputChange("blood_pressure_level", "normal")}
          >
            <div className="card-title">Normal</div>
            <div className="card-description">No blood pressure concerns</div>
          </div>
          <div
            className={`health-card ${
              formData.blood_pressure_level === "high" ? "selected" : ""
            }`}
            onClick={() => handleInputChange("blood_pressure_level", "high")}
          >
            <div className="card-title">High</div>
            <div className="card-description">
              Doctor mentioned it's elevated
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="step-container">
      <div className="step-header">
        <h2 className="step-title">Just a couple more details</h2>
        <p className="step-subtitle">
          We're almost ready to analyze your stress levels
        </p>
      </div>

      <div className="input-row">
        <div className="input-group">
          <label className="input-label">Height (cm)</label>
          <input
            type="number"
            className="input-field"
            placeholder="e.g., 170"
            min="100"
            max="250"
            value={formData.height_cm}
            onChange={(e) => handleInputChange("height_cm", e.target.value)}
          />
        </div>

        <div className="input-group">
          <label className="input-label">Weight (kg)</label>
          <input
            type="number"
            className="input-field"
            placeholder="e.g., 70"
            min="30"
            max="200"
            value={formData.weight_kg}
            onChange={(e) => handleInputChange("weight_kg", e.target.value)}
          />
        </div>
      </div>

      <div className="summary-section">
        <h3 className="summary-title">Ready to analyze your stress?</h3>
        <p className="summary-text">
          We'll use all the information you've provided to give you personalized
          insights about your current stress levels and helpful recommendations.
        </p>
      </div>
    </div>
  );

  const renderResults = () => {
    if (!prediction) return (
      <div className="no-results-container">
        <h3>No results available</h3>
        <p>Complete an assessment to see your stress analysis results.</p>
      </div>
    );
    
    const tips = getStressTips(prediction.stress_level);

    return (
      <div className="results-container">
        <div className="results-header">
          <h2 className="results-title">Your Stress Analysis</h2>
          <p className="results-subtitle">
            Here's what we found based on your responses
          </p>
        </div>

        <div className="stress-score-card">
          <div className="score-display">
            <div className="score-number">{prediction.stress_level}</div>
            <div className="score-scale">/10</div>
          </div>
          <div className="score-category">{prediction.stress_category}</div>
          <div className="confidence-range">
            Confidence Range: {prediction.confidence_interval.lower} -{" "}
            {prediction.confidence_interval.upper}
          </div>
        </div>

        {weeklyInsight && (
          <div className="weekly-insight">
            <h3 className="insight-title">Weekly Progress</h3>
            <div className="insight-content">
              <p className="insight-message">
                Last week your stress level was: {weeklyInsight.lastWeek}
              </p>
              <p className="insight-message">
                This week it is: {weeklyInsight.thisWeek}
              </p>
              <p className="insight-message">
                Insight: You've{" "}
                {weeklyInsight.improvement > 0 ? "improved" : "worsened"} by{" "}
                {Math.abs(weeklyInsight.improvement)}%
              </p>
            </div>
          </div>
        )}

        <div className="tips-section">
          <h3 className="tips-title">Personalized Stress Reduction Tips</h3>
          <div className="tips-list">
            {tips.map((tip, index) => (
              <div key={index} className="tip-item">
                <span className="tip-bullet">•</span>
                <span className="tip-text">{tip}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="next-prediction-info">
          <p className="next-prediction-text">
            Your next stress assessment will be available after midnight to track your
            progress effectively.
          </p>
        </div>
      </div>
    );
  };

  const renderHistory = () => (
    <div className="history-container">
      <div className="history-header">
        <h2 className="history-title">Your Stress History</h2>
        <p className="history-subtitle">Track your progress over time</p>
      </div>

      {history.length > 0 ? (
        <div className="history-content">
          <div className="stats-overview">
            <div className="stat-card">
              <div className="stat-number">{history.length}</div>
              <div className="stat-label">Total Assessments</div>
            </div>
            {history.length > 1 && (
              <div className="stat-card">
                <div className="stat-number">
                  {Math.round(
                    history.reduce((sum, entry) => sum + entry.stress_level, 0) /
                    history.length * 10
                  ) / 10}
                </div>
                <div className="stat-label">Average Stress Level</div>
              </div>
            )}
          </div>

          <div className="history-list">
            <h3 className="section-title">Recent Assessments</h3>
            {history.map((entry, index) => (
              <div key={index} className="history-item">
                <div className="history-date">
                  {new Date(entry.timestamp).toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </div>
                <div className="history-details">
                  <div className="history-score">{entry.stress_level}/10</div>
                  <div className="history-category">{entry.stress_category}</div>
                </div>
              </div>
            ))}
          </div>

          {weeklyInsight && (
            <div className="weekly-insight">
              <h3 className="insight-title">Weekly Progress Insight</h3>
              <div className="insight-content">
                <p className="insight-message">
                  Compared to last week, your stress level has{" "}
                  {weeklyInsight.improvement > 0 ? "improved" : "worsened"} by{" "}
                  {Math.abs(weeklyInsight.improvement)}%
                </p>
                <div className="progress-comparison">
                  <div className="progress-item">
                    <span className="progress-label">Last Week:</span>
                    <span className="progress-value">{weeklyInsight.lastWeek}/10</span>
                  </div>
                  <div className="progress-item">
                    <span className="progress-label">This Week:</span>
                    <span className="progress-value">{weeklyInsight.thisWeek}/10</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="no-history">
          <h3>No history available yet</h3>
          <p>Complete your first stress assessment to start tracking your progress.</p>
        </div>
      )}
    </div>
  );

  const renderWellnessTips = () => {
    const generalTips = [
      {
        category: "Sleep Hygiene",
        tips: [
          "Maintain a consistent sleep schedule, even on weekends",
          "Create a relaxing bedtime routine 1 hour before sleep",
          "Keep your bedroom cool, dark, and quiet",
          "Avoid screens 30 minutes before bedtime"
        ]
      },
      {
        category: "Physical Activity",
        tips: [
          "Aim for at least 150 minutes of moderate exercise per week",
          "Take short walking breaks every hour during work",
          "Try stress-reducing activities like yoga or tai chi",
          "Use stairs instead of elevators when possible"
        ]
      },
      {
        category: "Mental Health",
        tips: [
          "Practice deep breathing exercises for 5-10 minutes daily",
          "Try mindfulness meditation or progressive muscle relaxation",
          "Keep a gratitude journal to focus on positive aspects",
          "Connect with friends and family regularly"
        ]
      },
      {
        category: "Lifestyle",
        tips: [
          "Limit caffeine intake, especially after 2 PM",
          "Stay hydrated throughout the day",
          "Take regular breaks from work or stressful activities",
          "Organize your space to reduce daily stressors"
        ]
      }
    ];

    const personalizedTips = prediction ? getStressTips(prediction.stress_level) : [];

    return (
      <div className="wellness-tips-container">
        <div className="tips-header">
          <h2 className="tips-title">Wellness Tips & Recommendations</h2>
          <p className="tips-subtitle">Evidence-based strategies to manage stress and improve wellbeing</p>
        </div>

        {personalizedTips.length > 0 && (
          <div className="personalized-tips-section">
            <h3 className="section-title">Your Personalized Recommendations</h3>
            <div className="personalized-tips-list">
              {personalizedTips.map((tip, index) => (
                <div key={index} className="personalized-tip-item">
                  <span className="tip-bullet">🎯</span>
                  <span className="tip-text">{tip}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="general-tips-section">
          <h3 className="section-title">General Wellness Guidelines</h3>
          {generalTips.map((category, categoryIndex) => (
            <div key={categoryIndex} className="tip-category">
              <h4 className="category-title">{category.category}</h4>
              <div className="category-tips">
                {category.tips.map((tip, tipIndex) => (
                  <div key={tipIndex} className="general-tip-item">
                    <span className="tip-bullet">•</span>
                    <span className="tip-text">{tip}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="emergency-resources">
          <h3 className="section-title">When to Seek Professional Help</h3>
          <div className="emergency-content">
            <p className="emergency-text">
              If you're experiencing persistent high stress levels, consider reaching out to:
            </p>
            <ul className="emergency-list">
              <li>Your primary healthcare provider</li>
              <li>A licensed mental health professional</li>
              <li>Employee assistance programs at work</li>
              <li>Community mental health centers</li>
            </ul>
            <p className="emergency-note">
              Remember: Seeking help is a sign of strength, not weakness.
            </p>
          </div>
        </div>
      </div>
    );
  };

const renderAssessmentTab = () => {
  if (!canPredict) {
    return (
        <div className="assessment-unavailable">
          <div className="unavailable-header">
            <h2 className="unavailable-title">Assessment Completed Today</h2>
            <p className="unavailable-subtitle">
              You've already completed your stress assessment for today.
            </p>
          </div>
          <div className="unavailable-message">
            <p>To ensure accurate tracking and prevent assessment fatigue, we limit assessments to once per day.</p>
            <p>Your next assessment will be available after midnight.</p>
          </div>
          <div className="unavailable-actions">
            <button 
              className="nav-button"
              onClick={() => handleTabClick("results")}
              disabled={!prediction}
            >
              View Today's Results
            </button>
            <button 
              className="nav-button"
              onClick={() => handleTabClick("history")}
            >
              View Progress History
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="assessment-content">
        <div className="progress-indicator">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${(currentStep / 5) * 100}%` }}
            ></div>
          </div>
          <div className="step-counter">
            {currentStep < 5 ? `Step ${currentStep} of 4` : "Results"}
          </div>
        </div>

        <div className="form-content">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
          {currentStep === 4 && renderStep4()}
          {currentStep === 5 && (
            <div className="assessment-complete">
              <h2>Assessment Complete!</h2>
              <p>Your results have been saved. Check the "Current Results" tab to view your analysis.</p>
              <button 
                className="nav-button"
                onClick={() => handleTabClick("results")}
              >
                View Results
              </button>
            </div>
          )}
        </div>

        {error && (
          <div className="error-message">
            <div className="error-text">{error}</div>
          </div>
        )}

        {currentStep < 5 && (
          <div className="navigation-buttons">
            {currentStep > 1 && (
              <button
                className="nav-button back-button"
                onClick={prevStep}
              >
                Back
              </button>
            )}

            {currentStep < 4 ? (
              <button
                className="nav-button next-button"
                onClick={nextStep}
              >
                Next
              </button>
            ) : (
              <button
                className="nav-button submit-button"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading ? (
                  <div className="loading-content">
                    <div className="spinner"></div>
                    Analyzing...
                  </div>
                ) : (
                  "Get My Stress Analysis"
                )}
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "assessment":
        return renderAssessmentTab();
      case "results":
        return renderResults();
      case "history":
        return renderHistory();
      case "tips":
        return renderWellnessTips();
      default:
        return renderAssessmentTab();
    }
  };

 return (
    <div className="page-wrapper">
      <Sidebar />
      <div className="main-content">
        <div className="stress-prediction-container">
          <div className="content-wrapper">
            <div className="main-header">
              <h1 className="main-title">Stress Assessment & Wellness Tracker</h1>
              <p className="main-subtitle">
                Monitor your stress levels and get personalized recommendations for better mental health
              </p>
            </div>

            {renderTabs()}
            
            <div className="tab-content">
              {activeTab === "assessment" && renderAssessmentTab()}
              {activeTab === "results" && renderResults()}
              {activeTab === "history" && renderHistory()}
              {activeTab === "tips" && renderWellnessTips()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StressPrediction;