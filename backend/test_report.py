import logging
from datetime import datetime

import pytest

from report_generator import (
    escape_html,
    generate_error_html,
    generate_html_report,
    get_metric_color,
    get_nested_value,
    get_overall_score,
    get_recommendations_html,
    get_score_color,
    get_status_color,
)


@pytest.fixture
def mock_datetime(monkeypatch):
    class MockDatetime:
        @classmethod
        def now(cls):
            return datetime(2023, 10, 1, 12, 0, 0)

    monkeypatch.setattr("report_generator.datetime", MockDatetime)


@pytest.fixture
def sample_user_data():
    return {"full_name": "Test User", "current_streak": 5}


@pytest.fixture
def sample_metrics():
    return {
        "summary": {
            "averageStress": 6.5,
            "averageMentalHealth": 75.0,
            "screenTimeAverage": 5.5,
        },
        "mobile": [
            {
                "input_data": {
                    "social_media_usage": 2.5,
                    "night_usage": 1.0,
                }
            }
        ],
    }


@pytest.fixture
def caplog(caplog):
    caplog.set_level(logging.INFO)
    return caplog


def test_escape_html():
    assert escape_html("<script>alert('xss')</script>") == "&lt;script&gt;alert(&#39;xss&#39;)&lt;/script&gt;"
    assert escape_html("&'\"") == "&amp;&#39;&quot;"
    assert escape_html(123) == "123"
    assert escape_html(None) == "None"
    assert escape_html("") == ""


def test_escape_html_non_str():
    assert escape_html(42.5) == "42.5"
    assert escape_html(True) == "True"


def test_get_nested_value():
    data = {"a": {"b": {"c": 42}}}
    assert get_nested_value(data, "a.b.c") == 42
    assert get_nested_value(data, "a.b.d", default=0) == 0
    assert get_nested_value(data, "x.y.z", default="default") == "default"
    assert get_nested_value({}, "input_data.social_media_usage") is None
    assert get_nested_value({"input_data": {}}, "input_data.social_media_usage", 0) == 0


def test_get_nested_value_invalid_path():
    assert get_nested_value({"a": 1}, "a.b") is None
    assert get_nested_value([], "input_data") is None


def test_get_overall_score():
    assert get_overall_score(0, 100, 0) == 100
    assert get_overall_score(10, 0, 10) == 0
    assert get_overall_score(5, 70, 6) == 53
    assert get_overall_score(3, 85, 4) == 71
    assert get_overall_score(8, 40, 9) == 23


def test_get_overall_score_edge_cases():
    assert get_overall_score(11, 100, 11) == 33  # stress and screen capped
    assert get_overall_score(-1, 100, -1) == 106  # negative values not clamped, resulting in scores above 100


def test_get_score_color():
    assert get_score_color(30) == "#dc2626"
    assert get_score_color(39) == "#dc2626"
    assert get_score_color(40) == "#d97706"
    assert get_score_color(69) == "#d97706"
    assert get_score_color(70) == "#059669"
    assert get_score_color(100) == "#059669"


def test_get_status_color():
    assert get_status_color(8, 40, 9) == "#dc2626"
    assert get_status_color(6, 60, 7) == "#d97706"
    assert get_status_color(4, 80, 5) == "#059669"
    assert get_status_color(7.1, 50, 8) == "#dc2626"  # stress >7
    assert get_status_color(5, 69, 6) == "#d97706"  # mental <70
    assert get_status_color(5, 70, 6.1) == "#d97706"  # screen >6


def test_get_metric_color():
    # Stress
    assert get_metric_color(8, "stress") == "#dc2626"
    assert get_metric_color(6, "stress") == "#d97706"
    assert get_metric_color(4, "stress") == "#059669"

    # Mental
    assert get_metric_color(40, "mental") == "#dc2626"
    assert get_metric_color(60, "mental") == "#d97706"
    assert get_metric_color(80, "mental") == "#059669"

    # Screen
    assert get_metric_color(9, "screen") == "#dc2626"
    assert get_metric_color(7, "screen") == "#d97706"
    assert get_metric_color(5, "screen") == "#059669"

    # Unknown type
    assert get_metric_color(0, "unknown") == "#059669"


def test_get_recommendations_html():
    summary_high_stress = {"averageStress": 8}
    latest_mobile_high_social = {"input_data": {"social_media_usage": 4, "night_usage": 3}}
    html = get_recommendations_html(summary_high_stress, latest_mobile_high_social)
    assert "🧘‍♀️ Practice daily meditation" in html
    assert "📱 Reduce social media" in html
    assert "🌙 Avoid phone before bed" in html
    assert "🏃‍♀️ Engage in regular activity" in html
    assert "😴 Maintain consistent sleep" in html
    assert html.count('<p class="recommendation">') <= 6

    summary_low_mental = {"averageMentalHealth": 50}
    html_low = get_recommendations_html(summary_low_mental, {})
    assert "📓 Start a gratitude journal" in html_low

    # No specific recommendations, only general
    html_general = get_recommendations_html({}, {})
    assert len(html_general.split('<p class="recommendation">')) == 4  # Three recommendations + tag count


def test_generate_error_html():
    user_data = {"full_name": "Error User"}
    error_msg = "Test error <script>"
    html = generate_error_html(user_data, error_msg)
    assert "<h1>Mentora Wellness Report - Error</h1>" in html
    assert "For: Error User" in html
    assert "Error: Test error &lt;script&gt;" in html
    assert "Contact support" in html


def test_generate_error_html_escape():
    html = generate_error_html({}, "&<>'\"")
    assert "For: User" in html
    assert "Error: &amp;&lt;&gt;&#39;&quot;" in html


def test_generate_html_report(sample_user_data, sample_metrics, mock_datetime, caplog):
    html = generate_html_report(sample_user_data, sample_metrics)
    assert "<!DOCTYPE html>" in html
    assert "<title>Mentora Wellness Report</title>" in html
    assert "Test User" in html
    assert "September 24 - October 01, 2023" in html  # Based on mock date -7 days
    assert "October 01, 2023" in html
    assert "Overall Wellness Score" in html
    assert "51%" in html  # Correct calculation
    assert "Stress Level: 6.5/10" in html
    assert "Mental Wellness: 75.0%" in html
    assert "Screen Time: 5.5h/day" in html
    assert "Social Media: 2.5h/day" in html
    assert "Night Usage: 1.0h" in html
    assert "Active Streak" in html
    assert "5 days" in html
    assert "Personalized Recommendations" in html
    assert "🏃‍♀️ Engage in regular activity" in html  # General ones
    assert "Generated by Mentora AI" in html

    # Check logging
    assert "HTML report generated for user: Test User" in caplog.text


def test_generate_html_report_missing_data(mock_datetime):
    user_data = {}
    metrics = {}
    html = generate_html_report(user_data, metrics)
    assert "User" in html  # Default name
    assert "0%" in html  # All zeros
    assert "Stress Level: 0/10" in html
    assert "Mental Wellness: 0%" in html
    assert "Screen Time: 0h/day" in html
    assert "Social Media: 0h/day" in html
    assert "Night Usage: 0h" in html


def test_generate_html_report_exception(mock_datetime, caplog, monkeypatch):
    def failing_get_nested_value(*args, **kwargs):
        raise ValueError("Test exception")

    monkeypatch.setattr("report_generator.get_nested_value", failing_get_nested_value)
    html = generate_html_report({}, {})
    assert "Error" in html
    assert "Test exception" in html

    assert "Error generating HTML: Test exception" in caplog.text


def test_generate_html_report_invalid_types(mock_datetime):
    # Pass invalid types, should handle or error
    html = generate_html_report({}, [])
    assert "Error" in html
    assert "&#39;list&#39; object has no attribute &#39;get&#39;" in html