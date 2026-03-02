# LEAP Copilot - Microsoft Track

LEAP Copilot is a user-ready AI learning assistant that accepts real student input (account + modules + study logs) and generates explainable 7-day plans.

## What Is Implemented
- User registration with `school_id` + `name`
- User-defined module/topic setup
- Study log input (correctness, response time, difficulty, attempt number)
- Analysis engine for concept state, diagnosis, and 7-day plan
- Human feedback loop (`accept/edit/reject`)
- Auditable system metrics

## Backend Endpoints
- `GET /health`
- `POST /users/register`
- `GET /users/{school_id}`
- `POST /analyze`
- `POST /analyze/sample`
- `POST /feedback`
- `GET /metrics`

## Quick Start
```bash
cd /Users/jaiveersinghkhanuja/Documents/Playground/leap-copilot-microsoft-track
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
uvicorn backend.app.main:app --reload --port 8000
```

In another terminal:
```bash
cd /Users/jaiveersinghkhanuja/Documents/Playground/leap-copilot-microsoft-track/frontend
python3 -m http.server 5173
```

Open:
- `http://127.0.0.1:5173`

## User Flow
1. Register using school ID + name.
2. Add your own modules/topics.
3. Add study log entries.
4. Run analysis on your own data.
5. Review concept states, diagnosis, and plan.
6. Submit feedback actions and watch metrics update.

## Project Structure
- `backend/app/` API + analysis + persistence
- `frontend/` user-facing web app (`index.html`, `app.js`, `styles.css`)
- `data/` sample and local database artifacts
- `docs/` architecture and competitive analysis
- `testbench/` judge run instructions

## Responsible AI Notes
- Recommendations include evidence fields.
- Feedback loop allows user override.
- Metrics provide auditable recommendation quality.
