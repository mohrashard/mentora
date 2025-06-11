#!/usr/bin/env python3
"""
Interactive Social Media Impact Predictor - FIXED VERSION
Predicts addiction score and academic performance impact based on user input
"""

import numpy as np
import joblib
import os
import sys

# Color codes for better UI
class Colors:
    HEADER = '\033[95m'
    OKBLUE = '\033[94m'
    OKCYAN = '\033[96m'
    OKGREEN = '\033[92m'
    WARNING = '\033[93m'
    FAIL = '\033[91m'
    ENDC = '\033[0m'
    BOLD = '\033[1m'
    UNDERLINE = '\033[4m'

def print_colored(text, color):
    print(f"{color}{text}{Colors.ENDC}")

def print_header():
    print_colored("="*60, Colors.HEADER)
    print_colored("   📱 SOCIAL MEDIA IMPACT PREDICTOR 📱", Colors.HEADER)
    print_colored("="*60, Colors.HEADER)
    print()

def print_section(title):
    print_colored(f"\n{'='*20} {title} {'='*20}", Colors.OKBLUE)

def get_numeric_input(prompt, min_val=None, max_val=None, data_type=int):
    """Get numeric input with validation"""
    while True:
        try:
            value = data_type(input(f"{prompt}: "))
            if min_val is not None and value < min_val:
                print_colored(f"❌ Value must be at least {min_val}", Colors.FAIL)
                continue
            if max_val is not None and value > max_val:
                print_colored(f"❌ Value must be at most {max_val}", Colors.FAIL)
                continue
            return value
        except ValueError:
            print_colored("❌ Please enter a valid number", Colors.FAIL)

def get_choice_input(prompt, options):
    """Get choice input from a list of options"""
    print(f"\n{prompt}")
    for i, option in enumerate(options, 1):
        print(f"  {i}. {option}")
    
    while True:
        try:
            choice = int(input("\nEnter your choice (number): "))
            if 1 <= choice <= len(options):
                return options[choice - 1]
            else:
                print_colored(f"❌ Please enter a number between 1 and {len(options)}", Colors.FAIL)
        except ValueError:
            print_colored("❌ Please enter a valid number", Colors.FAIL)

def get_available_options(encoders):
    """Get available options from the trained encoders"""
    options = {}
    
    # Get all available options from encoders
    for key, encoder in encoders.items():
        options[key] = list(encoder.classes_)
    
    return options

def collect_user_data(available_options):
    """Collect all user data through interactive prompts"""
    print_colored("Please provide the following information:", Colors.OKGREEN)
    
    # Age
    print_section("Personal Information")
    age = get_numeric_input("Enter your age", min_val=13, max_val=100)
    
    # Gender - use available options from training data
    gender = get_choice_input("Select your gender:", available_options['Gender'])
    
    # Academic Level - use available options from training data
    academic_level = get_choice_input("Select your academic level:", available_options['Academic_Level'])
    
    # Country - use available options from training data
    print_colored("Available countries from training data:", Colors.WARNING)
    country = get_choice_input("Select your country:", available_options['Country'])
    
    print_section("Social Media Usage")
    
    # Average daily usage
    avg_daily_usage = get_numeric_input("Average daily social media usage (hours)", 
                                       min_val=0, max_val=24, data_type=float)
    
    # Most used platform - use available options from training data
    platform = get_choice_input("Select your most used social media platform:", 
                               available_options['Most_Used_Platform'])
    
    print_section("Lifestyle & Health")
    
    # Sleep hours
    sleep_hours = get_numeric_input("Average sleep hours per night", 
                                   min_val=3, max_val=12, data_type=float)
    
    # Mental health score
    print("\nMental Health Score (1-10 scale):")
    print("1 = Very Poor, 5 = Average, 10 = Excellent")
    mental_health_score = get_numeric_input("Rate your mental health", min_val=1, max_val=10)
    
    # Relationship status - use available options from training data
    relationship_status = get_choice_input("Select your relationship status:", 
                                         available_options['Relationship_Status'])
    
    # Conflicts over social media
    print("\nConflicts Over Social Media (1-10 scale):")
    print("1 = Never, 5 = Sometimes, 10 = Very Frequently")
    conflicts = get_numeric_input("How often do you have conflicts due to social media use?", 
                                 min_val=1, max_val=10)
    
    return {
        'age': age,
        'gender': gender,
        'academic_level': academic_level,
        'country': country,
        'avg_daily_usage': avg_daily_usage,
        'platform': platform,
        'sleep_hours': sleep_hours,
        'mental_health_score': mental_health_score,
        'relationship_status': relationship_status,
        'conflicts': conflicts
    }

def load_models():
    """Load the trained models and preprocessing objects"""
    try:
        academic_model = joblib.load('students_models/academic_performance_model.joblib')
        addiction_model = joblib.load('students_models/addiction_score_model.joblib')
        scaler = joblib.load('students_models/feature_scaler.joblib')
        encoders = joblib.load('students_models/label_encoders.joblib')
        feature_columns = joblib.load('students_models/feature_columns.joblib')
        
        return academic_model, addiction_model, scaler, encoders, feature_columns
    except FileNotFoundError as e:
        print_colored(f"❌ Error: Model files not found. Please ensure all model files are in the current directory.", Colors.FAIL)
        print_colored(f"Missing file: {e.filename}", Colors.FAIL)
        print_colored("Required files:", Colors.WARNING)
        print("- academic_performance_model.joblib")
        print("- addiction_score_model.joblib")
        print("- feature_scaler.joblib")
        print("- label_encoders.joblib")
        print("- feature_columns.joblib")
        sys.exit(1)

def safe_transform(encoder, value, default_value=0):
    """Safely transform a value, returning default if not found"""
    try:
        return encoder.transform([value])[0]
    except ValueError:
        print_colored(f"⚠️ Warning: '{value}' not found in training data, using default encoding", Colors.WARNING)
        return default_value

def make_predictions(user_data, academic_model, addiction_model, scaler, encoders):
    """Make predictions based on user data"""
    try:
        # Create input array with safe transformations
        input_data = np.array([[
            user_data['age'],
            safe_transform(encoders['Gender'], user_data['gender']),
            safe_transform(encoders['Academic_Level'], user_data['academic_level']),
            safe_transform(encoders['Country'], user_data['country']),
            user_data['avg_daily_usage'],
            safe_transform(encoders['Most_Used_Platform'], user_data['platform']),
            user_data['sleep_hours'],
            user_data['mental_health_score'],
            safe_transform(encoders['Relationship_Status'], user_data['relationship_status']),
            user_data['conflicts']
        ]])
        
        # Scale the input
        input_scaled = scaler.transform(input_data)
        
        # Make predictions
        academic_pred = academic_model.predict(input_scaled)[0]
        addiction_pred = addiction_model.predict(input_scaled)[0]
        
        # Get prediction probabilities for academic performance
        academic_proba = academic_model.predict_proba(input_scaled)[0]
        
        academic_result = "Yes" if academic_pred == 1 else "No"
        confidence = max(academic_proba) * 100
        
        return academic_result, round(addiction_pred, 2), round(confidence, 1)
        
    except Exception as e:
        print_colored(f"❌ Error making predictions: {str(e)}", Colors.FAIL)
        return None, None, None

def get_addiction_level(score):
    """Categorize addiction score"""
    if score <= 1:
        return "Very Low", Colors.OKGREEN
    elif score <= 2:
        return "Low", Colors.OKCYAN
    elif score <= 3:
        return "Below Moderate", Colors.OKBLUE
    elif score <= 4:
        return "Moderate", Colors.WARNING
    elif score <= 5:
        return "Above Moderate", Colors.WARNING
    elif score <= 6:
        return "High", Colors.FAIL
    elif score <= 7:
        return "Very High", Colors.FAIL
    else:
        return "Critical", Colors.BOLD + Colors.FAIL



def display_results(user_data, academic_result, addiction_score, confidence):
    """Display prediction results with formatting"""
    print_section("PREDICTION RESULTS")
    
    # Academic Performance Impact
    color = Colors.FAIL if academic_result == "Yes" else Colors.OKGREEN
    symbol = "⚠️" if academic_result == "Yes" else "✅"
    print_colored(f"{symbol} Academic Performance Impact: {academic_result}", color)
    print_colored(f"   Confidence: {confidence}%", Colors.OKCYAN)
    
    # Addiction Score
    addiction_level, level_color = get_addiction_level(addiction_score)
    print_colored(f"📊 Addiction Score: {addiction_score}/10", level_color)
    print_colored(f"   Level: {addiction_level}", level_color)

def provide_recommendations(user_data, academic_result, addiction_score):
    """Provide personalized recommendations"""
    print_section("PERSONALIZED RECOMMENDATIONS")
    
    recommendations = []
    
    # Usage-based recommendations
    if user_data['avg_daily_usage'] > 6:
        recommendations.append("📱 Reduce daily social media usage to under 4 hours")
        recommendations.append("⏰ Set specific times for social media check-ins")
        recommendations.append("📵 Use app timers to limit usage")
    
    # Sleep-based recommendations
    if user_data['sleep_hours'] < 7:
        recommendations.append("😴 Aim for 7-9 hours of sleep per night")
        recommendations.append("🌙 Avoid screens 1 hour before bedtime")
    
    # Mental health recommendations
    if user_data['mental_health_score'] <= 5:
        recommendations.append("🧘 Practice mindfulness and meditation")
        recommendations.append("🤝 Consider talking to a counselor or therapist")
        recommendations.append("🏃 Engage in regular physical exercise")
    
    # Conflict-based recommendations
    if user_data['conflicts'] >= 6:
        recommendations.append("💬 Communicate openly about social media boundaries")
        recommendations.append("📴 Implement device-free time with family/friends")
    
    # Academic performance recommendations
    if academic_result == "Yes":
        recommendations.append("📚 Create a dedicated study environment free from distractions")
        recommendations.append("📝 Use the Pomodoro technique for focused study sessions")
        recommendations.append("🔕 Turn off social media notifications during study time")
    
    # Addiction-specific recommendations
    if addiction_score >= 5:
        recommendations.append("🎯 Set clear goals for reducing social media use")
        recommendations.append("🏃 Find alternative activities to replace social media time")
        recommendations.append("👥 Join support groups for digital wellness")
    
    # Display recommendations
    for i, rec in enumerate(recommendations, 1):
        print_colored(f"{i}. {rec}", Colors.OKGREEN)
    
    if not recommendations:
        print_colored("🎉 Great job! Your social media usage appears to be well-balanced.", Colors.OKGREEN)

def provide_tips():
    """Provide general tips for healthy social media use"""
    print_section("HEALTHY SOCIAL MEDIA TIPS")
    
    tips = [
        "🔔 Turn off non-essential notifications",
        "📱 Keep your phone out of the bedroom",
        "🕐 Designate specific hours for social media",
        "🧘 Practice mindful scrolling - be intentional",
        "👥 Prioritize face-to-face interactions",
        "📚 Replace some social media time with reading",
        "🏃 Use social media breaks for physical activity",
        "🎯 Curate your feed to include positive content",
        "📝 Journal about your social media feelings",
        "🤝 Seek support if you feel addicted"
    ]
    
    for tip in tips:
        print_colored(f"• {tip}", Colors.OKCYAN)

def display_available_options(available_options):
    """Display what categories were available in the training data"""
    print_section("TRAINING DATA CATEGORIES")
    print_colored("The model was trained on the following categories:", Colors.OKCYAN)
    
    for category, options in available_options.items():
        print_colored(f"\n{category.replace('_', ' ').title()}:", Colors.OKBLUE)
        for option in options:
            print_colored(f"  • {option}", Colors.OKCYAN)

def main():
    """Main function to run the interactive predictor"""
    print_header()
    
    try:
        # Load models
        print_colored("Loading prediction models... 🤖", Colors.OKCYAN)
        academic_model, addiction_model, scaler, encoders, feature_columns = load_models()
        print_colored("✅ Models loaded successfully!", Colors.OKGREEN)
        
        # Get available options from training data
        available_options = get_available_options(encoders)
        
        # Display available options
        display_available_options(available_options)
        
        # Ask if user wants to continue
        print_colored("\nPress Enter to continue with data collection, or 'q' to quit:", Colors.OKCYAN)
        choice = input().strip().lower()
        if choice == 'q':
            print_colored("👋 Goodbye!", Colors.OKGREEN)
            return
        
        # Collect user data
        user_data = collect_user_data(available_options)
        
        # Make predictions
        print_colored("\nAnalyzing your data... 🔍", Colors.OKCYAN)
        academic_result, addiction_score, confidence = make_predictions(
            user_data, academic_model, addiction_model, scaler, encoders
        )
        
        if academic_result is not None:
            # Display results
            display_results(user_data, academic_result, addiction_score, confidence)
            
            # Provide recommendations
            provide_recommendations(user_data, academic_result, addiction_score)
            
            # Provide general tips
            provide_tips()
            
            print_section("SUMMARY")
            print_colored(f"👤 User: {user_data['age']} years old, {user_data['academic_level']}", Colors.OKCYAN)
            print_colored(f"📱 Daily Usage: {user_data['avg_daily_usage']} hours on {user_data['platform']}", Colors.OKCYAN)
            print_colored(f"🎯 Academic Impact: {academic_result} ({confidence}% confidence)", Colors.OKCYAN)
            print_colored(f"📊 Addiction Score: {addiction_score}/10", Colors.OKCYAN)
            
        else:
            print_colored("❌ Failed to make predictions. Please check your input data.", Colors.FAIL)
            
    except KeyboardInterrupt:
        print_colored("\n\n👋 Thanks for using the Social Media Impact Predictor!", Colors.OKGREEN)
        sys.exit(0)
    except Exception as e:
        print_colored(f"❌ An unexpected error occurred: {str(e)}", Colors.FAIL)
        sys.exit(1)
    
    print_colored("\n" + "="*60, Colors.HEADER)
    print_colored("Thank you for using the Social Media Impact Predictor! 🎉", Colors.OKGREEN)
    print_colored("Stay mindful of your digital wellness! 🌟", Colors.OKGREEN)
    print_colored("="*60, Colors.HEADER)

if __name__ == "__main__":
    main()
    