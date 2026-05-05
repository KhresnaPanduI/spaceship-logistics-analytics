// Shared API client. Single source for the backend base URL so we can swap
// between local dev and the deployed Railway URL via env.

const BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://localhost:8765";

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

// ---- Response types ----

export type Kpis = {
  total_orders: number;
  delivered_orders: number;
  delayed_orders: number;
  on_time_rate: number;
  avg_delivery_days: number;
};

export type ChartRow = Record<string, string | number | null>;
export type VizSpec = {
  type: "line" | "bar" | "stacked_bar" | "number" | "table";
  x?: string | null;
  y?: string | null;
  series?: string | null;
};

export type ChartResponse = {
  rows: ChartRow[];
  viz_spec: VizSpec;
  plan?: QueryPlan;
};

export type Filter = { field: string; op: "eq" | "in"; value: unknown };
export type QueryPlan = {
  metric: string;
  breakdown: string | null;
  time_grain: string;
  filters: Filter[];
  date_from: string | null;
  date_to: string | null;
  sql: string;
};

export type QueryResult = {
  rows: ChartRow[];
  plan: QueryPlan;
  viz_spec: VizSpec;
};

export type ForecastPoint = { period: string; value: number };
export type ForecastResult = {
  historical: ForecastPoint[];
  forecast: ForecastPoint[];
  inventory_recommendation: number;
  methodology: string;
  plan: {
    grain: string;
    entity: string;
    horizon_months: number;
    method_used: string;
    params: Record<string, number | string>;
  };
};

export type AskResponse =
  | { kind: "query"; answer: string; result: QueryResult }
  | { kind: "forecast"; answer: string; result: ForecastResult }
  | {
      kind: "unsupported";
      message: string;
      supported_metrics: string[];
      supported_breakdowns: string[];
    };
