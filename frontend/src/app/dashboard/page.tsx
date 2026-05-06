import { ChartCard } from "@/components/ChartCard";
import { ChartRenderer } from "@/components/ChartRenderer";
import { ConcentrationChart } from "@/components/ConcentrationChart";
import { KpiTile } from "@/components/KpiTile";
import { apiGet, ChartResponse, Kpis } from "@/lib/api";
import { fmtCurrencyUSD, fmtDays, fmtNumber, fmtPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Parallel fetches — every chart hits the registry path on the backend.
  const [
    kpis,
    volume,
    onTimeTrend,
    status,
    carrierDelay,
    regionDelay,
    concentration,
  ] = await Promise.all([
    apiGet<Kpis>("/api/kpis"),
    apiGet<ChartResponse>("/api/charts/volume_over_time"),
    apiGet<ChartResponse>("/api/charts/on_time_rate_trend"),
    apiGet<ChartResponse>("/api/charts/delivery_status"),
    apiGet<ChartResponse>("/api/charts/carrier_delay_rate"),
    apiGet<ChartResponse>("/api/charts/delay_rate_by_region"),
    apiGet<ChartResponse>("/api/charts/client_revenue_concentration"),
  ]);

  return (
    <div className="space-y-10">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Operational view of order volume, delivery performance, and carrier mix
          across the 2025 calendar year.
        </p>
      </header>

      <section className="space-y-4">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <KpiTile label="Total orders" value={fmtNumber(kpis.total_orders)} />
          <KpiTile label="Delivered" value={fmtNumber(kpis.delivered_orders)} />
          <KpiTile label="Delayed" value={fmtNumber(kpis.delayed_orders)} />
          <KpiTile
            label="In transit"
            value={fmtNumber(kpis.in_transit_orders)}
            hint="active pipeline"
          />
        </div>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <KpiTile
            label="On-time rate"
            value={fmtPercent(kpis.on_time_rate)}
            hint="delivered ÷ (delivered + delayed + exception)"
          />
          <KpiTile
            label="Avg delivery time"
            value={fmtDays(kpis.avg_delivery_days)}
            hint="across completed deliveries"
          />
          <KpiTile
            label="Revenue at risk"
            value={fmtCurrencyUSD(kpis.revenue_at_risk_usd, 0)}
            hint="value of delayed + exception orders"
          />
        </div>
      </section>

      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <ChartCard
          title="Order volume over time"
          subtitle="Monthly order count, 2025"
        >
          <ChartRenderer rows={volume.rows} viz={volume.viz_spec} />
        </ChartCard>

        <ChartCard
          title="On-time rate over time"
          subtitle="Monthly on-time delivery rate, 2025"
        >
          <ChartRenderer rows={onTimeTrend.rows} viz={onTimeTrend.viz_spec} />
        </ChartCard>

        <ChartCard
          title="Carrier delay rate"
          subtitle="(delayed + exception) ÷ completed deliveries, by carrier"
        >
          <ChartRenderer rows={carrierDelay.rows} viz={carrierDelay.viz_spec} />
        </ChartCard>

        <ChartCard
          title="Delay rate by region"
          subtitle="Geographic complement to the by-carrier view"
        >
          <ChartRenderer rows={regionDelay.rows} viz={regionDelay.viz_spec} />
        </ChartCard>

        <ChartCard
          title="Delivery status breakdown"
          subtitle="Counts of each terminal status across the dataset"
        >
          <ChartRenderer rows={status.rows} viz={status.viz_spec} />
        </ChartCard>

        <ChartCard
          title="Top clients — revenue & delay rate"
          subtitle="Concentration risk by client ID; which large clients also have delivery problems"
        >
          <ConcentrationChart rows={concentration.rows} />
        </ChartCard>
      </section>
    </div>
  );
}
