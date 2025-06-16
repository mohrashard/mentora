from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import joblib
import numpy as np
import pandas as pd
import os
from dotenv import load_dotenv
import logging

# Load environment variables
load_dotenv()

# Initialize Flask app
app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])  # Added CORS configuration

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# MongoDB configuration
MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
DB_NAME = os.getenv('DB_NAME', 'mentoradb')

# Global variables for model artifacts
model = None
scaler = None
metadata = None

# Initialize MongoDB client globally
client = None
db = None
users_collection = None
predictions_collection = None

def initialize_db():
    """Initialize MongoDB connection"""
    global client, db, users_collection, predictions_collection
    try:
        client = MongoClient(MONGO_URI)
        db = client[DB_NAME]
        users_collection = db['users']
        predictions_collection = db['stress_predictions']
        logger.info("✅ Connected to MongoDB successfully")
        return True
    except Exception as e:
        logger.error(f"❌ Failed to connect to MongoDB: {e}")
        return False

def load_model_artifacts():
    """Load the trained model and preprocessing artifacts"""
    global model, scaler, metadata
    
    try:
        model_dir = 'stress_models'
        model_path = os.path.join(model_dir, 'stress_prediction_model.joblib')
        scaler_path = os.path.join(model_dir, 'feature_scaler.joblib')
        metadata_path = os.path.join(model_dir, 'model_metadata.joblib')
        
        if os.path.exists(model_path):
            model = joblib.load(model_path)
            scaler = joblib.load(scaler_path)
            metadata = joblib.load(metadata_path)
            logger.info("✅ Model artifacts loaded successfully")
            return True
        else:
            logger.error(f"❌ Model files not found in {model_dir}")
            return False
    except Exception as e:
        logger.error(f"❌ Error loading model artifacts: {e}")
        return False

def get_user_profile(user_id):
    """Get user profile data from users collection"""
    try:
        if users_collection is None:
            logger.warning("⚠️ Users collection not available")
            return None
            
        # Validate ObjectId format
        if not ObjectId.is_valid(user_id):
            logger.warning(f"⚠️ Invalid user ID format: {user_id}")
            return None
            
        user = users_collection.find_one({'_id': ObjectId(user_id)})
        if not user:
            logger.warning(f"⚠️ User not found: {user_id}")
            return None
            
        return {
            'age': user.get('age', 30),
            'gender': user.get('gender', 'Unknown'),
            'occupation': user.get('occupation_or_academic_level', 'Student')
        }
    except Exception as e:
        logger.error(f"❌ Error fetching user profile: {e}")
        return None

def estimate_bmi_category(height_cm, weight_kg):
    """Estimate BMI category based on height and weight"""
    try:
        height_m = height_cm / 100
        bmi = weight_kg / (height_m ** 2)
        
        if bmi < 18.5:
            return "Underweight"
        elif 18.5 <= bmi < 25:
            return "Normal"
        elif 25 <= bmi < 30:
            return "Overweight"
        else:
            return "Obese"
    except:
        return "Normal"

def estimate_heart_rate(age, activity_level):
    """Estimate heart rate based on age and activity level"""
    base_rate = 72
    age_factor = max(0, (age - 30) * 0.1)
    activity_factor = (100 - activity_level) * 0.15
    return round(base_rate + age_factor + activity_factor)

def estimate_bp(age, bmi_category):
    """Estimate blood pressure based on age and BMI"""
    base_systolic = 110
    base_diastolic = 70
    
    # Age adjustment
    age_adjust = max(0, (age - 30) * 0.5)
    
    # BMI adjustment
    bmi_adjust = 0
    if bmi_category == "Overweight":
        bmi_adjust = 5
    elif bmi_category == "Obese":
        bmi_adjust = 10
        
    systolic = base_systolic + age_adjust + bmi_adjust
    diastolic = base_diastolic + (age_adjust * 0.6) + (bmi_adjust * 0.6)
    
    return round(systolic), round(diastolic)

def preprocess_input(input_data, user_profile):
    """Preprocess input data for prediction"""
    try:
        # Get BMI category - either directly or estimate from height/weight
        if 'bmi_category' in input_data:
            bmi_category = input_data['bmi_category']
        elif 'height_cm' in input_data and 'weight_kg' in input_data:
            bmi_category = estimate_bmi_category(
                float(input_data['height_cm']), 
                float(input_data['weight_kg'])
            )
        else:
            bmi_category = "Normal"  # Default
        
        # Apply BMI mapping
        bmi_mapping = metadata.get('bmi_mapping', {'Normal': 0, 'Overweight': 1, 'Obese': 2})
        bmi_numeric = bmi_mapping.get(bmi_category, 0)
        
        # Apply gender mapping
        gender_mapping = metadata.get('gender_mapping', {'Male': 1, 'Female': 0})
        gender = input_data.get('gender', user_profile.get('gender', 'Unknown'))
        gender_numeric = gender_mapping.get(gender, 0)
        
        # Map occupation stress level
        occupation = input_data.get('occupation', user_profile.get('occupation', 'Student'))
        occupation_stress = 0
        
        # Get occupation categories from metadata or use defaults
        occupation_categories = metadata.get('occupation_categories', {
            'high_stress': ['Doctor', 'Nurse', 'Lawyer', 'Software Engineer'],
            'medium_stress': ['Teacher', 'Accountant', 'Engineer', 'Salesperson', 'Sales Representative']
        })
        
        if occupation in occupation_categories.get('high_stress', []):
            occupation_stress = 2
        elif occupation in occupation_categories.get('medium_stress', []):
            occupation_stress = 1
        
        # Extract basic features with defaults
        sleep_duration = float(input_data.get('sleep_duration', 7.0))
        quality_of_sleep = float(input_data.get('quality_of_sleep', 7.0))
        daily_steps = float(input_data.get('daily_steps', 5000))
        physical_activity = float(input_data.get('physical_activity_level', 50))
        
        # Estimate heart rate if not provided
        heart_rate = float(input_data.get('heart_rate', 
                            estimate_heart_rate(user_profile['age'], physical_activity)))
        
        # Estimate BP if not provided
        if 'systolic_bp' in input_data and 'diastolic_bp' in input_data:
            systolic_bp = float(input_data['systolic_bp'])
            diastolic_bp = float(input_data['diastolic_bp'])
        else:
            systolic_bp, diastolic_bp = estimate_bp(user_profile['age'], bmi_category)
        
        # Calculate derived features
        sleep_efficiency = quality_of_sleep / sleep_duration if sleep_duration > 0 else 0
        activity_ratio = physical_activity / (daily_steps/1000) if daily_steps > 0 else 0
        bp_product = (systolic_bp * diastolic_bp) / 1000
        
        # Handle sleep disorder - convert to binary
        has_sleep_disorder = input_data.get('has_sleep_disorder', False)
        if isinstance(has_sleep_disorder, str):
            has_sleep_disorder = has_sleep_disorder.lower() in ['true', '1', 'yes']
        has_sleep_disorder = int(bool(has_sleep_disorder))
        
        # Create feature dictionary
        features = {
            'Age': float(user_profile['age']),
            'Sleep Duration': sleep_duration,
            'Quality of Sleep': quality_of_sleep,
            'Physical Activity Level': physical_activity,
            'BMI_Numeric': bmi_numeric,
            'Heart Rate': heart_rate,
            'Daily Steps': daily_steps,
            'Systolic_BP': systolic_bp,
            'Diastolic_BP': diastolic_bp,
            'Gender_Numeric': gender_numeric,
            'Occupation_Stress_Level': occupation_stress,
            'Has_Sleep_Disorder': has_sleep_disorder,
            'Sleep_Efficiency': sleep_efficiency,
            'Activity_to_Steps_Ratio': activity_ratio,
            'BP_Product': bp_product
        }
        
        # Create feature vector in correct order
        selected_features = metadata.get('selected_features', [
            'Age', 'Sleep Duration', 'Quality of Sleep', 'Physical Activity Level',
            'BMI_Numeric', 'Heart Rate', 'Daily Steps', 'Systolic_BP', 'Diastolic_BP',
            'Gender_Numeric', 'Occupation_Stress_Level', 'Has_Sleep_Disorder',
            'Sleep_Efficiency', 'Activity_to_Steps_Ratio', 'BP_Product'
        ])
        
        feature_vector = [features[col] for col in selected_features]
        return feature_vector
        
    except Exception as e:
        logger.error(f"Error in preprocessing: {e}")
        raise

def save_prediction_to_db(user_id, input_data, prediction, prediction_id=None):
    """Save prediction data to MongoDB"""
    if predictions_collection is None:
        logger.warning("⚠️ Database not connected - skipping save")
        return None
    
    try:
        # Create document to save
        prediction_doc = {
            'user_id': user_id,
            'prediction_id': prediction_id or datetime.now().strftime('%Y%m%d_%H%M%S_%f')[:-3],
            'timestamp': datetime.now(),
            'input_data': input_data,
            'predicted_stress_level': prediction,
            'stress_category': get_stress_category(prediction)
        }
        
        # Insert into MongoDB
        result = predictions_collection.insert_one(prediction_doc)
        logger.info(f"✅ Prediction saved to MongoDB with ID: {result.inserted_id}")
        return str(result.inserted_id)
        
    except Exception as e:
        logger.error(f"❌ Error saving to MongoDB: {e}")
        return None

def get_stress_category(stress_level):
    """Categorize stress level"""
    if stress_level <= 3:
        return "Low Stress"
    elif stress_level <= 6:
        return "Medium Stress"
    else:
        return "High Stress"

# API Routes

@app.route('/')
def home():
    """Root endpoint with welcome message"""
    return jsonify({
        'message': 'Welcome to the Stress Prediction API',
        'endpoints': {
            'health_check': '/health (GET)',
            'predict': '/predict (POST)',
            'history': '/predictions/history?user_id=<user_id> (GET)',
            'prediction_by_id': '/predictions/<prediction_id> (GET)',
            'stats': '/stats?user_id=<user_id> (GET)'
        }
    })

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'model_loaded': model is not None,
        'database_connected': predictions_collection is not None
    })

@app.route('/predict', methods=['POST'])
def predict_stress():
    """Main prediction endpoint"""
    try:
        # Check if model is loaded
        if model is None or scaler is None or metadata is None:
            return jsonify({
                'success': False,
                'error': 'Model not loaded. Please ensure model files are available.'
            }), 500
        
        # Get JSON data from request
        data = request.get_json()
        
        if not data:
            return jsonify({
                'success': False,
                'error': 'No data provided'
            }), 400
        
        # Validate required user_id
        user_id = data.get('user_id')
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User ID is required'
            }), 400
        
        # Get user profile
        user_profile = get_user_profile(user_id)
        if not user_profile:
            return jsonify({
                'success': False,
                'error': 'User profile not found'
            }), 404
        
        # Preprocess input data
        feature_vector = preprocess_input(data, user_profile)
        
        # Scale features
        scaled_features = scaler.transform([feature_vector])
        
        # Make prediction
        prediction = model.predict(scaled_features)[0]
        prediction = round(float(prediction), 2)
        
        # Save to database
        db_id = save_prediction_to_db(user_id, data, prediction)
        
        # Prepare response
        response = {
            'success': True,
            'prediction': {
                'stress_level': prediction,
                'stress_category': get_stress_category(prediction),
                'confidence_interval': {
                    'lower': max(1.0, prediction - 0.5),
                    'upper': min(10.0, prediction + 0.5)
                }
            },
            'input_summary': {
                'age': user_profile['age'],
                'occupation': user_profile['occupation'],
                'sleep_quality': data.get('quality_of_sleep', 7.0),
                'physical_activity': data.get('physical_activity_level', 50)
            },
            'timestamp': datetime.now().isoformat(),
            'database_id': db_id
        }
        
        logger.info(f"✅ Prediction successful: {prediction}")
        return jsonify(response)
        
    except Exception as e:
        logger.error(f"❌ Prediction error: {e}")
        return jsonify({
            'success': False,
            'error': f'Prediction failed: {str(e)}'
        }), 500


@app.route('/predictions/history', methods=['GET'])
def get_prediction_history():
    """Get prediction history for a user"""
    try:
        if predictions_collection is None:
            return jsonify({
                'success': False,
                'error': 'Database not connected'
            }), 500
        
        # Get user ID from query parameters
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User ID is required'
            }), 400
        
        # Get query parameters
        try:
            limit = int(request.args.get('limit', 10))
            skip = int(request.args.get('skip', 0))
        except ValueError:
            return jsonify({
                'success': False,
                'error': 'Invalid limit or skip value'
            }), 400
        
        # Query database for user's predictions
        cursor = predictions_collection.find({'user_id': user_id}).sort('timestamp', -1).skip(skip).limit(limit)
        predictions = []
        
        for doc in cursor:
            predictions.append({
                'id': str(doc['_id']),
                'prediction_id': doc.get('prediction_id', str(doc['_id'])),
                'timestamp': doc['timestamp'].isoformat(),
                'predicted_stress_level': doc['predicted_stress_level'],
                'stress_category': doc['stress_category'],
                'input_data': doc['input_data']
            })
        
        total_count = predictions_collection.count_documents({'user_id': user_id})
        
        return jsonify({
            'success': True,
            'predictions': predictions,
            'total_count': total_count,
            'returned_count': len(predictions)
        })
        
    except Exception as e:
        logger.error(f"❌ Error fetching history: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch history: {str(e)}'
        }), 500

@app.route('/predictions/<prediction_id>', methods=['GET'])
def get_prediction_by_id(prediction_id):
    """Get specific prediction by ID"""
    try:
        if predictions_collection is None:
            return jsonify({
                'success': False,
                'error': 'Database not connected'
            }), 500
        
        # Find prediction by MongoDB _id
        try:
            doc = predictions_collection.find_one({'_id': ObjectId(prediction_id)})
        except:
            doc = None
            
        if not doc:
            # Try searching by prediction_id field
            doc = predictions_collection.find_one({'prediction_id': prediction_id})
            
        if not doc:
            return jsonify({
                'success': False,
                'error': 'Prediction not found'
            }), 404
        
        prediction = {
            'id': str(doc['_id']),
            'prediction_id': doc.get('prediction_id', str(doc['_id'])),
            'timestamp': doc['timestamp'].isoformat(),
            'predicted_stress_level': doc['predicted_stress_level'],
            'stress_category': doc['stress_category'],
            'input_data': doc['input_data']
        }
        
        return jsonify({
            'success': True,
            'prediction': prediction
        })
        
    except Exception as e:
        logger.error(f"❌ Error fetching prediction: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch prediction: {str(e)}'
        }), 500

@app.route('/stats', methods=['GET'])
def get_prediction_stats():
    """Get prediction statistics for a user"""
    try:
        if predictions_collection is None:
            return jsonify({
                'success': False,
                'error': 'Database not connected'
            }), 500
        
        # Get user ID from query parameters
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User ID is required'
            }), 400
        
        # Aggregate statistics for user
        pipeline = [
            {'$match': {'user_id': user_id}},
            {
                '$group': {
                    '_id': None,
                    'total_predictions': {'$sum': 1},
                    'avg_stress_level': {'$avg': '$predicted_stress_level'},
                    'min_stress_level': {'$min': '$predicted_stress_level'},
                    'max_stress_level': {'$max': '$predicted_stress_level'}
                }
            }
        ]
        
        result = list(predictions_collection.aggregate(pipeline))
        
        if result:
            stats = result[0]
            stats.pop('_id', None)
            stats['avg_stress_level'] = round(stats.get('avg_stress_level', 0), 2)
            stats['min_stress_level'] = stats.get('min_stress_level', 0)
            stats['max_stress_level'] = stats.get('max_stress_level', 0)
        else:
            stats = {
                'total_predictions': 0,
                'avg_stress_level': 0,
                'min_stress_level': 0,
                'max_stress_level': 0
            }
        
        # Get stress category distribution for user
        category_pipeline = [
            {'$match': {'user_id': user_id}},
            {
                '$group': {
                    '_id': '$stress_category',
                    'count': {'$sum': 1}
                }
            }
        ]
        
        category_result = list(predictions_collection.aggregate(category_pipeline))
        category_distribution = {item['_id']: item['count'] for item in category_result}
        
        # Add missing categories with zero count
        for category in ["Low Stress", "Medium Stress", "High Stress"]:
            if category not in category_distribution:
                category_distribution[category] = 0
        
        return jsonify({
            'success': True,
            'stats': stats,
            'category_distribution': category_distribution
        })
        
    except Exception as e:
        logger.error(f"❌ Error fetching stats: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch stats: {str(e)}'
        }), 500
    
@app.route('/stresshistory', methods=['GET'])
def get_stress_history():
    """Get stress prediction history with filtering options"""
    try:
        if predictions_collection is None:
            return jsonify({
                'success': False,
                'error': 'Database not connected'
            }), 500
        
        # Get user ID from query parameters
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({
                'success': False,
                'error': 'User ID is required'
            }), 400
        
        # Build query filters
        query_filter = {'user_id': user_id}
        
        # Date range filtering
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        if start_date or end_date:
            date_filter = {}
            try:
                if start_date:
                    start_dt = datetime.strptime(start_date, '%Y-%m-%d')
                    date_filter['$gte'] = start_dt
                if end_date:
                    end_dt = datetime.strptime(end_date, '%Y-%m-%d') + timedelta(days=1)
                    date_filter['$lt'] = end_dt
                query_filter['timestamp'] = date_filter
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Invalid date format. Use YYYY-MM-DD'
                }), 400
        
        # Stress level filtering
        min_stress = request.args.get('min_stress')
        max_stress = request.args.get('max_stress')
        
        if min_stress or max_stress:
            stress_filter = {}
            try:
                if min_stress:
                    stress_filter['$gte'] = float(min_stress)
                if max_stress:
                    stress_filter['$lte'] = float(max_stress)
                query_filter['predicted_stress_level'] = stress_filter
            except ValueError:
                return jsonify({
                    'success': False,
                    'error': 'Stress levels must be numeric'
                }), 400
        
        # Stress category filtering
        category = request.args.get('category')
        if category:
            valid_categories = ['Low Stress', 'Medium Stress', 'High Stress']
            if category not in valid_categories:
                return jsonify({
                    'success': False,
                    'error': 'Invalid category. Valid options: Low Stress, Medium Stress, High Stress'
                }), 400
            query_filter['stress_category'] = category
        
        # Sorting options
        sort_order = -1  # Default: newest first
        sort_param = request.args.get('sort')
        if sort_param == 'oldest':
            sort_order = 1
        
        # Pagination parameters
        try:
            limit = int(request.args.get('limit', 10))
            skip = int(request.args.get('skip', 0))
        except ValueError:
            return jsonify({
                'success': False,
                'error': 'Invalid limit or skip value'
            }), 400
        
        # Query database with filters
        cursor = predictions_collection.find(query_filter).sort('timestamp', sort_order).skip(skip).limit(limit)
        
        # Format results
        predictions = []
        for doc in cursor:
            predictions.append({
                'id': str(doc['_id']),
                'timestamp': doc['timestamp'].isoformat(),
                'stress_level': doc['predicted_stress_level'],
                'stress_category': doc['stress_category'],
                'input_summary': {
                    'sleep_quality': doc['input_data'].get('quality_of_sleep'),
                    'physical_activity': doc['input_data'].get('physical_activity_level'),
                    'daily_steps': doc['input_data'].get('daily_steps')
                }
            })
        
        # Get total count for pagination
        total_count = predictions_collection.count_documents(query_filter)
        
        return jsonify({
            'success': True,
            'predictions': predictions,
            'total_count': total_count,
            'returned_count': len(predictions)
        })
        
    except Exception as e:
        logger.error(f"❌ Error fetching stress history: {e}")
        return jsonify({
            'success': False,
            'error': f'Failed to fetch stress history: {str(e)}'
        }), 500


@app.errorhandler(404)
def not_found(error):
    return jsonify({
        'success': False,
        'error': 'Endpoint not found'
    }), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({
        'success': False,
        'error': 'Internal server error'
    }), 500

# Initialize the application
def initialize_app():
    """Initialize the application"""
    logger.info("🚀 Starting Flask application...")
    
    # Initialize database
    if not initialize_db():
        logger.error("❌ Failed to initialize database")
    
    # Load model artifacts
    if not load_model_artifacts():
        logger.warning("⚠️ Model artifacts not loaded. Prediction endpoint will not work.")
    
    # Create indexes if database is connected
    if predictions_collection is not None:
        try:
            predictions_collection.create_index([("timestamp", -1)])
            predictions_collection.create_index([("user_id", 1)])
            predictions_collection.create_index([("prediction_id", 1)], unique=True, sparse=True)
            logger.info("✅ Database indexes created/verified")
        except Exception as e:
            logger.warning(f"⚠️ Database index creation warning: {e}")

if __name__ == '__main__':
    initialize_app()
    
    app.run(
        host='0.0.0.0',
        port=5001,  
        debug=True
    )