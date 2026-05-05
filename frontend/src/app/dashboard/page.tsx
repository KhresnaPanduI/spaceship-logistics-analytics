import { ChartCard } from "@/components/ChartCard";
import { ChartRenderer } from "@/components/ChartRenderer";
import { KpiTile } from "@/components/KpiTile";
import { apiGet, ChartResponse, Kpis } from "@/lib/api";
import { fmtDays, fmtNumber, fmtPercent } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Parallel fetches — every chart hits the registry path on the backend.
  const [kpis, volume, status, carrierDelay] = await Promise.all([
    apiGet<Kpis>("/api/kpis"),
    apiGet<ChartResponse>("/api/charts/volume_over_time"),
    apiGet<ChartResponse>("/api/charts/delivery_status"),
    apiGet<ChartResponse>("/api/charts/carrier_delay_rate"),
  ]).catch((e) => {
    throw e;
  });

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Dashboard</h1>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
          Operational view of order volume, delivery performance, and carrier mix
          across the 2025 calendar year.
        </p>
      </header>

      <section className="grid grid-cols-2 gap-4 md:grid-cols-5">
        <KpiTile label="Total orders" value={fmtNumber(kpis.total_orders)} />
        <KpiTile label="Delivered" value={fmtNumber(kpis.delivered_orders)} />
        <KpiTile label="Delayed" value={fmtNumber(kpis.delayed_orders)} />
        <KpiTile
          label="On-time rate"
          value={fmtPercent(kpis.on_time_rate)}
          hint="delivered / (delivered + delayed + exception)"
        />
        <KpiTile
          label="Avg delivery time"
          value={fmtDays(kpis.avg_delivery_days)}
          hint="across completed deliveries"
        />
      </section>

      <section className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Order volume over time"
          subtitle="Monthly order count, 2025"
        >
          <ChartRenderer rows={volume.rows} viz={volume.viz_spec} />
        </ChartCard>

        <ChartCard
          title="Carrier delay rate"
          subtitle="(delayed + exception) / completed deliveries, by carrier"
        >
          <ChartRenderer rows={carrierDelay.rows} viz={carrierDelay.viz_spec} />
        </ChartCard>

        <ChartCard
          title="Delivery status breakdown"
          subtitle="Counts of each terminal status across the dataset"
        >
          <ChartRenderer rows={status.rows} viz={status.viz_spec} />
        </ChartCard>
      </section>
    </div>
  );
}
