"""LLM orchestration: question -> tool selection -> deterministic execution -> NL summary.

Flow per /api/ask request:

  1. Send question + tool schemas to the LLM. The LLM either calls one tool
     or replies in text starting with "UNSUPPORTED:".
  2. Parse the chosen tool's arguments through Pydantic. Validation errors
     become a structured "unsupported" response — never a retry loop.
  3. Execute the tool deterministically (DuckDB SQL or pandas+numpy).
  4. Send the tool result back to the LLM and ask it for a 1-2 sentence
     plain-English answer. This second call ONLY summarises; it cannot
     change the numbers.
  5. Return the structured envelope.

Two LLM calls total. No ReAct loop, no critic, no retry.
"""
from __future__ import annotations

import json
import logging
from typing import Any

from pydantic import ValidationError

from app.llm.client import get_client, model_name
from app.llm.prompt import SYSTEM_PROMPT, all_tools
from app.registry import BREAKDOWNS, METRICS
from app.schemas import (
    ForecastAnswer,
    ForecastInput,
    QueryAnswer,
    QueryMetricInput,
    UnsupportedResult,
)
from app.tools.forecast import run_forecast
from app.tools.query_metric import run_query_metric

log = logging.getLogger(__name__)

AskResponse = QueryAnswer | ForecastAnswer | UnsupportedResult


def ask(question: str) -> AskResponse:
    client = get_client()

    # ---- Step 1: tool selection ----
    completion = client.chat.completions.create(
        model=model_name(),
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": question},
        ],
        tools=all_tools(),
        tool_choice="auto",
        temperature=0.1,
    )
    msg = completion.choices[0].message
    tool_calls = msg.tool_calls or []

    if not tool_calls:
        text = (msg.content or "").strip()
        if text.upper().startswith("UNSUPPORTED:"):
            reason = text.split(":", 1)[1].strip()
        else:
            reason = text or "I couldn't map this question to a supported tool."
        return _unsupported(reason)

    call = tool_calls[0]
    fn_name = call.function.name
    raw_args = call.function.arguments or "{}"
    try:
        args = json.loads(raw_args)
    except json.JSONDecodeError:
        return _unsupported(f"LLM returned malformed tool arguments: {raw_args!r}")

    # ---- Step 2 + 3: validate and execute ----
    try:
        if fn_name == "query_metric":
            inp = QueryMetricInput(**_strip_nulls(args))
            tool_result = run_query_metric(inp)
            tool_summary_for_llm = _summarise_query_for_llm(inp, tool_result)
            answer_text = _summarise_answer(question, fn_name, tool_summary_for_llm, client)
            return QueryAnswer(answer=answer_text, result=tool_result)

        if fn_name == "forecast":
            inp = ForecastInput(**_strip_nulls(args))
            forecast_result = run_forecast(inp)
            tool_summary_for_llm = _summarise_forecast_for_llm(inp, forecast_result)
            answer_text = _summarise_answer(question, fn_name, tool_summary_for_llm, client)
            return ForecastAnswer(answer=answer_text, result=forecast_result)

        return _unsupported(f"LLM called unknown tool '{fn_name}'.")
    except ValidationError as e:
        return _unsupported(f"Tool input failed validation: {e.errors()[0]['msg']}")
    except ValueError as e:
        return _unsupported(str(e))


# ---------- helpers ----------

def _strip_nulls(d: dict) -> dict:
    """Drop top-level keys whose value is None so Pydantic defaults take over.

    The LLM sometimes includes `"breakdown": null` etc., which is fine for our
    schema, but stripping makes the validation messages more useful when other
    fields are wrong.
    """
    return {k: v for k, v in d.items() if v is not None}


def _summarise_query_for_llm(inp: QueryMetricInput, res) -> str:
    """Compact text describing the tool result, for the second LLM call."""
    lines = [
        f"metric: {inp.metric}",
        f"breakdown: {inp.breakdown or 'none'}",
        f"time_grain: {inp.time_grain}",
        f"filters: {[f.model_dump() for f in inp.filters]}",
        f"date_range: {inp.date_from} to {inp.date_to}",
        f"row_count: {len(res.rows)}",
    ]
    # Show up to 20 rows for the LLM to summarise.
    sample = res.rows[:20]
    lines.append(f"rows (first {len(sample)}): {json.dumps(sample, default=str)}")
    return "\n".join(lines)


def _summarise_forecast_for_llm(inp: ForecastInput, res) -> str:
    return "\n".join([
        f"category: {inp.entity}",
        f"horizon_months: {inp.horizon_months}",
        f"method_used: {res.plan.method_used}",
        f"params: {json.dumps(res.plan.params)}",
        f"forecast: {[(p.period, p.value) for p in res.forecast]}",
        f"inventory_recommendation: {res.inventory_recommendation}",
    ])


def _summarise_answer(question: str, tool_name: str, tool_summary: str, client) -> str:
    """Second LLM call: turn structured tool output into a 1-2 sentence answer.

    Constraints in the prompt: only summarise the numbers we already computed;
    no new data, no speculation, no apology.
    """
    completion = client.chat.completions.create(
        model=model_name(),
        messages=[
            {
                "role": "system",
                "content": (
                    "You are summarising the result of a deterministic analytics tool "
                    "for a user. Reply in 1-2 short sentences. State only the numbers "
                    "the tool returned. Do not invent values, do not speculate, do not "
                    "apologise. If the result has many rows, mention only the headline "
                    "(top item, total, or trend direction)."
                ),
            },
            {
                "role": "user",
                "content": (
                    f"User question: {question}\n\n"
                    f"Tool used: {tool_name}\n"
                    f"Tool result:\n{tool_summary}"
                ),
            },
        ],
        temperature=0.1,
        max_tokens=200,
    )
    return (completion.choices[0].message.content or "").strip()


def _unsupported(reason: str) -> UnsupportedResult:
    return UnsupportedResult(
        message=reason,
        supported_metrics=list(METRICS.keys()),
        supported_breakdowns=list(BREAKDOWNS),
    )
