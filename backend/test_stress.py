import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timezone, timedelta
from bson import ObjectId
import numpy as np
import joblib
from flask import json
import stress

# Import without globals
from stress import (
    app,
    initialize_db,
    load_model_artifacts,
    get_user_profile,
    estimate_bmi_category,
    estimate_heart_rate,
    estimate_bp,
    preprocess_input,
    save_prediction_to_db,
    get_stress_category
)


@pytest.fixture(autouse=True)
def reset_globals():
    stress.client = None
    stress.db = None
    stress.users_collection = None
    stress.predictions_collection = None
    stress.model = None
    stress.scaler = None
    stress.metadata = None


@pytest.fixture
def mock_mongo():
    with patch('stress.MongoClient') as mock_client:
        mock_instance = MagicMock()
        mock_db = MagicMock()
        mock_users = MagicMock()
        mock_predictions = MagicMock()
        mock_client.return_value = mock_instance
        mock_instance.__getitem__.return_value = mock_db
        mock_db.__getitem__.side_effect = lambda name: mock_users if name == 'users' else mock_predictions
        yield mock_client, mock_users, mock_predictions


@pytest.fixture
def mock_joblib():
    with patch('stress.joblib.load') as mock_load:
        yield mock_load


@pytest.fixture
def mock_os():
    with patch('stress.os.path.exists') as mock_exists, patch('stress.os.getenv') as mock_getenv:
        mock_getenv.side_effect = lambda k, d: d
        yield mock_exists, mock_getenv


@pytest.fixture
def mock_datetime():
    with patch('stress.datetime') as mock_dt:
        mock_dt.now.return_value = datetime(2023, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
        mock_dt.strptime = datetime.strptime
        yield mock_dt


@pytest.fixture
def test_app(mock_mongo, mock_joblib, mock_os, mock_datetime):
    # Reset globals
    stress.client = None
    stress.db = None
    stress.users_collection = None
    stress.predictions_collection = None
    stress.model = None
    stress.scaler = None
    stress.metadata = None

    # Mock load_model_artifacts to load dummies
    dummy_model = MagicMock()
    dummy_model.predict.return_value = [5.0]
    dummy_scaler = MagicMock()
    dummy_scaler.transform.return_value = np.array([[0.0]])
    dummy_metadata = {
        'bmi_mapping': {'Normal': 0, 'Overweight': 1, 'Obese': 2},
        'gender_mapping': {'Male': 1, 'Female': 0},
        'occupation_categories': {
            'high_stress': ['Doctor'],
            'medium_stress': ['Teacher']
        },
        'selected_features': [
            'Age', 'Sleep Duration', 'Quality of Sleep', 'Physical Activity Level',
            'BMI_Numeric', 'Heart Rate', 'Daily Steps', 'Systolic_BP', 'Diastolic_BP',
            'Gender_Numeric', 'Occupation_Stress_Level', 'Has_Sleep_Disorder',
            'Sleep_Efficiency', 'Activity_to_Steps_Ratio', 'BP_Product'
        ]
    }
    mock_joblib.side_effect = [dummy_model, dummy_scaler, dummy_metadata]

    mock_os[0].return_value = True  # exists True

    # Initialize
    initialize_db()
    load_model_artifacts()

    yield app

    # Cleanup globals if needed


@pytest.fixture
def test_client(test_app):
    return test_app.test_client()


# Tests for initialization functions

def test_initialize_db_success(mock_mongo):
    assert initialize_db() is True
    assert stress.client is not None


def test_initialize_db_failure(mock_mongo):
    mock_mongo[0].side_effect = Exception("Connection failed")
    assert initialize_db() is False
    assert stress.client is None


def test_load_model_artifacts_success(mock_joblib, mock_os):
    mock_os[0].return_value = True
    dummy_model = MagicMock()
    dummy_scaler = MagicMock()
    dummy_metadata = MagicMock()
    mock_joblib.side_effect = [dummy_model, dummy_scaler, dummy_metadata]
    assert load_model_artifacts() is True
    assert stress.model is not None
    assert stress.scaler is not None
    assert stress.metadata is not None


def test_load_model_artifacts_file_not_found(mock_joblib, mock_os):
    mock_os[0].return_value = False
    assert load_model_artifacts() is False
    assert stress.model is None


def test_load_model_artifacts_exception(mock_joblib, mock_os):
    mock_os[0].return_value = True
    mock_joblib.side_effect = Exception("Load failed")
    assert load_model_artifacts() is False
    assert stress.model is None


# Tests for utility functions

def test_get_user_profile_found(mock_mongo):
    stress.users_collection = mock_mongo[1]
    mock_users = mock_mongo[1]
    mock_users.find_one.return_value = {
        'age': 25,
        'gender': 'Male',
        'occupation_or_academic_level': 'Engineer'
    }
    profile = get_user_profile('507f1f77bcf86cd799439011')
    assert profile == {'age': 25, 'gender': 'Male', 'occupation': 'Engineer'}


def test_get_user_profile_not_found(mock_mongo):
    stress.users_collection = mock_mongo[1]
    mock_users = mock_mongo[1]
    mock_users.find_one.return_value = None
    profile = get_user_profile('507f1f77bcf86cd799439011')
    assert profile is None


def test_get_user_profile_invalid_id(mock_mongo):
    stress.users_collection = mock_mongo[1]
    profile = get_user_profile('invalid')
    assert profile is None


def test_get_user_profile_no_collection():
    stress.users_collection = None
    profile = get_user_profile('507f1f77bcf86cd799439011')
    assert profile is None


def test_estimate_bmi_category():
    assert estimate_bmi_category(170, 50) == "Underweight"
    assert estimate_bmi_category(170, 65) == "Normal"
    assert estimate_bmi_category(170, 80) == "Overweight"
    assert estimate_bmi_category(170, 100) == "Obese"
    assert estimate_bmi_category(0, 0) == "Normal"  # Error case


def test_estimate_heart_rate():
    assert estimate_heart_rate(20, 80) == 75
    assert estimate_heart_rate(40, 50) == 80


def test_estimate_bp():
    assert estimate_bp(20, "Normal") == (110, 70)
    assert estimate_bp(40, "Overweight") == (120, 76)


def test_preprocess_input(test_app):  # Uses metadata
    input_data = {
        'sleep_duration': 8.0,
        'quality_of_sleep': 8.0,
        'daily_steps': 6000,
        'physical_activity_level': 60,
        'height_cm': 170,
        'weight_kg': 65,
        'gender': 'Male',
        'occupation': 'Doctor',
        'heart_rate': 70,
        'systolic_bp': 120,
        'diastolic_bp': 80,
        'has_sleep_disorder': 'yes'
    }
    user_profile = {'age': 30, 'gender': 'Male', 'occupation': 'Doctor'}
    features = preprocess_input(input_data, user_profile)
    assert len(features) == 15
    assert features[0] == 30.0  # Age
    assert features[4] == 0  # BMI_Numeric Normal
    assert features[10] == 2  # Occupation high stress
    assert features[11] == 1  # Has sleep disorder


def test_preprocess_input_missing_data(test_app):
    input_data = {}
    user_profile = {'age': 30, 'gender': 'Female', 'occupation': 'Student'}
    features = preprocess_input(input_data, user_profile)
    assert features[0] == 30.0
    assert features[1] == 7.0  # Default sleep
    assert features[9] == 0  # Gender Female


def test_preprocess_input_exception(test_app):
    input_data = {'sleep_duration': 'invalid'}
    user_profile = {'age': 30, 'gender': 'Male', 'occupation': 'Student'}
    with pytest.raises(Exception):
        preprocess_input(input_data, user_profile)


def test_save_prediction_to_db(mock_mongo, mock_datetime):
    stress.predictions_collection = mock_mongo[2]
    mock_predictions = mock_mongo[2]
    inserted_mock = MagicMock()
    inserted_mock.inserted_id = '123'
    mock_predictions.insert_one.return_value = inserted_mock
    db_id = save_prediction_to_db('user1', {'data': 'input'}, 5.0, 'pred1')
    assert db_id == '123'


def test_save_prediction_to_db_no_db():
    stress.predictions_collection = None
    db_id = save_prediction_to_db('user1', {'data': 'input'}, 5.0)
    assert db_id is None


def test_save_prediction_to_db_exception(mock_mongo):
    stress.predictions_collection = mock_mongo[2]
    mock_predictions = mock_mongo[2]
    mock_predictions.insert_one.side_effect = Exception("Save failed")
    db_id = save_prediction_to_db('user1', {'data': 'input'}, 5.0)
    assert db_id is None


def test_get_stress_category():
    assert get_stress_category(2) == "Low Stress"
    assert get_stress_category(5) == "Medium Stress"
    assert get_stress_category(8) == "High Stress"


# Tests for routes

def test_home(test_client):
    response = test_client.get('/')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert 'message' in data
    assert 'endpoints' in data


def test_health(test_client):
    response = test_client.get('/health')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['status'] == 'healthy'
    assert data['model_loaded'] is True
    assert data['database_connected'] is True


def test_health_no_model(mock_mongo, mock_os, mock_joblib, test_client):
    stress.model = None
    stress.scaler = None
    stress.metadata = None
    mock_os[0].return_value = False
    load_model_artifacts()
    response = test_client.get('/health')
    data = json.loads(response.data)
    assert data['model_loaded'] is False


def test_predict_stress_success(test_client, mock_mongo):
    stress.users_collection = mock_mongo[1]
    mock_users = mock_mongo[1]
    mock_users.find_one.return_value = {'age': 30, 'gender': 'Male', 'occupation_or_academic_level': 'Doctor'}
    data = {
        'user_id': '507f1f77bcf86cd799439011',
        'sleep_duration': 7.0,
        'quality_of_sleep': 7.0
    }
    response = test_client.post('/predict', json=data)
    assert response.status_code == 200
    resp_data = json.loads(response.data)
    assert resp_data['success'] is True
    assert resp_data['prediction']['stress_level'] == 5.0


def test_predict_stress_no_model(test_client, mock_mongo):
    stress.model = None
    stress.scaler = None
    stress.metadata = None
    data = {'user_id': '507f1f77bcf86cd799439011'}
    response = test_client.post('/predict', json=data)
    assert response.status_code == 500
    resp_data = json.loads(response.data)
    assert resp_data['success'] is False
    assert 'Model not loaded' in resp_data['error']


def test_predict_stress_no_data(test_client):
    response = test_client.post('/predict', json={})
    assert response.status_code == 400
    resp_data = json.loads(response.data)
    assert resp_data['success'] is False
    assert 'No data provided' in resp_data['error']


def test_predict_stress_no_user_id(test_client):
    data = {'sleep_duration': 7.0}
    response = test_client.post('/predict', json=data)
    assert response.status_code == 400
    resp_data = json.loads(response.data)
    assert 'User ID is required' in resp_data['error']


def test_predict_stress_user_not_found(test_client, mock_mongo):
    stress.users_collection = mock_mongo[1]
    mock_users = mock_mongo[1]
    mock_users.find_one.return_value = None
    data = {'user_id': '507f1f77bcf86cd799439011'}
    response = test_client.post('/predict', json=data)
    assert response.status_code == 404
    resp_data = json.loads(response.data)
    assert 'User profile not found' in resp_data['error']


def test_predict_stress_exception(test_client, mock_mongo):
    stress.users_collection = mock_mongo[1]
    mock_users = mock_mongo[1]
    mock_users.find_one.return_value = {'age': 30, 'gender': 'Male', 'occupation_or_academic_level': 'Doctor'}
    with patch('stress.preprocess_input', side_effect=Exception("Preprocess failed")):
        data = {'user_id': '507f1f77bcf86cd799439011'}
        response = test_client.post('/predict', json=data)
        assert response.status_code == 500
        resp_data = json.loads(response.data)
        assert 'Prediction failed' in resp_data['error']


def test_get_prediction_history_success(test_client, mock_mongo):
    stress.predictions_collection = mock_mongo[2]
    mock_predictions = mock_mongo[2]
    mock_predictions.find.return_value = MagicMock()
    mock_predictions.find.return_value.sort.return_value.skip.return_value.limit.return_value = [
        {
            '_id': ObjectId(),
            'prediction_id': 'pred1',
            'timestamp': datetime.now(timezone.utc),
            'predicted_stress_level': 5.0,
            'stress_category': 'Medium Stress',
            'input_data': {}
        }
    ]
    mock_predictions.count_documents.return_value = 1
    response = test_client.get('/predictions/history?user_id=user1&limit=10&skip=0')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert len(data['predictions']) == 1
    assert data['total_count'] == 1


def test_get_prediction_history_no_db(test_client):
    stress.predictions_collection = None
    response = test_client.get('/predictions/history?user_id=user1')
    assert response.status_code == 500
    data = json.loads(response.data)
    assert 'Database not connected' in data['error']


def test_get_prediction_history_no_user_id(test_client):
    response = test_client.get('/predictions/history')
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'User ID is required' in data['error']


def test_get_prediction_history_invalid_limit(test_client):
    response = test_client.get('/predictions/history?user_id=user1&limit=abc')
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'Invalid limit or skip value' in data['error']


def test_get_prediction_history_exception(test_client, mock_mongo):
    stress.predictions_collection = mock_mongo[2]
    mock_predictions = mock_mongo[2]
    mock_predictions.find.side_effect = Exception("Find failed")
    response = test_client.get('/predictions/history?user_id=user1')
    assert response.status_code == 500
    data = json.loads(response.data)
    assert 'Failed to fetch history' in data['error']


def test_get_prediction_by_id_success(test_client, mock_mongo):
    stress.predictions_collection = mock_mongo[2]
    mock_predictions = mock_mongo[2]
    mock_predictions.find_one.return_value = {
        '_id': ObjectId('507f1f77bcf86cd799439011'),
        'prediction_id': 'pred1',
        'timestamp': datetime.now(timezone.utc),
        'predicted_stress_level': 5.0,
        'stress_category': 'Medium Stress',
        'input_data': {}
    }
    response = test_client.get('/predictions/507f1f77bcf86cd799439011')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert data['prediction']['predicted_stress_level'] == 5.0


def test_get_prediction_by_id_not_found(test_client, mock_mongo):
    stress.predictions_collection = mock_mongo[2]
    mock_predictions = mock_mongo[2]
    mock_predictions.find_one.return_value = None
    response = test_client.get('/predictions/invalid')
    assert response.status_code == 404
    data = json.loads(response.data)
    assert 'Prediction not found' in data['error']


def test_get_prediction_by_id_exception(test_client, mock_mongo):
    stress.predictions_collection = mock_mongo[2]
    mock_predictions = mock_mongo[2]
    mock_predictions.find_one.side_effect = Exception("Find failed")
    response = test_client.get('/predictions/507f1f77bcf86cd799439011')
    assert response.status_code == 500
    data = json.loads(response.data)
    assert 'Failed to fetch prediction' in data['error']


def test_get_prediction_stats_success(test_client, mock_mongo):
    stress.predictions_collection = mock_mongo[2]
    mock_predictions = mock_mongo[2]
    mock_predictions.aggregate.side_effect = [
        [{'_id': None, 'total_predictions': 2, 'avg_stress_level': 5.5, 'min_stress_level': 5.0, 'max_stress_level': 6.0}],
        [{'_id': 'Medium Stress', 'count': 2}]
    ]
    response = test_client.get('/stats?user_id=user1')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert data['stats']['avg_stress_level'] == 5.5
    assert data['category_distribution']['Medium Stress'] == 2
    assert data['category_distribution']['Low Stress'] == 0


def test_get_prediction_stats_no_db(test_client):
    stress.predictions_collection = None
    response = test_client.get('/stats?user_id=user1')
    assert response.status_code == 500
    data = json.loads(response.data)
    assert 'Database not connected' in data['error']


def test_get_prediction_stats_no_user_id(test_client):
    response = test_client.get('/stats')
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'User ID is required' in data['error']


def test_get_prediction_stats_exception(test_client, mock_mongo):
    stress.predictions_collection = mock_mongo[2]
    mock_predictions = mock_mongo[2]
    mock_predictions.aggregate.side_effect = Exception("Aggregate failed")
    response = test_client.get('/stats?user_id=user1')
    assert response.status_code == 500
    data = json.loads(response.data)
    assert 'Failed to fetch stats' in data['error']


def test_get_stress_history_success(test_client, mock_mongo):
    stress.predictions_collection = mock_mongo[2]
    mock_predictions = mock_mongo[2]
    mock_predictions.find.return_value = MagicMock()
    mock_predictions.find.return_value.sort.return_value.skip.return_value.limit.return_value = [
        {
            '_id': ObjectId(),
            'timestamp': datetime.now(timezone.utc),
            'predicted_stress_level': 5.0,
            'stress_category': 'Medium Stress',
            'input_data': {'quality_of_sleep': 7, 'physical_activity_level': 50, 'daily_steps': 5000}
        }
    ]
    mock_predictions.count_documents.return_value = 1
    response = test_client.get('/stresshistory?user_id=user1&limit=10&skip=0&category=Medium Stress&sort=oldest&start_date=2023-01-01&min_stress=4&max_stress=6')
    assert response.status_code == 200
    data = json.loads(response.data)
    assert data['success'] is True
    assert len(data['predictions']) == 1
    assert data['total_count'] == 1


def test_get_stress_history_no_db(test_client):
    stress.predictions_collection = None
    response = test_client.get('/stresshistory?user_id=user1')
    assert response.status_code == 500
    data = json.loads(response.data)
    assert 'Database not connected' in data['error']


def test_get_stress_history_no_user_id(test_client):
    response = test_client.get('/stresshistory')
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'User ID is required' in data['error']


def test_get_stress_history_invalid_date(test_client):
    response = test_client.get('/stresshistory?user_id=user1&start_date=invalid')
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'Invalid date format' in data['error']


def test_get_stress_history_invalid_stress(test_client):
    response = test_client.get('/stresshistory?user_id=user1&min_stress=abc')
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'Stress levels must be numeric' in data['error']


def test_get_stress_history_invalid_category(test_client):
    response = test_client.get('/stresshistory?user_id=user1&category=Invalid')
    assert response.status_code == 400
    data = json.loads(response.data)
    assert 'Invalid category' in data['error']


def test_get_stress_history_exception(test_client, mock_mongo):
    stress.predictions_collection = mock_mongo[2]
    mock_predictions = mock_mongo[2]
    mock_predictions.find.side_effect = Exception("Find failed")
    response = test_client.get('/stresshistory?user_id=user1')
    assert response.status_code == 500
    data = json.loads(response.data)
    assert 'Failed to fetch stress history' in data['error']


def test_not_found(test_client):
    response = test_client.get('/invalid')
    assert response.status_code == 404
    data = json.loads(response.data)
    assert 'Endpoint not found' in data['error']