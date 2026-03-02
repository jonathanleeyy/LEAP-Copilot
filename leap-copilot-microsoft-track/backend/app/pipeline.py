from __future__ import annotations

from datetime import UTC, datetime

from .engine import compute_concept_states, diagnose
from .models import AnalyzeRequest, AnalyzeResponse, DailyTask


def _activity_for_cause(cause: str) -> tuple[str, str]:
    if cause == "concept_gap":
        return (
            "Concept rebuild: 2 worked examples + 5 targeted questions",
            "Raise conceptual clarity and reduce repeated misunderstandings",
        )
    if cause == "careless_mistakes":
        return (
            "Accuracy drill: slow-pass checklist + error log review",
            "Reduce avoidable mistakes through deliberate verification",
        )
    if cause == "time_pressure":
        return (
            "Timed micro-quiz (8-10 min) + reflection",
            "Improve speed-accuracy balance under constrained time",
        )
    return (
        "Spaced recall restart: summary + retrieval practice",
        "Recover forgotten knowledge after inactivity",
    )


def build_seven_day_plan(request: AnalyzeRequest) -> AnalyzeResponse:
    states = compute_concept_states(request.events)
    diagnosis = diagnose(states)
    ctx_by_concept = {ctx.concept_id: ctx for ctx in request.module_contexts}

    plan: list[DailyTask] = []
    if diagnosis:
        top = diagnosis[: min(3, len(diagnosis))]
        daily_budget = max(request.daily_minutes, 15)

        for day in range(1, 8):
            current = top[(day - 1) % len(top)]
            activity, outcome = _activity_for_cause(current.cause)
            context = ctx_by_concept.get(current.concept_id)
            topic_hint = ""
            if context and context.topics:
                topic_hint = f" Focus topic: {context.topics[(day - 1) % len(context.topics)]}."
            duration = min(max(15, daily_budget // len(top)), 60)
            plan.append(
                DailyTask(
                    day=day,
                    concept_id=current.concept_id,
                    activity=f"{activity}.{topic_hint}".strip(),
                    duration_min=duration,
                    expected_outcome=outcome,
                    confidence=round(max(0.5, current.score), 3),
                    evidence=current.evidence[:4],
                )
            )
    elif states:
        # Ensure users always get actionable output, even when no risk diagnosis is triggered.
        target = states[0]
        daily_budget = max(request.daily_minutes, 15)
        for day in range(1, 8):
            plan.append(
                DailyTask(
                    day=day,
                    concept_id=target.concept_id,
                    activity="Reinforcement set: 5 mixed questions + 1 summary note",
                    duration_min=min(max(15, daily_budget // 2), 45),
                    expected_outcome="Maintain mastery and prevent future decay",
                    confidence=round(max(0.5, target.confidence), 3),
                    evidence=target.evidence[:4],
                )
            )

    normalized: list[DailyTask] = []
    for item in sorted(plan, key=lambda x: x.day):
        evidence = item.evidence if item.evidence else ["insufficient_evidence_fallback"]
        context = ctx_by_concept.get(item.concept_id)
        if context and context.assignments:
            nearest = sorted(context.assignments, key=lambda a: a.due_date)[0]
            evidence = [
                *evidence,
                f"assignment_due:{nearest.title}@{nearest.due_date.date().isoformat()}",
            ]
        normalized.append(item.model_copy(update={"evidence": evidence[:4]}))

    summary = (
        f"Analyzed {len(request.events)} events across {len(states)} concepts. "
        f"Generated {len(normalized)} daily tasks with explicit evidence links."
    )

    return AnalyzeResponse(
        student_id=request.student_id,
        generated_at=datetime.now(UTC),
        concept_states=states,
        diagnosis=diagnosis,
        seven_day_plan=normalized,
        summary=summary,
    )
