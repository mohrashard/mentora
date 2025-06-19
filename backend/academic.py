from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
import os
from dotenv import load_dotenv
import logging
from datetime import datetime, timedelta
import joblib
import numpy as np
import pandas as pd
from sklearn.preprocessing import StandardScaler, LabelEncoder
from bson import ObjectId
import warnings
warnings.filterwarnings('ignore')

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

# Global variables for database
client = None
db = None
students_collection = None

# Global variables for ML models
academic_model = None
addiction_model = None
scaler = None
label_encoders = None
feature_columns = None

def initialize_database():
    """Initialize database connection with error handling"""
    global client, db, students_collection
    
    try:
        mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
        db_name = os.getenv('DB_NAME', 'mentoradb')
        
        logger.info(f"Connecting to MongoDB: {mongo_uri}")
        logger.info(f"Database Name: {db_name}")
        
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
        
        # Test the connection
        client.admin.command('ping')
        
        db = client[db_name]
        students_collection = db['students']
        
        logger.info(f"Successfully connected to MongoDB: {db_name}")
        return True
        
    except Exception as e:
        logger.error(f"Error connecting to MongoDB: {e}")
        return False

def load_ml_models():
    """Load the trained ML models and preprocessing objects"""
    global academic_model, addiction_model, scaler, label_encoders, feature_columns
    
    try:
        # Load models and preprocessing objects
        academic_model = joblib.load('students_models/academic_performance_model.joblib')
        addiction_model = joblib.load('students_models/addiction_score_model.joblib')
        scaler = joblib.load('students_models/feature_scaler.joblib')
        label_encoders = joblib.load('students_models/label_encoders.joblib')
        feature_columns = joblib.load('students_models/feature_columns.joblib')
        
        logger.info("Successfully loaded ML models and preprocessing objects")
        return True
        
    except Exception as e:
        logger.error(f"Error loading ML models: {e}")
        return False

def validate_prediction_data(data):
    """Server-side validation for prediction data"""
    errors = {}
    
    if not data:
        return {'general': 'No data provided'}
    
    # Required fields validation
    required_fields = ['age', 'gender', 'academic_level', 'country', 'avg_daily_usage_hours', 
                      'most_used_platform', 'sleep_hours_per_night', 'mental_health_score', 
                      'relationship_status', 'conflicts_over_social_media', 'local_timestamp']
    
    for field in required_fields:
        if field not in data or str(data[field]).strip() == '':
            errors[field] = f'{field.replace("_", " ").title()} is required'
    
    # Numeric validations
    try:
        if 'age' in data and data['age']:
            age = float(data['age'])
            if age < 1 or age > 120:
                errors['age'] = 'Age must be between 1 and 120'
    except (ValueError, TypeError):
        errors['age'] = 'Age must be a valid number'
    
    try:
        if 'avg_daily_usage_hours' in data and data['avg_daily_usage_hours']:
            usage = float(data['avg_daily_usage_hours'])
            if usage < 0 or usage > 24:
                errors['avg_daily_usage_hours'] = 'Daily usage hours must be between 0 and 24'
    except (ValueError, TypeError):
        errors['avg_daily_usage_hours'] = 'Daily usage hours must be a valid number'
    
    try:
        if 'sleep_hours_per_night' in data and data['sleep_hours_per_night']:
            sleep = float(data['sleep_hours_per_night'])
            if sleep < 0 or sleep > 24:
                errors['sleep_hours_per_night'] = 'Sleep hours must be between 0 and 24'
    except (ValueError, TypeError):
        errors['sleep_hours_per_night'] = 'Sleep hours must be a valid number'
    
    try:
        if 'mental_health_score' in data and data['mental_health_score']:
            mental = int(data['mental_health_score'])
            if mental < 1 or mental > 10:
                errors['mental_health_score'] = 'Mental health score must be between 1 and 10'
    except (ValueError, TypeError):
        errors['mental_health_score'] = 'Mental health score must be a valid number'
    
    try:
        if 'conflicts_over_social_media' in data and data['conflicts_over_social_media']:
            conflicts = int(data['conflicts_over_social_media'])
            if conflicts < 0 or conflicts > 10:
                errors['conflicts_over_social_media'] = 'Conflicts score must be between 0 and 10'
    except (ValueError, TypeError):
        errors['conflicts_over_social_media'] = 'Conflicts score must be a valid number'
    
    # Validate local_timestamp format
    if 'local_timestamp' in data and data['local_timestamp']:
        try:
            # Try to parse the timestamp to ensure it's valid
            datetime.fromisoformat(data['local_timestamp'])
        except (ValueError, TypeError):
            errors['local_timestamp'] = 'Invalid timestamp format'
    
    return errors

def predict_social_media_impact(age, gender, academic_level, country, avg_daily_usage, 
                               platform, sleep_hours, mental_health_score, 
                               relationship_status, conflicts):
    """
    Function to predict both academic performance impact and addiction score
    """
    try:
        # Create input array with fallback for unknown categories
        def safe_transform(encoder, value, fallback):
            try:
                return encoder.transform([value])[0]
            except ValueError:
                logger.warning(f"Unknown value '{value}' in {encoder.classes_}. Using fallback: {fallback}")
                return encoder.transform([fallback])[0]
                
        # Create input array
        input_data = np.array([[
            float(age),
            safe_transform(label_encoders['Gender'], gender, 'Other'),
            safe_transform(label_encoders['Academic_Level'], academic_level, 'Undergraduate'),
            safe_transform(label_encoders['Country'], country, 'Other'),
            float(avg_daily_usage),
            safe_transform(label_encoders['Most_Used_Platform'], platform, 'Other'),
            float(sleep_hours),
            int(mental_health_score),
            safe_transform(label_encoders['Relationship_Status'], relationship_status, 'Single'),
            int(conflicts)
        ]])
        
        # Scale the features
        input_scaled = scaler.transform(input_data)
        
        # Make predictions
        academic_prediction = academic_model.predict(input_scaled)[0]
        addiction_prediction = addiction_model.predict(input_scaled)[0]
        
        # Convert academic prediction to Yes/No
        academic_result = "Yes" if academic_prediction == 1 else "No"
        
        # Round addiction score to nearest integer
        addiction_score = int(round(addiction_prediction))
        
        logger.info(f"Prediction successful: Academic={academic_result}, Addiction={addiction_score}")
        
        return academic_result, addiction_score
        
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        raise e

def generate_personalized_tips(academic_result, addiction_score, input_data):
    """Generate personalized tips based on predictions and user data"""
    tips = []
    
    # Academic performance tips
    if academic_result == "Yes":
        tips.append("📚 Create a dedicated study schedule and stick to it")
        tips.append("⏱️ Use apps like Forest or Focus@Will to minimize distractions during study time")
        tips.append("🔕 Turn off social media notifications during study sessions")
    else:
        tips.append("🎉 Great job managing your social media and academics! Maintain this balance")
        tips.append("🔄 Periodically review your social media usage to ensure it stays productive")
    
    # Addiction level tips
    if addiction_score >= 7:
        tips.append("🚨 Consider a digital detox - start with one screen-free day per week")
        tips.append("⏰ Set strict daily time limits for social media using app timers")
        tips.append("🧘 Practice mindfulness when you feel the urge to check social media")
        tips.append("💡 Seek professional help if you feel social media is controlling your life")
    elif addiction_score >= 4:
        tips.append("⏳ Track your social media usage with built-in phone features or apps like Moment")
        tips.append("🌙 Establish a 'no screens' policy 1 hour before bedtime")
        tips.append("🏞️ Replace some social media time with physical activities or hobbies")
    else:
        tips.append("👍 You're maintaining healthy social media habits - keep it up!")
        tips.append("🔍 Occasionally audit your following list to ensure quality content")
    
    # Sleep-related tips
    if input_data['sleep_hours_per_night'] < 7:
        tips.append("😴 Improve sleep quality by avoiding screens 1 hour before bed")
        tips.append("🌜 Create a consistent bedtime routine to ensure 7-9 hours of sleep")
    
    # Mental health tips
    if input_data['mental_health_score'] <= 4:
        tips.append("🧠 Take regular breaks from social media for mental wellness")
        tips.append("💬 Talk to a counselor if social media negatively affects your mood")
        tips.append("✨ Follow accounts that promote positivity and unfollow toxic ones")
    
    # Usage time tips
    if input_data['avg_daily_usage_hours'] > 4:
        tips.append("⏳ Reduce usage gradually - try decreasing by 30 minutes each day")
        tips.append("📵 Designate tech-free zones in your home (e.g., bedroom, dining table)")
    
    # Conflict resolution tips
    if input_data['conflicts_over_social_media'] >= 5:
        tips.append("🤝 Have open conversations with loved ones about social media boundaries")
        tips.append("❤️ Practice digital empathy - consider how your posts might affect others")
    
    # Ensure we have at least 3 tips
    while len(tips) < 3:
        tips.append("📆 Schedule regular digital breaks throughout your day")
        tips.append("🔔 Set specific times for checking social media instead of constant scrolling")
    
    return tips[:5]  # Return top 5 most relevant tips

@app.before_request
def check_connections():
    """Check database and model connections before each request"""
    global students_collection, academic_model
    
    if students_collection is None:
        if not initialize_database():
            return jsonify({'message': 'Database connection error'}), 500
    
    if academic_model is None:
        if not load_ml_models():
            return jsonify({'message': 'ML models loading error'}), 500

@app.route('/')
def home():
    """Root endpoint with welcome message"""
    return jsonify({
        'message': 'Academic Performance Prediction API',
        'status': 'Server is running',
        'endpoints': {
            'predict': '/predictacademicperformance (POST)',
            'health': '/health (GET)',
            'get_today_prediction': '/get_today_prediction (GET)'
        }
    }), 200

@app.route('/get_today_prediction', methods=['GET'])
def get_today_prediction():
    try:
        user_id = request.args.get('user_id')
        if not user_id:
            return jsonify({'message': 'User ID is required'}), 400
        
        # Define today and tomorrow in UTC
        now_utc = datetime.utcnow()
        today_utc = now_utc.replace(hour=0, minute=0, second=0, microsecond=0)
        tomorrow_utc = today_utc + timedelta(days=1)
        
        # Prepare user_id for query
        if ObjectId.is_valid(user_id):
            query_user_id = ObjectId(user_id)
        else:
            query_user_id = user_id
        
        # Find today's prediction
        prediction = students_collection.find_one({
            'user_id': query_user_id,
            'timestamp': {
                '$gte': today_utc,
                '$lt': tomorrow_utc
            }
        })
        
        if prediction:
            return jsonify({
                'results': prediction['predictions'],
                'personalized_tips': prediction['personalized_tips'],
                'timestamp': prediction['timestamp'].isoformat(),
                'local_timestamp': prediction.get('local_timestamp', '')
            }), 200
        else:
            return jsonify({'message': 'No prediction found for today'}), 404
            
    except Exception as e:
        logger.error(f"Error fetching today's prediction: {str(e)}")
        return jsonify({'message': 'Error fetching prediction'}), 500

@app.route('/predictacademicperformance', methods=['POST'])
def predict_academic_performance():
    """Handle prediction request and save to database"""
    try:
        # Get JSON data from request
        data = request.get_json()
        logger.info(f"Prediction request received")
        
        if not data:
            logger.warning("No data provided in prediction request")
            return jsonify({'message': 'No data provided'}), 400
        
        # Server-side validation
        validation_errors = validate_prediction_data(data)
        if validation_errors:
            logger.warning(f"Validation errors: {validation_errors}")
            return jsonify({'errors': validation_errors}), 400
        
        # Extract data
        age = data['age']
        gender = data['gender']
        academic_level = data['academic_level']
        country = data['country']
        avg_daily_usage = data['avg_daily_usage_hours']
        platform = data['most_used_platform']
        sleep_hours = data['sleep_hours_per_night']
        mental_health_score = data['mental_health_score']
        relationship_status = data['relationship_status']
        conflicts = data['conflicts_over_social_media']
        user_id = data.get('user_id')  # Optional user_id from session/auth
        local_timestamp = data['local_timestamp']  # New field from frontend
        
        # Make prediction
        academic_result, addiction_score = predict_social_media_impact(
            age, gender, academic_level, country, avg_daily_usage,
            platform, sleep_hours, mental_health_score, relationship_status, conflicts
        )
        
        # Generate personalized tips
        tips = generate_personalized_tips(
            academic_result,
            addiction_score,
            {
                'sleep_hours_per_night': float(sleep_hours),
                'mental_health_score': int(mental_health_score),
                'avg_daily_usage_hours': float(avg_daily_usage),
                'conflicts_over_social_media': int(conflicts)
            }
        )
        
        # Prepare document for MongoDB
        prediction_document = {
            'user_id': ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id,
            'input_data': {
                'age': float(age),
                'gender': gender,
                'academic_level': academic_level,
                'country': country,
                'avg_daily_usage_hours': float(avg_daily_usage),
                'most_used_platform': platform,
                'sleep_hours_per_night': float(sleep_hours),
                'mental_health_score': int(mental_health_score),
                'relationship_status': relationship_status,
                'conflicts_over_social_media': int(conflicts),
                'local_timestamp': local_timestamp  # Store local timestamp from frontend
            },
            'predictions': {
                'affects_academic_performance': academic_result,
                'addiction_score': addiction_score
            },
            'personalized_tips': tips,  # Store tips in database
            'timestamp': datetime.utcnow()  # Server's UTC timestamp
        }
        
        # Save to MongoDB
        result = students_collection.insert_one(prediction_document)
        
        if result.inserted_id:
            logger.info(f"Prediction saved successfully: {str(result.inserted_id)}")
            
            # Generate interpretation messages
            addiction_level = "High" if addiction_score >= 7 else "Moderate" if addiction_score >= 4 else "Low"
            
            return jsonify({
                'message': 'Prediction completed successfully',
                'prediction_id': str(result.inserted_id),
                'results': {
                    'affects_academic_performance': academic_result,
                    'addiction_score': addiction_score
                },
                'interpretation': {
                    'academic_impact': f"Social media {'does' if academic_result == 'Yes' else 'does not'} significantly affect academic performance",
                    'addiction_level': f"Addiction score: {addiction_score}/10 - {addiction_level} risk"
                },
                'personalized_tips': tips,  # Send tips in response
                'local_timestamp': local_timestamp  # Return local timestamp to frontend
            }), 200
        else:
            logger.error("Failed to save prediction to database")
            return jsonify({'message': 'Failed to save prediction. Please try again.'}), 500
            
    except ValueError as e:
        if "not in list" in str(e):
            logger.error(f"Invalid category value: {str(e)}")
            return jsonify({
                'message': 'Invalid input value provided. Please check your selections.',
                'error': 'One or more input values are not recognized by the model'
            }), 400
        else:
            logger.error(f"Prediction validation error: {str(e)}")
            return jsonify({'message': 'Invalid input data'}), 400
            
    except Exception as e:
        logger.error(f"Prediction error: {str(e)}")
        return jsonify({'message': 'Internal server error during prediction'}), 500

@app.route('/academichistory', methods=['GET'])
def get_academic_history():
    """Get prediction history for a user with optional filters"""
    try:
        # Get parameters from query string
        user_id = request.args.get('user_id')
        from_date = request.args.get('from_date')
        to_date = request.args.get('to_date')
        addiction_score_min = request.args.get('addiction_score_min')
        addiction_score_max = request.args.get('addiction_score_max')
        
        # Validate required user_id
        if not user_id:
            logger.warning("Missing user_id in academic history request")
            return jsonify({'message': 'User ID is required'}), 400
        
        # Build query filters
        query = {'user_id': user_id}
        
        # Date range filter
        if from_date or to_date:
            date_filter = {}
            if from_date:
                try:
                    date_filter['$gte'] = datetime.fromisoformat(from_date)
                except (ValueError, TypeError):
                    return jsonify({'message': 'Invalid from_date format. Use ISO format'}), 400
            if to_date:
                try:
                    # Include entire end date
                    to_date_dt = datetime.fromisoformat(to_date)
                    date_filter['$lte'] = to_date_dt.replace(hour=23, minute=59, second=59)
                except (ValueError, TypeError):
                    return jsonify({'message': 'Invalid to_date format. Use ISO format'}), 400
            query['timestamp'] = date_filter
        
        # Addiction score filter
        if addiction_score_min or addiction_score_max:
            score_filter = {}
            try:
                if addiction_score_min:
                    score_filter['$gte'] = int(addiction_score_min)
                if addiction_score_max:
                    score_filter['$lte'] = int(addiction_score_max)
                query['predictions.addiction_score'] = score_filter
            except ValueError:
                return jsonify({'message': 'Addiction scores must be integers'}), 400
        
        # Fetch history from MongoDB
        history = students_collection.find(query).sort('timestamp', -1)
        
        # Format results
        results = []
        for doc in history:
            results.append({
                'prediction_id': str(doc['_id']),
                'timestamp': doc['timestamp'].isoformat(),
                'local_timestamp': doc['input_data'].get('local_timestamp', ''),
                'academic_impact': doc['predictions']['affects_academic_performance'],
                'addiction_score': doc['predictions']['addiction_score'],
                'avg_daily_usage': doc['input_data']['avg_daily_usage_hours'],
                'sleep_hours': doc['input_data']['sleep_hours_per_night'],
                'mental_health_score': doc['input_data']['mental_health_score'],
                'work_study_hours': doc['input_data'].get('work_study_hours', 0)
            })
        
        return jsonify({
            'user_id': user_id,
            'count': len(results),
            'history': results
        }), 200
        
    except Exception as e:
        logger.error(f"Error fetching academic history: {str(e)}")
        return jsonify({'message': 'Error fetching history data'}), 500

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        if students_collection is not None:
            students_collection.find_one()
            db_status = 'Connected'
        else:
            db_status = 'Disconnected'
        
        # Test model loading
        model_status = 'Loaded' if academic_model is not None else 'Not Loaded'
            
        return jsonify({
            'status': 'Server is running',
            'database': db_status,
            'ml_models': model_status,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return jsonify({
            'status': 'Server is running',
            'database': 'Error',
            'ml_models': 'Error',
            'error': str(e)
        }), 200

@app.errorhandler(404)
def not_found(error):
    return jsonify({'message': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({'message': 'Internal server error'}), 500

if __name__ == '__main__':
    print("="*50)
    print("Starting Academic Performance Prediction Server...")
    print("="*50)
    
    # Initialize database connection
    if initialize_database():
        print(f"✓ Database connection established")
    else:
        print("✗ Failed to connect to database")
    
    # Load ML models
    if load_ml_models():
        print(f"✓ ML models loaded successfully")
    else:
        print("✗ Failed to load ML models")
    
    print(f"✓ Server will run on: http://localhost:5004")
    print(f"✓ Server will run on: http://127.0.0.1:5004")
    print("="*50)
    
    app.run(
        debug=False,
        host='0.0.0.0',
        port=5004,
        threaded=True,
        use_reloader=False
    )