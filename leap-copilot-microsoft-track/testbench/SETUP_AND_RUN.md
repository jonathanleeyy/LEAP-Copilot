# Testbench Setup and Run Guide

## Prerequisites
- Python 3.11+
- macOS/Linux terminal

## 1) Clone
```bash
git clone <YOUR_REPO_URL>
cd leap-copilot-microsoft-track
```

## 2) Backend
```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

## 3) Frontend
In another terminal:
```bash
cd frontend
python3 -m http.server 5173
```
Open:
- `http://127.0.0.1:5173`

## 4) User Validation Flow
1. Register with a school ID and name.
2. Add at least 2 modules/topics.
3. Add multiple study logs across those topics.
4. Run analysis.
5. Verify:
- Concept states rendered
- Diagnosis rendered
- 7-day plan rendered
6. Submit feedback actions (`accept`, `edit`, `reject`).
7. Refresh metrics and confirm rates change.

## 5) API Sanity Commands
```bash
curl http://127.0.0.1:8000/health
curl -X POST http://127.0.0.1:8000/users/register -H "Content-Type: application/json" -d '{"school_id":"SCH-100","name":"Alice"}'
curl -X POST http://127.0.0.1:8000/analyze/sample
curl http://127.0.0.1:8000/metrics
```

## Notes
- Uses synthetic/non-PII data for testing.
- SQLite is used for hackathon persistence.
