# Architecture - LEAP Copilot

## 1) High-Level Design

LEAP Copilot follows a layered architecture:

1. Data Layer
- Learning interaction events
- Concept metadata
- Recommendation history

2. Learning State Engine
- Computes per-concept mastery and trend
- Detects inactivity decay risk

3. AI Agent Layer
- Diagnosis Agent: identifies probable struggle causes
- Planner Agent: converts diagnosis to constrained 7-day plan
- Checker Agent: validates quality, safety, and explainability

4. Policy & Responsible AI Layer
- Deterministic JSON schema checks
- Evidence requirements
- Optional fairness audits

5. API Layer
- FastAPI endpoints for ingest/analyze/plan

6. UI Layer
- Student timeline
- Recommendation cards
- Why panel (evidence + confidence)
- Human override controls

## 2) Data Flow

1. Ingestion
- Student events are submitted via API or batch import.

2. Feature Construction
- Per-concept accuracy windows
- Response-time profiles
- Attempt density
- Gap duration

3. Learning-State Computation
- Mastery score in [0,1]
- Trend label (`improving/stagnant/regressing`)
- Confidence score based on data sufficiency

4. Agent Orchestration
- Diagnosis Agent proposes likely causes with scores.
- Planner Agent generates daily tasks by priority and available minutes.
- Checker Agent rejects vague/unsafe/non-evidence-backed outputs.

5. Output
- 7-day plan and explanation payload returned to UI.

6. Human Feedback Loop
- User edits/rejections are stored and used to refine future planning.

## 3) Suggested API Contract (MVP)

### POST `/analyze`
Input:
- `student_id`
- `daily_minutes`
- `events[]`

Output:
- `concept_states[]`
- `diagnosis[]`
- `seven_day_plan[]`
- `summary`

### GET `/health`
- Liveness check.

### POST `/feedback`
- Accept/edit/reject recommendation.

## 4) Agent Responsibilities

Diagnosis Agent:
- Finds why performance is weak.
- Labels risk factors and evidence.

Planner Agent:
- Maps diagnosis into concrete daily tasks.
- Enforces time-budget constraints.

Checker Agent:
- Ensures every recommendation has evidence.
- Blocks low-quality text-only generic advice.
- Confirms deterministic output shape.

## 5) Responsible AI by Design

- Explainability: Evidence references required for every recommendation.
- Consistency: Structured output + deterministic post-processing.
- Privacy: Pseudonymous IDs; no PII in prompts.
- Human agency: User override is first-class.
- Fairness: Recommendation distribution checks by behavior cohort.

## 6) Scalability Path

Hackathon MVP:
- SQLite + CSV inputs
- Single FastAPI service

Production path:
- Azure Blob/Data Lake for event storage
- Azure AI Search for grounded retrieval
- Azure Container Apps for service scaling
- Optional Power BI dashboards for cohort analytics

## 7) Trade-offs & Limitations

- Rule-guided diagnosis is interpretable but less expressive than full probabilistic models.
- Synthetic/limited data may reduce generalization confidence.
- LLM planning quality depends on grounding quality.
- Fairness claims require diverse, representative evaluation data.
