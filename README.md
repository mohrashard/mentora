# 🌿 Mentora: AI-Powered Mental Wellness Platform

<div align="center">
  <img src="frontend/public/MentoraLogo.png" alt="Mentora Logo" width="250"/>
  
  [![Python](https://img.shields.io/badge/Python-3.8+-blue.svg)](https://www.python.org/)
  [![React](https://img.shields.io/badge/React-18.0+-61DAFB.svg)](https://reactjs.org/)
  [![Flask](https://img.shields.io/badge/Flask-2.0+-green.svg)](https://flask.palletsprojects.com/)
  [![License](https://img.shields.io/badge/License-Academic-orange.svg)](#license)
  [![MongoDB](https://img.shields.io/badge/MongoDB-4.4+-47A248.svg)](https://www.mongodb.com/)
</div>

---

## 🎯 Overview

**Mentora** is an advanced AI-powered mental wellness platform that leverages digital behavior analytics and lifestyle data to provide comprehensive mental health insights. Built for students and young professionals, it combines machine learning algorithms with intuitive web interfaces to deliver predictive analytics, personalized recommendations, and automated wellness monitoring.

### 🏆 Key Highlights
- **6 AI-Powered Predictive Models** for comprehensive mental health assessment
- **Real-time Dashboard Analytics** with interactive visualizations  
- **Automated Alert System** for early intervention
- **Intelligent Reporting** with personalized insights
- **Privacy-First Architecture** with enterprise-grade security

---

## 🔮 Core Features

### 🧠 AI-Powered Predictive Models
| Model | Description | Use Case |
|-------|-------------|----------|
| **Stress Level Predictor** | Analyzes lifestyle and digital behavior patterns to detect stress indicators | Preventive stress management |
| **Mental Health Classifier** | Comprehensive risk assessment (Healthy/At Risk) | Overall wellness monitoring |
| **Depression Level Detector** | Identifies severity of depressive symptoms | Early depression screening |
| **Anxiety Presence Identifier** | Flags early anxiety disorder signs | Anxiety disorder prevention |
| **Academic Impact Analyzer** | Measures social media's effect on academic performance | Student productivity optimization |
| **Mobile Addiction Predictor** | Detects unhealthy mobile dependency patterns | Digital wellness management |

### 📊 Analytics & Visualization
- **Unified Dashboard** - Centralized view of all wellness metrics
- **Interactive Charts** - Real-time trend analysis and pattern recognition  
- **Behavioral Insights** - Data-driven recommendations based on digital footprint
- **Progress Tracking** - Long-term wellness journey monitoring
- **Comparative Analysis** - Peer benchmarking and goal setting

### 🚨 Smart Notifications & Alerts
- **Threshold-Based Alerts** - Automatic notifications when wellness metrics exceed safe limits
- **Predictive Warnings** - Early intervention alerts based on behavior patterns
- **Daily Engagement Reminders** - Streak maintenance and motivation boosters
- **Weekly Wellness Reports** - Comprehensive PDF reports with actionable insights

### 📈 Automated Reporting System
- **Daily Reports** - Quick wellness snapshots and streak tracking
- **Weekly Analytics** - Comprehensive trend analysis with recommendations
- **Custom Scheduling** - Flexible report delivery via email


---

## 🛠️ Technology Stack

<div align="center">

| Layer             | Technologies                                                                 |
| ----------------- | ---------------------------------------------------------------------------- |
| **Frontend**      | React.js, JavaScript ES6+, HTML5, CSS3, Chart.js                             |
| **Backend**       | Flask, Python 3.8+, RESTful APIs, Flask Session Authentication               |
| **Database**      | MongoDB, Mongoose ODM                                                        |
| **ML/AI**         | Scikit-learn, Pandas, NumPy                                      |
| **Visualization** | Matplotlib, Seaborn, Plotly                                                  |
| **Development**   | Jupyter Notebooks, Git, GitHub                                               |
| **Security**      | Password hashing via Werkzeug (PBKDF2), CORS, Rate Limiting, Data Encryption |


</div>

---

## 📁 Project Architecture

```
MENTORA/
├── 🔧 backend/                          # Flask API & ML Services
│   ├── __pycache__/                     # Python cache files
│   ├── assets/                          # Backend assets
│   │   └── style.css                    # Styling assets
│   ├── mental_health_models/            # Trained mental health models
│   ├── mobile_models/                   # Mobile addiction models  
│   ├── stress_models/                   # Stress prediction models
│   ├── students_models/                 # Academic performance models
│   ├── academic.py                      # Academic impact predictor
│   ├── mental.py                        # Mental health classifier API
│   ├── mobile.py                        # Mobile addiction detector API
│   ├── register.py                      # User registration & auth API 
│   ├── report_generator.py              # Automated report generation
│   ├── stress.py                        # Stress level analyzer API
│   ├── requirements.txt                 # Backend dependencies
│   ├── test_academic.html               # Academic predictor test interface
│   ├── test_academic.py                 # Academic predictor test script
│   ├── test_mental.html                 # Mental health test interface
│   ├── test_mental.py                   # Mental health test script
│   ├── test_mobile.py                   # Mobile addiction test script
│   ├── test_register.html               # Registration test interface
│   ├── test_register.py                 # Registration test script
│   ├── test_report.html                 # Report generation test interface
│   ├── test_report.py                   # Report generation test script
│   └── test_stress.py                   # Stress predictor test script
│
├── 📊 data/                            # Training Datasets
│   ├── mental_health_dataset.csv        # Mental health indicators
│   ├── mobile_addiction.csv             # Mobile usage patterns
│   ├── Sleep_health_and_lifestyle_dataset.csv  # Sleep & lifestyle data
│   └── Students Social Media Addiction.csv     # Academic performance data
│
├── 🎨 frontend/                        # React Application
│   ├── node_modules/                    # Node.js dependencies
│   ├── public/                         # Static assets
│   │   ├── favicon.ico                  # App favicon
│   │   ├── index.html                   # Main HTML template
│   │   ├── logo192.png                  # App logo (192px)
│   │   ├── logo512.png                  # App logo (512px)
│   │   ├── manifest.json                # PWA manifest
│   │   ├── mentoraBrain.glb             # 3D brain model
│   │   ├── MentoraLogo.png             # Brand logo
│   │   └── robots.txt                   # SEO robots file
│   ├── src/
│   │   ├── components/                  # React components
│   │   │   ├── Sidebar.css             # Sidebar styling
│   │   │   ├── Sidebar.jsx             # Navigation sidebar
│   │   ├── academicPerformance.jsx # Academic predictor UI
│   │   ├── App.css                 # Main app styles
│   │   ├── App.js                  # Root component
│   │   ├── App.test.js             # App unit tests
│   │   ├── Dashboard.css           # Dashboard styling
│   │   ├── dashboard.jsx           # Main dashboard
│   │   ├── index.js                # React entry point
│   │   ├── Landing.css             # Landing page styles
│   │   ├── Landing.jsx             # Landing page component
│   │   ├── Login.css               # Login form styles
│   │   ├── LoginForm.jsx           # User login component
│   │   ├── logo.svg                # React logo
│   │   ├── mentalHealth.css        # Mental health predictor styles
│   │   ├── mentalHealth.jsx        # Mental health predictor
│   │   ├── mobileAddiction.css     # Mobile addiction styles
│   │   ├── mobileAddiction.jsx     # Mobile addiction predictor
│   │   ├── profile.jsx             # User profile component
│   │   ├── ProfilePage.css         # Profile page styles
│   │   ├── register.jsx            # Registration component
│   │   ├── RegistrationForm.jsx    # User registration form
│   │   ├── reportWebVitals.js      # Performance monitoring
│   │   ├── setupTests.js           # Test configuration
│   │   ├── SocialMediaPredictor.css # Social media predictor styles
│   │   ├── SocialMediaPredictor.jsx # Social media predictor
│   │   ├── stress.css              # Stress predictor styles
│   │   └── stress.jsx              # Stress level predictor
│   │   └── Unauthorized.js             # Unauthorized access handler
│   ├   ├── package-lock.json               # Locked dependency versions
│   ├   └── package.json                    # Node.js dependencies
│
├── 🔬 Research Notebooks               # Jupyter ML Research
│   ├── academicResults.ipynb           # Academic performance analysis
│   ├── mental.ipynb                    # Mental health model training
│   ├── mobile_addiction_model.ipynb    # Mobile addiction research
│   └── stressModel.ipynb               # Stress prediction modeling
│
├── 🧪 Testing Suite                    # Test Files & Interfaces
│   ├── test_academic.html              # Academic predictor test interface

```

---

## 🚀 Quick Start Guide

### Prerequisites
- **Python 3.8+** with pip
- **Node.js 16+** with npm
- **MongoDB 4.4+** (local or cloud)
- **Git** for version control

### 1️⃣ Clone Repository
```bash
git clone https://github.com/mohrashard/mentora.git
cd Mentora
```

### 2️⃣ Backend Setup
```bash
cd backend

# Create virtual environment
python -m venv mentora_env
source mentora_env/bin/activate  # Windows: mentora_env\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Configure environment variables (edit .env file)
# Add your MongoDB URI and other settings

# Start individual predictors (choose based on your needs)
python mental.py      # Mental health predictor
python stress.py      # Stress level predictor  
python mobile.py      # Mobile addiction predictor
python academic.py    # Academic performance predictor
```
✅ **Backend services running on various ports**

### 3️⃣ Frontend Setup
```bash
cd ../frontend

# Install dependencies
npm install

# Start development server
npm start
```
✅ **Frontend running at:** `http://localhost:3000`

### 4️⃣ Access Jupyter Notebooks (Research & Training)
```bash
# From project root directory
jupyter notebook

# Available notebooks:
# - academicResults.ipynb (Academic performance analysis)
# - mental.ipynb (Mental health model training)  
# - mobile_addiction_model.ipynb (Mobile addiction research)
# - stressModel.ipynb (Stress prediction modeling)
```
✅ **Jupyter running at:** `http://localhost:8888`

---

## 📊 Dataset Information

Mentora utilizes carefully curated public datasets from Kaggle:

| Dataset                     | Purpose                        | Features                     |
|-----------------------------|--------------------------------|------------------------------|
| Mental Health Dataset       | General wellness indicators    | Mood, sleep, stress levels   |
| Mobile Addiction Dataset    | Digital behavior patterns      | Screen time, app usage       |
| Sleep & Lifestyle Dataset   | Lifestyle impact analysis      | Sleep quality, exercise, diet|
| Student Social Media Dataset| Academic performance correlation| GPA, social media usage     |


**Data Privacy:** All datasets are anonymized and used in compliance with privacy regulations.

---

## 🔐 Security & Privacy

### 🛡️ Security Measures
- **Password Hashing** via Werkzeug (PBKDF2) for secure credential storage
- **Flask Session Authentication** for user login management
- **Rate Limiting** to prevent abuse
- **Input Validation** and sanitization
- **CORS Configuration** for secure cross-origin requests
- **Data Encryption** for sensitive information


### 🔒 Privacy Protection
- **Data Anonymization** before processing
- **Explicit User Consent** for data collection
- **Regular Security Audits** and updates

---

## 🧪 Development & Testing

### Running Tests
```bash
# Backend tests
pytest backend/tests/ -v

# Frontend tests  
cd frontend && npm test

# Integration tests
pytest tests/integration/ -v
```

### Model Training & Testing
```bash
# Train individual models (from project root)
python stress.py                    # Train stress prediction model
python mental.py                    # Train mental health classifier
python mobile.py                    # Train mobile addiction detector  
python academic.py                  # Train academic performance analyzer

# Or train from backend directory
cd backend
python stress.py
python mental.py
python mobile.py
python academic.py
```

### Production Build
```bash
# Frontend production build
cd frontend && npm run build

# Backend production setup
pip install gunicorn
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

---

## 📈 Performance Metrics

### Model Accuracy
| **Model**                 | **Algorithm Used**     | **Accuracy** | **CV Score**        | **Precision** | **Recall** | **F1-Score** |
|----------------------------|----------------------|-------------|-------------------|---------------|------------|--------------|
| 🟢 Stress Predictor        | Gradient Boosting     | 92.4%       | 0.9822 ± 0.0133   | 91.6%         | 92.3%      | 91.9%        |
| 🟡 Mental Health Classifier| Random Forest         | 91.5%       | 0.9150             | 90%           | 57%        | 59%          |
| 🟢 Depression Detector     | Gradient Boosting     | 99.4%       | 0.9943             | 98%           | 89%        | 93%          |
| 🟡 Anxiety Identifier      | Random Forest         | 91.6%       | 0.9160             | 71%           | 51%        | 50%          |
| 🟢 Academic Analyzer       | Random Forest         | 100%        | 1.0000 ± 0.0000    | 100%          | 100%       | 100%         |
| 🟢 Mobile Addiction        | SVM                   | 98.1%       | 0.9812             | 98%           | 98%        | 98%          |


**Summary of Model Performance:**

- **Highest Accuracy:** Academic Analyzer (Random Forest) – 100%  
- **Best Cross-Validation Score:** Stress Predictor (Gradient Boosting) – 0.9822 ± 0.0133  
- **Highest Precision:** Academic Analyzer (Random Forest) – 100%  
- **Highest Recall:** Academic Analyzer (Random Forest) – 100%  
- **Highest F1-Score:** Academic Analyzer (Random Forest) – 100%  

Other notable performers:  
- **Depression Detector (Gradient Boosting)** achieved very high accuracy (99.4%) and F1-Score (93%).  
- **Mobile Addiction Predictor (SVM)** achieved strong overall performance with 98.1% accuracy and balanced metrics.  
- **Mental Health Classifier** and **Anxiety Identifier** performed moderately, indicating potential for further optimization.


### System Performance
- **API Response Time:** < 200ms average
- **Dashboard Load Time:** < 3 seconds
- **Real-time Updates:** < 1 second latency
- **Report Generation:** < 30 seconds for weekly reports

---

## 🤝 Contributing

While this is primarily a solo academic project, contributions are welcome! Please read our [Contributing Guidelines](docs/CONTRIBUTING.md) before submitting pull requests.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 👨‍💻 Author & Acknowledgments

**Project Lead & Developer:** [Mohamed Rashard](https://github.com/mohrashard/)  
🎓 **Institution:** Cardiff Metropolitan University – BSC Software Engineering and Artificial Intelligence 
📅 **Academic Year:** 2025  
📧 **Contact:** mohrashard@gmail.com

### Acknowledgments
- Kaggle for providing high-quality datasets
- Open-source contributors for ML libraries
- ICBT faculty for academic guidance and support

---

## 📜 License & Disclaimer

### License
This project is developed for **academic and research purposes only**. All rights reserved.

### Important Disclaimer
⚠️ **Mentora is not a substitute for professional mental health care.** Always consult qualified healthcare professionals for mental health concerns. This platform is designed as a supplementary tool for wellness monitoring and should not be used for clinical diagnosis or treatment.

---



<div align="center">
  
**Built with ❤️ for mental wellness and powered by AI**

⭐ **Star this repository if you found it helpful!**

</div>