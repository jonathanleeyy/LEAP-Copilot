from __future__ import annotations

from collections import defaultdict
from datetime import UTC, datetime
from statistics import mean

from .models import ConceptState, DiagnosisItem, LearningEvent


def _clamp(value: float, low: float, high: float) -> float:
    return max(low, min(high, value))


def _trend_label(earlier: float, recent: float) -> str:
    delta = recent - earlier
    if delta > 0.08:
        return "improving"
    if delta < -0.08:
        return "regressing"
    return "stagnant"


def compute_concept_states(events: list[LearningEvent], now: datetime | None = None) -> list[ConceptState]:
    if not events:
        return []

    now = now or datetime.now(UTC)
    grouped: dict[str, list[LearningEvent]] = defaultdict(list)
    for event in sorted(events, key=lambda e: e.timestamp):
        grouped[event.concept_id].append(event)

    states: list[ConceptState] = []
    for concept_id, concept_events in grouped.items():
        corrects = [e.correct for e in concept_events]
        acc = mean(corrects)

        recent_slice = corrects[-5:] if len(corrects) >= 5 else corrects
        early_slice = corrects[:-5] if len(corrects) > 5 else corrects

        recent_acc = mean(recent_slice)
        early_acc = mean(early_slice)

        avg_rt = mean(e.response_time_sec for e in concept_events)
        inactivity_days = max((now - concept_events[-1].timestamp).days, 0)

        speed_bonus = _clamp((25.0 - avg_rt) / 50.0, -0.15, 0.15)
        decay_penalty = _clamp(inactivity_days / 60.0, 0.0, 0.25)
        mastery = _clamp((0.8 * recent_acc) + 0.2 * early_acc + speed_bonus - decay_penalty, 0.0, 1.0)

        confidence = _clamp(len(concept_events) / 12.0, 0.35, 1.0)
        trend = _trend_label(early_acc, recent_acc)

        evidence = [
            f"accuracy={acc:.2f}",
            f"recent_accuracy={recent_acc:.2f}",
            f"avg_response_time={avg_rt:.1f}s",
            f"inactivity_days={inactivity_days}",
            f"attempts={len(concept_events)}",
        ]

        states.append(
            ConceptState(
                concept_id=concept_id,
                mastery_score=round(mastery, 3),
                trend=trend,
                confidence=round(confidence, 3),
                inactivity_days=inactivity_days,
                evidence=evidence,
            )
        )

    states.sort(key=lambda item: item.mastery_score)
    return states


def diagnose(states: list[ConceptState]) -> list[DiagnosisItem]:
    diagnosis: list[DiagnosisItem] = []

    for state in states:
        acc = 0.5
        rt = 20.0
        for ev in state.evidence:
            if ev.startswith("accuracy="):
                acc = float(ev.split("=", 1)[1])
            if ev.startswith("avg_response_time="):
                rt = float(ev.split("=", 1)[1].replace("s", ""))

        base_risk = 1.0 - state.mastery_score

        if state.inactivity_days >= 14 and state.trend != "improving":
            diagnosis.append(
                DiagnosisItem(
                    concept_id=state.concept_id,
                    cause="inactivity_decay",
                    score=round(_clamp(base_risk + 0.15, 0.0, 1.0), 3),
                    evidence=state.evidence + ["long_gap_detected"],
                )
            )

        if acc < 0.58 and rt > 22:
            diagnosis.append(
                DiagnosisItem(
                    concept_id=state.concept_id,
                    cause="concept_gap",
                    score=round(_clamp(base_risk + 0.2, 0.0, 1.0), 3),
                    evidence=state.evidence + ["low_accuracy_high_latency"],
                )
            )
        elif acc < 0.7 and rt < 12:
            diagnosis.append(
                DiagnosisItem(
                    concept_id=state.concept_id,
                    cause="careless_mistakes",
                    score=round(_clamp(base_risk + 0.1, 0.0, 1.0), 3),
                    evidence=state.evidence + ["low_latency_with_errors"],
                )
            )
        elif acc < 0.65:
            diagnosis.append(
                DiagnosisItem(
                    concept_id=state.concept_id,
                    cause="time_pressure",
                    score=round(_clamp(base_risk + 0.05, 0.0, 1.0), 3),
                    evidence=state.evidence + ["moderate_accuracy_instability"],
                )
            )

    diagnosis.sort(key=lambda item: item.score, reverse=True)
    return diagnosis[:10]
