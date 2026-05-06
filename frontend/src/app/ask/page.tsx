"use client";

import { FormEvent, useState } from "react";

import { AskEmptyState } from "@/components/AskEmptyState";
import { ChartCard } from "@/components/ChartCard";
import { ChartRenderer } from "@/components/ChartRenderer";
import { DataTable } from "@/components/DataTable";
import { ForecastChart } from "@/components/ForecastChart";
import { ForecastPlanCard } from "@/components/ForecastPlanCard";
import { PlanPanel } from "@/components/PlanPanel";
import { ResponseSkeleton } from "@/components/ResponseSkeleton";
import { apiPost, AskResponse, Unit } from "@/lib/api";
import { fmtNumber } from "@/lib/format";

const EXAMPLES = [
  "How many orders were delivered late last month?",
  "Which carrier has the highest delay rate?",
  "Show delayed orders by week for the last 3 months",
  "Show order volume by month",
  "Total revenue by region",
  "Predict demand for CRAYON for the next 4 months",
];

const HISTORY_LIMIT = 5;

export default function AskPage() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<AskResponse | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  async function submit(q: string) {
    if (!q.trim()) return;
    setQuestion(q);
    setLoading(true);
    setError(null);
    setResponse(null);
    try {
      const data = await apiPost<AskResponse>("/api/ask", { question: q });
      setResponse(data);
      setHistory((h) => [q, ...h.filter((x) => x !== q)].slice(0, HISTORY_LIMIT));
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

  const showEmptyState = !response && !loading && !error;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Ask the data</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Natural-language questions are interpreted by Claude, routed to a
          structured tool, and answered with deterministic computation. Every
          response includes the underlying query plan and data.
        </p>
      </header>

      <form onSubmit={onSubmit} className="space-y-3">
        <div className="flex gap-2">
          <input
            className="w-full rounded-lg border border-slate-300/70 bg-white px-4 py-2.5 text-sm shadow-sm transition-colors placeholder:text-slate-400 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 dark:border-slate-700 dark:bg-slate-900"
            placeholder="e.g. Which carrier has the highest delay rate?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            disabled={loading}
          />
          <button
            type="submit"
            className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={loading || !question.trim()}
          >
            {loading ? "Thinking…" : "Ask"}
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-500 dark:text-slate-400">Examples</span>
          {EXAMPLES.map((ex) => (
            <Chip key={ex} disabled={loading} onClick={() => submit(ex)}>
              {ex}
            </Chip>
          ))}
        </div>

        {history.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-500 dark:text-slate-400">Recent</span>
            {history.map((q) => (
              <Chip key={q} variant="recent" disabled={loading} onClick={() => submit(q)}>
                {q}
              </Chip>
            ))}
          </div>
        )}
      </form>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800 dark:border-red-900 dark:bg-red-900/20 dark:text-red-200">
          {error}
        </div>
      )}

      {loading && <ResponseSkeleton />}

      {showEmptyState && <AskEmptyState />}

      {response && !loading && <ResponseView response={response} />}
    </div>
  );
}

function Chip({
  children,
  onClick,
  disabled,
  variant = "example",
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "example" | "recent";
}) {
  const base =
    "rounded-full border px-3 py-1 text-xs transition-colors disabled:opacity-50";
  const styles =
    variant === "recent"
      ? "border-indigo-200 bg-indigo-50 text-indigo-800 hover:border-indigo-300 hover:bg-indigo-100 dark:border-indigo-900 dark:bg-indigo-900/20 dark:text-indigo-200"
      : "border-slate-300/70 bg-white text-slate-700 hover:border-indigo-400 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300";
  return (
    <button type="button" disabled={disabled} onClick={onClick} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}

function ResponseView({ response }: { response: AskResponse }) {
  if (response.kind === "unsupported") {
    return (
      <div className="space-y-3 rounded-xl border border-amber-300/70 bg-amber-50 p-5 dark:border-amber-900/70 dark:bg-amber-900/20">
        <div className="text-xs font-medium uppercase tracking-[0.08em] text-amber-900 dark:text-amber-200">
          Unsupported question
        </div>
        <p className="whitespace-pre-line text-sm text-amber-900/90 dark:text-amber-100/90">
          {response.message}
        </p>
        <div className="text-xs text-amber-900/80 dark:text-amber-100/80">
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
    const metricCol = result.viz_spec.y ?? null;
    const metricUnit: Unit | null = (result.viz_spec.y_unit as Unit | null) ?? null;
    return (
      <div className="space-y-5">
        <AnswerCard answer={answer} />
        <ChartCard title="Visualization">
          <ChartRenderer rows={result.rows} viz={result.viz_spec} />
        </ChartCard>
        <PlanPanel plan={result.plan} rowCount={result.rows.length} />
        <ChartCard title="Underlying data" subtitle={`${result.rows.length} row(s)`}>
          <DataTable rows={result.rows} metricCol={metricCol} metricUnit={metricUnit} />
        </ChartCard>
      </div>
    );
  }

  // forecast
  const { answer, result } = response;

  return (
    <div className="space-y-5">
      <AnswerCard answer={answer} />
      <ChartCard
        title={`Forecast — ${result.plan.entity}`}
        subtitle={`Method: ${result.plan.method_used} · Horizon: ${result.plan.horizon_months} month(s)`}
      >
        <ForecastChart historical={result.historical} forecast={result.forecast} />
      </ChartCard>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200/70 bg-white p-5 dark:border-slate-800/70 dark:bg-slate-900">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            Inventory recommendation
          </div>
          <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">
            {fmtNumber(result.inventory_recommendation)} units
          </div>
          <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">
            ⌈sum(forecast) × 1.20⌉ — 20% safety stock buffer.
          </p>
        </div>
        <div className="rounded-xl border border-slate-200/70 bg-slate-50/60 p-5 dark:border-slate-800/70 dark:bg-slate-900/40">
          <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
            Methodology
          </div>
          <p className="mt-2 text-sm leading-relaxed text-slate-700 dark:text-slate-300">
            {result.methodology}
          </p>
        </div>
      </div>
      <ForecastPlanCard plan={result.plan} />
    </div>
  );
}

function AnswerCard({ answer }: { answer: string }) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-5 text-base leading-relaxed text-slate-800 dark:border-slate-800/70 dark:bg-slate-900 dark:text-slate-200">
      {renderInlineMarkdown(answer)}
    </div>
  );
}

// Minimal inline renderer so the LLM's `**bold**` shows correctly without
// pulling in a markdown parser dependency.
function renderInlineMarkdown(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const re = /\*\*(.+?)\*\*/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let idx = 0;
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(
      <strong key={idx++} className="font-semibold text-slate-900 dark:text-slate-100">
        {m[1]}
      </strong>,
    );
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}
