from flask import Flask, request, jsonify
from flask_cors import CORS
import joblib
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
import logging
import os
import traceback
from pymongo import MongoClient
from bson import ObjectId
import json
import re  # Added for date format validation

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

# MongoDB connection - FIXED IMPLEMENTATION
mobile_collection = None
try:
    client = MongoClient('mongodb://localhost:27017/', serverSelectionTimeoutMS=5000)
    db = client['mentoradb']
    mobile_collection = db['mobile_addiction'] 
    client.server_info()  # Force connection check
    logger.info("Connected to MongoDB successfully")
except Exception as e:
    logger.error(f"Failed to connect to MongoDB: {e}")
    mobile_collection = None

# Global variables for model components
model = None
scaler = None
label_encoder = None
feature_columns = None
model_metadata = None

def load_model_components():
    """Load all model components on startup"""
    global model, scaler, label_encoder, feature_columns, model_metadata
    
    try:
        models_dir = 'mobile_models'
        
        # Check if models directory exists
        if not os.path.exists(models_dir):
            logger.error(f"Models directory '{models_dir}' not found!")
            return False
        
        # Load model metadata
        metadata_path = os.path.join(models_dir, 'model_metadata.joblib')
        if os.path.exists(metadata_path):
            model_metadata = joblib.load(metadata_path)
            logger.info(f"Loaded model metadata: {model_metadata['best_model_name']}")
        else:
            logger.error("Model metadata not found!")
            return False
        
        # Load the trained model
        model_path = os.path.join(models_dir, 'best_model.joblib')
        if os.path.exists(model_path):
            model = joblib.load(model_path)
            logger.info(f"Loaded model: {model_metadata['best_model_name']}")
        else:
            logger.error("Model file not found!")
            return False
        
        # Load label encoder
        le_path = os.path.join(models_dir, 'label_encoder.joblib')
        if os.path.exists(le_path):
            label_encoder = joblib.load(le_path)
            logger.info("Loaded label encoder")
        else:
            logger.error("Label encoder not found!")
            return False
        
        # Load feature columns
        features_path = os.path.join(models_dir, 'feature_columns.joblib')
        if os.path.exists(features_path):
            feature_columns = joblib.load(features_path)
            logger.info(f"Loaded feature columns: {len(feature_columns)} features")
        else:
            logger.error("Feature columns not found!")
            return False
        
        # Load scaler if required
        if model_metadata.get('requires_scaling', False):
            scaler_path = os.path.join(models_dir, 'scaler.joblib')
            if os.path.exists(scaler_path):
                scaler = joblib.load(scaler_path)
                logger.info("Loaded feature scaler")
            else:
                logger.error("Scaler required but not found!")
                return False
        else:
            logger.info("Model doesn't require scaling")
        
        logger.info("All model components loaded successfully!")
        return True
        
    except Exception as e:
        logger.error(f"Error loading model components: {str(e)}")
        logger.error(traceback.format_exc())
        return False

def validate_input_data(data):
    """Validate input data for mobile usage analysis"""
    errors = {}
    
    # Check if user_id is provided
    if 'user_id' not in data or not data['user_id']:
        errors['user_id'] = 'User ID is required'
    
    # Validate each feature
    feature_validations = {
        'daily_screen_time': {'min': 0, 'max': 24, 'type': float},
        'app_sessions': {'min': 0, 'max': 500, 'type': int},
        'social_media_usage': {'min': 0, 'max': 24, 'type': float},
        'gaming_time': {'min': 0, 'max': 24, 'type': float},
        'notifications': {'min': 0, 'max': 1000, 'type': int},
        'night_usage': {'min': 0, 'max': 8, 'type': float},
        'age': {'min': 10, 'max': 100, 'type': int},
        'work_study_hours': {'min': 0, 'max': 24, 'type': float},
        'stress_level': {'min': 1, 'max': 10, 'type': int},
        'apps_installed': {'min': 1, 'max': 500, 'type': int}
    }
    
    for field, validation in feature_validations.items():
        if field not in data:
            errors[field] = f'{field.replace("_", " ").title()} is required'
            continue
        
        try:
            value = validation['type'](data[field])
            if value < validation['min'] or value > validation['max']:
                errors[field] = f'{field} must be between {validation["min"]} and {validation["max"]}'
        except (ValueError, TypeError):
            errors[field] = f'{field} must be a valid number'
    
    return errors

def generate_personalized_tips(input_data, prediction):
    """Generate personalized tips based on user input and prediction"""
    tips = []
    
    # Convert string values to numbers for analysis
    screen_time = float(input_data.get('daily_screen_time', 0))
    social_media = float(input_data.get('social_media_usage', 0))
    gaming_time = float(input_data.get('gaming_time', 0))
    notifications = int(input_data.get('notifications', 0))
    night_usage = float(input_data.get('night_usage', 0))
    stress_level = int(input_data.get('stress_level', 0))
    app_sessions = int(input_data.get('app_sessions', 0))
    
    # Screen time tips
    if screen_time > 8:
        tips.append("Consider reducing your daily screen time by setting app usage limits")
    elif screen_time > 6:
        tips.append("Try to take regular breaks from your phone throughout the day")
    
    # Social media tips
    if social_media > 3:
        tips.append("Limit social media usage by using app timers or scheduled breaks")
    elif social_media > 2:
        tips.append("Consider designating specific times for social media use")
    
    # Gaming tips
    if gaming_time > 2:
        tips.append("Balance gaming with other activities like exercise or reading")
    
    # Notifications tips
    if notifications > 100:
        tips.append("Reduce notifications by turning off non-essential app alerts")
    elif notifications > 50:
        tips.append("Consider grouping notifications or using 'Do Not Disturb' mode")
    
    # Night usage tips
    if night_usage > 2:
        tips.append("Avoid phone usage 1-2 hours before bedtime for better sleep quality")
    elif night_usage > 1:
        tips.append("Try using night mode or blue light filters in the evening")
    
    # Stress-related tips
    if stress_level > 7:
        tips.append("Consider using mindfulness apps instead of social media when stressed")
        tips.append("Take phone-free breaks during high-stress periods")
    
    # App sessions tips
    if app_sessions > 100:
        tips.append("Try batching your app usage instead of checking them frequently")
    
    # Prediction-based tips
    if prediction == "addicted":
        tips.extend([
            "Set specific times for phone-free activities like meals or exercise",
            "Use grayscale mode to make your phone less visually appealing",
            "Keep your phone in another room while sleeping or working"
        ])
    else:
        tips.extend([
            "Maintain your healthy phone habits to prevent addiction",
            "Continue monitoring your usage patterns regularly"
        ])
    
    # Ensure we have at least 3 tips
    if len(tips) < 3:
        tips.extend([
            "Practice the 20-20-20 rule: every 20 minutes, look at something 20 feet away for 20 seconds",
            "Create phone-free zones in your home like the bedroom or dining area",
            "Use physical alarm clocks instead of your phone to reduce morning usage"
        ])
    
    return tips[:8]  # Return maximum 8 tips

def save_to_mongodb(user_id, input_data, prediction_result):
    """Save prediction result to MongoDB"""
    if mobile_collection is None:
        logger.error("MongoDB collection not available")
        return False
    
    try:
        # Create document with proper structure
        document = {
            'user_id': user_id,
            'input_data': input_data,
            'prediction_result': prediction_result,
            'created_at': datetime.utcnow(),  # Changed to UTC
            'date': datetime.utcnow().strftime('%Y-%m-%d')  # Changed to UTC
        }
        
        # Insert document
        result = mobile_collection.insert_one(document)
        logger.info(f"Saved prediction to MongoDB with ID: {result.inserted_id}")
        return True
        
    except Exception as e:
        logger.error(f"Error saving to MongoDB: {str(e)}")
        logger.error(traceback.format_exc())
        return False
    
def get_today_prediction_from_db(user_id):
    """Get today's prediction from MongoDB"""
    if mobile_collection is None:
        return None
    
    try:
        today = datetime.utcnow().strftime('%Y-%m-%d')  # Changed to UTC
        
        # Find today's prediction for the user
        prediction = mobile_collection.find_one({
            'user_id': user_id,
            'date': today
        }, sort=[('created_at', -1)])  # Get the latest if multiple exist
        
        if prediction:
            # Convert ObjectId to string for JSON serialization
            prediction['_id'] = str(prediction['_id'])
            logger.info(f"Found today's prediction for user {user_id}")
            return prediction['prediction_result']
        
        return None
        
    except Exception as e:
        logger.error(f"Error retrieving from MongoDB: {str(e)}")
        return None

@app.before_request
def check_model_loaded():
    """Check if model is loaded before processing requests"""
    if model is None or feature_columns is None or label_encoder is None:
        return jsonify({'error': 'Model not loaded. Please check server logs.'}), 500

@app.route('/')
def home():
    """Root endpoint with API information"""
    return jsonify({
        'message': 'Mobile Usage Analysis API',
        'status': 'Server is running',
        'model_info': {
            'model_name': model_metadata.get('best_model_name', 'Unknown') if model_metadata else 'Unknown',
            'accuracy': f"{model_metadata.get('best_accuracy', 0):.4f}" if model_metadata else 'Unknown',
            'features_count': len(feature_columns) if feature_columns else 0
        },
        'mongodb_status': 'Connected' if mobile_collection is not None else 'Not Connected',
        'endpoints': {
            'analyze': '/analyze_mobile_usage (POST)',
            'health': '/health (GET)',
            'get_today_prediction': '/get_today_prediction (GET)',
            'get_user_history': '/get_user_history (GET)'
        }
    }), 200

@app.route('/analyze_mobile_usage', methods=['POST'])
def analyze_mobile_usage():
    """Main endpoint for mobile usage analysis"""
    try:
        # Get JSON data from request
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        user_id = data.get('user_id', '')
        logger.info(f"Analysis request received for user: {user_id}")
        
        # Check if user already submitted today (check MongoDB first)
        existing_prediction = get_today_prediction_from_db(user_id)
        if existing_prediction:
            logger.info(f"User {user_id} already submitted today - returning existing prediction")
            return jsonify(existing_prediction), 200
        
        # Validate input data
        validation_errors = validate_input_data(data)
        if validation_errors:
            logger.warning(f"Validation errors: {validation_errors}")
            return jsonify({'error': 'Validation failed', 'details': validation_errors}), 400
        
        # Prepare features for prediction
        try:
            features = []
            for feature in feature_columns:
                if feature == 'age':
                    features.append(int(data[feature]))
                elif feature in ['app_sessions', 'notifications', 'stress_level', 'apps_installed']:
                    features.append(int(data[feature]))
                else:
                    features.append(float(data[feature]))
            
            # Convert to numpy array and reshape for prediction
            features_array = np.array(features).reshape(1, -1)
            
            # Apply scaling if required
            if model_metadata.get('requires_scaling', False) and scaler is not None:
                features_array = scaler.transform(features_array)
            
            # Make prediction
            prediction_encoded = model.predict(features_array)[0]
            
            # Get prediction probabilities if available
            prediction_proba = None
            if hasattr(model, 'predict_proba'):
                prediction_proba = model.predict_proba(features_array)[0]
            
            # Decode prediction
            prediction = label_encoder.inverse_transform([prediction_encoded])[0]
            
            # Calculate confidence
            if prediction_proba is not None:
                confidence_value = max(prediction_proba) * 100
                confidence = f"{confidence_value:.1f}%"
            else:
                confidence = "N/A"
            
            # Generate personalized tips
            personalized_tips = generate_personalized_tips(data, prediction)
            
            # Prepare input summary
            input_summary = {
                'daily_screen_time': float(data['daily_screen_time']),
                'social_media_usage': float(data['social_media_usage']),
                'stress_level': int(data['stress_level']),
                'notifications': int(data['notifications']),
                'night_usage': float(data['night_usage']),
                'gaming_time': float(data['gaming_time'])
            }
            
            # Create response
            result = {
                'prediction': prediction,
                'status': 'Analysis Complete',
                'confidence': confidence,
                'input_summary': input_summary,
                'personalized_tips': personalized_tips,
                'analysis_info': {
                    'model_used': model_metadata.get('best_model_name', 'Machine Learning Model'),
                    'features_analyzed': len(feature_columns),
                    'timestamp': datetime.utcnow().isoformat() + 'Z',  # Changed to UTC with 'Z'
                    'user_id': user_id
                }
            }
            
            # Save to MongoDB
            save_success = save_to_mongodb(user_id, data, result)
            if save_success:
                logger.info(f"Successfully saved prediction for user {user_id}")
            else:
                logger.error(f"Failed to save prediction for user {user_id}")
            
            logger.info(f"Analysis completed for user {user_id}: {prediction}")
            return jsonify(result), 200
            
        except Exception as e:
            logger.error(f"Prediction error: {str(e)}")
            logger.error(traceback.format_exc())
            return jsonify({'error': 'Prediction failed. Please check your input data.'}), 500
        
    except Exception as e:
        logger.error(f"Analysis error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/get_today_prediction', methods=['GET'])
def get_today_prediction():
    """Get today's prediction for a user if it exists"""
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        # Check MongoDB first
        prediction = get_today_prediction_from_db(user_id)
        
        if prediction:
            logger.info(f"Retrieved today's prediction for user: {user_id}")
            return jsonify(prediction), 200
        else:
            return jsonify({'error': 'No prediction found for today'}), 404
            
    except Exception as e:
        logger.error(f"Error retrieving today's prediction: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/get_user_history', methods=['GET'])
def get_user_history():
    """Get user's prediction history with optional date filtering"""
    try:
        user_id = request.args.get('user_id')
        limit = int(request.args.get('limit', 10))
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if not user_id:
            return jsonify({'error': 'User ID is required'}), 400
        
        # Validate date formats if provided
        date_format = re.compile(r'^\d{4}-\d{2}-\d{2}$')
        if start_date and not date_format.match(start_date):
            return jsonify({'error': 'start_date must be in YYYY-MM-DD format'}), 400
        if end_date and not date_format.match(end_date):
            return jsonify({'error': 'end_date must be in YYYY-MM-DD format'}), 400
        
        # Build query with date filtering
        query = {'user_id': user_id}
        if start_date and end_date:
            query['date'] = {'$gte': start_date, '$lte': end_date}
        elif start_date:
            query['date'] = {'$gte': start_date}
        elif end_date:
            query['date'] = {'$lte': end_date}
            
        if mobile_collection is None:
            return jsonify({'error': 'Database not available'}), 500
        
        # Get user's prediction history
        history = list(mobile_collection.find(
            query,
            {'_id': 0, 'prediction_result': 1, 'input_data': 1, 'date': 1, 'created_at': 1}
        ).sort('created_at', -1).limit(limit))
        
        # Convert created_at to ISO string with 'Z' for UTC
        formatted_history = []
        for item in history:
            entry = {
                "created_at": item['created_at'].isoformat() + 'Z',
                "date": item['date'],
                "input_data": item['input_data'],
                "prediction_result": item['prediction_result']
            }
            formatted_history.append(entry)
        
        logger.info(f"Retrieved {len(formatted_history)} predictions for user: {user_id}")
        return jsonify(formatted_history), 200
        
    except Exception as e:
        logger.error(f"Error retrieving user history: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        model_status = 'Loaded' if model is not None else 'Not Loaded'
        scaler_status = 'Loaded' if scaler is not None else ('Not Required' if not model_metadata.get('requires_scaling', False) else 'Not Loaded')
        
        # Count today's predictions
        today_count = 0
        if mobile_collection is not None:
            today = datetime.utcnow().strftime('%Y-%m-%d')  # Changed to UTC
            today_count = mobile_collection.count_documents({'date': today})
        
        return jsonify({
            'status': 'Server is running',
            'model_status': model_status,
            'scaler_status': scaler_status,
            'mongodb_status': 'Connected' if mobile_collection is not None else 'Not Connected',
            'features_loaded': len(feature_columns) if feature_columns else 0,
            'model_info': {
                'name': model_metadata.get('best_model_name', 'Unknown') if model_metadata else 'Unknown',
                'accuracy': model_metadata.get('best_accuracy', 0) if model_metadata else 0
            },
            'active_predictions_today': today_count,
            'timestamp': datetime.utcnow().isoformat() + 'Z'  # Changed to UTC with 'Z'
        }), 200
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return jsonify({
            'status': 'Server is running',
            'model_status': 'Error',
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
    print("MOBILE USAGE ANALYSIS API SERVER")
    print("="*60)
    
    # Load model components
    if load_model_components():
        print("✓ All model components loaded successfully")
        print(f"✓ Model: {model_metadata.get('best_model_name', 'Unknown')}")
        print(f"✓ Accuracy: {model_metadata.get('best_accuracy', 0):.4f}")
        print(f"✓ Features: {len(feature_columns)}")
        print(f"✓ Scaling Required: {model_metadata.get('requires_scaling', False)}")
        print(f"✓ MongoDB: {'Connected' if mobile_collection is not None else 'Not Connected'}")
        print(f"✓ Server will run on: http://localhost:5003")
        print(f"✓ Server will run on: http://127.0.0.1:5003")
        print("="*60)
        
        # Run the Flask app
        app.run(
            debug=False,
            host='0.0.0.0',
            port=5003,
            threaded=True,
            use_reloader=False
        )
    else:
        print("✗ Failed to load model components!")
        print("✗ Please ensure you have run the model training script")
        print("✗ and the 'mobile_models' directory exists with all required files")
        print("="*60)