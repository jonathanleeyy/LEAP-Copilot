from __future__ import annotations

import json
import sqlite3
from datetime import UTC, datetime
from pathlib import Path


ROOT = Path(__file__).resolve().parents[2]
DB_PATH = ROOT / "data" / "leap_metrics.db"


def _connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with _connect() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                school_id TEXT PRIMARY KEY,
                name TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS recommendations (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                student_id TEXT NOT NULL,
                created_at TEXT NOT NULL,
                payload_json TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS feedback (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                recommendation_id INTEGER NOT NULL,
                action TEXT NOT NULL,
                note TEXT NOT NULL,
                edited_json TEXT,
                created_at TEXT NOT NULL,
                FOREIGN KEY (recommendation_id) REFERENCES recommendations(id)
            )
            """
        )
        conn.commit()


def upsert_user(school_id: str, name: str) -> dict:
    created_at = datetime.now(UTC).isoformat()
    with _connect() as conn:
        existing = conn.execute("SELECT school_id, created_at FROM users WHERE school_id = ?", (school_id,)).fetchone()
        if existing:
            conn.execute("UPDATE users SET name = ? WHERE school_id = ?", (name, school_id))
            created_at = existing["created_at"]
        else:
            conn.execute(
                "INSERT INTO users (school_id, name, created_at) VALUES (?, ?, ?)",
                (school_id, name, created_at),
            )
        conn.commit()
        return {"school_id": school_id, "name": name, "created_at": created_at}


def get_user(school_id: str) -> dict | None:
    with _connect() as conn:
        row = conn.execute(
            "SELECT school_id, name, created_at FROM users WHERE school_id = ?",
            (school_id,),
        ).fetchone()
        if not row:
            return None
        return {"school_id": row["school_id"], "name": row["name"], "created_at": row["created_at"]}


def insert_recommendation(student_id: str, payload: dict) -> int:
    created_at = datetime.now(UTC).isoformat()
    payload_json = json.dumps(payload, ensure_ascii=True, default=str)
    with _connect() as conn:
        cur = conn.execute(
            "INSERT INTO recommendations (student_id, created_at, payload_json) VALUES (?, ?, ?)",
            (student_id, created_at, payload_json),
        )
        conn.commit()
        return int(cur.lastrowid)


def insert_feedback(recommendation_id: int, action: str, note: str, edited_json: str | None) -> int:
    created_at = datetime.now(UTC).isoformat()
    with _connect() as conn:
        exists = conn.execute(
            "SELECT id FROM recommendations WHERE id = ?",
            (recommendation_id,),
        ).fetchone()
        if not exists:
            raise ValueError("recommendation_id not found")

        cur = conn.execute(
            """
            INSERT INTO feedback (recommendation_id, action, note, edited_json, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (recommendation_id, action, note, edited_json, created_at),
        )
        conn.commit()
        return int(cur.lastrowid)


def compute_metrics() -> dict:
    with _connect() as conn:
        total_recommendations = int(
            conn.execute("SELECT COUNT(*) AS c FROM recommendations").fetchone()["c"]
        )
        total_feedback = int(conn.execute("SELECT COUNT(*) AS c FROM feedback").fetchone()["c"])

        action_counts = {
            "accept": 0,
            "edit": 0,
            "reject": 0,
        }
        for row in conn.execute("SELECT action, COUNT(*) AS c FROM feedback GROUP BY action"):
            action = row["action"]
            if action in action_counts:
                action_counts[action] = int(row["c"])

        total_plan_items = 0
        actionable_items = 0
        explainable_items = 0

        for row in conn.execute("SELECT payload_json FROM recommendations"):
            payload = json.loads(row["payload_json"])
            tasks = payload.get("seven_day_plan", [])
            for task in tasks:
                total_plan_items += 1
                has_actionability = bool(task.get("activity")) and bool(task.get("duration_min")) and bool(
                    task.get("expected_outcome")
                )
                has_evidence = bool(task.get("evidence"))
                if has_actionability:
                    actionable_items += 1
                if has_evidence:
                    explainable_items += 1

        denom_feedback = total_feedback if total_feedback else 1
        denom_plan = total_plan_items if total_plan_items else 1

        return {
            "total_recommendations": total_recommendations,
            "total_feedback": total_feedback,
            "accept_rate": round(action_counts["accept"] / denom_feedback, 3),
            "edit_rate": round(action_counts["edit"] / denom_feedback, 3),
            "reject_rate": round(action_counts["reject"] / denom_feedback, 3),
            "actionability_rate": round(actionable_items / denom_plan, 3),
            "explainability_coverage": round(explainable_items / denom_plan, 3),
        }
