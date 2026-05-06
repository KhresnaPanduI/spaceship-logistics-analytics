type Props = {
  label: string;
  value: string;
  hint?: string;
};

export function KpiTile({ label, value, hint }: Props) {
  return (
    <div className="group rounded-xl border border-slate-200/70 bg-white p-5 transition-shadow hover:shadow-sm dark:border-slate-800/70 dark:bg-slate-900">
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
        {label}
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums tracking-tight text-slate-900 dark:text-slate-100">
        {value}
      </div>
      {hint && (
        <div className="mt-2 text-xs leading-snug text-slate-500 dark:text-slate-400">
          {hint}
        </div>
      )}
    </div>
  );
}
