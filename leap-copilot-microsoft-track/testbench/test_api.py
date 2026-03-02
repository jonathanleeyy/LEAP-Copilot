"""
LEAP Copilot — API Endpoint Tests
Run with: pytest test_api.py -v
Requires backend running at http://127.0.0.1:8000
"""

import pytest
import httpx

BASE_URL = "http://127.0.0.1:8000"
TEST_USER = {"username": "testuser_leap", "password": "testpass123"}

# ── Shared state across tests ────────────────────────────────────
session_token = None
created_module_id = None


# ── 1. Health Check ──────────────────────────────────────────────
def test_health_check():
    """Backend should be reachable and return 200 OK."""
    response = httpx.get(f"{BASE_URL}/health")
    assert response.status_code == 200, "Backend is not running or /health endpoint missing"
    data = response.json()
    assert "status" in data or "message" in data, "Health response should contain status or message"


# ── 2. Signup ────────────────────────────────────────────────────
def test_signup():
    """Should create a new user account and return 201."""
    response = httpx.post(f"{BASE_URL}/auth/signup", json=TEST_USER)
    # Accept 201 (created) or 409 (already exists — re-running tests)
    assert response.status_code in [201, 409], (
        f"Expected 201 or 409, got {response.status_code}: {response.text}"
    )


# ── 3. Login ─────────────────────────────────────────────────────
def test_login():
    """Should authenticate and return a session token."""
    global session_token
    response = httpx.post(f"{BASE_URL}/auth/login", json=TEST_USER)
    assert response.status_code == 200, (
        f"Login failed with status {response.status_code}: {response.text}"
    )
    data = response.json()
    assert "token" in data or "access_token" in data, "Login response should contain a token"
    session_token = data.get("token") or data.get("access_token")
    assert session_token is not None


# ── 4. Add Module ────────────────────────────────────────────────
def test_add_module():
    """Should add a new academic module and confirm it appears on GET."""
    global created_module_id
    headers = {"Authorization": f"Bearer {session_token}"}

    module_payload = {
        "name": "Probability Theory",
        "year": "Year 2",
        "semester": "Semester 1",
        "test_date": "2025-12-15"
    }
    post_response = httpx.post(f"{BASE_URL}/modules", json=module_payload, headers=headers)
    assert post_response.status_code in [200, 201], (
        f"Add module failed: {post_response.status_code} — {post_response.text}"
    )

    # Verify it appears in GET /modules
    get_response = httpx.get(f"{BASE_URL}/modules", headers=headers)
    assert get_response.status_code == 200
    modules = get_response.json()
    assert isinstance(modules, list), "GET /modules should return a list"
    names = [m.get("name", "") for m in modules]
    assert "Probability Theory" in names, "Newly added module not found in module list"

    # Store the ID for later tests
    for m in modules:
        if m.get("name") == "Probability Theory":
            created_module_id = m.get("id")
            break


# ── 5. Add Study Log ─────────────────────────────────────────────
def test_add_log():
    """Should accept a study log entry and return 201."""
    headers = {"Authorization": f"Bearer {session_token}"}

    log_payload = {
        "module": "Probability Theory",
        "marks_obtained": 7,
        "marks_total": 10,
        "response_time_sec": 25,
        "difficulty": 0.6,
        "attempt_number": 1
    }
    response = httpx.post(f"{BASE_URL}/logs", json=log_payload, headers=headers)
    assert response.status_code in [200, 201], (
        f"Add log failed: {response.status_code} — {response.text}"
    )


# ── 6. Get Logs ──────────────────────────────────────────────────
def test_get_logs():
    """Should return a list of study logs for the user."""
    headers = {"Authorization": f"Bearer {session_token}"}
    response = httpx.get(f"{BASE_URL}/logs", headers=headers)
    assert response.status_code == 200
    logs = response.json()
    assert isinstance(logs, list), "GET /logs should return a list"
    assert len(logs) >= 1, "Should have at least the log we just added"


# ── 7. Run Analysis ──────────────────────────────────────────────
def test_run_analysis():
    """
    Should trigger AI analysis and return a plan, concept states, and diagnosis.
    This is the core AI endpoint test.
    """
    headers = {"Authorization": f"Bearer {session_token}"}

    analysis_payload = {"daily_minutes": 60}
    response = httpx.post(f"{BASE_URL}/analyse", json=analysis_payload, headers=headers, timeout=30.0)
    assert response.status_code == 200, (
        f"Analysis failed: {response.status_code} — {response.text}"
    )

    data = response.json()

    # Verify required keys are present in response
    assert "plan" in data, "Analysis response missing 'plan' field"
    assert "concept_states" in data, "Analysis response missing 'concept_states' field"
    assert "diagnosis" in data, "Analysis response missing 'diagnosis' field"

    # Verify plan has 7 days
    plan = data["plan"]
    assert isinstance(plan, list), "'plan' should be a list"
    assert len(plan) == 7, f"Plan should have 7 days, got {len(plan)}"

    # Verify each day has required fields
    for day in plan:
        assert "day" in day or "date" in day, "Each plan day should have a 'day' or 'date' field"
        assert "topics" in day or "sessions" in day, "Each plan day should have topics or sessions"


# ── 8. YouTube Resource Search ───────────────────────────────────
def test_youtube_search():
    """Should return video results for a topic query."""
    headers = {"Authorization": f"Bearer {session_token}"}
    response = httpx.get(
        f"{BASE_URL}/youtube",
        params={"topic": "Bayes theorem probability"},
        headers=headers,
        timeout=15.0
    )
    assert response.status_code == 200, (
        f"YouTube search failed: {response.status_code} — {response.text}"
    )
    results = response.json()
    assert isinstance(results, list), "YouTube results should be a list"
