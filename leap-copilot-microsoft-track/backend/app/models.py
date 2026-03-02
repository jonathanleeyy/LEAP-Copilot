from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


Trend = Literal["improving", "stagnant", "regressing"]
Cause = Literal[
    "concept_gap",
    "careless_mistakes",
    "time_pressure",
    "inactivity_decay",
]


class LearningEvent(BaseModel):
    student_id: str
    timestamp: datetime
    question_id: str
    concept_id: str
    correct: int = Field(ge=0, le=1)
    response_time_sec: float = Field(gt=0)
    attempt_no: int = Field(ge=1)
    difficulty: float = Field(ge=0.0, le=1.0)
    source: str = "quiz"


class AnalyzeRequest(BaseModel):
    student_id: str
    daily_minutes: int = Field(default=45, ge=15, le=240)
    events: list[LearningEvent]
    module_contexts: list["ModuleContext"] = Field(default_factory=list)


class ConceptState(BaseModel):
    concept_id: str
    mastery_score: float = Field(ge=0.0, le=1.0)
    trend: Trend
    confidence: float = Field(ge=0.0, le=1.0)
    inactivity_days: int = Field(ge=0)
    evidence: list[str]


class DiagnosisItem(BaseModel):
    concept_id: str
    cause: Cause
    score: float = Field(ge=0.0, le=1.0)
    evidence: list[str]


class DailyTask(BaseModel):
    day: int = Field(ge=1, le=7)
    concept_id: str
    activity: str
    duration_min: int = Field(ge=5, le=240)
    expected_outcome: str
    confidence: float = Field(ge=0.0, le=1.0)
    evidence: list[str]


class AnalyzeResponse(BaseModel):
    recommendation_id: int | None = None
    student_id: str
    generated_at: datetime
    concept_states: list[ConceptState]
    diagnosis: list[DiagnosisItem]
    seven_day_plan: list[DailyTask]
    summary: str


class FeedbackRequest(BaseModel):
    recommendation_id: int = Field(ge=1)
    action: Literal["accept", "edit", "reject"]
    note: str = ""
    edited_plan: list[DailyTask] | None = None


class FeedbackResponse(BaseModel):
    ok: bool
    feedback_id: int
    recommendation_id: int


class MetricsResponse(BaseModel):
    total_recommendations: int
    total_feedback: int
    accept_rate: float
    edit_rate: float
    reject_rate: float
    actionability_rate: float
    explainability_coverage: float


class UserRegisterRequest(BaseModel):
    school_id: str = Field(min_length=2, max_length=64)
    name: str = Field(min_length=2, max_length=128)


class UserProfile(BaseModel):
    school_id: str
    name: str
    created_at: datetime


class YouTubeVideo(BaseModel):
    video_id: str
    title: str
    channel: str
    duration: str | None = None
    url: str
    thumbnail: str


class YouTubeSearchResponse(BaseModel):
    query: str
    results: list[YouTubeVideo]


class AssignmentItem(BaseModel):
    title: str = Field(min_length=1, max_length=128)
    due_date: datetime
    marks_obtained: float = Field(ge=0)
    marks_total: float = Field(gt=0)


class ModuleContext(BaseModel):
    concept_id: str
    topics: list[str] = Field(default_factory=list)
    assignments: list[AssignmentItem] = Field(default_factory=list)
