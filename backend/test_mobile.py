# test_mobile.py (corrected)
# test_mobile.py
import importlib
import sys
import json
from datetime import datetime, timedelta, timezone
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest


# --- Helpers to safely import the module while preventing real MongoDB connections ---
class _DummyCollection:
    """A minimal dummy collection returned during import-time DB setup (not used for real DB ops)."""
    def __getitem__(self, key):
        return self


class _DummyDB:
    def __getitem__(self, name):
        return _DummyCollection()


class _DummyMongoClient:
    def __init__(self, *args, **kwargs):
        pass

    def server_info(self):
        # pretend server is available
        return {}

    def __getitem__(self, name):
        return _DummyDB()


def _reload_module(monkeypatch):
    """
    Reload the mobile module after monkeypatching pymongo.MongoClient so the module's
    import-time DB connection won't attempt a real network call.
    """
    # Patch pymongo.MongoClient before importing the module so import-time connection doesn't run.
    monkeypatch.setattr("pymongo.MongoClient", _DummyMongoClient, raising=True)

    # Ensure a fresh import
    if "mobile" in sys.modules:
        del sys.modules["mobile"]
    module = importlib.import_module("mobile")
    # reload to make sure monkeypatch applied (defensive)
    module = importlib.reload(module)
    return module


# --- Fixtures ---
@pytest.fixture
def mobile_mod(monkeypatch):
    return _reload_module(monkeypatch)


@pytest.fixture
def client(mobile_mod):
    """Returns a Flask test client bound to a clean module instance."""
    return mobile_mod.app.test_client()


# --- Small utility for creating a dummy ML model used in predictions ---
class DummyModel:
    def __init__(self, encoded_prediction=0, proba=None, raise_on_predict=False):
        self.encoded_prediction = encoded_prediction
        self._proba = proba
        self.raise_on_predict = raise_on_predict

    def predict(self, X):
        if self.raise_on_predict:
            raise RuntimeError("Model failure")
        return [self.encoded_prediction]

    def predict_proba(self, X):
        return self._proba


# --- Dummy cursor for simulating MongoDB cursor chaining (find().sort().limit()) ---
class DummyCursor:
    def __init__(self, data):
        self._data = data

    def sort(self, *args, **kwargs):
        return self

    def limit(self, n):
        return self

    def __iter__(self):
        return iter(self._data)


# Sentinel for defaults
_sentinel = object()

# --- Small helper to set model environment quickly in tests ---
def setup_model_environment(mobile_mod,
                            model=_sentinel,
                            scaler=None,
                            label_encoder=_sentinel,
                            feature_columns=_sentinel,
                            model_metadata=_sentinel,
                            mobile_collection=None):
    """
    Configure module-level globals so endpoints bypass the before_request model-check.
    """
    mobile_mod.model = object() if model is _sentinel else model
    mobile_mod.scaler = scaler
    mobile_mod.label_encoder = MagicMock() if label_encoder is _sentinel else label_encoder
    mobile_mod.feature_columns = [] if feature_columns is _sentinel else feature_columns
    mobile_mod.model_metadata = {"best_model_name": "TestModel", "best_accuracy": 0.0, "requires_scaling": False} if model_metadata is _sentinel else model_metadata
    # If test wants to control DB behaviour, pass mobile_collection object/mock
    mobile_mod.mobile_collection = mobile_collection


# ----------------------
# Unit tests - pure functions
# ----------------------
def test_validate_input_data_all_valid(mobile_mod):
    data = {
        "user_id": "user1",
        "daily_screen_time": 3.5,
        "app_sessions": 10,
        "social_media_usage": 1.5,
        "gaming_time": 0.5,
        "notifications": 20,
        "night_usage": 0.5,
        "age": 25,
        "work_study_hours": 6,
        "stress_level": 3,
        "apps_installed": 15
    }
    errors = mobile_mod.validate_input_data(data)
    assert errors == {}, f"Expected no validation errors but got: {errors}"


def test_validate_input_data_missing_and_invalid_fields(mobile_mod):
    # missing many fields and invalid types
    data = {
        "user_id": "",  # empty should be flagged
        "daily_screen_time": "abc",
        "app_sessions": -5,
        "social_media_usage": 30,  # out of range
        # gaming_time missing
        "notifications": "many",
        "night_usage": None,
        "age": 9,  # below min
        "work_study_hours": 30,  # above max
        "stress_level": "high",
        # apps_installed missing
    }
    errors = mobile_mod.validate_input_data(data)
    # check that several expected keys are present in errors
    assert "user_id" in errors
    assert "daily_screen_time" in errors
    assert "app_sessions" in errors
    assert "gaming_time" in errors
    assert "notifications" in errors
    assert "age" in errors
    assert "apps_installed" in errors


def test_generate_personalized_tips_addicted_and_non_addicted(mobile_mod):
    addicted_input = {
        "daily_screen_time": 9,
        "social_media_usage": 4,
        "gaming_time": 3,
        "notifications": 200,
        "night_usage": 3,
        "stress_level": 9,
        "app_sessions": 150
    }
    tips_addicted = mobile_mod.generate_personalized_tips(addicted_input, "addicted")
    assert isinstance(tips_addicted, list)
    # should include prediction-specific tips for 'addicted'
    assert any("phone-free" in tip.lower() or "grayscale" in tip.lower() or "set specific times" in tip.lower()
               for tip in tips_addicted)
    assert 3 <= len(tips_addicted) <= 8

    non_addicted_input = {
        "daily_screen_time": 1,
        "social_media_usage": 0.5,
        "gaming_time": 0,
        "notifications": 10,
        "night_usage": 0.2,
        "stress_level": 2,
        "app_sessions": 5
    }
    tips_non = mobile_mod.generate_personalized_tips(non_addicted_input, "not_addicted")
    assert isinstance(tips_non, list)
    assert any("maintain" in tip.lower() or "monitoring" in tip.lower() or "phone-free zones" in tip.lower()
               for tip in tips_non)
    assert 3 <= len(tips_non) <= 8


def test_save_to_mongodb_behavior(mobile_mod):
    # When mobile_collection is None -> should return False
    mobile_mod.mobile_collection = None
    ok = mobile_mod.save_to_mongodb("u1", {"a": 1}, {"prediction": "x"})
    assert ok is False

    # When mobile_collection has insert_one -> returns True and insert_one called with expected keys
    mock_collection = MagicMock()
    mock_collection.insert_one.return_value = MagicMock(inserted_id="fakeid123")
    mobile_mod.mobile_collection = mock_collection

    now_before = datetime.now(timezone.utc)
    success = mobile_mod.save_to_mongodb("u1", {"a": 2}, {"prediction": "y"})
    assert success is True
    assert mock_collection.insert_one.call_count == 1
    inserted_doc = mock_collection.insert_one.call_args[0][0]
    assert inserted_doc["user_id"] == "u1"
    assert "created_at" in inserted_doc
    assert "date" in inserted_doc
    # created_at should be a datetime close to now
    assert isinstance(inserted_doc["created_at"], datetime)
    assert inserted_doc["created_at"] >= now_before


def test_get_today_prediction_from_db_variants(mobile_mod):
    # If mobile_collection is None -> returns None
    mobile_mod.mobile_collection = None
    assert mobile_mod.get_today_prediction_from_db("u1") is None

    # If find_one returns a document -> returns prediction_result
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    doc = {"_id": "obj1", "prediction_result": {"prediction": "addicted"}, "user_id": "u1", "date": today_str}
    mock_collection = MagicMock()
    mock_collection.find_one.return_value = doc
    mobile_mod.mobile_collection = mock_collection
    pred = mobile_mod.get_today_prediction_from_db("u1")
    assert pred == doc["prediction_result"]

    # If find_one raises -> return None
    mock_collection.find_one.side_effect = Exception("db error")
    mobile_mod.mobile_collection = mock_collection
    assert mobile_mod.get_today_prediction_from_db("u1") is None


# ----------------------
# Integration-style tests for Flask endpoints (with mocks)
# ----------------------
def test_before_request_blocks_when_model_not_loaded(client, mobile_mod):
    # ensure model or essential components are None to trigger the before_request guard
    setup_model_environment(mobile_mod, model=None, label_encoder=None, feature_columns=None, model_metadata=None)
    resp = client.get("/health")
    assert resp.status_code == 500
    data = resp.get_json()
    assert "error" in data
    assert "Model not loaded" in data["error"]


def test_home_endpoint_when_model_loaded(client, mobile_mod):
    # Setup a loaded model environment
    feature_cols = ["daily_screen_time", "app_sessions"]
    meta = {"best_model_name": "RF", "best_accuracy": 0.8765}
    setup_model_environment(
        mobile_mod,
        model=object(),
        label_encoder=object(),
        feature_columns=feature_cols,
        model_metadata=meta,
        mobile_collection=MagicMock()  # indicate DB connected
    )
    resp = client.get("/")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["message"] == "Mobile Usage Analysis API"
    assert data["model_info"]["model_name"] == "RF"
    # accuracy formatted in string with 4 decimal places by endpoint
    assert "accuracy" in data["model_info"]
    assert data["model_info"]["features_count"] == len(feature_cols)
    assert data["mongodb_status"] == "Connected"


def test_analyze_mobile_usage_success_flow(client, mobile_mod):
    # Prepare a realistic feature list and model pipeline mocks
    feature_cols = [
        'daily_screen_time', 'app_sessions', 'social_media_usage', 'gaming_time',
        'notifications', 'night_usage', 'age', 'work_study_hours', 'stress_level', 'apps_installed'
    ]
    # Dummy model: encoded label 1 with predict_proba returning probabilities [0.05, 0.95]
    dummy_model = DummyModel(encoded_prediction=1, proba=[[0.05, 0.95]])
    label_enc = MagicMock()
    label_enc.inverse_transform.return_value = ["addicted"]  # return label text

    # Ensure no scaling required for simplicity
    meta = {"best_model_name": "Dummy", "best_accuracy": 0.99, "requires_scaling": False}

    # Mock DB and functions
    mock_collection = MagicMock()
    mock_collection.insert_one.return_value = MagicMock(inserted_id="id1")

    # Make sure get_today_prediction_from_db returns None (so analysis runs)
    mobile_mod.get_today_prediction_from_db = lambda uid: None
    save_calls = []

    def fake_save(user_id, input_data, prediction_result):
        save_calls.append((user_id, input_data, prediction_result))
        return True

    # Setup environment
    setup_model_environment(
        mobile_mod,
        model=dummy_model,
        scaler=None,
        label_encoder=label_enc,
        feature_columns=feature_cols,
        model_metadata=meta,
        mobile_collection=mock_collection
    )
    # patch save_to_mongodb to observe calls
    mobile_mod.save_to_mongodb = fake_save

    # Valid payload
    payload = {
        "user_id": "u123",
        "daily_screen_time": 7.5,
        "app_sessions": 50,
        "social_media_usage": 2.5,
        "gaming_time": 1.0,
        "notifications": 80,
        "night_usage": 1.2,
        "age": 28,
        "work_study_hours": 6.5,
        "stress_level": 4,
        "apps_installed": 50
    }

    resp = client.post("/analyze_mobile_usage", json=payload)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["prediction"] == "addicted"
    assert "confidence" in data
    # confidence should be formatted as "95.0%"
    assert data["confidence"].endswith("%")
    assert data["input_summary"]["daily_screen_time"] == float(payload["daily_screen_time"])
    # confirm that save_to_mongodb was called (via fake_save)
    assert len(save_calls) == 1
    saved_user, saved_input, saved_result = save_calls[0]
    assert saved_user == payload["user_id"]
    assert isinstance(saved_result, dict) and "prediction" in saved_result


def test_analyze_mobile_usage_returns_existing_prediction_when_present(client, mobile_mod):
    setup_model_environment(mobile_mod,
                            model=object(),
                            label_encoder=object(),
                            feature_columns=["daily_screen_time"],
                            model_metadata={"requires_scaling": False},
                            mobile_collection=MagicMock())
    # Simulate existing prediction returned by DB helper
    mobile_mod.get_today_prediction_from_db = lambda uid: {"prediction": "already", "from_db": True}
    payload = {"user_id": "u_exist"}
    resp = client.post("/analyze_mobile_usage", json=payload)
    assert resp.status_code == 200
    assert resp.get_json() == {"prediction": "already", "from_db": True}


def test_analyze_mobile_usage_validation_failure(client, mobile_mod):
    # Setup model so before_request doesn't block
    setup_model_environment(
        mobile_mod,
        model=object(),
        label_encoder=object(),
        feature_columns=['daily_screen_time', 'app_sessions', 'social_media_usage',
                         'gaming_time', 'notifications', 'night_usage', 'age', 'work_study_hours',
                         'stress_level', 'apps_installed'],
        model_metadata={"requires_scaling": False},
        mobile_collection=MagicMock()
    )
    # Mock get_today_prediction_from_db to return None so validation runs
    mobile_mod.get_today_prediction_from_db = lambda uid: None

    # Missing required fields
    payload = {"user_id": "u_bad"}
    resp = client.post("/analyze_mobile_usage", json=payload)
    assert resp.status_code == 400
    data = resp.get_json()
    assert data["error"] == "Validation failed"
    assert "details" in data and isinstance(data["details"], dict)


def test_analyze_mobile_usage_model_failure_returns_500(client, mobile_mod):
    # Prepare feature list
    feature_cols = ['daily_screen_time', 'app_sessions', 'social_media_usage', 'gaming_time',
                    'notifications', 'night_usage', 'age', 'work_study_hours', 'stress_level', 'apps_installed']
    # Dummy model that raises on predict
    failing_model = DummyModel(raise_on_predict=True)
    label_enc = MagicMock()
    label_enc.inverse_transform.return_value = ["unknown"]

    setup_model_environment(
        mobile_mod,
        model=failing_model,
        scaler=None,
        label_encoder=label_enc,
        feature_columns=feature_cols,
        model_metadata={"requires_scaling": False},
        mobile_collection=MagicMock()
    )
    # Mock get_today_prediction_from_db to return None so validation runs
    mobile_mod.get_today_prediction_from_db = lambda uid: None

    # Provide a full valid payload (structure only; model will throw)
    payload = {
        "user_id": "uerr",
        "daily_screen_time": 2.0,
        "app_sessions": 5,
        "social_media_usage": 1.0,
        "gaming_time": 0.0,
        "notifications": 5,
        "night_usage": 0.1,
        "age": 30,
        "work_study_hours": 6.0,
        "stress_level": 2,
        "apps_installed": 10
    }
    resp = client.post("/analyze_mobile_usage", json=payload)
    assert resp.status_code == 500
    data = resp.get_json()
    assert "Prediction failed" in data["error"]


def test_get_today_prediction_endpoint_variants(client, mobile_mod):
    setup_model_environment(mobile_mod, model=object(), label_encoder=object(), feature_columns=["a"], model_metadata={"requires_scaling": False}, mobile_collection=MagicMock())

    # missing user_id -> 400
    r = client.get("/get_today_prediction")
    assert r.status_code == 400

    # when helper returns None -> 404
    mobile_mod.get_today_prediction_from_db = lambda uid: None
    r = client.get("/get_today_prediction", query_string={"user_id": "u1"})
    assert r.status_code == 404

    # when helper returns a prediction -> 200
    mobile_mod.get_today_prediction_from_db = lambda uid: {"prediction": "ok"}
    r = client.get("/get_today_prediction", query_string={"user_id": "u1"})
    assert r.status_code == 200
    assert r.get_json() == {"prediction": "ok"}


def test_get_user_history_errors_and_success(client, mobile_mod):
    setup_model_environment(mobile_mod, model=object(), label_encoder=object(), feature_columns=["a"], model_metadata={"requires_scaling": False}, mobile_collection=MagicMock())

    # missing user_id -> 400
    r = client.get("/get_user_history")
    assert r.status_code == 400

    # invalid date format -> 400
    r = client.get("/get_user_history", query_string={"user_id": "u", "start_date": "2025-99-99"})
    assert r.status_code == 400

    # DB unavailable -> 500
    mobile_mod.mobile_collection = None
    r = client.get("/get_user_history", query_string={"user_id": "u"})
    assert r.status_code == 500
    assert r.get_json()["error"] == "Database not available"

    # successful retrieval -> 200 with formatted entries
    now = datetime.now(timezone.utc)
    doc = {
        "created_at": now,
        "date": now.strftime("%Y-%m-%d"),
        "input_data": {"a": 1},
        "prediction_result": {"prediction": "addicted"}
    }
    class FakeCollection:
        def __init__(self, data):
            self._data = data

        def find(self, *args, **kwargs):
            return DummyCursor(self._data)

    mobile_mod.mobile_collection = FakeCollection([doc])
    r = client.get("/get_user_history", query_string={"user_id": "u", "limit": 5})
    assert r.status_code == 200
    data = r.get_json()
    assert isinstance(data, list) and len(data) == 1
    entry = data[0]
    assert entry["date"] == doc["date"]
    assert "created_at" in entry and entry["created_at"].endswith("Z")
    assert entry["prediction_result"] == doc["prediction_result"]


def test_health_endpoint_reports_status(client, mobile_mod):
    feature_cols = ["f1", "f2", "f3"]
    meta = {"best_model_name": "X", "best_accuracy": 0.5, "requires_scaling": True}
    # provide a scaler to show "Loaded" scaler_status
    dummy_scaler = object()

    # fake DB with count_documents
    class FakeColl:
        def count_documents(self, q):
            return 7

    setup_model_environment(
        mobile_mod,
        model=object(),
        scaler=dummy_scaler,
        label_encoder=object(),
        feature_columns=feature_cols,
        model_metadata=meta,
        mobile_collection=FakeColl()
    )
    r = client.get("/health")
    assert r.status_code == 200
    data = r.get_json()
    assert data["model_status"] == "Loaded"
    assert data["active_predictions_today"] == 7
    assert data["features_loaded"] == len(feature_cols)


def test_404_error_handler_for_unknown_endpoint(client, mobile_mod):
    setup_model_environment(mobile_mod, model=object(), label_encoder=object(), feature_columns=["a"], model_metadata={"requires_scaling": False}, mobile_collection=MagicMock())
    r = client.get("/this_endpoint_does_not_exist")
    assert r.status_code == 404
    assert r.get_json()["error"] == "Endpoint not found"


def test_internal_error_handler_direct_call(mobile_mod):
    with mobile_mod.app.app_context():
        # The error handler can be invoked directly as a function.
        resp, status = mobile_mod.internal_error(Exception("boom"))
        # internal_error returns (Response, status_code)
        assert status == 500
        # Check the response contains the error message
        body = resp.get_data(as_text=True)
        assert "Internal server error" in body