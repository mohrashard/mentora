#!/usr/bin/env python3
"""
Mobile Addiction Checker
A script to predict mobile addiction based on lifestyle data
"""

import joblib
import numpy as np
import pandas as pd
import os
from typing import Dict, List, Tuple

class MobileAddictionChecker:
    def __init__(self, models_dir: str = 'mobile_models'):
        """Initialize the addiction checker with pre-trained models"""
        self.models_dir = models_dir
        self.model = None
        self.scaler = None
        self.label_encoder = None
        self.feature_columns = None
        self.metadata = None
        self.load_models()
    
    def load_models(self):
        """Load the pre-trained models and preprocessing objects"""
        try:
            # Load model metadata
            self.metadata = joblib.load(os.path.join(self.models_dir, 'model_metadata.joblib'))
            
            # Load the best model
            self.model = joblib.load(os.path.join(self.models_dir, 'best_model.joblib'))
            
            # Load feature columns
            self.feature_columns = joblib.load(os.path.join(self.models_dir, 'feature_columns.joblib'))
            
            # Load label encoder
            self.label_encoder = joblib.load(os.path.join(self.models_dir, 'label_encoder.joblib'))
            
            # Load scaler if required
            if self.metadata['requires_scaling']:
                self.scaler = joblib.load(os.path.join(self.models_dir, 'scaler.joblib'))
            
            print(f"✅ Successfully loaded {self.metadata['best_model_name']} model")
            print(f"📊 Model accuracy: {self.metadata['best_accuracy']:.2%}")
            print("-" * 50)
            
        except FileNotFoundError as e:
            print(f"❌ Error: Could not find model files in '{self.models_dir}' directory")
            print("Please ensure you have run the training script first to generate the models.")
            raise e
    
    def get_user_input(self) -> Dict[str, float]:
        """Collect user input for all required features"""
        print("📱 Mobile Addiction Assessment")
        print("Please provide the following information about your mobile usage:\n")
        
        user_data = {}
        
        # Feature descriptions and input prompts
        feature_prompts = {
            'daily_screen_time': {
                'prompt': "Daily screen time (hours per day)",
                'example': "e.g., 6.5 for 6 hours 30 minutes",
                'min_val': 0, 'max_val': 24
            },
            'app_sessions': {
                'prompt': "Number of app sessions per day",
                'example': "e.g., 80 (times you open apps)",
                'min_val': 0, 'max_val': 500
            },
            'social_media_usage': {
                'prompt': "Social media usage (hours per day)",
                'example': "e.g., 4.0 for 4 hours",
                'min_val': 0, 'max_val': 24
            },
            'gaming_time': {
                'prompt': "Gaming time (hours per day)",
                'example': "e.g., 2.5 for 2 hours 30 minutes",
                'min_val': 0, 'max_val': 24
            },
            'notifications': {
                'prompt': "Number of notifications per day",
                'example': "e.g., 150",
                'min_val': 0, 'max_val': 1000
            },
            'night_usage': {
                'prompt': "Night usage (hours between 10 PM - 6 AM)",
                'example': "e.g., 2.0 for 2 hours",
                'min_val': 0, 'max_val': 8
            },
            'age': {
                'prompt': "Your age (years)",
                'example': "e.g., 25",
                'min_val': 10, 'max_val': 100
            },
            'work_study_hours': {
                'prompt': "Work/study hours per day",
                'example': "e.g., 8.0 for 8 hours",
                'min_val': 0, 'max_val': 24
            },
            'stress_level': {
                'prompt': "Stress level (1-10 scale)",
                'example': "1 = very low stress, 10 = very high stress",
                'min_val': 1, 'max_val': 10
            },
            'apps_installed': {
                'prompt': "Number of apps installed on your phone",
                'example': "e.g., 45",
                'min_val': 1, 'max_val': 500
            }
        }
        
        for feature in self.feature_columns:
            while True:
                try:
                    info = feature_prompts[feature]
                    print(f"📊 {info['prompt']}")
                    print(f"   {info['example']}")
                    
                    value = float(input(f"   Enter value: "))
                    
                    # Validate input range
                    if value < info['min_val'] or value > info['max_val']:
                        print(f"   ⚠️  Please enter a value between {info['min_val']} and {info['max_val']}")
                        continue
                    
                    user_data[feature] = value
                    break
                    
                except ValueError:
                    print("   ⚠️  Please enter a valid number")
                except KeyboardInterrupt:
                    print("\n\n👋 Assessment cancelled by user")
                    exit()
        
        return user_data
    
    def predict_addiction(self, user_data: Dict[str, float]) -> Tuple[str, float, Dict]:
        """Predict addiction status and return detailed results"""
        # Convert to DataFrame
        df = pd.DataFrame([user_data])
        
        # Ensure correct feature order
        X = df[self.feature_columns]
        
        # Apply scaling if required
        if self.metadata['requires_scaling']:
            X_scaled = self.scaler.transform(X)
            prediction = self.model.predict(X_scaled)
        else:
            prediction = self.model.predict(X)
        
        # Decode prediction
        prediction_label = self.label_encoder.inverse_transform(prediction)[0]
        
        # Handle probability prediction based on model capabilities
        if hasattr(self.model, "predict_proba"):
            if self.metadata['requires_scaling']:
                prediction_proba = self.model.predict_proba(X_scaled)[0]
            else:
                prediction_proba = self.model.predict_proba(X)[0]
            
            prob_dict = {
                class_name: prob 
                for class_name, prob in zip(self.label_encoder.classes_, prediction_proba)
            }
            confidence = max(prediction_proba)
        else:
            # For models without predict_proba (like SVM without probability=True)
            prob_dict = {
                class_name: 1.0 if class_name == prediction_label else 0.0
                for class_name in self.label_encoder.classes_
            }
            confidence = 1.0
        
        return prediction_label, confidence, prob_dict
    
    def analyze_risk_factors(self, user_data: Dict[str, float]) -> List[str]:
        """Analyze user data and provide insights about risk factors"""
        insights = []
        
        # Define thresholds based on typical addiction patterns
        if user_data['daily_screen_time'] > 8:
            insights.append(f"⚠️  High daily screen time ({user_data['daily_screen_time']:.1f} hours)")
        
        if user_data['social_media_usage'] > 4:
            insights.append(f"⚠️  Excessive social media usage ({user_data['social_media_usage']:.1f} hours/day)")
        
        if user_data['night_usage'] > 2:
            insights.append(f"⚠️  High night usage ({user_data['night_usage']:.1f} hours between 10 PM-6 AM)")
        
        if user_data['app_sessions'] > 100:
            insights.append(f"⚠️  Very frequent app usage ({user_data['app_sessions']:.0f} sessions/day)")
        
        if user_data['notifications'] > 200:
            insights.append(f"⚠️  High notification volume ({user_data['notifications']:.0f}/day)")
        
        if user_data['stress_level'] > 7:
            insights.append(f"⚠️  High stress level ({user_data['stress_level']:.0f}/10)")
        
        if user_data['gaming_time'] > 4:
            insights.append(f"⚠️  Excessive gaming time ({user_data['gaming_time']:.1f} hours/day)")
        
        return insights
    
    def provide_recommendations(self, prediction: str, user_data: Dict[str, float]) -> List[str]:
        """Provide personalized recommendations based on the assessment"""
        recommendations = []
        
        if prediction == 'addicted':
            recommendations.extend([
                "📱 Consider using app time limits and focus modes",
                "⏰ Set specific times for phone-free activities",
                "🌙 Avoid phone usage 1 hour before bedtime",
                "🔕 Reduce non-essential notifications",
                "🏃 Engage in more physical activities and hobbies"
            ])
        
        # Specific recommendations based on usage patterns
        if user_data['social_media_usage'] > 3:
            recommendations.append("📊 Consider reducing social media time gradually")
        
        if user_data['night_usage'] > 1:
            recommendations.append("🌙 Try using 'Do Not Disturb' mode after 9 PM")
        
        if user_data['stress_level'] > 6:
            recommendations.append("🧘 Practice stress management techniques like meditation")
        
        if user_data['gaming_time'] > 2:
            recommendations.append("🎮 Set daily gaming time limits")
        
        return recommendations
    
    def display_results(self, prediction: str, confidence: float, probabilities: Dict, 
                       user_data: Dict[str, float]):
        """Display comprehensive results to the user"""
        print("\n" + "=" * 60)
        print("📱 MOBILE ADDICTION ASSESSMENT RESULTS")
        print("=" * 60)
        
        # Main prediction
        status_emoji = "🔴" if prediction == 'addicted' else "🟢"
        print(f"\n{status_emoji} PREDICTION: {prediction.upper()}")
        print(f"🎯 Confidence: {confidence:.1%}")
        
        # Probability breakdown
        print(f"\n📊 PROBABILITY BREAKDOWN:")
        for class_name, prob in probabilities.items():
            bar_length = int(prob * 20)  # Scale to 20 chars
            bar = "█" * bar_length + "░" * (20 - bar_length)
            print(f"   {class_name:15} {bar} {prob:.1%}")
        
        # Risk factor analysis
        risk_factors = self.analyze_risk_factors(user_data)
        if risk_factors:
            print(f"\n⚠️  RISK FACTORS IDENTIFIED:")
            for factor in risk_factors:
                print(f"   {factor}")
        else:
            print(f"\n✅ No major risk factors identified")
        
        # Recommendations
        recommendations = self.provide_recommendations(prediction, user_data)
        if recommendations:
            print(f"\n💡 RECOMMENDATIONS:")
            for i, rec in enumerate(recommendations, 1):
                print(f"   {i}. {rec}")
        
        # Summary statistics
        print(f"\n📈 YOUR USAGE SUMMARY:")
        print(f"   Daily screen time: {user_data['daily_screen_time']:.1f} hours")
        print(f"   Social media: {user_data['social_media_usage']:.1f} hours")
        print(f"   Gaming: {user_data['gaming_time']:.1f} hours")
        print(f"   Night usage: {user_data['night_usage']:.1f} hours")
        print(f"   App sessions: {user_data['app_sessions']:.0f} per day")
        print(f"   Stress level: {user_data['stress_level']:.0f}/10")
        
        print("\n" + "=" * 60)

def main():
    """Main function to run the mobile addiction checker"""
    try:
        # Initialize the checker
        checker = MobileAddictionChecker()
        
        # Get user input
        user_data = checker.get_user_input()
        
        # Make prediction
        prediction, confidence, probabilities = checker.predict_addiction(user_data)
        
        # Display results
        checker.display_results(prediction, confidence, probabilities, user_data)
        
        # Ask if user wants to save results
        print("\n💾 Would you like to save these results? (y/n): ", end="")
        save_choice = input().lower().strip()
        
        if save_choice == 'y':
            filename = f"addiction_assessment_{pd.Timestamp.now().strftime('%Y%m%d_%H%M%S')}.txt"
            with open(filename, 'w') as f:
                f.write("Mobile Addiction Assessment Results\n")
                f.write("=" * 40 + "\n")
                f.write(f"Prediction: {prediction}\n")
                f.write(f"Confidence: {confidence:.1%}\n")
                f.write(f"Assessment Date: {pd.Timestamp.now()}\n\n")
                f.write("Input Data:\n")
                for feature, value in user_data.items():
                    f.write(f"  {feature}: {value}\n")
            print(f"✅ Results saved to {filename}")
        
    except KeyboardInterrupt:
        print("\n\n👋 Assessment interrupted by user")
    except Exception as e:
        print(f"\n❌ An error occurred: {str(e)}")
        print("Please ensure all model files are present and try again.")

if __name__ == "__main__":
    print("🚀 Starting Mobile Addiction Assessment Tool")
    print("Make sure you have run the training script first to generate the models.\n")
    main()