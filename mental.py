import pandas as pd
import joblib
import warnings
warnings.filterwarnings('ignore')

# Load the trained models
model_dir = "mental_health_models"
mh_model = joblib.load(f"{model_dir}/mental_health_model.joblib")
dep_model = joblib.load(f"{model_dir}/depression_model.joblib")
anx_model = joblib.load(f"{model_dir}/anxiety_model.joblib")

# Load feature names
X_features = joblib.load(f"{model_dir}/feature_names.joblib")

def get_user_input():
    """Collect user data through interactive prompts with simplified inputs"""
    print("\n" + "="*60)
    print("PERSONAL MENTAL HEALTH ASSESSMENT")
    print("="*60)
    print("Please provide information about your lifestyle and habits:")
    
    data = {}
    
    # Section 1: Personal Information
    print("\n--- PERSONAL INFORMATION ---")
    data['Age'] = int(input("1. Your age: "))
    data['Gender'] = input("2. Gender (Male/Female/Other): ").capitalize()
    data['Employment_Status'] = input("3. Employment status (Employed/Unemployed/Student/Retired): ").capitalize()
    
    # Section 2: Health Information
    print("\n--- HEALTH INFORMATION ---")
    data['Chronic_Health_Issues'] = input("4. Do you have any chronic health issues? (Yes/No): ").capitalize()
    data['Smoking_Habits'] = input("5. Smoking habits (Never/Occasional/Daily): ").capitalize()
    data['Drinking_Habits'] = input("6. Drinking habits (Never/Social/Regular): ").capitalize()
    data['Stress_Level'] = input("7. How would you rate your stress level? (Low/Medium/High): ").capitalize()
    data['Social_Interaction_Level'] = input("8. How often do you socialize? (Low/Medium/High): ").capitalize()
    
    # Section 3: Lifestyle Metrics
    print("\n--- LIFESTYLE METRICS ---")
    data['Screen_Time_hours_per_day'] = float(input("9. Average daily screen time (hours): "))
    data['Sleep_Duration_hours_per_night'] = float(input("10. Average nightly sleep duration (hours): "))
    
    print("\nRate the following on a scale of 1-10 (1 = poor, 10 = excellent):")
    data['Sleep_Quality_1_to_10'] = float(input("11. Your sleep quality: "))
    data['Mood_Rating_1_to_10'] = float(input("12. Your average mood: "))
    data['Diet_Quality_1_to_10'] = float(input("13. Your diet quality: "))
    
    data['Physical_Activity_hours_per_week'] = float(input("\n14. Weekly physical activity (hours): "))
    data['Work_Study_Hours_per_day'] = float(input("15. Daily work/study hours: "))
    
    # Simplified caffeine intake estimation
    print("\n16. Caffeine intake estimation:")
    print("  a. Coffee (1 cup ≈ 95mg)")
    print("  b. Tea (1 cup ≈ 47mg)")
    print("  c. Soda (1 can ≈ 40mg)")
    print("  d. Energy drinks (1 can ≈ 80mg)")
    
    coffee = float(input("  - How many cups of coffee per day? ")) * 95
    tea = float(input("  - How many cups of tea per day? ")) * 47
    soda = float(input("  - How many cans of soda per day? ")) * 40
    energy = float(input("  - How many energy drinks per day? ")) * 80
    
    data['Caffeine_Intake_mg_per_day'] = coffee + tea + soda + energy
    
    return data

def predict_mental_health(input_data):
    """Make predictions using the trained models"""
    input_df = pd.DataFrame([input_data])
    
    # Make predictions
    mh_pred = mh_model.predict(input_df[X_features])[0]
    dep_pred = dep_model.predict(input_df[X_features])[0]
    anx_pred = anx_model.predict(input_df[X_features])[0]
    
    # Get prediction probabilities
    mh_prob = mh_model.predict_proba(input_df[X_features])[0].max()
    dep_prob = dep_model.predict_proba(input_df[X_features])[0].max()
    anx_prob = anx_model.predict_proba(input_df[X_features])[0].max()
    
    return {
        'mental_health_status': mh_pred,
        'depression_level': dep_pred,
        'anxiety_presence': anx_pred,
        'mental_health_confidence': mh_prob,
        'depression_confidence': dep_prob,
        'anxiety_confidence': anx_prob
    }

def generate_recommendations(predictions, input_data):
    """Generate personalized recommendations based on predictions and input data"""
    recommendations = []
    
    # Mental health status recommendations
    if predictions['mental_health_status'] == 'Poor':
        recommendations.append("🧠 Prioritize self-care: Consider speaking with a mental health professional")
        recommendations.append("📅 Establish routine: Consistent daily schedules can improve mental wellbeing")
    elif predictions['mental_health_status'] == 'Fair':
        recommendations.append("🌱 Practice mindfulness: Try meditation or journaling for 10 minutes daily")
        recommendations.append("🌞 Morning sunlight: Get 15 minutes of morning sun to regulate your circadian rhythm")
    else:
        recommendations.append("🌟 Maintain healthy habits: Continue your current positive routines")
        recommendations.append("🤝 Community connection: Consider volunteering to strengthen social bonds")
    
    # Depression level recommendations
    if predictions['depression_level'] in ['Moderate', 'Severe']:
        recommendations.append("🤝 Seek professional support: Consider talking to a therapist or counselor")
        recommendations.append("📞 Reach out: Contact a support line if you need immediate help")
    elif predictions['depression_level'] == 'Mild':
        recommendations.append("👥 Increase social connection: Schedule regular calls with friends or family")
        recommendations.append("🏞️ Nature therapy: Spend 30 minutes daily in green spaces")
    
    # Anxiety recommendations
    if predictions['anxiety_presence'] == 'Yes':
        recommendations.append("😌 Practice 4-7-8 breathing: Inhale 4s, hold 7s, exhale 8s")
        recommendations.append("✍️ Worry journaling: Write down anxious thoughts each evening")
    
    # Sleep-related recommendations
    if input_data['Sleep_Duration_hours_per_night'] < 7:
        recommendations.append("💤 Sleep extension: Aim for 7-9 hours of sleep nightly")
    if input_data['Sleep_Quality_1_to_10'] < 6:
        recommendations.append("🌙 Sleep hygiene: Keep bedroom cool/dark and avoid screens 1 hour before bed")
    
    # Physical activity recommendations
    if input_data['Physical_Activity_hours_per_week'] < 2.5:
        recommendations.append("🏃‍♂️ Movement matters: Aim for 30 minutes of moderate exercise 5 days/week")
    
    # Screen time
    if input_data['Screen_Time_hours_per_day'] > 6:
        recommendations.append("📱 Digital detox: Implement screen-free periods during meals and before bed")
    
    # Caffeine intake
    if input_data['Caffeine_Intake_mg_per_day'] > 400:
        recommendations.append("☕ Caffeine moderation: Limit to 2-3 cups of coffee daily, avoid after 2PM")
    
    # Stress management
    if input_data['Stress_Level'] == 'High':
        recommendations.append("🧘 Stress reduction: Try progressive muscle relaxation or yoga")
    elif input_data['Stress_Level'] == 'Medium':
        recommendations.append("🌿 Adaptogens: Consider stress-reducing herbs like ashwagandha or rhodiola")
    
    # Social connection
    if input_data['Social_Interaction_Level'] == 'Low':
        recommendations.append("👥 Social scheduling: Plan at least two social activities per week")
    
    # Diet quality
    if input_data['Diet_Quality_1_to_10'] < 6:
        recommendations.append("🥗 Nutrient focus: Increase omega-3s (fish, walnuts) and magnesium (leafy greens)")
    
    return recommendations

def display_results(predictions, recommendations):
    """Display prediction results and recommendations"""
    print("\n" + "="*60)
    print("YOUR MENTAL HEALTH ASSESSMENT RESULTS")
    print("="*60)
    
    # Mental health status with emoji
    status_emoji = "🟢" if predictions['mental_health_status'] == 'Good' else \
                   "🟠" if predictions['mental_health_status'] == 'Fair' else "🔴"
    
    print(f"\n🧠 Mental Health Status: {status_emoji} {predictions['mental_health_status']} "
          f"(Confidence: {predictions['mental_health_confidence']*100:.1f}%)")
    
    # Depression level with emoji
    dep_emoji = "🟢" if predictions['depression_level'] == 'Minimal' else \
                "🟡" if predictions['depression_level'] == 'Mild' else \
                "🟠" if predictions['depression_level'] == 'Moderate' else "🔴"
    
    print(f"😔 Depression Level: {dep_emoji} {predictions['depression_level']} "
          f"(Confidence: {predictions['depression_confidence']*100:.1f}%)")
    
    # Anxiety presence with emoji
    anxiety_emoji = "🟢 No" if predictions['anxiety_presence'] == 'No' else "🔴 Yes"
    print(f"😰 Anxiety Presence: {anxiety_emoji} "
          f"(Confidence: {predictions['anxiety_confidence']*100:.1f}%)")
    
    print("\n" + "="*60)
    print("PERSONALIZED RECOMMENDATIONS")
    print("="*60)
    
    if recommendations:
        for i, rec in enumerate(recommendations, 1):
            print(f"\n{i}. {rec}")
    else:
        print("\n🌟 Great news! Your current lifestyle patterns appear well-balanced.")
        print("Maintain your healthy routines and consider sharing what works for you with others.")
    
    print("\n💡 Note: These recommendations are generated based on predictive models and")
    print("should not replace professional medical advice. Consult a healthcare")
    print("professional for personalized guidance.")

def main():
    """Main interactive program"""
    print("="*60)
    print("MENTAL HEALTH PREDICTION & WELLNESS TOOL")
    print("="*60)
    print("\nThis tool helps you understand potential mental health patterns")
    print("based on your lifestyle and provides personalized recommendations.")
    
    while True:
        try:
            user_data = get_user_input()
            predictions = predict_mental_health(user_data)
            recommendations = generate_recommendations(predictions, user_data)
            display_results(predictions, recommendations)
            
            another = input("\n\nWould you like to make another assessment? (y/n): ").lower()
            if another != 'y':
                print("\nThank you for using the Mental Health Assessment Tool. Take care of yourself! 🌈")
                break
                
        except Exception as e:
            print(f"\n⚠️ Error: {e}")
            print("Please try again with valid inputs.")

if __name__ == "__main__":
    main()