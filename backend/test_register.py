import pytest
import json
from unittest.mock import MagicMock
from bson import ObjectId
from datetime import datetime, timedelta
from werkzeug.security import generate_password_hash
import register
from register import app, initialize_database, validate_email, validate_signup_data, calculate_streak_update


@pytest.fixture
def client():
    """Create a test client for the Flask app."""
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


@pytest.fixture
def mock_db(mocker):
    """Patch the global users_collection in register.py with a mock."""
    mock_collection = MagicMock()
    mocker.patch.object(register, "users_collection", mock_collection)
    return mock_collection


@pytest.fixture
def mock_mail(mocker):
    """Mock the Flask-Mail extension."""
    return mocker.patch('register.mail')


@pytest.fixture
def mock_requests(mocker):
    """Mock the requests module for external service calls."""
    return mocker.patch('register.requests')


def test_validate_email():
    assert validate_email("test@example.com") is True
    assert validate_email("invalid-email") is False
    assert validate_email("") is False


def test_validate_signup_data():
    valid_data = {
        'full_name': 'John Doe',
        'email': 'john@example.com',
        'password': 'password123',
        'age': '25',
        'gender': 'Male',
        'occupation_or_academic_level': 'Student',
        'country': 'USA'
    }
    assert validate_signup_data(valid_data) == {}

    invalid_data = valid_data.copy()
    del invalid_data['full_name']
    assert 'full_name' in validate_signup_data(invalid_data)

    invalid_email = valid_data.copy()
    invalid_email['email'] = 'invalid-email'
    assert 'email' in validate_signup_data(invalid_email)

    short_password = valid_data.copy()
    short_password['password'] = '123'
    assert 'password' in validate_signup_data(short_password)

    invalid_age = valid_data.copy()
    invalid_age['age'] = '150'
    assert 'age' in validate_signup_data(invalid_age)


def test_calculate_streak_update():
    assert calculate_streak_update(None) == (False, True)

    today = datetime.utcnow()
    assert calculate_streak_update(today) == (False, False)

    yesterday = datetime.utcnow() - timedelta(days=1)
    assert calculate_streak_update(yesterday) == (True, False)

    two_days_ago = datetime.utcnow() - timedelta(days=2)
    assert calculate_streak_update(two_days_ago) == (False, True)


def test_home_route(client):
    response = client.get('/')
    assert response.status_code == 200
    assert b'Welcome to Mentora API' in response.data


def test_signup_success(client, mock_db):
    mock_db.find_one.return_value = None
    mock_db.insert_one.return_value.inserted_id = ObjectId()

    signup_data = {
        'full_name': 'John Doe',
        'email': 'john@example.com',
        'password': 'password123',
        'age': 25,
        'gender': 'Male',
        'occupation_or_academic_level': 'Student',
        'country': 'USA'
    }

    response = client.post('/signup',
                           data=json.dumps(signup_data),
                           content_type='application/json')

    assert response.status_code == 201
    assert b'Account created successfully' in response.data


def test_signup_existing_email(client, mock_db):
    mock_db.find_one.return_value = {'email': 'john@example.com'}

    signup_data = {
        'full_name': 'John Doe',
        'email': 'john@example.com',
        'password': 'password123',
        'age': 25,
        'gender': 'Male',
        'occupation_or_academic_level': 'Student',
        'country': 'USA'
    }

    response = client.post('/signup',
                           data=json.dumps(signup_data),
                           content_type='application/json')

    assert response.status_code == 400
    assert b'Email already exists' in response.data


def test_signup_invalid_data(client):
    invalid_data = {
        'full_name': '',
        'email': 'invalid-email',
        'password': '123',
        'age': 150,
        'gender': 'Male',
        'occupation_or_academic_level': 'Student',
        'country': 'USA'
    }

    response = client.post('/signup',
                           data=json.dumps(invalid_data),
                           content_type='application/json')

    assert response.status_code == 400
    assert b'errors' in response.data


def test_login_success(client, mock_db):
    hashed_password = generate_password_hash('password123')
    mock_db.find_one.return_value = {
        '_id': ObjectId(),
        'email': 'john@example.com',
        'password': hashed_password,
        'full_name': 'John Doe',
        'current_streak': 0,
        'max_streak': 0,
        'last_login_date': None
    }

    login_data = {'email': 'john@example.com', 'password': 'password123'}

    response = client.post('/login',
                           data=json.dumps(login_data),
                           content_type='application/json')

    assert response.status_code == 200
    assert b'Login successful' in response.data


def test_login_invalid_credentials(client, mock_db):
    mock_db.find_one.return_value = None

    login_data = {'email': 'nonexistent@example.com', 'password': 'password123'}

    response = client.post('/login',
                           data=json.dumps(login_data),
                           content_type='application/json')

    assert response.status_code == 401
    assert b'Invalid email or password' in response.data


def test_get_user_success(client, mock_db):
    user_id = ObjectId()
    mock_db.find_one.return_value = {
        '_id': user_id,
        'full_name': 'John Doe',
        'email': 'john@example.com',
        'age': 25,
        'gender': 'Male',
        'occupation_or_academic_level': 'Student',
        'country': 'USA',
        'current_streak': 5,
        'max_streak': 10,
        'last_login_date': datetime.utcnow(),
        'created_at': datetime.utcnow()
    }

    response = client.get(f'/user/{str(user_id)}')
    assert response.status_code == 200
    assert b'John Doe' in response.data


def test_get_user_not_found(client, mock_db):
    mock_db.find_one.return_value = None

    response = client.get(f'/user/{str(ObjectId())}')
    assert response.status_code == 404
    assert b'User not found' in response.data


def test_get_profile_success(client, mock_db):
    user_id = ObjectId()
    mock_db.find_one.return_value = {
        '_id': user_id,
        'full_name': 'John Doe',
        'email': 'john@example.com',
        'age': 25,
        'gender': 'Male',
        'occupation_or_academic_level': 'Student',
        'country': 'USA',
        'current_streak': 5,
        'max_streak': 10,
        'last_login_date': datetime.utcnow(),
        'created_at': datetime.utcnow(),
        'streak_reset_month': datetime.utcnow().strftime("%Y-%m"),
        'streak_resets_this_month': 1
    }

    response = client.get(f'/profile/{str(user_id)}')
    assert response.status_code == 200
    assert b'John Doe' in response.data


def test_update_profile_success(client, mock_db):
    user_id = ObjectId()
    mock_db.find_one.return_value = {
        '_id': user_id,
        'full_name': 'John Doe',
        'email': 'john@example.com',
        'age': 25,
        'gender': 'Male',
        'occupation_or_academic_level': 'Student',
        'country': 'USA',
        'current_streak': 5,
        'max_streak': 10,
        'last_login_date': datetime.utcnow(),
        'created_at': datetime.utcnow(),
        'streak_reset_month': datetime.utcnow().strftime("%Y-%m"),
        'streak_resets_this_month': 1
    }

    update_data = {'full_name': 'John Smith', 'age': 26}

    response = client.put(f'/profile/{str(user_id)}',
                          data=json.dumps(update_data),
                          content_type='application/json')

    assert response.status_code == 200
    assert b'Profile updated successfully' in response.data


def test_health_check(client, mock_db):
    mock_db.find_one.return_value = True
    response = client.get('/health')
    assert response.status_code == 200
    assert b'Server is running' in response.data


def test_weekly_report_job(mocker, mock_db, mock_mail):
    mock_db.find.return_value = [{
        '_id': ObjectId(),
        'email': 'test@example.com',
        'full_name': 'Test User',
        'current_streak': 5
    }]

    mocker.patch('register.fetch_user_metrics', return_value={})
    mocker.patch('register.generate_html_report', return_value='<html>report</html>')
    mock_send_email = mocker.patch('register.send_email', return_value=True)

    from register import weekly_report_job
    weekly_report_job()

    assert mock_send_email.called


def test_daily_reminder_job(mocker, mock_db, mock_mail):
    mock_db.find.return_value = [{
        '_id': ObjectId(),
        'email': 'test@example.com',
        'full_name': 'Test User',
        'current_streak': 5
    }]

    mock_send_email = mocker.patch('register.send_email', return_value=True)

    from register import daily_reminder_job
    daily_reminder_job()

    assert mock_send_email.called


def test_send_email_success(mocker):
    mocker.patch('register.Message')
    mock_mail_send = mocker.patch('register.mail.send')

    from register import send_email
    result = send_email('test@example.com', 'Test Subject', 'Test Body')

    assert result is True
    assert mock_mail_send.called


def test_fetch_user_metrics(mocker, mock_requests):
    mock_response = MagicMock()
    mock_response.status_code = 200
    mock_response.json.return_value = {'predictions': [{'stress_level': 5}]}
    mock_requests.get.return_value = mock_response

    from register import fetch_user_metrics
    metrics = fetch_user_metrics(str(ObjectId()))

    assert 'stress' in metrics
    assert len(metrics['stress']) > 0


def test_initialize_database_success(mocker):
    mock_client = mocker.patch('register.MongoClient')
    mock_client.return_value.admin.command.return_value = True
    result = initialize_database()
    assert result is True


def test_initialize_database_failure(mocker):
    mock_client = mocker.patch('register.MongoClient')
    mock_client.return_value.admin.command.side_effect = Exception('Connection failed')
    result = initialize_database()
    assert result is False
