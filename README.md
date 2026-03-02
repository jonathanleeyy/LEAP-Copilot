# LEAP Copilot — AI-Powered Study Planner

> An intelligent, personalised study planning system that analyses student performance data and generates evidence-backed 7-day study schedules using AI.

---

## What is LEAP Copilot?

LEAP Copilot is a full-stack AI application built for students preparing for high-stakes academic assessments. It combines a lightweight, interactive frontend with a Python-powered backend that applies machine learning and spaced repetition principles to generate personalised study plans.

Students log their practice sessions, test scores, and topic difficulty — LEAP analyses patterns in that data and tells them exactly what to study, for how long, and why.

---

## Key Features

- **AI-Generated 7-Day Study Plans** — personalised schedules based on real performance data
- **Concept State Tracking** — monitors mastery level per topic using adaptive scoring
- **Spaced Repetition Engine** — prioritises topics based on forgetting curves and response time
- **Assignment & Deadline Management** — tracks upcoming tests and due dates
- **Score Trend Visualisation** — charts performance over time per module
- **YouTube Resource Finder** — surfaces relevant video explanations for weak topics
- **Ethereal Sunset UI** — warm, premium interface with living ambient animations

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Python (FastAPI) |
| AI/ML | Custom spaced repetition algorithm, concept state modelling |
| Charts | Chart.js |
| Fonts | Bricolage Grotesque, Instrument Sans (Google Fonts) |

---

## Project Structure

```
leap-copilot/
├── index.html          # Main frontend entry point
├── styles.css          # Full design system (Design System v5)
├── app.js              # Frontend logic, API calls, chart rendering
├── backend/
│   ├── main.py         # FastAPI app entry point
│   ├── models.py       # Data models (modules, logs, plans)
│   ├── planner.py      # Core AI study plan generation logic
│   ├── analysis.py     # Concept state + diagnosis engine
│   └── requirements.txt
├── testbench/
│   ├── test_api.py     # Backend API endpoint tests
│   ├── test_planner.py # Study plan generation unit tests
│   ├── sample_data.json # Sample student data for testing
│   └── TESTING.md      # Step-by-step test run instructions
└── README.md
```

---

## Dependencies

### Backend (Python)
```
fastapi
uvicorn
pydantic
python-dotenv
httpx        # for YouTube API calls
pytest       # for running tests
```

Install all dependencies:
```bash
pip install -r backend/requirements.txt
```

### Frontend
No build step required. The frontend uses CDN-loaded fonts and Chart.js. Open `index.html` directly in a browser once the backend is running.

---

## Setup & Run Instructions

### 1. Clone the repository
```bash
git clone https://github.com/jonathanleeyy/leap-copilot.git
cd leap-copilot
```

### 2. Set up the backend
```bash
cd backend
pip install -r requirements.txt
```

### 3. Configure environment variables
Create a `.env` file inside the `backend/` folder:
```
YOUTUBE_API_KEY=your_youtube_api_key_here
```
> You can obtain a free YouTube Data API v3 key from [Google Cloud Console](https://console.cloud.google.com/).

### 4. Start the backend server
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
The API will be available at `http://127.0.0.1:8000`.  
You can verify it's running by visiting `http://127.0.0.1:8000/health`.

### 5. Open the frontend
Open `index.html` in your browser (no separate server needed):
```bash
# macOS
open index.html

# Windows
start index.html

# Or simply drag index.html into your browser
```

### 6. Log in
Use the Sign In or Create Account buttons on the auth screen to get started.

---

## Running Tests

See [`testbench/TESTING.md`](testbench/TESTING.md) for full step-by-step testing instructions.

Quick run:
```bash
cd testbench
pytest test_api.py test_planner.py -v
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/health` | Check backend connection |
| POST | `/auth/login` | Authenticate user |
| POST | `/auth/signup` | Register new user |
| GET | `/modules` | Get all modules for user |
| POST | `/modules` | Add a new module |
| POST | `/logs` | Log a study session |
| GET | `/logs` | Retrieve all study logs |
| POST | `/analyse` | Run AI analysis + generate plan |
| GET | `/youtube` | Search YouTube for topic resources |

---

## How the AI Works

LEAP uses a custom concept state model inspired by spaced repetition research:

1. **Performance Scoring** — each study log entry (marks, response time, difficulty, attempt number) is normalised into a performance score
2. **Concept State Estimation** — scores are aggregated per topic using an exponential recency weighting — recent sessions matter more
3. **Forgetting Curve Modelling** — time elapsed since last study session is factored in; older sessions decay in weight
4. **Priority Ranking** — topics are ranked by a combination of: low mastery + high difficulty + upcoming deadline proximity
5. **Plan Generation** — the daily study time input is distributed across the top-priority topics, with built-in review cycles

---

## Acknowledgements

- Spaced repetition principles inspired by Ebbinghaus forgetting curve research [1]
- FastAPI framework by Sebastián Ramírez
- Chart.js for frontend data visualisation
- Google Fonts for Bricolage Grotesque and Instrument Sans

---

## License

MIT License — see `LICENSE` for details.
