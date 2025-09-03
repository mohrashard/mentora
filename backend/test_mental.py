import pytest
from datetime import datetime, timedelta
from bson import ObjectId
import numpy as np

import mental


# -----------------------------
# Helpers / Test Doubles
# -----------------------------

class InsertOneResult:
    def __init__(self, inserted_id):
        self.inserted_id = inserted_id


class DummyCursor:
    def __init__(self, docs):
        self._base_docs = [dict(d) for d in docs]
        self._docs = [dict(d) for d in docs]
        self._skip = 0
        self._limit = None

    def sort(self, key, direction):
        reverse = direction == -1
        self._docs = sorted(self._docs, key=lambda d: d.get(key), reverse=reverse)
        return self

    def skip(self, n):
        self._skip = n
        return self

    def limit(self, n):
        self._limit = n
        return self

    def __iter__(self):
        docs = self._docs
        if self._skip:
            docs = docs[self._skip:]
        if self._limit is not None:
            docs = docs[:self._limit]
        return iter(docs)


class DummyCollection:
    def __init__(self, initial_docs=None):
        self.docs = list(initial_docs or [])

    def find_one(self, filter=None, *args, **kwargs):
        if not filter:
            return dict(self.docs[0]) if self.docs else None
        for d in self.docs:
            match = True
            for k, v in (filter or {}).items():
                if d.get(k) != v:
                    match = False
                    break
            if match:
                return dict(d)
        return None

    def insert_one(self, document):
        _id = ObjectId()
        to_insert = dict(document)
        to_insert["_id"] = _id
        self.docs.append(to_insert)
        return InsertOneResult(_id)

    def find(self, filter=None, projection=None, *args, **kwargs):
        def matches(doc, filt):
            if not filt:
                return True
            for k, v in filt.items():
                if isinstance(v, dict):
                    val = doc.get(k)
                    if "$gte" in v and not (val and val >= v["$gte"]):
                        return False
                    if "$lte" in v and not (val and val <= v["$lte"]):
                        return False
                else:
                    if doc.get(k) != v:
                        return False
            return True

        filtered = [dict(d) for d in self.docs if matches(d, filter)]
        if projection:
            exclude_keys = {k for k, flag in projection.items() if flag == 0}
            for d in filtered:
                for k in exclude_keys:
                    d.pop(k, None)
        return DummyCursor(filtered)

    def count_documents(self, filter=None, *args, **kwargs):
        return len(list(self.find(filter)))


class DummyModel:
    def __init__(self, predict_value, proba=None):
        self.predict_value = predict_value
        self.proba = np.array([0.9, 0.1]) if proba is None else np.array(proba)

    def predict(self, X):
        return np.array([self.predict_value])

    def predict_proba(self, X):
        return np.array([self.proba])


# -----------------------------
# Fixtures
# -----------------------------

@pytest.fixture(autouse=True)
def setup_app_env(monkeypatch):
    user_id = ObjectId()
    valid_user = {
        "_id": user_id,
        "age": 22,
        "gender": "Male",
        "email": "user@example.com"
    }
    mental.users_collection = DummyCollection([valid_user])

    now = datetime.utcnow()
    mental.mental_health_collection = DummyCollection([
        {
            "timestamp": now - timedelta(days=2),
            "created_at": now - timedelta(days=2),
            "input_data": {"foo": "bar"},
            "prediction_results": {"mental_health_status": "Good"},
            "recommendations": ["Stay hydrated"]
        },
        {
            "timestamp": now - timedelta(days=1),
            "created_at": now - timedelta(days=1),
            "input_data": {"foo": "baz"},
            "prediction_results": {"mental_health_status": "At Risk"},
            "recommendations": ["Take breaks"]
        },
    ])

    mental.models_loaded = True
    mental.best_mh_model = DummyModel("At Risk", [0.2, 0.8])
    mental.best_dep_model = DummyModel("High", [0.1, 0.9])
    mental.best_anx_model = DummyModel("Yes", [0.3, 0.7])
    mental.X_features = [
        'Age', 'Gender', 'Caffeine_Intake_mg_per_day',
        'Sleep_Duration_hours_per_night', 'Sleep_Quality_1_to_10',
        'Mood_Rating_1_to_10', 'Stress_Level', 'Smoking_Habits',
        'Drinking_Habits', 'Social_Interaction_Level',
        'Screen_Time_hours_per_day', 'Physical_Activity_hours_per_week',
        'Diet_Quality_1_to_10', 'Work_Study_Hours_per_day',
        'Employment_Status', 'Chronic_Health_Issues'
    ]

    monkeypatch.setattr(mental, "initialize_database", lambda: True)
    monkeypatch.setattr(mental, "load_models", lambda: True)
    mental.app.config["TESTING"] = True
    yield


@pytest.fixture
def client():
    with mental.app.test_client() as c:
        yield c


# -----------------------------
# Unit Tests
# -----------------------------

def test_calculate_caffeine_intake_basic():
    drinks = [
        {"type": "Tea", "quantity": 2},
        {"type": "Coffee", "quantity": 1},
        {"type": "Unknown", "quantity": 3},
    ]
    assert mental.calculate_caffeine_intake(drinks) == 175


def test_calculate_caffeine_intake_invalid():
    assert mental.calculate_caffeine_intake([]) == 0
    assert mental.calculate_caffeine_intake(None) == 0
    assert mental.calculate_caffeine_intake("notalist") == 0


def test_get_user_data_valid_and_invalid():
    valid_id = str(mental.users_collection.docs[0]["_id"])
    assert mental.get_user_data(valid_id)["email"] == "user@example.com"
    assert mental.get_user_data("abc") is None
    assert mental.get_user_data(str(ObjectId())) is None


def test_predict_mental_health_success():
    data = {
        'Age': 22, 'Gender': 'Male',
        'Caffeine_Intake_mg_per_day': 175,
        'Sleep_Duration_hours_per_night': 7,
        'Sleep_Quality_1_to_10': 6,
        'Mood_Rating_1_to_10': 5,
        'Stress_Level': 'Medium',
        'Smoking_Habits': 'Never',
        'Drinking_Habits': 'Never',
        'Social_Interaction_Level': 'Medium',
        'Screen_Time_hours_per_day': 4,
        'Physical_Activity_hours_per_week': 3,
        'Diet_Quality_1_to_10': 5,
        'Work_Study_Hours_per_day': 6,
        'Employment_Status': 'Student',
        'Chronic_Health_Issues': 'No'
    }
    res = mental.predict_mental_health(data)
    assert res["mental_health_status"] == "At Risk"


def test_generate_recommendations():
    pred = {"depression_level": "Severe", "mental_health_status": "Poor", "anxiety_presence": "Yes"}
    recs = mental.generate_recommendations(pred, caffeine_intake=450)
    assert any("mental health professional" in r for r in recs)
    assert len(recs) == len(set(recs))


def test_store_prediction_result_success():
    uid = str(ObjectId())
    inserted = mental.store_prediction_result(uid, {"a": 1}, {"b": 2}, ["rec"])
    assert inserted is not None


def test_store_prediction_result_failure(monkeypatch):
    class BadCollection(DummyCollection):
        def insert_one(self, document): raise RuntimeError("fail")
    mental.mental_health_collection = BadCollection()
    assert mental.store_prediction_result(str(ObjectId()), {}, {}, []) is None


# -----------------------------
# API Tests
# -----------------------------

def test_home(client):
    rv = client.get("/")
    assert rv.status_code == 200
    assert rv.get_json()["status"] == "Server is running"


def test_predictmentalhealth_happy(client):
    uid = str(mental.users_collection.docs[0]["_id"])
    payload = {"user_id": uid, "sleep_hours": 7, "mood_rating": 6,
               "drinks": [{"type": "Coffee", "quantity": 2}],
               "stress_level": "Medium", "smoking_habits": "Never",
               "drinking_habits": "Never", "social_interaction_level": "Medium",
               "screen_time": 5, "physical_activity": 3, "diet_quality": 6,
               "work_study_hours": 8, "employment_status": "Student", "chronic_health_issues": "No"}
    rv = client.post("/predictmentalhealth", json=payload)
    data = rv.get_json()
    assert rv.status_code == 200
    assert data["success"] is True




def test_predictmentalhealth_missing_user_id(client):
    """Test prediction endpoint with JSON but missing user_id"""
    response = client.post("/predictmentalhealth", json={})
    assert response.status_code == 400
    data = response.get_json()
    assert "No data provided" in data["error"]




def test_predictmentalhealth_user_not_found(client):
    rv = client.post("/predictmentalhealth", json={"user_id": str(ObjectId()), "sleep_hours": 7, "mood_rating": 5})
    assert rv.status_code == 404


def test_user_history(client):
    uid = str(mental.users_collection.docs[0]["_id"])
    mental.store_prediction_result(uid, {"x": 1}, {"y": 2}, ["rec"])
    rv = client.get(f"/user/{uid}/history")
    assert rv.status_code == 200
    assert "history" in rv.get_json()


def test_user_history_invalid(client):
    rv = client.get("/user/abc/history")
    assert rv.status_code == 400


def test_health(client):
    rv = client.get("/health")
    data = rv.get_json()
    assert rv.status_code == 200
    assert "database" in data and "models" in data


def test_mentalhistory(client):
    uid = str(mental.users_collection.docs[0]["_id"])
    rv = client.get(f"/mentalhistory?user_id={uid}&limit=1")
    assert rv.status_code == 200
    assert "history" in rv.get_json()


def test_mentalhistory_invalid(client):
    assert client.get("/mentalhistory").status_code == 400
    assert client.get("/mentalhistory?user_id=abc").status_code == 400
    uid = str(mental.users_collection.docs[0]["_id"])
    rv = client.get(f"/mentalhistory?user_id={uid}&from_date=2024-13-40")
    assert rv.status_code == 400


def test_404(client):
    rv = client.get("/no-such-route")
    assert rv.status_code == 404
    assert rv.get_json()["error"] == "Endpoint not found"
