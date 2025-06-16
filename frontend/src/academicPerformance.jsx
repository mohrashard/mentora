import React, { useState, useEffect } from 'react';
import Sidebar from "./components/Sidebar";
import { 
  User, 
  BookOpen, 
  Globe, 
  Smartphone, 
  Moon, 
  Heart, 
  MessageSquare,
  Activity,
  Clock,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Shield,
  Target,
  Lightbulb
} from 'lucide-react';
import './SocialMediaPredictor.css';

const SOCIAL_MEDIA_STORAGE_KEY = 'social_media_last_prediction';

// Get today's date string in YYYY-MM-DD format
const getTodayDateString = () => {
  const today = new Date();
  return today.getFullYear() + '-' + 
         String(today.getMonth() + 1).padStart(2, '0') + '-' + 
         String(today.getDate()).padStart(2, '0');
};

// Get tomorrow's date string in YYYY-MM-DD format
const getTomorrowDateString = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.getFullYear() + '-' + 
         String(tomorrow.getMonth() + 1).padStart(2, '0') + '-' + 
         String(tomorrow.getDate()).padStart(2, '0');
};

// Check if it's past midnight (new day)
const isNewDay = (lastSubmissionDate) => {
  const today = getTodayDateString();
  return lastSubmissionDate !== today;
};

const SocialMediaPredictor = () => {
  const [userId, setUserId] = useState('user_123');
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState({
    age: '',
    gender: '',
    academic_level: '',
    country: '',
    avg_daily_usage_hours: '',
    most_used_platform: '',
    sleep_hours_per_night: '',
    mental_health_score: '',
    relationship_status: '',
    conflicts_over_social_media: ''
  });
  const [errors, setErrors] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [predictionResult, setPredictionResult] = useState(null);
  const [hasSubmittedToday, setHasSubmittedToday] = useState(false);
  const [todaysPrediction, setTodaysPrediction] = useState(null);
  const [nextAvailableDate, setNextAvailableDate] = useState('');
  const [animationKey, setAnimationKey] = useState(0);

  useEffect(() => {
    const storedUserId = localStorage.getItem('user_id') || 'user_123';
    setUserId(storedUserId);
    checkPredictionLock(storedUserId);
    
    // Check every minute if it's a new day
    const interval = setInterval(() => {
      checkPredictionLock(storedUserId);
    }, 60000); // Check every minute

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    setAnimationKey(prev => prev + 1);
  }, [currentStep]);

  const checkPredictionLock = async (userId) => {
    try {
      const todayStr = getTodayDateString();
      const tomorrowStr = getTomorrowDateString();
      
      // Check local storage first
      const localPrediction = localStorage.getItem(`${SOCIAL_MEDIA_STORAGE_KEY}_${userId}`);
      if (localPrediction) {
        const parsed = JSON.parse(localPrediction);
        const lastSubmissionDate = parsed.submissionDate;
        
        // If it's a new day, allow new prediction
        if (isNewDay(lastSubmissionDate)) {
          setHasSubmittedToday(false);
          setTodaysPrediction(null);
          setNextAvailableDate('');
          return;
        }
        
        // If submitted today, show locked state
        if (lastSubmissionDate === todayStr) {
          setHasSubmittedToday(true);
          setTodaysPrediction(parsed);
          setNextAvailableDate(tomorrowStr);
          return;
        }
      }

      // Try to fetch from server
      try {
        const response = await fetch(`http://localhost:5004/get_today_prediction?user_id=${userId}`);
        if (response.ok) {
          const data = await response.json();
          const serverDate = new Date(data.timestamp).toISOString().split('T')[0];
          
          // Check if server data is from today
          if (serverDate === todayStr) {
            setTodaysPrediction(data);
            setHasSubmittedToday(true);
            setNextAvailableDate(tomorrowStr);
            
            // Update localStorage with proper date
            localStorage.setItem(
              `${SOCIAL_MEDIA_STORAGE_KEY}_${userId}`, 
              JSON.stringify({
                ...data,
                submissionDate: todayStr
              })
            );
          } else {
            // Server data is old, allow new prediction
            setHasSubmittedToday(false);
            setTodaysPrediction(null);
            setNextAvailableDate('');
          }
        } else {
          // No server data, allow new prediction
          setHasSubmittedToday(false);
          setTodaysPrediction(null);
          setNextAvailableDate('');
        }
      } catch (error) {
        console.error('Failed to fetch today prediction:', error);
        // On network error, allow new prediction
        setHasSubmittedToday(false);
        setTodaysPrediction(null);
        setNextAvailableDate('');
      }
    } catch (error) {
      console.error('Error checking prediction status:', error);
      // On error, allow new prediction
      setHasSubmittedToday(false);
      setTodaysPrediction(null);
      setNextAvailableDate('');
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};
    
    switch(step) {
      case 1:
        if (!formData.age || formData.age < 1 || formData.age > 120) 
          newErrors.age = 'Age must be between 1 and 120';
        if (!formData.gender) 
          newErrors.gender = 'Please select your gender';
        if (!formData.academic_level) 
          newErrors.academic_level = 'Please select academic level';
        if (!formData.country) 
          newErrors.country = 'Please enter your country';
        break;
        
      case 2:
        if (!formData.avg_daily_usage_hours || formData.avg_daily_usage_hours < 0 || formData.avg_daily_usage_hours > 24) 
          newErrors.avg_daily_usage_hours = 'Must be between 0-24 hours';
        if (!formData.most_used_platform) 
          newErrors.most_used_platform = 'Please select a platform';
        break;
        
      case 3:
        if (!formData.sleep_hours_per_night || formData.sleep_hours_per_night < 0 || formData.sleep_hours_per_night > 24) 
          newErrors.sleep_hours_per_night = 'Must be between 0-24 hours';
        if (!formData.mental_health_score || formData.mental_health_score < 1 || formData.mental_health_score > 10) 
          newErrors.mental_health_score = 'Rate between 1-10';
        if (!formData.relationship_status) 
          newErrors.relationship_status = 'Please select status';
        if (!formData.conflicts_over_social_media || formData.conflicts_over_social_media < 0 || formData.conflicts_over_social_media > 10) 
          newErrors.conflicts_over_social_media = 'Rate between 0-10';
        break;
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (hasSubmittedToday) return;
    
    if (!validateStep(3)) return;

    try {
      setIsLoading(true);
      const payload = {
        user_id: userId,
        ...formData,
        age: Number(formData.age),
        avg_daily_usage_hours: Number(formData.avg_daily_usage_hours),
        sleep_hours_per_night: Number(formData.sleep_hours_per_night),
        mental_health_score: Number(formData.mental_health_score),
        conflicts_over_social_media: Number(formData.conflicts_over_social_media)
      };

      const response = await fetch('http://localhost:5004/predictacademicperformance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const data = await response.json();
      if (response.ok) {
        const todayStr = getTodayDateString();
        const resultWithDate = {
          ...data,
          timestamp: new Date().toISOString(),
          submissionDate: todayStr
        };
        
        setPredictionResult(resultWithDate);
        setHasSubmittedToday(true);
        setTodaysPrediction(resultWithDate);
        
        // Store in localStorage with submission date
        localStorage.setItem(
          `${SOCIAL_MEDIA_STORAGE_KEY}_${userId}`, 
          JSON.stringify(resultWithDate)
        );
        
        setNextAvailableDate(getTomorrowDateString());
      } else {
        if (data.errors && data.error === 'One or more input values are not recognized by the model') {
          setErrors({ submit: 'Invalid selection. Please check your input values.' });
        } else {
          setErrors({ submit: data.message || 'Prediction failed. Please try again.' });
        }
      }
    } catch (error) {
      setErrors({ submit: 'Network error. Please check your connection.' });
    } finally {
      setIsLoading(false);
    }
  };

  const getStepIcon = (step) => {
    switch(step) {
      case 1: return <User size={24} />;
      case 2: return <Smartphone size={24} />;
      case 3: return <Activity size={24} />;
      default: return <User size={24} />;
    }
  };

  const getStepTitle = (step) => {
    switch(step) {
      case 1: return "Personal Information";
      case 2: return "Social Media Usage";
      case 3: return "Lifestyle & Wellbeing";
      default: return "Personal Information";
    }
  };

  const getAddictionLevel = (score) => {
    if (score >= 7) return { level: 'High Risk', color: 'danger', icon: <AlertCircle size={20} /> };
    if (score >= 4) return { level: 'Moderate Risk', color: 'warning', icon: <Target size={20} /> };
    return { level: 'Low Risk', color: 'success', icon: <Shield size={20} /> };
  };

  const formatNextAvailableTime = () => {
    if (!nextAvailableDate) return '';
    const tomorrow = new Date(nextAvailableDate);
    return tomorrow.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    }) + ' at 12:00 AM';
  };

  if (hasSubmittedToday) {
    return (
      <div className="app-layout">
        <Sidebar />
        <div className="main-content">
          <div className="predictor-container">
            <div className="predictor-content">
              <div className="lock-notice animate-fade-in">
                <div className="lock-icon">
                  <Clock size={48} />
                </div>
                <h2 className="lock-title">Assessment Complete</h2>
                <p className="lock-message">
                  You've already completed today's social media impact assessment.
                </p>
                <p className="next-assessment-time">
                  Next assessment available: {formatNextAvailableTime()}
                </p>
              </div>

              {todaysPrediction && (
                <div className="results-display animate-slide-up">
                  <h2 className="results-title">
                    <TrendingUp size={24} />
                    Your Latest Assessment Results
                  </h2>
                  
                  <div className="results-grid">
                    <div className="result-card academic-impact">
                      <div className="result-header">
                        <BookOpen size={20} />
                        <span>Academic Impact</span>
                      </div>
                      <div className={`result-value ${todaysPrediction.results.affects_academic_performance === 'Yes' ? 'warning' : 'success'}`}>
                        {todaysPrediction.results.affects_academic_performance === 'Yes' 
                          ? 'Significant Impact' : 'No Significant Impact'}
                      </div>
                    </div>

                    <div className="result-card addiction-score">
                      <div className="result-header">
                        <Heart size={20} />
                        <span>Addiction Risk</span>
                      </div>
                      <div className="result-value">
                        <span className={`score ${getAddictionLevel(todaysPrediction.results.addiction_score).color}`}>
                          {todaysPrediction.results.addiction_score}/10
                        </span>
                        <span className={`level ${getAddictionLevel(todaysPrediction.results.addiction_score).color}`}>
                          {getAddictionLevel(todaysPrediction.results.addiction_score).icon}
                          {getAddictionLevel(todaysPrediction.results.addiction_score).level}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="personalized-tips">
                    <h3>
                      <Lightbulb size={20} />
                      Personalized Recommendations
                    </h3>
                    <div className="tips-grid">
                      {todaysPrediction.personalized_tips.map((tip, index) => (
                        <div key={index} className="tip-card animate-slide-up" style={{animationDelay: `${index * 0.1}s`}}>
                          <div className="tip-content">{tip}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="predictor-container">
          <div className="predictor-content">
            <div className="predictor-header animate-fade-in">
              <h1 className="main-title">Social Media Impact Assessment</h1>
              <p className="main-subtitle">
                Discover how social media affects your academic performance and wellbeing
              </p>
            </div>

            <div className="progress-section animate-slide-down">
              <div className="progress-info">
                <span className="step-indicator">Step {currentStep} of 3</span>
                <span className="step-name">{getStepTitle(currentStep)}</span>
              </div>
              <div className="progress-bar">
                <div 
                  className="progress-fill" 
                  style={{ width: `${(currentStep / 3) * 100}%` }}
                />
              </div>
            </div>

            {errors.submit && (
              <div className="error-banner animate-shake">
                <AlertCircle size={20} />
                {errors.submit}
              </div>
            )}

            <div className="form-container">
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <div className="step-content animate-slide-in" key={`step-1-${animationKey}`}>
                  <div className="step-header">
                    <div className="step-icon">{getStepIcon(1)}</div>
                    <h2>Tell us about yourself</h2>
                    <p>We need some basic information to personalize your assessment</p>
                  </div>
                  
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="age">
                        <User size={16} />
                        Age
                      </label>
                      <input
                        id="age"
                        type="number"
                        name="age"
                        value={formData.age}
                        onChange={handleInputChange}
                        min="1"
                        max="120"
                        placeholder="Enter your age"
                        className={errors.age ? 'error' : ''}
                      />
                      {errors.age && <div className="error-text">{errors.age}</div>}
                      <div className="input-hint">Must be between 1-120 years</div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="gender">
                        <User size={16} />
                        Gender
                      </label>
                      <select
                        id="gender"
                        name="gender"
                        value={formData.gender}
                        onChange={handleInputChange}
                        className={errors.gender ? 'error' : ''}
                      >
                        <option value="">Select Gender</option>
                        <option value="Male">Male</option>
                        <option value="Female">Female</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.gender && <div className="error-text">{errors.gender}</div>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="academic_level">
                        <BookOpen size={16} />
                        Academic Level
                      </label>
                      <select
                        id="academic_level"
                        name="academic_level"
                        value={formData.academic_level}
                        onChange={handleInputChange}
                        className={errors.academic_level ? 'error' : ''}
                      >
                        <option value="">Select Level</option>
                        <option value="High School">High School</option>
                        <option value="Undergraduate">Undergraduate</option>
                        <option value="Graduate">Graduate</option>
                        <option value="Postgraduate">Postgraduate</option>
                      </select>
                      {errors.academic_level && <div className="error-text">{errors.academic_level}</div>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="country">
                        <Globe size={16} />
                        Country
                      </label>
                      <input
                        id="country"
                        type="text"
                        name="country"
                        value={formData.country}
                        onChange={handleInputChange}
                        placeholder="Enter your country"
                        className={errors.country ? 'error' : ''}
                      />
                      {errors.country && <div className="error-text">{errors.country}</div>}
                      <div className="input-hint">Where you currently study</div>
                    </div>
                  </div>

                  <div className="button-group">
                    <button className="btn btn-primary" onClick={handleNext}>
                      Continue
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 2: Social Media Usage */}
              {currentStep === 2 && (
                <div className="step-content animate-slide-in" key={`step-2-${animationKey}`}>
                  <div className="step-header">
                    <div className="step-icon">{getStepIcon(2)}</div>
                    <h2>Your social media habits</h2>
                    <p>Help us understand your digital lifestyle</p>
                  </div>
                  
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="avg_daily_usage_hours">
                        <Clock size={16} />
                        Daily Usage (hours)
                      </label>
                      <input
                        id="avg_daily_usage_hours"
                        type="number"
                        name="avg_daily_usage_hours"
                        value={formData.avg_daily_usage_hours}
                        onChange={handleInputChange}
                        min="0"
                        max="24"
                        step="0.1"
                        placeholder="e.g., 3.5"
                        className={errors.avg_daily_usage_hours ? 'error' : ''}
                      />
                      {errors.avg_daily_usage_hours && <div className="error-text">{errors.avg_daily_usage_hours}</div>}
                      <div className="input-hint">Total time spent on social media daily</div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="most_used_platform">
                        <Smartphone size={16} />
                        Primary Platform
                      </label>
                      <select
                        id="most_used_platform"
                        name="most_used_platform"
                        value={formData.most_used_platform}
                        onChange={handleInputChange}
                        className={errors.most_used_platform ? 'error' : ''}
                      >
                        <option value="">Select Platform</option>
                        <option value="Instagram">Instagram</option>
                        <option value="Facebook">Facebook</option>
                        <option value="TikTok">TikTok</option>
                        <option value="Twitter">Twitter</option>
                        <option value="Snapchat">Snapchat</option>
                        <option value="YouTube">YouTube</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Other">Other</option>
                      </select>
                      {errors.most_used_platform && <div className="error-text">{errors.most_used_platform}</div>}
                      <div className="input-hint">Your most frequently used platform</div>
                    </div>
                  </div>

                  <div className="button-group">
                    <button className="btn btn-outline" onClick={handleBack}>
                      <ChevronLeft size={20} />
                      Back
                    </button>
                    <button className="btn btn-primary" onClick={handleNext}>
                      Continue
                      <ChevronRight size={20} />
                    </button>
                  </div>
                </div>
              )}

              {/* Step 3: Lifestyle Factors */}
              {currentStep === 3 && !predictionResult && (
                <div className="step-content animate-slide-in" key={`step-3-${animationKey}`}>
                  <div className="step-header">
                    <div className="step-icon">{getStepIcon(3)}</div>
                    <h2>Lifestyle & wellbeing</h2>
                    <p>Final questions about your health and relationships</p>
                  </div>
                  
                  <div className="form-grid">
                    <div className="form-group">
                      <label htmlFor="sleep_hours_per_night">
                        <Moon size={16} />
                        Sleep Hours
                      </label>
                      <input
                        id="sleep_hours_per_night"
                        type="number"
                        name="sleep_hours_per_night"
                        value={formData.sleep_hours_per_night}
                        onChange={handleInputChange}
                        min="0"
                        max="24"
                        step="0.5"
                        placeholder="e.g., 7.5"
                        className={errors.sleep_hours_per_night ? 'error' : ''}
                      />
                      {errors.sleep_hours_per_night && <div className="error-text">{errors.sleep_hours_per_night}</div>}
                      <div className="input-hint">Average nightly sleep duration</div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="mental_health_score">
                        <Heart size={16} />
                        Mental Health (1-10)
                      </label>
                      <input
                        id="mental_health_score"
                        type="number"
                        name="mental_health_score"
                        value={formData.mental_health_score}
                        onChange={handleInputChange}
                        min="1"
                        max="10"
                        placeholder="Rate 1-10"
                        className={errors.mental_health_score ? 'error' : ''}
                      />
                      {errors.mental_health_score && <div className="error-text">{errors.mental_health_score}</div>}
                      <div className="input-hint">1 = Poor, 10 = Excellent</div>
                    </div>

                    <div className="form-group">
                      <label htmlFor="relationship_status">
                        <User size={16} />
                        Relationship Status
                      </label>
                      <select
                        id="relationship_status"
                        name="relationship_status"
                        value={formData.relationship_status}
                        onChange={handleInputChange}
                        className={errors.relationship_status ? 'error' : ''}
                      >
                        <option value="">Select Status</option>
                        <option value="Single">Single</option>
                        <option value="In a relationship">In a relationship</option>
                        <option value="Married">Married</option>
                        <option value="Divorced">Divorced</option>
                        <option value="Prefer not to say">Prefer not to say</option>
                      </select>
                      {errors.relationship_status && <div className="error-text">{errors.relationship_status}</div>}
                    </div>

                    <div className="form-group">
                      <label htmlFor="conflicts_over_social_media">
                        <MessageSquare size={16} />
                        Social Media Conflicts (0-10)
                      </label>
                      <input
                        id="conflicts_over_social_media"
                        type="number"
                        name="conflicts_over_social_media"
                        value={formData.conflicts_over_social_media}
                        onChange={handleInputChange}
                        min="0"
                        max="10"
                        placeholder="Rate 0-10"
                        className={errors.conflicts_over_social_media ? 'error' : ''}
                      />
                      {errors.conflicts_over_social_media && (
                        <div className="error-text">{errors.conflicts_over_social_media}</div>
                      )}
                      <div className="input-hint">0 = Never, 10 = Frequent conflicts</div>
                    </div>
                  </div>

                  <div className="button-group">
                    <button className="btn btn-outline" onClick={handleBack}>
                      <ChevronLeft size={20} />
                      Back
                    </button>
                    <button 
                      className="btn btn-primary btn-submit" 
                      onClick={handleSubmit}
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <>
                          <div className="loading-spinner"></div>
                          Analyzing...
                        </>
                      ) : (
                        <>
                          Get My Assessment
                          <Target size={20} />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* Results Display */}
              {predictionResult && (
                <div className="results-container animate-fade-in">
                  <div className="results-header">
                    <div className="success-icon">
                      <CheckCircle size={48} />
                    </div>
                    <h2>Assessment Complete!</h2>
                    <p>Your personalized social media impact analysis is ready</p>
                  </div>

                  <div className="results-grid">
                    <div className="result-card academic-impact animate-slide-up">
                      <div className="result-header">
                        <BookOpen size={24} />
                        <span>Academic Impact</span>
                      </div>
                      <div className={`result-value ${predictionResult.results.affects_academic_performance === 'Yes' ? 'warning' : 'success'}`}>
                        {predictionResult.results.affects_academic_performance === 'Yes' 
                          ? 'Significant Impact' : 'No Significant Impact'}
                      </div>
                      <p className="result-description">
                        {predictionResult.interpretation.academic_impact}
                      </p>
                    </div>

                    <div className="result-card addiction-score animate-slide-up" style={{animationDelay: '0.1s'}}>
                      <div className="result-header">
                        <Heart size={24} />
                        <span>Addiction Risk Level</span>
                      </div>
                      <div className="result-value">
                        <span className={`score ${getAddictionLevel(predictionResult.results.addiction_score).color}`}>
                          {predictionResult.results.addiction_score}/10
                        </span>
                        <span className={`level ${getAddictionLevel(predictionResult.results.addiction_score).color}`}>
                          {getAddictionLevel(predictionResult.results.addiction_score).icon}
                          {getAddictionLevel(predictionResult.results.addiction_score).level}
                        </span>
                      </div>
                      <p className="result-description">
                        {predictionResult.interpretation.addiction_level}
                      </p>
                    </div>
                  </div>

                  <div className="personalized-tips animate-slide-up" style={{animationDelay: '0.2s'}}>
                    <h3>
                      <Lightbulb size={24} />
                      Your Personalized Recommendations
                    </h3>
                    <div className="tips-grid">
                      {predictionResult.personalized_tips.map((tip, index) => (
                        <div key={index} className="tip-card animate-slide-up" style={{animationDelay: `${0.3 + index * 0.1}s`}}>
                          <div className="tip-content">{tip}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="next-assessment-info animate-fade-in" style={{animationDelay: '0.5s'}}>
                    <Clock size={20} />
                    <p>You can take your next assessment tomorrow after midnight</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SocialMediaPredictor;