def provide_recommendations(user_data, stress_level):
    """Provide personalized recommendations based on user data"""
    recommendations = []
    
    if user_data['sleep_duration'] < 7:
        recommendations.append("💤 Improve sleep: Try to get 7-9 hours of sleep per night")
    
    if user_data['quality_of_sleep'] < 6:
        recommendations.append("🛏️ Sleep quality: Create a better sleep environment and bedtime routine")
    
    if user_data['physical_activity_level'] < 30:
        recommendations.append("🏃‍♂️ Exercise more: Aim for at least 30 minutes of physical activity daily")
    
    if user_data['daily_steps'] < 8000:
        recommendations.append("👟 Walk more: Try to reach 8,000-10,000 steps per day")
    
    if stress_level > 5:
        recommendations.append("🧘‍♀️ Stress management: Try meditation, deep breathing, or yoga")
        recommendations.append("🤝 Social support: Connect with friends, family, or consider counseling")
    
    return recommendations

def provide_health_tips():
    """Provide helpful health tips for users who don't know their vitals"""
    print("\n💡 HELPFUL HEALTH TIPS:")
    print("="*50)
    print("📝 How to know your health metrics better:")
    print("\n🩺 Blood Pressure:")
    print("   • Many pharmacies offer free BP checks")
    print("   • Home BP monitors cost $20-50")
    print("   • Normal: around 120/80, High: 140/90+")
    
    print("\n💓 Resting Heart Rate:")
    print("   • Check pulse at wrist for 15 seconds, multiply by 4")
    print("   • Best measured when you wake up, before getting up")
    print("   • Fitness trackers/smartwatches can track this")
    
    print("\n👟 Daily Steps:")
    print("   • Smartphone apps can track steps automatically")
    print("   • Aim for 8,000-10,000 steps per day")
    print("   • Even a 10-minute walk adds ~1,000 steps")
    
    print("\n🏥 General Health:")
    print("   • Regular checkups help track these metrics")
    print("   • Many health apps can estimate based on lifestyle")
    print("   • Don't worry if you don't know exact numbers!")
    print("="*50)
    
import joblib
import numpy as np
import pandas as pd
from datetime import datetime

def load_model_components():
    """Load the saved model components"""
    try:
        model = joblib.load('stress_prediction_model.joblib')
        scaler = joblib.load('feature_scaler.joblib')
        feature_info = joblib.load('model_features_info.joblib')
        print("✅ Model components loaded successfully!")
        return model, scaler, feature_info
    except FileNotFoundError as e:
        print(f"❌ Error loading model files: {e}")
        print("Make sure you have run the model training and saving code first.")
        return None, None, None
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return None, None, None

def get_user_input():
    """Get user input for stress prediction"""
    print("\n" + "="*60)
    print("🧠 STRESS LEVEL PREDICTION TOOL")
    print("="*60)
    print("Please enter your details to predict your stress level:")
    print("-"*60)
    
    user_data = {}
    
    # Age input
    while True:
        try:
            age = int(input("Enter your age: "))
            if 15 <= age <= 100:
                user_data['age'] = age
                break
            else:
                print("❌ Please enter a valid age between 15 and 100")
        except ValueError:
            print("❌ Please enter a valid number for age")
    
    # Sleep duration input
    while True:
        try:
            sleep_duration = float(input("Enter your average sleep duration (hours per night): "))
            if 3 <= sleep_duration <= 12:
                user_data['sleep_duration'] = sleep_duration
                break
            else:
                print("❌ Please enter sleep duration between 3 and 12 hours")
        except ValueError:
            print("❌ Please enter a valid number for sleep duration")
    
    # Quality of sleep input
    while True:
        try:
            quality_of_sleep = int(input("Rate your sleep quality (1-10, where 10 is excellent): "))
            if 1 <= quality_of_sleep <= 10:
                user_data['quality_of_sleep'] = quality_of_sleep
                break
            else:
                print("❌ Please enter a number between 1 and 10")
        except ValueError:
            print("❌ Please enter a valid number for sleep quality")
    
    # Physical activity level input
    while True:
        try:
            physical_activity = int(input("Rate your physical activity level (0-100, where 100 is very active): "))
            if 0 <= physical_activity <= 100:
                user_data['physical_activity_level'] = physical_activity
                break
            else:
                print("❌ Please enter a number between 0 and 100")
        except ValueError:
            print("❌ Please enter a valid number for physical activity")
    
    # BMI Category input
    print("\nBMI Categories:")
    print("1. Normal/Normal Weight")
    print("2. Overweight") 
    print("3. Obese")
    while True:
        try:
            bmi_choice = int(input("Select your BMI category (1-3): "))
            if bmi_choice == 1:
                user_data['bmi_category'] = 'Normal'
                break
            elif bmi_choice == 2:
                user_data['bmi_category'] = 'Overweight'
                break
            elif bmi_choice == 3:
                user_data['bmi_category'] = 'Obese'
                break
            else:
                print("❌ Please enter 1, 2, or 3")
        except ValueError:
            print("❌ Please enter a valid number")
    
    # Heart rate input with user-friendly options
    print("\n💓 Heart Rate Information:")
    print("Don't know your exact resting heart rate? Choose an option:")
    print("1. Enter exact value (if you know it)")
    print("2. Select from general categories")
    print("3. Use estimated value based on your fitness level")
    
    while True:
        try:
            hr_choice = int(input("Choose option (1-3): "))
            if hr_choice in [1, 2, 3]:
                break
            else:
                print("❌ Please enter 1, 2, or 3")
        except ValueError:
            print("❌ Please enter a valid number")
    
    if hr_choice == 1:
        # Exact value
        while True:
            try:
                heart_rate = int(input("Enter your resting heart rate (beats per minute): "))
                if 40 <= heart_rate <= 120:
                    user_data['heart_rate'] = heart_rate
                    break
                else:
                    print("❌ Please enter a heart rate between 40 and 120 bpm")
            except ValueError:
                print("❌ Please enter a valid number for heart rate")
    
    elif hr_choice == 2:
        # General categories
        print("\nSelect your general heart rate category:")
        print("1. Very fit/Athletic (50-60 bpm)")
        print("2. Good fitness (60-70 bpm)")
        print("3. Average fitness (70-80 bpm)")
        print("4. Below average fitness (80-90 bpm)")
        print("5. Poor fitness (90+ bpm)")
        
        while True:
            try:
                hr_category = int(input("Select category (1-5): "))
                if hr_category == 1:
                    user_data['heart_rate'] = 55
                    break
                elif hr_category == 2:
                    user_data['heart_rate'] = 65
                    break
                elif hr_category == 3:
                    user_data['heart_rate'] = 75
                    break
                elif hr_category == 4:
                    user_data['heart_rate'] = 85
                    break
                elif hr_category == 5:
                    user_data['heart_rate'] = 95
                    break
                else:
                    print("❌ Please enter a number between 1 and 5")
            except ValueError:
                print("❌ Please enter a valid number")
    
    else:
        # Estimated based on fitness
        base_hr = 75  # Average resting heart rate
        
        # Adjust based on physical activity level
        if user_data['physical_activity_level'] > 80:
            base_hr = 60  # Very active
        elif user_data['physical_activity_level'] > 60:
            base_hr = 65  # Active
        elif user_data['physical_activity_level'] > 40:
            base_hr = 70  # Moderately active
        elif user_data['physical_activity_level'] > 20:
            base_hr = 80  # Low activity
        else:
            base_hr = 90  # Sedentary
        
        # Age adjustment (heart rate tends to increase slightly with age)
        age_adjustment = (user_data['age'] - 30) * 0.2
        base_hr += age_adjustment
        
        user_data['heart_rate'] = max(50, min(100, int(base_hr)))
        print(f"💓 Estimated resting heart rate: {user_data['heart_rate']} bpm")
        print("💡 This is estimated based on your age and physical activity level")
    
    # Daily steps input with user-friendly options
    print("\n👟 Daily Steps Information:")
    print("Don't track your steps? No problem!")
    print("1. Enter exact number (if you track steps)")
    print("2. Estimate based on your activity level")
    print("3. Select from lifestyle categories")
    
    while True:
        try:
            steps_choice = int(input("Choose option (1-3): "))
            if steps_choice in [1, 2, 3]:
                break
            else:
                print("❌ Please enter 1, 2, or 3")
        except ValueError:
            print("❌ Please enter a valid number")
    
    if steps_choice == 1:
        # Exact number
        while True:
            try:
                daily_steps = int(input("Enter your average daily steps: "))
                if 0 <= daily_steps <= 50000:
                    user_data['daily_steps'] = daily_steps
                    break
                else:
                    print("❌ Please enter daily steps between 0 and 50,000")
            except ValueError:
                print("❌ Please enter a valid number for daily steps")
    
    elif steps_choice == 2:
        # Estimate based on activity level
        activity_level = user_data['physical_activity_level']
        
        if activity_level >= 80:
            estimated_steps = 12000
        elif activity_level >= 60:
            estimated_steps = 9000
        elif activity_level >= 40:
            estimated_steps = 6500
        elif activity_level >= 20:
            estimated_steps = 4000
        else:
            estimated_steps = 2500
        
        user_data['daily_steps'] = estimated_steps
        print(f"👟 Estimated daily steps: {estimated_steps:,}")
        print("💡 Based on your physical activity level")
    
    else:
        # Lifestyle categories
        print("\nSelect your lifestyle category:")
        print("1. Very sedentary (desk job, minimal walking) - ~2,000 steps")
        print("2. Lightly active (some walking, light exercise) - ~5,000 steps")
        print("3. Moderately active (regular walks, some exercise) - ~7,500 steps")
        print("4. Active (regular exercise, lots of walking) - ~10,000 steps")
        print("5. Very active (intense exercise, very active job) - ~12,500 steps")
        
        while True:
            try:
                lifestyle_choice = int(input("Select category (1-5): "))
                if lifestyle_choice == 1:
                    user_data['daily_steps'] = 2000
                    break
                elif lifestyle_choice == 2:
                    user_data['daily_steps'] = 5000
                    break
                elif lifestyle_choice == 3:
                    user_data['daily_steps'] = 7500
                    break
                elif lifestyle_choice == 4:
                    user_data['daily_steps'] = 10000
                    break
                elif lifestyle_choice == 5:
                    user_data['daily_steps'] = 12500
                    break
                else:
                    print("❌ Please enter a number between 1 and 5")
            except ValueError:
                print("❌ Please enter a valid number")
    
    # Blood pressure inputs with user-friendly options
    print("\n🩺 Blood Pressure Information:")
    print("Don't know your exact blood pressure? No problem!")
    print("1. Enter exact values (if you know them)")
    print("2. Select from common ranges (if you have a general idea)")
    print("3. Use estimated values based on your health profile")
    
    while True:
        try:
            bp_choice = int(input("Choose option (1-3): "))
            if bp_choice in [1, 2, 3]:
                break
            else:
                print("❌ Please enter 1, 2, or 3")
        except ValueError:
            print("❌ Please enter a valid number")
    
    if bp_choice == 1:
        # Exact values
        while True:
            try:
                systolic_bp = int(input("Enter your systolic blood pressure (top number): "))
                if 80 <= systolic_bp <= 200:
                    user_data['systolic_bp'] = systolic_bp
                    break
                else:
                    print("❌ Please enter systolic BP between 80 and 200")
            except ValueError:
                print("❌ Please enter a valid number for systolic BP")
        
        while True:
            try:
                diastolic_bp = int(input("Enter your diastolic blood pressure (bottom number): "))
                if 50 <= diastolic_bp <= 120:
                    user_data['diastolic_bp'] = diastolic_bp
                    break
                else:
                    print("❌ Please enter diastolic BP between 50 and 120")
            except ValueError:
                print("❌ Please enter a valid number for diastolic BP")
    
    elif bp_choice == 2:
        # Common ranges
        print("\nSelect your blood pressure range:")
        print("1. Low/Normal (around 110/70)")
        print("2. Normal (around 120/80)")
        print("3. High Normal (around 130/85)")
        print("4. High (around 140/90)")
        print("5. Very High (around 160/100)")
        
        while True:
            try:
                range_choice = int(input("Select range (1-5): "))
                if range_choice == 1:
                    user_data['systolic_bp'] = 110
                    user_data['diastolic_bp'] = 70
                    break
                elif range_choice == 2:
                    user_data['systolic_bp'] = 120
                    user_data['diastolic_bp'] = 80
                    break
                elif range_choice == 3:
                    user_data['systolic_bp'] = 130
                    user_data['diastolic_bp'] = 85
                    break
                elif range_choice == 4:
                    user_data['systolic_bp'] = 140
                    user_data['diastolic_bp'] = 90
                    break
                elif range_choice == 5:
                    user_data['systolic_bp'] = 160
                    user_data['diastolic_bp'] = 100
                    break
                else:
                    print("❌ Please enter a number between 1 and 5")
            except ValueError:
                print("❌ Please enter a valid number")
    
    else:
        # Estimated based on profile
        print("\nLet's estimate your blood pressure based on your profile:")
        
        # Age-based estimation
        age = user_data['age']
        base_systolic = 110 + (age - 20) * 0.5  # Increases slightly with age
        base_diastolic = 70 + (age - 20) * 0.3
        
        # BMI adjustment
        if user_data['bmi_category'] == 'Overweight':
            base_systolic += 10
            base_diastolic += 5
        elif user_data['bmi_category'] == 'Obese':
            base_systolic += 20
            base_diastolic += 10
        
        # Physical activity adjustment
        if user_data['physical_activity_level'] > 70:
            base_systolic -= 5
            base_diastolic -= 3
        elif user_data['physical_activity_level'] < 30:
            base_systolic += 8
            base_diastolic += 5
        
        # Ensure values are within reasonable ranges
        user_data['systolic_bp'] = max(90, min(180, int(base_systolic)))
        user_data['diastolic_bp'] = max(60, min(110, int(base_diastolic)))
        
        print(f"📊 Estimated blood pressure: {user_data['systolic_bp']}/{user_data['diastolic_bp']}")
        print("💡 This is just an estimate based on your age, BMI, and activity level")
    
    # Gender input
    print("\nGender:")
    print("1. Male")
    print("2. Female")
    while True:
        try:
            gender_choice = int(input("Select your gender (1-2): "))
            if gender_choice == 1:
                user_data['gender'] = 'Male'
                break
            elif gender_choice == 2:
                user_data['gender'] = 'Female'
                break
            else:
                print("❌ Please enter 1 or 2")
        except ValueError:
            print("❌ Please enter a valid number")
    
    # Occupation input (optional)
    print("\nOccupation (optional - press Enter to skip):")
    occupation = input("Enter your occupation: ").strip()
    user_data['occupation'] = occupation if occupation else None
    
    # Sleep disorder input
    print("\nSleep Disorder:")
    print("1. No sleep disorder")
    print("2. Have a sleep disorder")
    while True:
        try:
            disorder_choice = int(input("Do you have a sleep disorder? (1-2): "))
            if disorder_choice == 1:
                user_data['has_sleep_disorder'] = False
                break
            elif disorder_choice == 2:
                user_data['has_sleep_disorder'] = True
                break
            else:
                print("❌ Please enter 1 or 2")
        except ValueError:
            print("❌ Please enter a valid number")
    
    return user_data

def predict_stress_level(model, scaler, user_data):
    """Make stress level prediction"""
    
    # Feature mappings
    bmi_mapping = {'Normal': 0, 'Normal Weight': 0, 'Overweight': 1, 'Obese': 2}
    gender_mapping = {'Female': 0, 'Male': 1}
    
    # Create feature vector (adjust based on your model's expected 10 features)
    features = np.array([[
        user_data['sleep_duration'],           # Feature 1
        user_data['quality_of_sleep'],         # Feature 2
        user_data['physical_activity_level'],  # Feature 3
        bmi_mapping.get(user_data['bmi_category'], 0),  # Feature 4
        user_data['heart_rate'],               # Feature 5
        user_data['daily_steps'],              # Feature 6
        user_data['systolic_bp'],              # Feature 7
        user_data['diastolic_bp'],             # Feature 8
        gender_mapping.get(user_data['gender'], 0),     # Feature 9
        int(user_data['has_sleep_disorder'])   # Feature 10
    ]])
    
    # Scale features
    features_scaled = scaler.transform(features)
    
    # Make prediction
    prediction = model.predict(features_scaled)[0]
    
    return round(prediction, 2)

def interpret_stress_level(stress_level):
    """Provide interpretation of stress level"""
    if stress_level <= 3:
        return "😌 Low Stress", "You're managing stress very well! Keep up the good work."
    elif stress_level <= 5:
        return "😐 Moderate Stress", "Your stress level is manageable but consider some relaxation techniques."
    elif stress_level <= 7:
        return "😟 High Stress", "Your stress level is elevated. Consider stress management strategies."
    else:
        return "😰 Very High Stress", "Your stress level is quite high. Consider consulting a healthcare professional."

def provide_health_tips():
    """Provide helpful health tips for users who don't know their vitals"""
    print("\n💡 HELPFUL HEALTH TIPS:")
    print("="*50)
    print("📝 How to know your health metrics better:")
    print("\n🩺 Blood Pressure:")
    print("   • Many pharmacies offer free BP checks")
    print("   • Home BP monitors cost $20-50")
    print("   • Normal: around 120/80, High: 140/90+")
    
    print("\n💓 Resting Heart Rate:")
    print("   • Check pulse at wrist for 15 seconds, multiply by 4")
    print("   • Best measured when you wake up, before getting up")
    print("   • Fitness trackers/smartwatches can track this")
    
    print("\n👟 Daily Steps:")
    print("   • Smartphone apps can track steps automatically")
    print("   • Aim for 8,000-10,000 steps per day")
    print("   • Even a 10-minute walk adds ~1,000 steps")
    
    print("\n🏥 General Health:")
    print("   • Regular checkups help track these metrics")
    print("   • Many health apps can estimate based on lifestyle")
    print("   • Don't worry if you don't know exact numbers!")
    print("="*50)

def save_results(user_data, prediction, timestamp):
    """Save prediction results to a file"""
    try:
        result = {
            'timestamp': timestamp,
            'user_data': user_data,
            'predicted_stress_level': prediction,
        }
        
        # Try to load existing results, if any
        try:
            existing_results = joblib.load('stress_predictions_history.joblib')
            existing_results.append(result)
        except FileNotFoundError:
            existing_results = [result]
        
        joblib.dump(existing_results, 'stress_predictions_history.joblib')
        print("📁 Results saved to stress_predictions_history.joblib")
        
    except Exception as e:
        print(f"❌ Could not save results: {e}")

def main():
    """Main function to run the stress prediction tool"""
    print("🚀 Starting Stress Level Prediction Tool...")
    
    # Load model components
    model, scaler, feature_info = load_model_components()
    
    if model is None:
        print("❌ Cannot proceed without model files. Please run the training script first.")
        return
    
    # Show health tips option
    print("\n🤔 Not sure about your health metrics?")
    show_tips = input("Would you like to see some helpful tips first? (y/n): ").lower().strip()
    if show_tips in ['y', 'yes']:
        provide_health_tips()
        input("\nPress Enter to continue with the prediction...")
    
    while True:
        try:
            # Get user input
            user_data = get_user_input()
            
            # Make prediction
            print("\n🔄 Making prediction...")
            predicted_stress = predict_stress_level(model, scaler, user_data)
            
            # Get interpretation
            stress_category, stress_message = interpret_stress_level(predicted_stress)
            
            # Display results
            print("\n" + "="*60)
            print("📊 PREDICTION RESULTS")
            print("="*60)
            print(f"🎯 Predicted Stress Level: {predicted_stress}/10")
            print(f"📈 Category: {stress_category}")
            print(f"💡 Interpretation: {stress_message}")
            
            # Show estimation disclaimer if user used estimates
            if any(key in user_data for key in ['estimated_bp', 'estimated_hr', 'estimated_steps']):
                print("\n⚠️  Note: Some values were estimated based on your profile.")
                print("   For more accurate results, consider getting actual measurements.")
            
            # Provide recommendations
            recommendations = provide_recommendations(user_data, predicted_stress)
            if recommendations:
                print("\n📋 PERSONALIZED RECOMMENDATIONS:")
                print("-"*40)
                for i, rec in enumerate(recommendations, 1):
                    print(f"{i}. {rec}")
            
            # Save results
            timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            save_results(user_data, predicted_stress, timestamp)
            
            print("\n" + "="*60)
            
            # Ask if user wants to make another prediction
            while True:
                continue_choice = input("\n🔄 Would you like to make another prediction? (y/n): ").lower().strip()
                if continue_choice in ['y', 'yes']:
                    break
                elif continue_choice in ['n', 'no']:
                    print("\n👋 Thank you for using the Stress Prediction Tool!")
                    print("🌟 Remember: This is a prediction tool. For serious health concerns, consult a healthcare professional.")
                    return
                else:
                    print("❌ Please enter 'y' for yes or 'n' for no")
        
        except KeyboardInterrupt:
            print("\n\n👋 Program interrupted. Goodbye!")
            break
        except Exception as e:
            print(f"\n❌ An error occurred: {e}")
            print("🔄 Let's try again...")

if __name__ == "__main__":
    main()