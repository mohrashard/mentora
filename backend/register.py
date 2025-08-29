from flask import Flask, request, jsonify
from flask_cors import CORS
from pymongo import MongoClient
from werkzeug.security import generate_password_hash, check_password_hash
import os
from dotenv import load_dotenv
import re
from datetime import datetime, timedelta
import logging
from bson import ObjectId
from flask_mail import Mail, Message  
from report_generator import generate_html_report
from io import BytesIO
import requests
from apscheduler.schedulers.background import BackgroundScheduler
import atexit


load_dotenv()


logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])  
app.config['MAIL_SERVER'] = 'smtp.gmail.com' 
app.config['MAIL_PORT'] = 587
app.config['MAIL_USE_TLS'] = True
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')
app.config['MAIL_DEFAULT_SENDER'] = 'noreply@mentora.com'
mail = Mail(app)

client = None
db = None
users_collection = None


scheduler = BackgroundScheduler(daemon=True)


#1.5: Background function for generating and emailing weekly wellness reports to users,
#  including metric aggregation, HTML report creation, and error logging

def weekly_report_job():
    """Generate and send weekly reports to all users"""
    logger.info("Starting weekly report job")
    try:
        with app.app_context():
            users = users_collection.find({})
            report_count = 0
            
            for user in users:
                try:
                    logger.info(f"Generating report for user: {user['email']}")
                    
                  
                    metrics = fetch_user_metrics(str(user['_id']))
                    
                   
                    html_report = generate_html_report(user, metrics)
                    
                 
                    body = f"""
Hi {user['full_name']},

Your weekly wellness report is below. 
You're on a {user.get('current_streak', 0)}-day streak - keep it up!

Best regards,
The Mentora Team
                    """
                    
              
                    if send_email(
                        to=user['email'],
                        subject="Your Weekly Wellness Report",
                        body=body,
                        html=html_report 
                    ):
                        report_count += 1
                        logger.info(f"Weekly report sent successfully to {user['email']}")
                    else:
                        logger.error(f"Failed to send weekly report to {user['email']}")
                        
                except Exception as e:
                    logger.error(f"Weekly report failed for {user.get('email', 'unknown')}: {str(e)}")
                    continue
            
            logger.info(f"Weekly report job completed. Sent {report_count} reports.")
            
    except Exception as e:
        logger.error(f"Weekly report job failed: {str(e)}")


#1.6: Background function for sending daily wellness reminders
#  to users via email, including personalized streak messages, 
# HTML formatting, and error logging

def daily_reminder_job():
    """Send professional daily reminders to all users"""
    logger.info("Starting daily reminder job")
    try:
        with app.app_context():
            users = users_collection.find({})
            reminder_count = 0
            for user in users:
                try:
                    logger.info(f"Sending reminder to user: {user['email']}")

                    current_streak = user.get('current_streak', 0)
                    streak_message = (
                        f"You're on a {current_streak}-day streak. Keep up the great work!"
                        if current_streak > 0 else
                        "Start your wellness streak today and track your progress!"
                    )                   
                    plain_body = f"""
Hi {user['full_name']},

{streak_message}

Remember to log your wellness activities today to maintain your streak.

Best regards,
Mentora Team
                    """

           
                    html_body = f"""
<!DOCTYPE html>
<html>
<head>
    <style>
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            color: #1a1a1a;
            line-height: 1.6;
        }}
        .container {{
            max-width: 600px;
            margin: 0 auto;
            padding: 25px;
            background: #ffffff;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
        }}
        .greeting {{
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 15px;
        }}
        .message {{
            font-size: 16px;
            margin-bottom: 20px;
        }}
        .streak {{
            font-weight: bold;
            color: #2F80ED;
        }}
        .closing {{
            font-size: 14px;
            color: #555555;
        }}
    </style>
</head>
<body>
    <div class="container">
        <div class="greeting">Hi {user['full_name']},</div>
        <div class="message streak">{streak_message}</div>
        <div class="message">
            Remember to log your wellness activities today to maintain your progress.
        </div>
        <div class="closing">
            Best regards,<br>
            Mentora Team
        </div>
    </div>
</body>
</html>
                    """

                    if send_email(
                        to=user['email'],
                        subject="Your Daily Wellness Reminder",
                        body=plain_body,
                        html=html_body
                    ):
                        reminder_count += 1
                        logger.info(f"Daily reminder sent successfully to {user['email']}")
                    else:
                        logger.error(f"Failed to send daily reminder to {user['email']}")

                except Exception as e:
                    logger.error(f"Daily reminder failed for {user.get('email', 'unknown')}: {str(e)}")
                    continue

            logger.info(f"Daily reminder job completed. Sent {reminder_count} reminders.")

    except Exception as e:
        logger.error(f"Daily reminder job failed: {str(e)}")





def initialize_scheduler():
    """Initialize and start the scheduler with proper error handling"""
    try:
        if not scheduler.running:
          
            scheduler.add_job(
                func=weekly_report_job,
                trigger='cron',
                day_of_week='mon',
                hour=9,
                minute=0,
                id='weekly_report_job',
                replace_existing=True
            )
            
         
            scheduler.add_job(
                func=daily_reminder_job,
                trigger='cron',
                hour=17,
                minute=0,
                id='daily_reminder_job',
                replace_existing=True
            )
            
            scheduler.start()
            logger.info("Scheduler started successfully")
           
            atexit.register(lambda: scheduler.shutdown())
            
        return True
    except Exception as e:
        logger.error(f"Failed to initialize scheduler: {str(e)}")
        return False
    

#1.7: Utility function for sending emails with optional 
# HTML content and PDF attachments, including configuration checks and error logging    
    
def send_email(to, subject, body, html=None, attachment=None, filename=None):
    """Send email with optional HTML body and PDF attachment (professional version)"""
    try:
        if not app.config.get('MAIL_USERNAME') or not app.config.get('MAIL_PASSWORD'):
            logger.error("Email configuration missing - MAIL_USERNAME or MAIL_PASSWORD not set")
            return False

        msg = Message(subject, recipients=[to])
        msg.body = body 

        if html:
            msg.html = html
            logger.info("HTML email content added")

        if attachment and filename:
            msg.attach(filename, "application/pdf", attachment)
            logger.info(f"Email attachment added: {filename}")

        mail.send(msg)
        logger.info(f"Email sent successfully to {to}")
        return True

    except Exception as e:
        logger.error(f"Email sending failed to {to}: {str(e)}")
        return False


#1.8: Utility function for fetching user wellness metrics from multiple microservices, 
# aggregating data, and calculating summary statistics for
#  email reports, with robust error handling and logging

def fetch_user_metrics(user_id):
    """Fetch metrics from existing endpoints with better error handling"""
    metrics = {
        'stress': [],
        'mental': [],
        'mobile': [],
        'academic': [],
        'summary': {
            'averageStress': 0,
            'averageMentalHealth': 0,
            'screenTimeAverage': 0,
            'academicImpact': 'none'
        }
    }
    
    services = {
        'stress': ('5001', 'stresshistory'),
        'mental': ('5002', 'mentalhistory'),
        'mobile': ('5003', 'get_user_history'),
        'academic': ('5004', 'academichistory')
    }
    
    for metric, (port, endpoint) in services.items():
        try:
            url = f'http://localhost:{port}/{endpoint}?user_id={user_id}'
            logger.info(f"Fetching {metric} data from {url}")
            
            response = requests.get(url, timeout=10)
            if response.status_code == 200:
                data = response.json()
                logger.debug(f"Raw {metric} data: {data}")
                
               
                if metric == 'stress':
                    history = data.get('predictions', [])
                elif metric in ['mental', 'academic']:
                    history = data.get('history', [])
                elif metric == 'mobile':
                    history = data 
                else:
                    history = []
                
                metrics[metric] = history
                logger.info(f"Successfully fetched {metric} data for user {user_id}")
            else:
                logger.warning(f"Failed to fetch {metric} data: HTTP {response.status_code}")
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Network error fetching {metric} data: {str(e)}")
        except Exception as e:
            logger.error(f"Error fetching {metric} data: {str(e)}")
    

    try:
       
        if metrics['stress']:
            stress_values = [float(entry.get('stress_level', 0)) for entry in metrics['stress']]
            metrics['summary']['averageStress'] = sum(stress_values) / len(stress_values) if stress_values else 0
        
       
        if metrics['mental']:
            mental_values = []
            for entry in metrics['mental']:
                input_data = entry.get('input_data', {})
                mood_rating = input_data.get('Mood_Rating_1_to_10', 0)
                mental_values.append(float(mood_rating))
            metrics['summary']['averageMentalHealth'] = sum(mental_values) / len(mental_values) if mental_values else 0
        
      
        if metrics['mobile']:
            screen_values = []
            for entry in metrics['mobile']:
                input_data = entry.get('input_data', {})
                screen_time = input_data.get('daily_screen_time', 0)
                screen_values.append(float(screen_time))
            metrics['summary']['screenTimeAverage'] = sum(screen_values) / len(screen_values) if screen_values else 0
        
     
        if metrics['academic']:
            academic_entries = metrics['academic']
            if academic_entries:
                impacts = [entry.get('academic_impact', 'none') for entry in academic_entries]
                metrics['summary']['academicImpact'] = max(set(impacts), key=impacts.count) if impacts else 'none'
                
    except Exception as e:
        logger.error(f"Error calculating summary metrics: {str(e)}")
    
    return metrics



def initialize_database():
    """Initialize database connection with error handling"""
    global client, db, users_collection
    
    try:
       
        mongo_uri = os.getenv('MONGO_URI', 'mongodb://localhost:27017')
        db_name = os.getenv('DB_NAME', 'mentoradb')
        
        logger.info(f"Connecting to MongoDB: {mongo_uri}")
        logger.info(f"Database Name: {db_name}")
        
        client = MongoClient(mongo_uri, serverSelectionTimeoutMS=5000)
    
        client.admin.command('ping')
        
        db = client[db_name]
        users_collection = db['users']
        
        logger.info(f"Successfully connected to MongoDB: {db_name}")
        return True
        
    except Exception as e:
        logger.error(f"Error connecting to MongoDB: {e}")
        return False

def validate_email(email):
    """Validate email format using regex"""
    if not email:
        return False
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(pattern, email) is not None

def validate_signup_data(data):
    """Server-side validation for signup data"""
    errors = {}
 
    if not data:
        return {'general': 'No data provided'}
    
 
    required_fields = ['full_name', 'email', 'password', 'age', 'gender', 'occupation_or_academic_level', 'country']
    
    for field in required_fields:
        if field not in data or not str(data[field]).strip():
            errors[field] = f'{field.replace("_", " ").title()} is required'
    

    if 'email' in data and data['email']:
        if not validate_email(data['email']):
            errors['email'] = 'Please enter a valid email address'
    

    if 'password' in data and data['password']:
        if len(data['password']) < 6:
            errors['password'] = 'Password must be at least 6 characters long'
    

    if 'age' in data and data['age']:
        try:
            age = int(data['age'])
            if age < 1 or age > 120:
                errors['age'] = 'Please enter a valid age between 1 and 120'
        except (ValueError, TypeError):
            errors['age'] = 'Please enter a valid age'
    
    return errors

def calculate_streak_update(last_login_date):
    """
    Calculate streak updates based on last login date
    Returns tuple: (should_increment_streak, should_reset_streak)
    """
    if not last_login_date:
        
        return False, True
    
    today = datetime.utcnow().date()
    last_login = last_login_date.date() if isinstance(last_login_date, datetime) else last_login_date
    
   
    days_diff = (today - last_login).days
    
    if days_diff == 0:
       
        return False, False
    elif days_diff == 1:
       
        return True, False
    else:
      
        return False, True

@app.before_request
def check_database_connection():
    """Check database connection before each request"""
    global users_collection
    if users_collection is None:
        if not initialize_database():
            return jsonify({'message': 'Database connection error'}), 500

@app.route('/')
def home():
    """Root endpoint with welcome message"""
    return jsonify({
        'message': 'Welcome to Mentora API',
        'status': 'Server is running',
        'endpoints': {
            'signup': '/signup (POST)',
            'login': '/login (POST)',
            'user': '/user/<user_id> (GET)',
            'profile': '/profile/<user_id> (GET, PUT)',
            'health': '/health (GET)'
        }
    }), 200

#1.1: Flask backend signup route implementation handling user registration, 
# including input validation, password hashing, duplicate email checking, 
# and MongoDB insertion with error logging

@app.route('/signup', methods=['POST'])
def signup():
    """Handle user signup"""
    try: 
        data = request.get_json()
        logger.info(f"Signup request received: {data.get('email', 'No email') if data else 'No data'}")
        if not data:
            logger.warning("No data provided in signup request")
            return jsonify({'message': 'No data provided'}), 400
        validation_errors = validate_signup_data(data)
        if validation_errors:
            logger.warning(f"Validation errors: {validation_errors}")
            return jsonify({'errors': validation_errors}), 400
    
        email = data['email'].lower().strip()
        existing_user = users_collection.find_one({'email': email})
        if existing_user:
            logger.warning(f"Signup attempt with existing email: {email}")
            return jsonify({'errors': {'email': 'Email already exists. Please use a different email.'}}), 400
             
        hashed_password = generate_password_hash(data['password'])
        user_document = {
            'full_name': data['full_name'].strip(),
            'email': email,
            'password': hashed_password,
            'age': int(data['age']),
            'gender': data['gender'].strip(),
            'occupation_or_academic_level': data['occupation_or_academic_level'].strip(),
            'country': data['country'].strip(),
            'current_streak': 0,
            'max_streak': 0,
            'last_login_date': None,
            'created_at': datetime.utcnow(),
            'streak_reset_month': None,
            'streak_resets_this_month': 0
        }
        
       
        result = users_collection.insert_one(user_document)
        
        if result.inserted_id:
            logger.info(f"User created successfully: {email}")
            return jsonify({
                'message': 'Account created successfully!',
                'user_id': str(result.inserted_id)
            }), 201
        else:
            logger.error("Failed to insert user into database")
            return jsonify({'message': 'Failed to create account. Please try again.'}), 500
            
    except Exception as e:
        logger.error(f"Signup error: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500
    

#1.2: Flask backend login route implementation handling user authentication, 
# password verification, streak tracking, and MongoDB update with error logging


@app.route('/login', methods=['POST'])
def login():
    """Handle user login with streak tracking"""
    try:

        data = request.get_json()
        logger.info(f"Login request received: {data.get('email', 'No email') if data else 'No data'}")
        
        if not data:
            logger.warning("No data provided in login request")
            return jsonify({'message': 'No data provided'}), 400
        
   
        email = data.get('email', '').strip().lower()
        password = data.get('password', '')
        
        if not email or not password:
            logger.warning("Missing email or password in login request")
            return jsonify({'message': 'Email and password are required'}), 400
        
       
        user = users_collection.find_one({'email': email})
        
        if not user:
            logger.warning(f"Login attempt with non-existent email: {email}")
            return jsonify({'message': 'Invalid email or password'}), 401
        
     
        if not check_password_hash(user['password'], password):
            logger.warning(f"Invalid password attempt for email: {email}")
            return jsonify({'message': 'Invalid email or password'}), 401
        
       
        current_streak = user.get('current_streak', 0)
        max_streak = user.get('max_streak', 0)
        last_login_date = user.get('last_login_date')
        should_increment, should_reset = calculate_streak_update(last_login_date)
        
        if should_increment:
            current_streak += 1
        elif should_reset:
            current_streak = 1
        if current_streak > max_streak:
            max_streak = current_streak
           
        update_data = {
            'current_streak': current_streak,
            'max_streak': max_streak,
            'last_login_date': datetime.utcnow()
        }           
        result = users_collection.update_one(
            {'_id': user['_id']},
            {'$set': update_data}
        )        
        logger.info(f"Successful login for user: {email}")
              
        return jsonify({
            'message': 'Login successful',
            'user_id': str(user['_id']),
            'user': {
                'full_name': user['full_name'],
                'email': user['email'],
                'current_streak': current_streak,
                'max_streak': max_streak
            },
            'redirect': f'/dashboard/{str(user["_id"])}'
        }), 200
        
    except Exception as e:
        logger.error(f"Login error: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500
    


#1.3: Flask backend route for retrieving user data by user ID,
#  including profile information and streak details,
#  with validation and error logging

@app.route('/user/<user_id>', methods=['GET'])
def get_user(user_id):
    """Get user data by user_id"""
    try: 
        if not ObjectId.is_valid(user_id):
            logger.warning(f"Invalid user_id format: {user_id}")
            return jsonify({'message': 'Invalid user ID format'}), 400
              
        user = users_collection.find_one({'_id': ObjectId(user_id)})
        
        if not user:
            logger.warning(f"User not found: {user_id}")
            return jsonify({'message': 'User not found'}), 404
                
        user_data = {
            'user_id': str(user['_id']),
            'full_name': user['full_name'],
            'email': user['email'],
            'age': user['age'],
            'gender': user['gender'],
            'occupation_or_academic_level': user['occupation_or_academic_level'],
            'country': user['country'],
            'current_streak': user.get('current_streak', 0),
            'max_streak': user.get('max_streak', 0),
            'last_login_date': user.get('last_login_date'),
            'created_at': user.get('created_at')
        }
        
        logger.info(f"User data retrieved for: {user_id}")
        return jsonify(user_data), 200
        
    except Exception as e:
        logger.error(f"Get user error: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500
    



#1.4: Flask backend profile route implementation supporting retrieval 
# and update of user profile data, including streak management, 
# password updates, and monthly reset limits with validation and error logging

@app.route('/profile/<user_id>', methods=['GET', 'PUT'])
def user_profile(user_id):
    """User profile retrieval and update endpoint"""
    try:
       
        if not ObjectId.is_valid(user_id):
            return jsonify({'message': 'Invalid user ID format'}), 400
            
       
        user = users_collection.find_one({'_id': ObjectId(user_id)})
        if not user:
            return jsonify({'message': 'User not found'}), 404


        if request.method == 'GET':
       
            current_month = datetime.utcnow().strftime("%Y-%m")
            streak_reset_month = user.get('streak_reset_month', "")
            streak_resets_this_month = user.get('streak_resets_this_month', 0)
            remaining_resets = 3 - streak_resets_this_month if streak_reset_month == current_month else 3

            profile_data = {
                'user_id': str(user['_id']),
                'full_name': user['full_name'],
                'email': user['email'],
                'age': user['age'],
                'gender': user['gender'],
                'occupation_or_academic_level': user['occupation_or_academic_level'],
                'country': user['country'],
                'current_streak': user.get('current_streak', 0),
                'max_streak': user.get('max_streak', 0),
                'last_login_date': user.get('last_login_date'),
                'created_at': user.get('created_at'),
                'remaining_streak_resets': max(0, remaining_resets)
            }
            return jsonify(profile_data), 200

      
        elif request.method == 'PUT':
            data = request.get_json()
            if not data:
                return jsonify({'message': 'No update data provided'}), 400

          
            update_data = {}
            errors = {}
            current_month = datetime.utcnow().strftime("%Y-%m")

         
            if 'password' in data:
                if len(data['password']) >= 6:
                    update_data['password'] = generate_password_hash(data['password'])
                else:
                    errors['password'] = 'Password must be at least 6 characters'

           
            if 'current_streak' in data:
                try:
                    new_streak = int(data['current_streak'])
                    if new_streak < 0:
                        errors['current_streak'] = 'Streak cannot be negative'
                    
                 
                    elif new_streak != user.get('current_streak', 0):
                   
                        streak_reset_month = user.get('streak_reset_month', "")
                        streak_resets = user.get('streak_resets_this_month', 0)
                        
                       
                        if streak_reset_month != current_month:
                            streak_resets = 0
                            update_data['streak_reset_month'] = current_month
                        

                        if streak_resets >= 3:
                            errors['current_streak'] = 'Monthly streak reset limit (3) reached'
                        else:
                        
                            update_data['current_streak'] = new_streak
                            update_data['streak_resets_this_month'] = streak_resets + 1
                            
                           
                            if new_streak > user.get('max_streak', 0):
                                update_data['max_streak'] = new_streak
                except (TypeError, ValueError):
                    errors['current_streak'] = 'Streak must be a positive integer'
        
            allowed_fields = [
                'full_name', 'age', 'gender', 
                'occupation_or_academic_level', 'country'
            ]

            
            for field in allowed_fields:
                if field in data:
                    value = str(data[field]).strip()
                    if value:
                  
                        if field == 'age':
                            try:
                                age_val = int(value)
                                if 1 <= age_val <= 120:
                                    update_data[field] = age_val
                                else:
                                    errors[field] = 'Age must be between 1-120'
                            except (TypeError, ValueError):
                                errors[field] = 'Invalid age format'
                        else:
                            update_data[field] = value
                    else:
                        errors[field] = f'{field.replace("_", " ").title()} cannot be empty'

            if errors:
                return jsonify({'errors': errors}), 400
                
       
            if update_data:
                result = users_collection.update_one(
                    {'_id': user['_id']},
                    {'$set': update_data}
                )
                
                if result.modified_count == 0:
                    return jsonify({'message': 'No changes detected'}), 200

            updated_resets = update_data.get('streak_resets_this_month', user.get('streak_resets_this_month', 0))
            remaining_resets = 3 - updated_resets
            
            return jsonify({
                'message': 'Profile updated successfully',
                'remaining_streak_resets': max(0, remaining_resets)
            }), 200

    except Exception as e:
        logger.error(f"Profile error: {str(e)}")
        return jsonify({'message': 'Internal server error'}), 500
    


@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:

        if users_collection is not None:
            users_collection.find_one()
            db_status = 'Connected'
        else:
            db_status = 'Disconnected'
            
        return jsonify({
            'status': 'Server is running',
            'database': db_status,
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        logger.error(f"Health check error: {str(e)}")
        return jsonify({
            'status': 'Server is running',
            'database': 'Error',
            'error': str(e)
        }), 200

@app.errorhandler(404)
def not_found(error):
    return jsonify({'message': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({'message': 'Internal server error'}), 500

@app.route('/test/weekly-report')
def test_weekly_report():
    weekly_report_job()
    return "✅ Weekly report job triggered manually"

@app.route('/test/daily-reminder')
def test_daily_reminder():
    daily_reminder_job()
    return "✅ Daily reminder job triggered manually"

if __name__ == '__main__':
    print("="*50)
    print("Starting Mentora Flask Server...")
    print("="*50)
    

    if initialize_database():
        print(f"✓ Database connection established")
        
    
        if initialize_scheduler():
            print(f"✓ Scheduler initialized - Jobs scheduled")
        else:
            print(f"⚠ Scheduler failed to initialize - Email jobs may not work")
            
        print(f"✓ Server will run on: http://localhost:5000")
        print(f"✓ Server will run on: http://127.0.0.1:5000")
        print("="*50)
        
      
        app.run(
            debug=False, 
            host='0.0.0.0',
            port=5000,
            threaded=True,
            use_reloader=False 
        )
    else:
        print("✗ Failed to connect to database. Please check MongoDB connection.")
        print("✗ Make sure MongoDB is running on mongodb://localhost:27017")