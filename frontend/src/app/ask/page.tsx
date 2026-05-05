"use client";

import { FormEvent, useState } from "react";

import { ChartCard } from "@/components/ChartCard";
import { ChartRenderer } from "@/components/ChartRenderer";
import { DataTable } from "@/components/DataTable";
import { ForecastChart } from "@/components/ForecastChart";
import { PlanPanel } from "@/components/PlanPanel";
import { apiPost, AskResponse } from "@/lib/api";

const EXAMPLES = [
  "How many orders were delivered late last month?",
  "Which carrier has the highest delay rate?",
  "Show order volume by month",
  "Total revenue by region",
  "Predict demand for CRAYON for the next 4 months",
];

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AskResponse | null>(null);

  async function submit(q: string) {
    if (!q.trim()) return;
    setQuestion(q);
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const data = await apiPost<AskResponse>("/api/ask", { question: q });
      setResponse(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    submit(question);
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Ask the data</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Natural-language questions are interpreted by the LLM, routed to a
          deterministic computation tool, and returned with the underlying
          query plan.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-3">
        <input
          className="w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-700 dark:bg-slate-900"
          placeholder="e.g. Which carrier has the highest delay rate?"
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={loading}
        />
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="submit"
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
            disabled={loading || !question.trim()}
          >
            {loading ? "Thinking…" : "Ask"}
          </button>
          <span className="text-xs text-slate-500">Examples:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => submit(ex)}
              disabled={loading}
              className="rounded-full border border-slate-300 bg-white px-3 py-1 text-xs text-slate-700 hover:border-blue-500 hover:text-blue-700 disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      {response && <ResponseView response={response} />}
    </div>
  );
}

function ResponseView({ response }: { response: AskResponse }) {
  if (response.kind === "unsupported") {
    return (
      <div className="space-y-3 rounded-lg border border-amber-300 bg-amber-50 p-5 dark:border-amber-900 dark:bg-amber-900/20">
        <div className="font-medium text-amber-900 dark:text-amber-200">
          Unsupported question
        </div>
        <p className="whitespace-pre-line text-sm text-amber-900/90 dark:text-amber-100/90">
          {response.message}
        </p>
        <div className="text-xs text-amber-900/80 dark:text-amber-100/70">
          <strong>Supported metrics:</strong> {response.supported_metrics.join(", ")}
          <br />
          <strong>Supported breakdowns:</strong>{" "}
          {response.supported_breakdowns.join(", ")}
        </div>
      </div>
    );
  }

  if (response.kind === "query") {
    const { answer, result } = response;
    return (
      <div className="space-y-5">
        <div className="rounded-lg border border-slate-200 bg-white p-5 text-base dark:border-slate-800 dark:bg-slate-900">
          {answer}
        </div>
        <ChartCard title="Visualization">
          <ChartRenderer rows={result.rows} viz={result.viz_spec} />
        </ChartCard>
        <PlanPanel plan={result.plan} />
        <ChartCard title="Underlying data" subtitle={`${result.rows.length} row(s)`}>
          <DataTable rows={result.rows} />
        </ChartCard>
      </div>
    );
  }

  // forecast
  const { answer, result } = response;

  return (
    <div className="space-y-5">
      <div className="rounded-lg border border-slate-200 bg-white p-5 text-base dark:border-slate-800 dark:bg-slate-900">
        {answer}
      </div>
      <ChartCard
        title={`Forecast — ${result.plan.entity}`}
        subtitle={`Method: ${result.plan.method_used} · Horizon: ${result.plan.horizon_months} month(s)`}
      >
        <ForecastChart historical={result.historical} forecast={result.forecast} />
      </ChartCard>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-lg border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Inventory recommendation
          </div>
          <div className="mt-2 text-3xl font-semibold tabular-nums">
            {result.inventory_recommendation} units
          </div>
          <p className="mt-2 text-xs text-slate-500">
            ceil(sum_forecast × 1.20) — 20% safety stock buffer
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-5 dark:border-slate-800 dark:bg-slate-900/40">
          <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
            Methodology
          </div>
          <p className="mt-2 text-sm leading-relaxed">{result.methodology}</p>
        </div>
      </div>
      <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm dark:border-slate-800 dark:bg-slate-900/40">
        <div className="font-medium">Plan parameters</div>
        <pre className="mt-2 overflow-x-auto whitespace-pre-wrap text-xs">
          {JSON.stringify(result.plan, null, 2)}
        </pre>
      </div>
    </div>
  );
}

