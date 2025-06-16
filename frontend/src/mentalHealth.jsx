import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import "./mentalHealth.css";

// Get local date-time string in ISO format without timezone conversion
const getLocalDateTimeString = () => {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60000; // offset in milliseconds
  const localISOTime = (new Date(now - offset)).toISOString().slice(0, -1);
  return localISOTime;
};

const getTodayDateString = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.toISOString().split('T')[0];
};

const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  return tomorrow.toISOString().split('T')[0];
};

const MHP_STORAGE_KEY = 'mental_health_prediction_last';

const generatePersonalizedTips = (resultsData) => {
  const tips = [];
  
  if (!resultsData) return tips;

  // Tips based on mental health status
  const status = resultsData.predictions.mental_health_status.toLowerCase();
  if (status.includes('poor') || status.includes('concerning')) {
    tips.push("Consider speaking with a mental health professional for personalized support.");
    tips.push("Prioritize self-care activities that help you relax and recharge.");
  } else if (status.includes('moderate')) {
    tips.push("Maintain healthy habits to support your mental wellbeing.");
    tips.push("Practice mindfulness or meditation for 10 minutes daily.");
  } else {
    tips.push("Continue your positive habits to maintain good mental health.");
  }

  // Tips based on depression level
  const depression = resultsData.predictions.depression_level.toLowerCase();
  if (depression.includes('moderate') || depression.includes('severe')) {
    tips.push("Reach out to friends or family for emotional support.");
    tips.push("Consider talking to a therapist about how you're feeling.");
    tips.push("Try journaling to process your thoughts and emotions.");
  } else if (depression.includes('mild')) {
    tips.push("Engage in activities you enjoy to boost your mood.");
    tips.push("Spend time in nature to help alleviate depressive symptoms.");
  }

  // Tips based on anxiety presence
  if (resultsData.predictions.anxiety_presence.toLowerCase().includes('yes')) {
    tips.push("Practice deep breathing exercises when feeling anxious.");
    tips.push("Limit caffeine intake as it can exacerbate anxiety symptoms.");
    tips.push("Try progressive muscle relaxation techniques before bed.");
  }

  // Tips based on caffeine insights
  if (resultsData.insights.high_caffeine_detected) {
    tips.push("Reduce caffeine intake, especially in the afternoon and evening.");
    tips.push("Replace caffeinated drinks with herbal tea or water.");
  }

  // Tips based on sleep
  if (resultsData.inputData?.Sleep_Hours < 6) {
    tips.push("Aim for 7-9 hours of sleep each night for better mental health.");
    tips.push("Establish a consistent sleep schedule and bedtime routine.");
  }

  // Tips based on physical activity
  if (resultsData.inputData?.Physical_Activity < 0.5) {
    tips.push("Try to incorporate at least 30 minutes of physical activity daily.");
    tips.push("Start with light exercises like walking or stretching.");
  }

  // Tips based on social interaction
  const socialLevel = resultsData.inputData?.Social_Interaction_Level?.toLowerCase();
  if (socialLevel === 'low') {
    tips.push("Make time for social connections, even brief interactions can help.");
    tips.push("Consider joining a club or group with similar interests.");
  }

  // Add general wellness tips if we don't have enough specific ones
  if (tips.length < 3) {
    tips.push("Practice gratitude by noting 3 things you're thankful for each day.");
    tips.push("Stay hydrated - proper hydration supports cognitive function.");
    tips.push("Take regular breaks from screens throughout the day.");
  }

  return tips.slice(0, 5); // Return maximum 5 most relevant tips
};

const MentalHealthPredictionForm = () => {
  const userId = localStorage.getItem('user_id') || 'default_user';
  
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingLastPrediction, setIsLoadingLastPrediction] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [predictions, setPredictions] = useState(null);
  const [lastPrediction, setLastPrediction] = useState(null);
  const [errors, setErrors] = useState({});
  const [predictionLocked, setPredictionLocked] = useState(false);
  const [nextAvailableDate, setNextAvailableDate] = useState('');
  const [personalizedTips, setPersonalizedTips] = useState([]);

  // Form data state
  const [formData, setFormData] = useState({
    user_id: userId,
    age: '',
    gender: '',
    drinks: [],
    sleep_hours: '',
    mood_rating: '',
    stress_level: '',
    smoking_habits: '',
    drinking_habits: '',
    social_interaction_level: '',
    screen_time: '',
    physical_activity: '',
    diet_quality: '',
    work_study_hours: '',
    employment_status: '',
    chronic_health_issues: ''
  });

  // Generate personalized tips when results are available
  useEffect(() => {
    if (predictions) {
      const tips = generatePersonalizedTips({
        ...predictions,
        inputData: formData
      });
      setPersonalizedTips(tips);
    }
  }, [predictions, formData]);

  // Generate tips for last prediction when available
  useEffect(() => {
    if (lastPrediction) {
      const tips = generatePersonalizedTips(lastPrediction);
      setPersonalizedTips(tips);
    }
  }, [lastPrediction]);

  // Check if a prediction was already made today
  useEffect(() => {
    const checkPredictionLock = () => {
      // Try to get the last prediction date for this user from localStorage
      let lastPredictions = {};
      try {
        const stored = localStorage.getItem(MHP_STORAGE_KEY);
        if (stored) {
          lastPredictions = JSON.parse(stored);
        }
      } catch (e) {
        // ignore parsing errors
      }
      const todayStr = getTodayDateString();
      const tomorrowStr = getTomorrowDateString();
      if (lastPredictions[userId] === todayStr) {
        setPredictionLocked(true);
        setNextAvailableDate(tomorrowStr);
        
        // Fetch last prediction data
        fetchLastPrediction();
      } else {
        setPredictionLocked(false);
        setNextAvailableDate('');
      }
    };

    checkPredictionLock();
  }, [userId, predictions]);

  // Fetch the last prediction from the backend
  const fetchLastPrediction = async () => {
    setIsLoadingLastPrediction(true);
    try {
      const response = await fetch(`http://localhost:5002/user/${userId}/history`);
      if (response.ok) {
        const data = await response.json();
        if (data.history_count > 0) {
          // Get the latest prediction
          const latest = data.history[0];
          
          // Transform the prediction to match the frontend format
          const transformed = {
            predictions: {
              mental_health_status: latest.prediction_results.mental_health_status,
              depression_level: latest.prediction_results.depression_level,
              anxiety_presence: latest.prediction_results.anxiety_presence,
              confidence_scores: {
                mental_health: latest.prediction_results.mental_health_confidence,
                depression: latest.prediction_results.depression_confidence,
                anxiety: latest.prediction_results.anxiety_confidence
              }
            },
            recommendations: latest.recommendations,
            insights: {
              caffeine_intake_level: latest.input_data.Caffeine_Intake_mg_per_day > 400 ? 
                'High' : latest.input_data.Caffeine_Intake_mg_per_day > 200 ? 
                'Moderate' : 'Low',
              high_caffeine_detected: latest.input_data.Caffeine_Intake_mg_per_day > 400,
              risk_factors_identified: latest.recommendations.filter(r => 
                r.includes('Consider') || r.includes('Try') || r.includes('reduce') || r.includes('monitor')
              ).length
            },
            inputData: latest.input_data 
          };
          
          setLastPrediction(transformed);
        }
      } else {
        console.error('Failed to fetch last prediction');
      }
    } catch (error) {
      console.error('Error fetching last prediction:', error);
    } finally {
      setIsLoadingLastPrediction(false);
    }
  };

  // Fetch user profile data on component mount
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`http://localhost:5000/user/${userId}`);

        if (response.ok) {
          const userData = await response.json();
          setUserProfile(userData);
          setFormData(prev => ({
            ...prev,
            age: userData.age || '',
            gender: userData.gender || ''
          }));
        } else {
          console.error('Failed to fetch user profile');
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserProfile();
  }, [userId]);

  // Handle input changes
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  // Handle drink changes
  const handleDrinkChange = (index, field, value) => {
    const updatedDrinks = [...formData.drinks];
    updatedDrinks[index] = {
      ...updatedDrinks[index],
      [field]: value
    };
    setFormData(prev => ({
      ...prev,
      drinks: updatedDrinks
    }));
  };

  // Add new drink entry
  const addDrink = () => {
    setFormData(prev => ({
      ...prev,
      drinks: [...prev.drinks, { type: 'Tea', quantity: 1 }]
    }));
  };

  // Remove drink entry
  const removeDrink = (index) => {
    const updatedDrinks = formData.drinks.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      drinks: updatedDrinks
    }));
  };

  // Validation functions
  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1:
        if (!formData.age || formData.age < 1 || formData.age > 120) {
          newErrors.age = 'Please enter a valid age between 1 and 120';
        }
        if (!formData.gender) {
          newErrors.gender = 'Please select your gender';
        }
        break;
      case 3:
        if (!formData.sleep_hours || formData.sleep_hours < 0 || formData.sleep_hours > 24) {
          newErrors.sleep_hours = 'Please enter valid sleep hours (0-24)';
        }
        if (!formData.mood_rating || formData.mood_rating < 1 || formData.mood_rating > 10) {
          newErrors.mood_rating = 'Please enter mood rating between 1-10';
        }
        if (!formData.stress_level) {
          newErrors.stress_level = 'Please select your stress level';
        }
        if (!formData.smoking_habits) {
          newErrors.smoking_habits = 'Please select your smoking habits';
        }
        if (!formData.drinking_habits) {
          newErrors.drinking_habits = 'Please select your drinking habits';
        }
        if (!formData.social_interaction_level) {
          newErrors.social_interaction_level = 'Please select your social interaction level';
        }
        break;
      case 4:
        if (!formData.screen_time || formData.screen_time < 0 || formData.screen_time > 24) {
          newErrors.screen_time = 'Please enter valid screen time (0-24 hours)';
        }
        if (!formData.physical_activity || formData.physical_activity < 0 || formData.physical_activity > 24) {
          newErrors.physical_activity = 'Please enter valid physical activity hours (0-24)';
        }
        if (!formData.diet_quality || formData.diet_quality < 1 || formData.diet_quality > 10) {
          newErrors.diet_quality = 'Please enter diet quality (1-10)';
        }
        if (!formData.work_study_hours || formData.work_study_hours < 0 || formData.work_study_hours > 24) {
          newErrors.work_study_hours = 'Please enter valid work/study hours (0-24)';
        }
        if (!formData.employment_status) {
          newErrors.employment_status = 'Please select your employment status';
        }
        if (!formData.chronic_health_issues) {
          newErrors.chronic_health_issues = 'Please select chronic health issues status';
        }
        break;
      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle next step
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 5));
    }
  };

  // Handle previous step
  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  // Submit form
  const handleSubmit = async () => {
    // First, check if predictions are locked for today
    if (predictionLocked) return;

    try {
      setIsLoading(true);

      // Get local timestamp
      const localDateTime = getLocalDateTimeString();
      
      // Create data to send with local timestamp
      const dataToSend = {
        ...formData,
        local_timestamp: localDateTime
      };

      const response = await fetch('http://localhost:5002/predictmentalhealth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend)
      });

      if (response.ok) {
        const result = await response.json();
        setPredictions(result);

        // Save today's prediction for this user in localStorage
        let lastPredictions = {};
        try {
          const stored = localStorage.getItem(MHP_STORAGE_KEY);
          if (stored) {
            lastPredictions = JSON.parse(stored);
          }
        } catch (e) {
          // ignore
        }
        const todayStr = getTodayDateString();
        lastPredictions[userId] = todayStr;
        localStorage.setItem(MHP_STORAGE_KEY, JSON.stringify(lastPredictions));
        setPredictionLocked(true);
        setNextAvailableDate(getTomorrowDateString());
      } else {
        const errorData = await response.json();
        console.error('Prediction failed:', errorData);
        setErrors({ submit: errorData.error || 'Prediction failed' });
      }
    } catch (error) {
      console.error('Error submitting form:', error);
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  // Calculate total caffeine intake for display
  const calculateTotalCaffeine = (drinks = formData.drinks) => {
    const caffeineContent = {
      'Tea': 40,
      'Coffee': 95,
      'Energy Drink': 80,
      'Soda': 34,
      'Green Tea': 25,
      'Black Tea': 47,
      'Espresso': 64
    };

    return drinks.reduce((total, drink) => {
      return total + (caffeineContent[drink.type] || 0) * drink.quantity;
    }, 0);
  };

  if (isLoading && !userProfile) {
    return (
      <div className="mental-health-app">
        <Sidebar />
        <div className="main-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading user profile...</div>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while fetching last prediction
  if (predictionLocked && isLoadingLastPrediction) {
    return (
      <div className="mental-health-app">
        <Sidebar />
        <div className="main-content">
          <div className="loading-container">
            <div className="loading-spinner"></div>
            <div className="loading-text">Loading your latest assessment...</div>
          </div>
        </div>
      </div>
    );
  }

  // If locked and we have last prediction, show results
  const resultsData = predictions || lastPrediction;
  if (predictionLocked && resultsData) {
    return (
      <div className="mental-health-app">
        <Sidebar />
        <div className="main-content">
          <div className="form-container">
            <div className="lock-notice">
              <div className="lock-icon">🔒</div>
              <h2 className="lock-title">Mental Health Prediction Assessment</h2>
              <div className="lock-message">
                You've already taken today's assessment.<br />
                You can take the next one after midnight.
              </div>
            </div>

            <div className="results-container">
              <h2 className="step-title">Your Latest Mental Health Prediction Results</h2>
              
              <div className="prediction-summary">
                <h3>Prediction Summary:</h3>
                <div className="prediction-item">
                  <span className="prediction-label">Mental Health Status:</span>
                  <span className="prediction-value">{resultsData.predictions.mental_health_status}</span>
                </div>
                <div className="prediction-item">
                  <span className="prediction-label">Depression Level:</span>
                  <span className="prediction-value">{resultsData.predictions.depression_level}</span>
                </div>
                <div className="prediction-item">
                  <span className="prediction-label">Anxiety Presence:</span>
                  <span className="prediction-value">{resultsData.predictions.anxiety_presence}</span>
                </div>
              </div>

              <div className="recommendations">
                <h3>Recommendations:</h3>
                <ul className="recommendation-list">
                  {resultsData.recommendations.map((recommendation, index) => (
                    <li key={index} className="recommendation-item">{recommendation}</li>
                  ))}
                </ul>
              </div>

              <div className="personalized-tips">
                <h3>Personalized Tips for You:</h3>
                <ul className="tip-list">
                  {personalizedTips.map((tip, index) => (
                    <li key={index} className="tip-item">
                      <span className="tip-bullet">•</span> {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="insights">
                <h3>Insights:</h3>
                <div className="insight-item">
                  <span>Caffeine Level:</span>
                  <span>{resultsData.insights.caffeine_intake_level}</span>
                </div>
                {resultsData.insights.high_caffeine_detected && (
                  <div className="insight-item">
                    <span className="warning-badge">⚠️ High caffeine consumption detected</span>
                  </div>
                )}
                <div className="insight-item">
                  <span>Risk Factors Identified:</span>
                  <span>{resultsData.insights.risk_factors_identified}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If locked but no last prediction found, show lock notice
  if (predictionLocked && !resultsData) {
    return (
      <div className="mental-health-app">
        <Sidebar />
        <div className="main-content">
          <div className="form-container">
            <div className="lock-notice">
              <div className="lock-icon">🔒</div>
              <h2 className="lock-title">Mental Health Prediction Assessment</h2>
              <div className="lock-message">
                You've already taken today's assessment.<br />
                You can take the next one after midnight.
              </div>
              <div className="next-date">
                Next available date: <strong>{nextAvailableDate}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mental-health-app">
      <Sidebar />
      <div className="main-content">
        <div className="form-container">
          <h1>Mental Health Prediction Assessment</h1>

          {/* Progress indicator */}
          <div className="progress-container">
            <div className="progress-text">Step {currentStep} of 5</div>
            <div className="progress-bar">
              <div 
                className="progress-fill" 
                style={{ width: `${(currentStep / 5) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Step 1: User Profile */}
          {currentStep === 1 && (
            <div className="step-content">
              <h2 className="step-title">Step 1: User Profile</h2>
              <div className="form-row">
                <div className="form-group">
                  <label>Age:</label>
                  <input
                    type="number"
                    value={formData.age}
                    onChange={(e) => handleInputChange('age', e.target.value)}
                    min="1"
                    max="120"
                    placeholder="Enter your age"
                  />
                  {errors.age && <div className="error-message">{errors.age}</div>}
                </div>

                <div className="form-group">
                  <label>Gender:</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => handleInputChange('gender', e.target.value)}
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.gender && <div className="error-message">{errors.gender}</div>}
                </div>
              </div>

              <div className="button-group button-group-end">
                <button className="btn btn-primary" onClick={handleNext}>Next</button>
              </div>
            </div>
          )}

          {/* Step 2: Caffeine Intake */}
          {currentStep === 2 && (
            <div className="step-content">
              <h2 className="step-title">Step 2: Caffeine Intake</h2>
              <div className="form-group">
                <h3>What caffeinated drinks do you consume daily?</h3>

                {formData.drinks.map((drink, index) => (
                  <div key={index} className="drink-entry">
                    <div className="drink-controls">
                      <div className="form-group">
                        <label>Drink Type:</label>
                        <select
                          value={drink.type}
                          onChange={(e) => handleDrinkChange(index, 'type', e.target.value)}
                        >
                          <option value="Tea">Tea</option>
                          <option value="Coffee">Coffee</option>
                          <option value="Energy Drink">Energy Drink</option>
                          <option value="Soda">Soda</option>
                          <option value="Green Tea">Green Tea</option>
                          <option value="Black Tea">Black Tea</option>
                          <option value="Espresso">Espresso</option>
                        </select>
                      </div>

                      <div className="form-group">
                        <label>Quantity:</label>
                        <input
                          type="number"
                          value={drink.quantity}
                          onChange={(e) => handleDrinkChange(index, 'quantity', parseInt(e.target.value) || 0)}
                          min="0"
                          placeholder="0"
                        />
                      </div>

                      <button 
                        className="remove-drink-btn" 
                        onClick={() => removeDrink(index)}
                        type="button"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                ))}

                <button className="add-drink-btn" onClick={addDrink} type="button">
                  ➕ Add another drink
                </button>

                {formData.drinks.length > 0 && (
                  <div className="caffeine-summary">
                    <div className="caffeine-total">
                      Total estimated caffeine: {calculateTotalCaffeine()} mg/day
                    </div>
                  </div>
                )}
              </div>

              <div className="button-group">
                <button className="btn btn-outline" onClick={handleBack}>Back</button>
                <button className="btn btn-primary" onClick={handleNext}>Next</button>
              </div>
            </div>
          )}

          {/* Step 3: Lifestyle & Wellness */}
          {currentStep === 3 && (
            <div className="step-content">
              <h2 className="step-title">Step 3: Lifestyle & Wellness</h2>
              <div className="form-row">
                <div className="form-group">
                  <label>Sleep Hours per Day:</label>
                  <input
                    type="number"
                    value={formData.sleep_hours}
                    onChange={(e) => handleInputChange('sleep_hours', e.target.value)}
                    min="0"
                    max="24"
                    step="0.5"
                    placeholder="8"
                  />
                  {errors.sleep_hours && <div className="error-message">{errors.sleep_hours}</div>}
                </div>

                <div className="form-group">
                  <label>Mood Rating (1-10):</label>
                  <input
                    type="number"
                    value={formData.mood_rating}
                    onChange={(e) => handleInputChange('mood_rating', e.target.value)}
                    min="1"
                    max="10"
                    placeholder="5"
                  />
                  {errors.mood_rating && <div className="error-message">{errors.mood_rating}</div>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Stress Level:</label>
                  <select
                    value={formData.stress_level}
                    onChange={(e) => handleInputChange('stress_level', e.target.value)}
                  >
                    <option value="">Select Stress Level</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                  {errors.stress_level && <div className="error-message">{errors.stress_level}</div>}
                </div>

                <div className="form-group">
                  <label>Smoking Habits:</label>
                  <select
                    value={formData.smoking_habits}
                    onChange={(e) => handleInputChange('smoking_habits', e.target.value)}
                  >
                    <option value="">Select Smoking Habits</option>
                    <option value="Never">Never</option>
                    <option value="Occasionally">Occasionally</option>
                    <option value="Regularly">Regularly</option>
                  </select>
                  {errors.smoking_habits && <div className="error-message">{errors.smoking_habits}</div>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Drinking Habits:</label>
                  <select
                    value={formData.drinking_habits}
                    onChange={(e) => handleInputChange('drinking_habits', e.target.value)}
                  >
                    <option value="">Select Drinking Habits</option>
                    <option value="Never">Never</option>
                    <option value="Occasionally">Occasionally</option>
                    <option value="Regularly">Regularly</option>
                  </select>
                  {errors.drinking_habits && <div className="error-message">{errors.drinking_habits}</div>}
                </div>

                <div className="form-group">
                  <label>Social Interaction Level:</label>
                  <select
                    value={formData.social_interaction_level}
                    onChange={(e) => handleInputChange('social_interaction_level', e.target.value)}
                  >
                    <option value="">Select Social Interaction Level</option>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                  {errors.social_interaction_level && <div className="error-message">{errors.social_interaction_level}</div>}
                </div>
              </div>

              <div className="button-group">
                <button className="btn btn-outline" onClick={handleBack}>Back</button>
                <button className="btn btn-primary" onClick={handleNext}>Next</button>
              </div>
            </div>
          )}

          {/* Step 4: Additional Lifestyle Inputs */}
          {currentStep === 4 && (
            <div className="step-content">
              <h2 className="step-title">Step 4: Additional Lifestyle Details</h2>
              <div className="form-row">
                <div className="form-group">
                  <label>Screen Time (hours/day):</label>
                  <input
                    type="number"
                    value={formData.screen_time}
                    onChange={(e) => handleInputChange('screen_time', e.target.value)}
                    min="0"
                    max="24"
                    placeholder="e.g. 4"
                  />
                  {errors.screen_time && <div className="error-message">{errors.screen_time}</div>}
                </div>
                <div className="form-group">
                  <label>Physical Activity (hours/day):</label>
                  <input
                    type="number"
                    value={formData.physical_activity}
                    onChange={(e) => handleInputChange('physical_activity', e.target.value)}
                    min="0"
                    max="24"
                    placeholder="e.g. 3"
                  />
                  {errors.physical_activity && <div className="error-message">{errors.physical_activity}</div>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Diet Quality (1=Poor, 10=Excellent):</label>
                  <input
                    type="number"
                    value={formData.diet_quality}
                    onChange={(e) => handleInputChange('diet_quality', e.target.value)}
                    min="1"
                    max="10"
                    placeholder="e.g. 5"
                  />
                  {errors.diet_quality && <div className="error-message">{errors.diet_quality}</div>}
                </div>
                <div className="form-group">
                  <label>Work/Study Hours (per day):</label>
                  <input
                    type="number"
                    value={formData.work_study_hours}
                    onChange={(e) => handleInputChange('work_study_hours', e.target.value)}
                    min="0"
                    max="24"
                    placeholder="e.g. 8"
                  />
                  {errors.work_study_hours && <div className="error-message">{errors.work_study_hours}</div>}
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Employment Status:</label>
                  <select
                    value={formData.employment_status}
                    onChange={(e) => handleInputChange('employment_status', e.target.value)}
                  >
                    <option value="">Select Employment Status</option>
                    <option value="Employed">Employed</option>
                    <option value="Student">Student</option>
                    <option value="Unemployed">Unemployed</option>
                    <option value="Other">Other</option>
                  </select>
                  {errors.employment_status && <div className="error-message">{errors.employment_status}</div>}
                </div>
                <div className="form-group">
                  <label>Chronic Health Issues:</label>
                  <select
                    value={formData.chronic_health_issues}
                    onChange={(e) => handleInputChange('chronic_health_issues', e.target.value)}
                  >
                    <option value="">Select Option</option>
                    <option value="No">No</option>
                    <option value="Yes">Yes</option>
                  </select>
                  {errors.chronic_health_issues && <div className="error-message">{errors.chronic_health_issues}</div>}
                </div>
              </div>
              <div className="button-group">
                <button className="btn btn-outline" onClick={handleBack}>Back</button>
                <button className="btn btn-primary" onClick={handleNext}>Next</button>
              </div>
            </div>
          )}

          {/* Step 5: Review & Submit */}
          {currentStep === 5 && !resultsData && (
            <div className="step-content">
              <h2 className="step-title">Step 5: Review & Submit</h2>
              
              <div className="review-section">
                <h3>Review Your Information</h3>

                <div className="review-category">
                  <h4>Profile Information:</h4>
                  <div className="review-item">
                    <span className="review-label">Age:</span>
                    <span className="review-value">{formData.age}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Gender:</span>
                    <span className="review-value">{formData.gender}</span>
                  </div>
                </div>

                <div className="review-category">
                  <h4>Caffeine Intake:</h4>
                  {formData.drinks.length === 0 ? (
                    <div className="review-item">
                      <span className="review-value">No caffeinated drinks recorded</span>
                    </div>
                  ) : (
                    <>
                      {formData.drinks.map((drink, index) => (
                        <div key={index} className="review-item">
                          <span className="review-label">{drink.type}:</span>
                          <span className="review-value">{drink.quantity}</span>
                        </div>
                      ))}
                      <div className="review-item">
                        <span className="review-label"><strong>Total Caffeine:</strong></span>
                        <span className="review-value"><strong>{calculateTotalCaffeine()} mg/day</strong></span>
                      </div>
                    </>
                  )}
                </div>

                <div className="review-category">
                  <h4>Lifestyle & Wellness:</h4>
                  <div className="review-item">
                    <span className="review-label">Sleep Hours:</span>
                    <span className="review-value">{formData.sleep_hours}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Mood Rating:</span>
                    <span className="review-value">{formData.mood_rating}/10</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Stress Level:</span>
                    <span className="review-value">{formData.stress_level}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Smoking Habits:</span>
                    <span className="review-value">{formData.smoking_habits}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Drinking Habits:</span>
                    <span className="review-value">{formData.drinking_habits}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Social Interaction:</span>
                    <span className="review-value">{formData.social_interaction_level}</span>
                  </div>
                </div>

                <div className="review-category">
                  <h4>Additional Lifestyle Details:</h4>
                  <div className="review-item">
                    <span className="review-label">Screen Time:</span>
                    <span className="review-value">{formData.screen_time} hours/day</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Physical Activity:</span>
                    <span className="review-value">{formData.physical_activity} hours/day</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Diet Quality:</span>
                    <span className="review-value">{formData.diet_quality}/10</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Work/Study Hours:</span>
                    <span className="review-value">{formData.work_study_hours} hours/day</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Employment Status:</span>
                    <span className="review-value">{formData.employment_status}</span>
                  </div>
                  <div className="review-item">
                    <span className="review-label">Chronic Health Issues:</span>
                    <span className="review-value">{formData.chronic_health_issues}</span>
                  </div>
                </div>
              </div>

              {errors.submit && (
                <div className="error-message">
                  Error: {errors.submit}
                </div>
              )}
              
              {predictionLocked && (
                <div className="error-message">
                  You've already taken today's assessment.<br />
                  Next available: <strong>{nextAvailableDate}</strong>
                </div>
              )}

              <div className="button-group">
                <button className="btn btn-outline" onClick={handleBack}>Back</button>
                <button
                  className="btn btn-primary"
                  onClick={handleSubmit}
                  disabled={isLoading || predictionLocked}
                >
                  {isLoading ? (
                    <>
                      <div className="loading-spinner" style={{width: '20px', height: '20px', marginRight: '8px'}}></div>
                      Processing...
                    </>
                  ) : (
                    'Submit & Get Prediction'
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Prediction Results */}
          {resultsData && (
            <div className="step-content results-container">
              <h2 className="step-title">Your Mental Health Prediction Results</h2>
              
              <div className="prediction-summary">
                <h3>Prediction Summary:</h3>
                <div className="prediction-item">
                  <span className="prediction-label">Mental Health Status:</span>
                  <span className="prediction-value">{resultsData.predictions.mental_health_status}</span>
                </div>
                <div className="prediction-item">
                  <span className="prediction-label">Depression Level:</span>
                  <span className="prediction-value">{resultsData.predictions.depression_level}</span>
                </div>
                <div className="prediction-item">
                  <span className="prediction-label">Anxiety Presence:</span>
                  <span className="prediction-value">{resultsData.predictions.anxiety_presence}</span>
                </div>
              </div>

              <div className="confidence-scores">
                <h3>Confidence Scores:</h3>
                <div className="confidence-item">
                  <span>Mental Health:</span>
                  <div>
                    <div className="confidence-bar">
                      <div 
                        className="confidence-fill" 
                        style={{ width: `${resultsData.predictions.confidence_scores.mental_health * 100}%` }}
                      ></div>
                    </div>
                    <span>{(resultsData.predictions.confidence_scores.mental_health * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="confidence-item">
                  <span>Depression:</span>
                  <div>
                    <div className="confidence-bar">
                      <div 
                        className="confidence-fill" 
                        style={{ width: `${resultsData.predictions.confidence_scores.depression * 100}%` }}
                      ></div>
                    </div>
                    <span>{(resultsData.predictions.confidence_scores.depression * 100).toFixed(1)}%</span>
                  </div>
                </div>
                <div className="confidence-item">
                  <span>Anxiety:</span>
                  <div>
                    <div className="confidence-bar">
                      <div 
                        className="confidence-fill" 
                        style={{ width: `${resultsData.predictions.confidence_scores.anxiety * 100}%` }}
                      ></div>
                    </div>
                    <span>{(resultsData.predictions.confidence_scores.anxiety * 100).toFixed(1)}%</span>
                  </div>
                </div>
              </div>

              <div className="recommendations">
                <h3>Recommendations:</h3>
                <ul className="recommendation-list">
                  {resultsData.recommendations.map((recommendation, index) => (
                    <li key={index} className="recommendation-item">{recommendation}</li>
                  ))}
                </ul>
              </div>

              <div className="personalized-tips">
                <h3>Personalized Tips for You:</h3>
                <ul className="tip-list">
                  {personalizedTips.map((tip, index) => (
                    <li key={index} className="tip-item">
                      <span className="tip-bullet">•</span> {tip}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="insights">
                <h3>Insights:</h3>
                <div className="insight-item">
                  <span>Caffeine Level:</span>
                  <span>{resultsData.insights.caffeine_intake_level}</span>
                </div>
                {resultsData.insights.high_caffeine_detected && (
                  <div className="insight-item">
                    <span className="warning-badge">⚠️ High caffeine consumption detected</span>
                  </div>
                )}
                <div className="insight-item">
                  <span>Risk Factors Identified:</span>
                  <span>{resultsData.insights.risk_factors_identified}</span>
                </div>
              </div>

              <div className="button-group button-group-center">
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setCurrentStep(1);
                    setPredictions(null);
                    setLastPrediction(null);
                    setFormData({
                      user_id: userId,
                      age: userProfile?.age || '',
                      gender: userProfile?.gender || '',
                      drinks: [],
                      sleep_hours: '',
                      mood_rating: '',
                      stress_level: '',
                      smoking_habits: '',
                      drinking_habits: '',
                      social_interaction_level: '',
                      screen_time: '',
                      physical_activity: '',
                      diet_quality: '',
                      work_study_hours: '',
                      employment_status: '',
                      chronic_health_issues: ''
                    });
                  }}
                >
                  Take Another Assessment
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MentalHealthPredictionForm;