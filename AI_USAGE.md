# AI usage disclosure

The take-home brief asks for honest disclosure of AI usage, including
"specific examples of AI-generated code". This document covers that. The
intent is to be useful to a reviewer trying to understand which decisions
were mine versus Claude's.

## Tools used

- **Claude Code** (Sonnet, via the CLI agent) — for nearly all code authoring,
  refactoring, and debugging in this repo. Used as a pair-programmer: I drove
  the architecture and scope decisions, Claude executed.
- **Claude Sonnet via OpenRouter** — at runtime, inside the deployed app, as
  the LLM that picks tools on `/api/ask`. This is *the* AI capability the
  product exposes to end users.
- I did **not** use ChatGPT, Cursor, Copilot, or other assistants on this
  project. Single tool, fully disclosed.

## Division of labour

I framed this collaboration as **architect / implementer**: I owned the major
decisions, Claude owned implementation details, and we explicitly negotiated
the boundary in advance.

### What I owned

- **The architectural thesis.** "Single-agent + metric registry + structured
  tools, no raw AI-generated SQL" was my call after weighing options. Claude
  surfaced the literature (Cube semantic-layer benchmark, Snowflake Cortex
  Analyst numbers) but the choice — and the explicit decision *not* to build a
  ReAct loop or LLM critic — was mine.
- **Scope cuts.** Multi-step queries, SKU-level forecasts, seasonal models,
  caching, Docker, auth, query-history persistence — all explicitly cut by me
  with reasons recorded in the README. I pushed back on Claude when it
  proposed adding things that would have over-engineered the solution.
- **Data semantics.** The `on_time_rate` formula
  (`delivered / (delivered + delayed + exception)`), the choice to take
  "delayed" from the `status` column rather than derive it from dates, the
  decision to treat `origin_city` and `warehouse` as one dimension (1:1 in
  the data), and the 20% safety-stock buffer were all my calls after looking
  at the dataset.
- **Forecast grain.** Pinning forecasting at `product_category × month` and
  rejecting SKU-level requests with a routing message was my call, with
  Claude verifying the SKU sparsity claim (355 unique SKUs in 400 rows).
- **UX shape.** Splitting KPIs into a 4+3 grid, the Linear-style visual
  language, the indigo-500 accent, surfacing the registry on the empty
  `/ask` page, the "rows · ms" badge in the plan panel, the structured
  unsupported response — all my direction. Claude implemented to spec and
  pushed back on a couple of choices (one I accepted, one I overrode).
- **Stage gating.** I controlled the build sequence (backend skeleton → tools
  → LLM → frontend → deploy → docs) and refused to let Claude polish stage 1
  before stage 2 existed.

### What Claude generated end-to-end

These files were drafted by Claude with my review but only minor edits:

- `backend/app/registry.py` — dataclass + dict scaffold for metrics,
  dimensions, time grains. I specified the metric list and formulas; Claude
  wrote the Python.
- `backend/app/tools/query_metric.py` — SQL builder from a validated
  `QueryMetricInput`. I specified the shape (registry-driven aggregates,
  parameter binding for filter values, a separate inline display string for
  the plan panel); Claude wrote the implementation.
- `backend/app/tools/forecast.py` — series construction, `numpy.polyfit`
  linear-trend fit, moving-average fallback, methodology string assembly,
  inventory recommendation. I specified the methods and the auto-selection
  rule; Claude wrote the math.
- `backend/app/llm/prompt.py` — system-prompt assembly and OpenAI-format
  tool schemas derived from the registry. I specified that the prompt and
  schemas must come from the same registry module; Claude wired it up.
- `backend/app/llm/orchestrator.py` — the two-call orchestrator
  (tool-selection → execute → summarise). I specified "two calls, no retry,
  summariser cannot invent numbers"; Claude wrote it.
- `backend/tests/test_smoke.py` — the nine offline tests covering KPI truth
  numbers, registry validation, query_metric correctness, and forecast shape.
  I specified what to test; Claude wrote the assertions.
- Frontend boilerplate — `lib/api.ts`, `lib/format.ts`, `components/KpiTile`,
  `components/ChartRenderer`, `components/PlanPanel`, `components/DataTable`,
  page scaffolds for `/dashboard` and `/ask`. I specified the visual
  language and component responsibilities; Claude wrote the Tailwind/React.
- This README and `AI_USAGE.md` — drafted by Claude from notes I wrote in a
  separate planning document, then reviewed by me line-by-line for accuracy.

### What we figured out together

These were genuinely collaborative — neither of us had a fixed answer
beforehand:

- **Where to put deployment plumbing.** Railway's Nixpacks builder choked on
  `pip install uv==` (empty version), then on the uv 0.5.x venv path change
  (`/opt/venv` → `/app/.venv`). Claude diagnosed both, I confirmed the fix
  approach (pin via `nixpacks.toml`, use the explicit `/app/.venv/bin/uvicorn`
  path), Claude implemented. Both fixes are documented inline in the config.
- **Insights surfaced from the data.** I noticed during integration that
  400 ≠ 304 + 55 + 11 and asked Claude to account for the 41 missing orders.
  We confirmed they're `in_transit (27) + canceled (3) + exception (11)`,
  and then together decided to surface this in the dashboard via two new
  KPIs (`in_transit_orders`, `revenue_at_risk_usd`) plus three new charts
  (on-time trend, region delay, top-clients concentration). Claude proposed
  the chart list; I picked four of them and rejected category-delay (sample
  sizes too small) and promo-effect (n=22 too small).
- **Mobile responsiveness.** I sent screenshots of x-axis labels overlapping
  on mobile. We discussed three fixes (tilt labels, "preserveStartEnd"
  interval, shorter labels) and landed on viewport-conditional tilt via a
  `useIsMobile` hook. After deploying we discovered the same overlap on
  desktop time-series in the 2-col grid; extended the tilt to desktop for
  line charts only.
- **Bonus features.** I asked which spec section 14 bonuses (caching, Docker,
  tests, advanced explainability, ambiguous queries) to include. Claude
  recommended: tests already done, query history already done, add a small
  explainability win (rows · ms badge in PlanPanel), defer the rest with
  reasons in the README. I agreed and Claude added the badge.

### Where Claude pushed back and I overrode (or vice versa)

- Early in the build, Claude initially deflected my idea of a top-clients
  revenue chart. When I pushed back, Claude reassessed honestly, agreed it
  was worth shipping, and suggested the dual-axis combo design
  (revenue bars + delay-rate line) we ended up with. Good outcome from a
  productive disagreement.
- I pushed back on Claude's instinct to include category delay-rate and
  promo-effect charts; the sample sizes per category and per promo flag were
  too small for the numbers to be trustworthy. Claude agreed and dropped
  them.
- Claude wanted to amend a commit when a pre-commit hook failed. I'd
  configured my global instructions to forbid amending; Claude followed the
  rule and made a new commit instead.

## Specific code examples

A reviewer wanting to spot-check AI-generated code can look at:

- The `_inline_sql_for_display()` helper in
  `backend/app/tools/query_metric.py` — Claude wrote this from my spec
  ("substitute `?` with quoted literals so the plan panel shows readable
  SQL while the actual execution uses parameter binding"). Small but
  representative of the pattern: I describe the requirement, Claude writes
  the function.
- The `useIsMobile` hook at `frontend/src/lib/useIsMobile.ts` — Claude wrote
  end-to-end after I sent mobile screenshots and asked for a viewport-aware
  fix. The 640px breakpoint and `matchMedia` approach were Claude's call.
- The `registry_summary_for_prompt()` helper in `backend/app/registry.py` —
  Claude wrote this so the system prompt and tool schemas always derive
  from the same module. Single source of truth was my call; the format of
  the summary string was Claude's.
- The methodology-string template in `backend/app/tools/forecast.py` — the
  format ("*Forecast for product_category='CRAYON' over 4 month(s) using
  linear trend (least squares). Fit on 12 months ... R²=0.28 ...
  Limitations: ...*") was Claude's draft, which I edited for tone.

## Honesty notes

- I did **not** use AI to fabricate data, results, or test outputs.
- I did **not** ship code I hadn't read. Claude's drafts were reviewed; the
  ones I disagreed with were changed before commit.
- The architecture decisions in the README — including the references to
  Cube and Snowflake — are accurate citations, not retroactive
  justifications. I picked the architecture before writing the README and
  asked Claude to find the strongest external evidence for the choice.
- Where I say "I owned" something, I mean I made the call before any code
  was written for it. Where I say "Claude generated end-to-end", I mean I
  reviewed it but didn't materially rewrite it.

The runtime LLM call (Claude Sonnet via OpenRouter) is the product's headline
feature, not a hidden dependency: every `/ask` response shows the user the
exact tool that was called, the SQL that ran, the row count, and the
execution time. If the LLM ever drifted, the user would see it instantly in
the plan panel.
