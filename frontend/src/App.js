import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import RegistrationForm from './register';
import LoginForm from './login';
import Dashboard from './dashboard';
import Landing from './landing';
import StressPrediction from './stress';
import MentalHealthPredictionForm from './mentalHealth';
import MobileUsageAnalyzer from './mobileAddiction';
import SocialMediaImpactPredictor from './academicPerformance';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<RegistrationForm />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/stress" element={<StressPrediction />} />
          <Route path="/mentalHealth" element={<MentalHealthPredictionForm />} />
          <Route path="/mobileAddiction" element={<MobileUsageAnalyzer />} />
          <Route path="/academicPerformance" element={<SocialMediaImpactPredictor/>}/>
        </Routes>
      </div>
    </Router>
  );
}

export default App;
