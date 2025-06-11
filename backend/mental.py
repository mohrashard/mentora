from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
import pandas as pd
import numpy as np
import joblib
import os
from datetime import datetime
import logging
import warnings
warnings.filterwarnings('ignore')

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5000"])

# Global variables for database and models
client = None
db = None
users_collection = None
mental_health_collection = None
models_loaded = False
best_mh_model = None
best_dep_model = None
best_anx_model = None
X_features = None

# Feature definitions
numerical_features = ['Age', 'Screen_Time_hours_per_day', 'Sleep_Duration_hours_per_night', 
                     'Sleep_Quality_1_to_10', 'Mood_Rating_1_to_10', 'Physical_Activity_hours_per_week',
                     'Diet_Quality_1_to_10', 'Work_Study_Hours_per_day', 'Caffeine_Intake_mg_per_day']

categorical_features = ['Gender', 'Employment_Status', 'Chronic_Health_Issues', 'Smoking_Habits', 
                       'Drinking_Habits', 'Social_Interaction_Level', 'Stress_Level']

# Caffeine content mapping (mg per unit)
CAFFEINE_CONTENT = {
    'Tea': 40,
    'Coffee': 95,
    'Energy Drink': 80,
    'Soda': 34,
    'Green Tea': 25,
    'Black Tea': 47,
    'Espresso': 64
}

def initialize_database():
    """Initialize MongoDB connection"""
    global client, db, users_collection, mental_health_collection
    
    try:
        mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
        db_name = os.getenv('DB_NAME', 'mentoradb')
        
        logger.info(f"Connecting to MongoDB: {mongo_uri}")
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        
        # Test connection
        client.admin.command('ping')
        
        db = client[db_name]
        users_collection = db['users']
        mental_health_collection = db['mental_health']
        
        logger.info("Successfully connected to MongoDB")
        return True
        
    except Exception as e:
        logger.error(f"MongoDB connection error: {e}")
        return False

def load_models():
    """Load the pre-trained ML models"""
    global models_loaded, best_mh_model, best_dep_model, best_anx_model, X_features
    
    try:
        model_dir = "mental_health_models"
        
        # Check if model directory exists
        if not os.path.exists(model_dir):
            logger.error(f"Model directory '{model_dir}' not found")
            return False
            
        # Load models
        best_mh_model = joblib.load(os.path.join(model_dir, 'mental_health_model.joblib'))
        best_dep_model = joblib.load(os.path.join(model_dir, 'depression_model.joblib'))
        best_anx_model = joblib.load(os.path.join(model_dir, 'anxiety_model.joblib'))
        X_features = joblib.load(os.path.join(model_dir, 'feature_names.joblib'))
        
        logger.info("Successfully loaded pre-trained models")
        models_loaded = True
        return True
            
    except Exception as e:
        logger.error(f"Error loading models: {e}")
        return False

def calculate_caffeine_intake(drinks_data):
    """Calculate total caffeine intake from drinks list"""
    total_caffeine = 0
    
    if not drinks_data or not isinstance(drinks_data, list):
        return 0
    
    for drink in drinks_data:
        if isinstance(drink, dict) and 'type' in drink and 'quantity' in drink:
            drink_type = drink['type']
            quantity = drink['quantity']
            
            # Get caffeine content for this drink type
            caffeine_per_unit = CAFFEINE_CONTENT.get(drink_type, 0)
            total_caffeine += caffeine_per_unit * quantity
    
    return total_caffeine

def get_user_data(user_id):
    """Fetch user data from MongoDB"""
    try:
        if not ObjectId.is_valid(user_id):
            return None
            
        user = users_collection.find_one({'_id': ObjectId(user_id)})
        return user
        
    except Exception as e:
        logger.error(f"Error fetching user data: {e}")
        return None

def predict_mental_health(input_data):
    """Make predictions using the loaded ML models"""
    try:
        if not models_loaded:
            raise Exception("Models not loaded")
        
        # Convert input to DataFrame
        input_df = pd.DataFrame([input_data])
        
        # Make predictions
        mh_pred = best_mh_model.predict(input_df[X_features])[0]
        dep_pred = best_dep_model.predict(input_df[X_features])[0]
        anx_pred = best_anx_model.predict(input_df[X_features])[0]
        
        # Get prediction probabilities
        mh_prob = best_mh_model.predict_proba(input_df[X_features])[0].max()
        dep_prob = best_dep_model.predict_proba(input_df[X_features])[0].max()
        anx_prob = best_anx_model.predict_proba(input_df[X_features])[0].max()
        
        return {
            'mental_health_status': mh_pred,
            'depression_level': dep_pred,
            'anxiety_presence': anx_pred,
            'mental_health_confidence': float(mh_prob),
            'depression_confidence': float(dep_prob),
            'anxiety_confidence': float(anx_prob)
        }
        
    except Exception as e:
        logger.error(f"Prediction error: {e}")
        raise

def generate_recommendations(prediction_results, caffeine_intake):
    """Generate recommendations based on prediction results and input data"""
    recommendations = []
    
    # Depression-based recommendations
    if prediction_results.get('depression_level') in ['High', 'Severe']:
        recommendations.append("Consider speaking to a mental health professional.")
        recommendations.append("Reach out to supportive friends or family members for help.")
        recommendations.append("Practice self-care and try to stick to a routine.")

    # Mental health status recommendations
    if prediction_results.get('mental_health_status') in ['At Risk', 'Poor']:
        recommendations.append("Try reducing screen time and improving sleep quality.")
        recommendations.append("Set a regular sleep schedule and limit electronics before bed.")
        recommendations.append("Increase your daily physical activity, even a short walk helps.")
        recommendations.append("Eat a balanced diet rich in fruits, vegetables, and whole grains.")
        recommendations.append("Regularly track your mood to identify patterns and triggers.")

    # Caffeine intake recommendations
    if caffeine_intake > 400:
        recommendations.append("High caffeine consumption detected. Consider reducing intake.")
    elif caffeine_intake > 300:
        recommendations.append("Moderate caffeine consumption. Monitor your intake.")
    elif caffeine_intake > 200:
        recommendations.append("Your caffeine intake is within a moderate range. Keep it in check to avoid potential negative effects.")
    
    # Anxiety-based recommendations
    if prediction_results.get('anxiety_presence') == 'Yes':
        recommendations.append("Consider stress-reduction techniques like meditation or exercise.")
        recommendations.append("Try deep breathing or mindfulness exercises to manage anxiety.")
        recommendations.append("Avoid excessive news or social media consumption if it increases your stress.")
        recommendations.append("Connect with others or share your feelings with someone you trust.")
    
    # General wellness recommendations
    recommendations.append("Stay hydrated and drink plenty of water throughout the day.")
    recommendations.append("Take breaks during work or study to rest your mind and body.")
    recommendations.append("Maintain regular social interactions to support your emotional health.")
    recommendations.append("If you notice persistent changes in your mood or behavior, consider seeking professional help.")
    recommendations.append("Balance work, rest, and recreation to support your mental health.")
    
    # Remove duplicates and keep order
    seen = set()
    recommendations_unique = []
    for rec in recommendations:
        if rec not in seen:
            recommendations_unique.append(rec)
            seen.add(rec)
    
    return recommendations_unique

def store_prediction_result(user_id, input_data, prediction_results, recommendations):
    """Store prediction results in MongoDB"""
    try:
        document = {
            'user_id': user_id,
            'input_data': input_data,
            'prediction_results': prediction_results,
            'recommendations': recommendations,
            'timestamp': datetime.utcnow(),
            'created_at': datetime.utcnow()
        }
        
        result = mental_health_collection.insert_one(document)
        return str(result.inserted_id)
        
    except Exception as e:
        logger.error(f"Error storing prediction result: {e}")
        return None

@app.before_request
def check_connections():
    """Check database and model connections before each request"""
    if users_collection is None or mental_health_collection is None:
        if not initialize_database():
            return jsonify({'error': 'Database connection failed'}), 500
    
    if not models_loaded:
        if not load_models():
            return jsonify({'error': 'Model loading failed. Please ensure models are in mental_health_models directory'}), 500

@app.route('/')
def home():
    """Root endpoint"""
    return jsonify({
        'message': 'Mental Health Prediction API',
        'status': 'Server is running',
        'port': 5002,
        'endpoints': {
            'prediction': '/predictmentalhealth (POST)',
            'health': '/health (GET)',
            'user_history': '/user/<user_id>/history (GET)'
        }
    }), 200

@app.route('/predictmentalhealth', methods=['POST'])
def predict_mental_health_endpoint():
    """Main prediction endpoint"""
    try:
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        # Extract user ID
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        # Fetch user data from MongoDB
        user_data = get_user_data(user_id)
        if not user_data:
            return jsonify({'error': 'User not found'}), 404
        
        # Auto-fill Age and Gender from user data
        age = user_data.get('age')
        gender = user_data.get('gender')
        
        if not age or not gender:
            return jsonify({'error': 'User profile incomplete. Age and Gender required.'}), 400
        
        # Calculate caffeine intake from drinks
        drinks_data = data.get('drinks', [])
        caffeine_intake = calculate_caffeine_intake(drinks_data)
        
        # Prepare input data for prediction
        input_data = {
            # Auto-filled from user profile
            'Age': int(age),
            'Gender': gender,
            
            # Calculated field
            'Caffeine_Intake_mg_per_day': caffeine_intake,
            
            # Required fields from form
            'Sleep_Duration_hours_per_night': float(data.get('sleep_hours', 7)),
            'Sleep_Quality_1_to_10': int(data.get('sleep_quality', 5)),
            'Mood_Rating_1_to_10': int(data.get('mood_rating', 5)),
            'Stress_Level': str(data.get('stress_level', 'Medium')),
            'Smoking_Habits': str(data.get('smoking_habits', 'Never')),
            'Drinking_Habits': str(data.get('drinking_habits', 'Never')),
            'Social_Interaction_Level': str(data.get('social_interaction_level', 'Medium')),
            
            # Optional fields with defaults
            'Screen_Time_hours_per_day': float(data.get('screen_time', 4)),
            'Physical_Activity_hours_per_week': float(data.get('physical_activity', 3)),
            'Diet_Quality_1_to_10': int(data.get('diet_quality', 5)),
            'Work_Study_Hours_per_day': float(data.get('work_study_hours', 8)),
            'Employment_Status': str(data.get('employment_status', 'Employed')),
            'Chronic_Health_Issues': str(data.get('chronic_health_issues', 'No'))
        }
        
        # Validate required numerical fields
        numerical_fields = ['sleep_hours', 'mood_rating']
        for field in numerical_fields:
            if field not in data:
                return jsonify({'error': f'{field} is required'}), 400
        
        # Make prediction
        prediction_results = predict_mental_health(input_data)
        
        # Generate recommendations
        recommendations = generate_recommendations(prediction_results, caffeine_intake)
        
        # Store results in MongoDB
        storage_id = store_prediction_result(user_id, input_data, prediction_results, recommendations)
        
        # Prepare response
        response_data = {
            'success': True,
            'timestamp': datetime.utcnow().isoformat(),
            'user_id': user_id,
            'storage_id': storage_id,
            'input_data': {
                'age': age,
                'gender': gender,
                'caffeine_intake_mg': caffeine_intake,
                'drinks_consumed': drinks_data,
                'sleep_hours': input_data['Sleep_Duration_hours_per_night'],
                'mood_rating': input_data['Mood_Rating_1_to_10'],
                'stress_level': input_data['Stress_Level']
            },
            'predictions': {
                'mental_health_status': prediction_results['mental_health_status'],
                'depression_level': prediction_results['depression_level'],
                'anxiety_presence': prediction_results['anxiety_presence'],
                'confidence_scores': {
                    'mental_health': prediction_results['mental_health_confidence'],
                    'depression': prediction_results['depression_confidence'],
                    'anxiety': prediction_results['anxiety_confidence']
                }
            },
            'recommendations': recommendations,
            'insights': {
                'high_caffeine_detected': caffeine_intake > 400,
                'caffeine_intake_level': 'High' if caffeine_intake > 400 else 'Moderate' if caffeine_intake > 200 else 'Low',
                'risk_factors_identified': len([r for r in recommendations if 'Consider' in r or 'Try' in r])
            }
        }
        
        logger.info(f"Prediction completed for user {user_id}")
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Prediction endpoint error: {e}")
        return jsonify({'error': 'Internal server error', 'details': str(e)}), 500

@app.route('/user/<user_id>/history', methods=['GET'])
def get_user_history(user_id):
    """Get prediction history for a user"""
    try:
        if not ObjectId.is_valid(user_id):
            return jsonify({'error': 'Invalid user ID format'}), 400
        
        # Get user's prediction history
        history = list(mental_health_collection.find(
            {'user_id': user_id},
            {'_id': 0, 'user_id': 0}
        ).sort('timestamp', -1).limit(10))
        
        # Convert datetime objects to ISO format
        for record in history:
            if 'timestamp' in record:
                record['timestamp'] = record['timestamp'].isoformat()
            if 'created_at' in record:
                record['created_at'] = record['created_at'].isoformat()
        
        return jsonify({
            'user_id': user_id,
            'history_count': len(history),
            'history': history
        }), 200
        
    except Exception as e:
        logger.error(f"History endpoint error: {e}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        db_status = 'Connected' if users_collection is not None else 'Disconnected'
        models_status = 'Loaded' if models_loaded else 'Not Loaded'
        
        # Test database connection
        if users_collection is not None:
            users_collection.find_one()
        
        return jsonify({
            'status': 'Server is running',
            'port': 5002,
            'database': db_status,
            'models': models_status,
            'timestamp': datetime.utcnow().isoformat(),
            'features_count': len(X_features) if X_features else 0
        }), 200
        
    except Exception as e:
        logger.error(f"Health check error: {e}")
        return jsonify({
            'status': 'Server is running with errors',
            'error': str(e)
        }), 200

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({'error': 'Internal server error'}), 500

if __name__ == '__main__':
    print("="*60)
    print("🧠 MENTAL HEALTH PREDICTION API SERVER")
    print("="*60)
    
    # Initialize database
    if initialize_database():
        print("✓ Database connection established")
    else:
        print("✗ Database connection failed - using mock data")
    
    # Load models
    if load_models():
        print("✓ ML models loaded successfully")
    else:
        print("✗ Model loading failed - please ensure models are in 'mental_health_models' directory")
        exit(1)
    
    print(f"✓ Server starting on: http://localhost:5002")
    print(f"✓ Prediction endpoint: http://localhost:5002/predictmentalhealth")
    print("="*60)
    
    # Run the Flask application
    app.run(
        debug=True,
        host='0.0.0.0',
        port=5002,
        threaded=True
    )