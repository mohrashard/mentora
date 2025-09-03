import json
from datetime import datetime, timedelta
import pytest

import academic  # The module under test


# -----------------------------
# Helper fakes for dependencies
# -----------------------------

class SimpleEncoder:
    """Minimal stand-in for sklearn LabelEncoder with .classes_ and .transform"""
    def __init__(self, mapping):
        self.mapping = dict(mapping)
        self.classes_ = list(mapping.keys())

    def transform(self, values):
        out = []
        for v in values:
            if v not in self.mapping:
                raise ValueError(f"{v} not in list")
            out.append(self.mapping[v])
        return out


class IdentityScaler:
    def transform(self, X):
        return X


class ConstantModel:
    def __init__(self, value):
        self.value = value

    def predict(self, X):
        return [self.value]


class InsertOneResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id


class FakeCursor:
    def __init__(self, docs):
        self._docs = list(docs)

    def sort(self, key, direction):
        reverse = direction == -1
        return sorted(self._docs, key=lambda d: d.get(key, datetime.min), reverse=reverse)


class FakeCollection:
    """Very small in-memory collection with required methods"""
    def __init__(self):
        self.docs = []
        self.raise_on_find_one = False

    def find_one(self, query=None):
        if self.raise_on_find_one:
            raise RuntimeError("DB error")
        query = query or {}
        uid = query.get('user_id')
        ts_filter = (query.get('timestamp') or {})
        for d in self.docs:
            if uid is not None and d.get('user_id') != uid:
                continue
            ts = d.get('timestamp', datetime.utcnow())
            gte_ok = ts_filter.get('$gte') is None or ts >= ts_filter['$gte']
            lt_ok = ts_filter.get('$lt') is None or ts < ts_filter['$lt']
            if gte_ok and lt_ok:
                return d
        return None

    def insert_one(self, document):
        self.docs.append(document)
        return InsertOneResult(inserted_id="fake_id_123")

    def find(self, query=None):
        return FakeCursor(self.docs)


# -----------------------------
# Pytest fixtures
# -----------------------------

@pytest.fixture()
def fake_db():
    return FakeCollection()


@pytest.fixture()
def fake_models_and_preprocessing():
    label_encoders = {
        'Gender': SimpleEncoder({'Male': 0, 'Female': 1, 'Other': 2}),
        'Academic_Level': SimpleEncoder({'Undergraduate': 0, 'Postgraduate': 1}),
        'Country': SimpleEncoder({'Sri Lanka': 0, 'Other': 1}),
        'Most_Used_Platform': SimpleEncoder({'Facebook': 0, 'Instagram': 1, 'Other': 2}),
        'Relationship_Status': SimpleEncoder({'Single': 0, 'In Relationship': 1})
    }
    scaler = IdentityScaler()
    academic_model = ConstantModel(1)
    addiction_model = ConstantModel(6.8)
    return label_encoders, scaler, academic_model, addiction_model


@pytest.fixture()
def app_client(monkeypatch, fake_db, fake_models_and_preprocessing):
    academic.students_collection = None
    academic.academic_model = None

    def _init_db():
        academic.students_collection = fake_db
        academic.db = object()
        academic.client = object()
        return True

    def _load_models():
        le, sc, am, adm = fake_models_and_preprocessing
        academic.label_encoders = le
        academic.scaler = sc
        academic.academic_model = am
        academic.addiction_model = adm
        academic.feature_columns = ['dummy']
        return True

    monkeypatch.setattr(academic, "initialize_database", _init_db)
    monkeypatch.setattr(academic, "load_ml_models", _load_models)

    academic.app.config.update(TESTING=True)
    with academic.app.test_client() as client:
        yield client

    academic.students_collection = None
    academic.academic_model = None
    academic.addiction_model = None
    academic.scaler = None
    academic.label_encoders = None


@pytest.fixture()
def valid_payload():
    return {
        "age": 21,
        "gender": "Male",
        "academic_level": "Undergraduate",
        "country": "Sri Lanka",
        "avg_daily_usage_hours": 5.0,
        "most_used_platform": "Instagram",
        "sleep_hours_per_night": 6.5,
        "mental_health_score": 5,
        "relationship_status": "Single",
        "conflicts_over_social_media": 3,
        "user_id": "user123",
        "local_timestamp": datetime.utcnow().isoformat()
    }


# -----------------------------
# Unit tests
# -----------------------------

def test_validate_prediction_data_success(valid_payload):
    errors = academic.validate_prediction_data(valid_payload)
    assert errors == {}


def test_validate_prediction_data_missing_and_invalid_fields():
    payload = {
        "age": "abc",
        "avg_daily_usage_hours": -1,
        "sleep_hours_per_night": 30,
        "mental_health_score": "x",
        "conflicts_over_social_media": 11,
        "local_timestamp": "not-iso"
    }
    errors = academic.validate_prediction_data(payload)
    assert 'age' in errors
    assert 'avg_daily_usage_hours' in errors
    assert 'sleep_hours_per_night' in errors
    assert 'mental_health_score' in errors
    assert 'conflicts_over_social_media' in errors
    assert 'local_timestamp' in errors
    assert 'gender' in errors


def test_generate_personalized_tips_logic():
    input_data = {
        'sleep_hours_per_night': 5.5,
        'mental_health_score': 3,
        'avg_daily_usage_hours': 6.0,
        'conflicts_over_social_media': 6
    }
    tips = academic.generate_personalized_tips("Yes", 8, input_data)
    assert len(tips) <= 5  # capped at 5
    # Must contain at least one stress/sleep related suggestion
    assert any(
        "sleep" in t.lower() or "😴" in t or "rest" in t.lower()
        for t in tips
    )
    # Must contain at least one digital usage or conflict related tip
    assert any(
        "usage" in t.lower() or "🚨" in t or "conflict" in t.lower()
        for t in tips
    )


def test_predict_social_media_impact_with_fallback(fake_models_and_preprocessing):
    le, sc, am, adm = fake_models_and_preprocessing
    academic.label_encoders = le
    academic.scaler = sc
    academic.academic_model = am
    academic.addiction_model = adm

    academic_result, addiction_score = academic.predict_social_media_impact(
        age=20, gender="UnknownGender", academic_level="UnknownLevel",
        country="UnknownCountry", avg_daily_usage=4.2,
        platform="UnknownPlatform", sleep_hours=7.0,
        mental_health_score=6, relationship_status="UnknownRel",
        conflicts=2
    )
    assert academic_result in {"Yes", "No"}
    assert addiction_score == 7


# -----------------------------
# API endpoint tests (happy path)
# -----------------------------

def test_home_endpoint(app_client):
    resp = app_client.get("/")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["message"] == "Academic Performance Prediction API"


def test_health_ok(app_client):
    resp = app_client.get("/health")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "Server is running"
    assert data["database"] == "Connected"
    assert data["ml_models"] == "Loaded"


def test_predict_success(app_client, valid_payload, fake_db):
    resp = app_client.post(
        "/predictacademicperformance",
        data=json.dumps(valid_payload),
        content_type="application/json"
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["message"] == "Prediction completed successfully"
    assert "prediction_id" in data
    assert "results" in data
    assert len(fake_db.docs) == 1


def test_get_today_prediction_found(app_client, fake_db):
    now = datetime.utcnow()
    doc = {
        "user_id": "user123",
        "predictions": {"affects_academic_performance": "Yes", "addiction_score": 7},
        "personalized_tips": ["tip1", "tip2"],
        "timestamp": now,
        "local_timestamp": now.isoformat()
    }
    fake_db.docs.append(doc)

    resp = app_client.get("/get_today_prediction?user_id=user123")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["results"]["affects_academic_performance"] == "Yes"


def test_academic_history_success(app_client, fake_db):
    now = datetime.utcnow()
    fake_db.docs.extend([
        {
            "_id": "id1",
            "user_id": "user123",
            "timestamp": now - timedelta(hours=2),
            "input_data": {
                "local_timestamp": (now - timedelta(hours=2)).isoformat(),
                "avg_daily_usage_hours": 4.0,
                "sleep_hours_per_night": 7.0,
                "mental_health_score": 5
            },
            "predictions": {"affects_academic_performance": "No", "addiction_score": 3}
        }
    ])
    resp = app_client.get("/academichistory?user_id=user123")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["user_id"] == "user123"


# -----------------------------
# API endpoint tests (negative)
# -----------------------------

def test_before_request_db_failure(monkeypatch):
    academic.students_collection = None
    academic.academic_model = None

    monkeypatch.setattr(academic, "initialize_database", lambda: False)
    monkeypatch.setattr(academic, "load_ml_models", lambda: True)

    academic.app.config.update(TESTING=True)
    with academic.app.test_client() as client:
        resp = client.get("/")
        assert resp.status_code == 500


def test_before_request_model_failure(monkeypatch):
    academic.students_collection = None
    academic.academic_model = None

    monkeypatch.setattr(academic, "initialize_database", lambda: True)
    monkeypatch.setattr(academic, "load_ml_models", lambda: False)

    academic.app.config.update(TESTING=True)
    with academic.app.test_client() as client:
        resp = client.get("/")
        assert resp.status_code == 500


def test_health_error_branch(monkeypatch, app_client, fake_db):
    fake_db.raise_on_find_one = True
    resp = app_client.get("/health")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["database"] == "Error"
    assert data["ml_models"] == "Error"


def test_predict_missing_body(app_client):
    # Send an empty JSON payload with correct header
    resp = app_client.post(
        "/predictacademicperformance",
        data=json.dumps({}),
        content_type="application/json"
    )
    assert resp.status_code == 400
    data = resp.get_json()
    assert "message" in data


def test_predict_validation_errors(app_client):
    payload = {"age": 200}
    resp = app_client.post(
        "/predictacademicperformance",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert resp.status_code == 400


def test_get_today_prediction_missing_user(app_client):
    resp = app_client.get("/get_today_prediction")
    assert resp.status_code == 400


def test_get_today_prediction_not_found(app_client):
    resp = app_client.get("/get_today_prediction?user_id=unknown_user")
    assert resp.status_code == 404


def test_academic_history_missing_user_id(app_client):
    resp = app_client.get("/academichistory")
    assert resp.status_code == 400


def test_academic_history_invalid_date_params(app_client):
    resp = app_client.get("/academichistory?user_id=u&from_date=2025-13-40")
    assert resp.status_code == 400
