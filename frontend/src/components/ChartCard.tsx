import { ReactNode } from "react";

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export function ChartCard({ title, subtitle, children }: Props) {
  return (
    <div className="rounded-xl border border-slate-200/70 bg-white p-5 dark:border-slate-800/70 dark:bg-slate-900">
      <h3 className="text-sm font-semibold tracking-tight text-slate-900 dark:text-slate-100">
        {title}
      </h3>
      {subtitle && (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
      )}
      <div className="mt-4">{children}</div>
    </div>
  );
}
