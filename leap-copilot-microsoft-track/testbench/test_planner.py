"""
LEAP Copilot — AI Planner Unit Tests
Run with: pytest test_planner.py -v
These tests do NOT require the backend to be running.
They test the core AI logic functions directly.
"""

import pytest
import json
import sys
import os

# Add backend to path so we can import planner functions directly
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'backend'))


# ── Helper: build a mock log entry ──────────────────────────────
def make_log(marks_obtained, marks_total, response_time_sec, difficulty, attempt_number, days_ago=0):
    """Creates a mock study log entry dictionary."""
    import datetime
    date = (datetime.datetime.now() - datetime.timedelta(days=days_ago)).isoformat()
    return {
        "marks_obtained": marks_obtained,
        "marks_total": marks_total,
        "response_time_sec": response_time_sec,
        "difficulty": difficulty,
        "attempt_number": attempt_number,
        "timestamp": date
    }


# ── Helper: load sample data ─────────────────────────────────────
def load_sample_data():
    sample_path = os.path.join(os.path.dirname(__file__), 'sample_data.json')
    with open(sample_path, 'r') as f:
        return json.load(f)


# ── 1. Performance Score Calculation ─────────────────────────────
def test_performance_score_calculation():
    """
    A student who scores 9/10 quickly on first attempt should score
    higher than one who scores 4/10 slowly on third attempt.
    """
    try:
        from planner import calculate_performance_score
    except ImportError:
        pytest.skip("calculate_performance_score not found in planner.py — adjust import path")

    high_score = calculate_performance_score(
        marks_obtained=9, marks_total=10,
        response_time_sec=12, difficulty=0.7,
        attempt_number=1
    )
    low_score = calculate_performance_score(
        marks_obtained=4, marks_total=10,
        response_time_sec=65, difficulty=0.7,
        attempt_number=3
    )

    assert high_score > low_score, (
        f"High performer score ({high_score:.3f}) should exceed "
        f"low performer score ({low_score:.3f})"
    )
    assert 0.0 <= high_score <= 1.0, "Performance score should be normalised between 0 and 1"
    assert 0.0 <= low_score <= 1.0, "Performance score should be normalised between 0 and 1"


# ── 2. Attempt Decay ─────────────────────────────────────────────
def test_attempt_decay():
    """
    Same performance on attempt 1 should score higher than attempt 3.
    Mastery on first attempt is more meaningful.
    """
    try:
        from planner import calculate_performance_score
    except ImportError:
        pytest.skip("calculate_performance_score not found in planner.py")

    first_attempt = calculate_performance_score(
        marks_obtained=8, marks_total=10,
        response_time_sec=20, difficulty=0.5,
        attempt_number=1
    )
    third_attempt = calculate_performance_score(
        marks_obtained=8, marks_total=10,
        response_time_sec=20, difficulty=0.5,
        attempt_number=3
    )

    assert first_attempt > third_attempt, (
        "First attempt score should be higher than third attempt for identical performance"
    )


# ── 3. Concept State Estimation ──────────────────────────────────
def test_concept_state_estimation():
    """
    A topic with consistently high recent scores should have a higher
    concept state than one with consistently low recent scores.
    """
    try:
        from analysis import estimate_concept_state
    except ImportError:
        pytest.skip("estimate_concept_state not found in analysis.py — adjust import path")

    strong_logs = [
        make_log(9, 10, 12, 0.7, 1, days_ago=1),
        make_log(8, 10, 15, 0.6, 1, days_ago=2),
        make_log(10, 10, 10, 0.8, 1, days_ago=3),
    ]
    weak_logs = [
        make_log(3, 10, 70, 0.7, 3, days_ago=1),
        make_log(4, 10, 65, 0.6, 2, days_ago=2),
        make_log(2, 10, 80, 0.8, 3, days_ago=3),
    ]

    strong_state = estimate_concept_state(strong_logs)
    weak_state   = estimate_concept_state(weak_logs)

    assert strong_state > weak_state, (
        f"Strong topic state ({strong_state:.3f}) should exceed weak ({weak_state:.3f})"
    )
    assert 0.0 <= strong_state <= 1.0, "Concept state should be between 0 and 1"
    assert 0.0 <= weak_state   <= 1.0, "Concept state should be between 0 and 1"


# ── 4. Recency Weighting ─────────────────────────────────────────
def test_recency_weighting():
    """
    A recent high-scoring session should raise the concept state more
    than an old high-scoring session (forgetting curve effect).
    """
    try:
        from analysis import estimate_concept_state
    except ImportError:
        pytest.skip("estimate_concept_state not found in analysis.py")

    recent_high = [make_log(9, 10, 12, 0.7, 1, days_ago=1)]
    old_high    = [make_log(9, 10, 12, 0.7, 1, days_ago=21)]

    recent_state = estimate_concept_state(recent_high)
    old_state    = estimate_concept_state(old_high)

    assert recent_state >= old_state, (
        f"Recent session ({recent_state:.3f}) should give >= state vs old session ({old_state:.3f})"
    )


# ── 5. Plan Generation Output Structure ──────────────────────────
def test_plan_generation_output():
    """
    Plan generator should return exactly 7 day entries,
    each with at least one topic assigned.
    """
    try:
        from planner import generate_study_plan
    except ImportError:
        pytest.skip("generate_study_plan not found in planner.py")

    data = load_sample_data()
    plan = generate_study_plan(
        modules=data["modules"],
        logs=data["logs"],
        daily_minutes=60
    )

    assert isinstance(plan, list), "Plan should be a list"
    assert len(plan) == 7, f"Plan should have exactly 7 days, got {len(plan)}"

    for i, day in enumerate(plan):
        assert "topics" in day or "sessions" in day, (
            f"Day {i+1} is missing topics/sessions field"
        )
        topics = day.get("topics") or day.get("sessions") or []
        assert len(topics) >= 1, f"Day {i+1} should have at least one topic assigned"


# ── 6. Plan Respects Daily Minutes Budget ────────────────────────
def test_plan_respects_daily_minutes():
    """
    No single day in the plan should exceed the specified daily_minutes budget.
    """
    try:
        from planner import generate_study_plan
    except ImportError:
        pytest.skip("generate_study_plan not found in planner.py")

    DAILY_LIMIT = 30
    data = load_sample_data()
    plan = generate_study_plan(
        modules=data["modules"],
        logs=data["logs"],
        daily_minutes=DAILY_LIMIT
    )

    for i, day in enumerate(plan):
        total_minutes = day.get("total_minutes", 0)
        # Also sum up from topics if total_minutes not provided at day level
        if total_minutes == 0:
            topics = day.get("topics") or day.get("sessions") or []
            total_minutes = sum(t.get("minutes", 0) for t in topics)

        assert total_minutes <= DAILY_LIMIT + 1, (  # +1 for rounding tolerance
            f"Day {i+1} allocated {total_minutes} min, exceeding limit of {DAILY_LIMIT} min"
        )


# ── 7. Priority Ranking: Weak Topics First ───────────────────────
def test_weak_topics_prioritised():
    """
    Topics with lower concept state should appear earlier/more frequently
    in the plan than strong topics.
    """
    try:
        from planner import generate_study_plan
        from analysis import estimate_concept_state
    except ImportError:
        pytest.skip("Required functions not found — adjust import paths")

    data = load_sample_data()

    # Find which topic is weakest based on logs
    topic_logs = {}
    for log in data["logs"]:
        topic = log.get("module", "unknown")
        topic_logs.setdefault(topic, []).append(log)

    states = {topic: estimate_concept_state(logs) for topic, logs in topic_logs.items()}
    weakest_topic = min(states, key=states.get)

    plan = generate_study_plan(
        modules=data["modules"],
        logs=data["logs"],
        daily_minutes=60
    )

    # Count how many days include the weakest topic
    days_with_weakest = 0
    for day in plan:
        topics = day.get("topics") or day.get("sessions") or []
        topic_names = [t.get("topic") or t.get("name") or "" for t in topics]
        if weakest_topic in topic_names:
            days_with_weakest += 1

    assert days_with_weakest >= 2, (
        f"Weakest topic '{weakest_topic}' (state: {states[weakest_topic]:.2f}) "
        f"only appeared in {days_with_weakest} days — should appear in at least 2"
    )
