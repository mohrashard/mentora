import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import RegistrationForm from './register';
import LoginForm from './login';
import Dashboard from './dashboard';
import Landing from './landing';
import StressPrediction from './stress';
import MentalHealthPredictionForm from './mentalHealth';
import MobileUsageAnalyzer from './mobileAddiction';
import SocialMediaImpactPredictor from './academicPerformance';
import ProfilePage from './profile';
import './App.css';
import Unauthorized from './Unauthorized';


function PrivateRoute({ children }) {
  const userId = localStorage.getItem("user_id");
  return userId ? children : <Navigate to="/unauthorized" replace />;
}


function App() {
  return (
    <Router>
      <div className="App">
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/register" element={<RegistrationForm />} />
          <Route path="/login" element={<LoginForm />} />
          <Route path="/unauthorized" element={<Unauthorized />} />

    
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/stress" element={<PrivateRoute><StressPrediction /></PrivateRoute>} />
          <Route path="/mentalHealth" element={<PrivateRoute><MentalHealthPredictionForm /></PrivateRoute>} />
          <Route path="/mobileAddiction" element={<PrivateRoute><MobileUsageAnalyzer /></PrivateRoute>} />
          <Route path="/academicPerformance" element={<PrivateRoute><SocialMediaImpactPredictor /></PrivateRoute>} />
          <Route path="/profile" element={<PrivateRoute><ProfilePage /></PrivateRoute>} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
