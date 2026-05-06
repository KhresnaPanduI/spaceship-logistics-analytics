export function ResponseSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-live="polite">
      <div className="rounded-xl border border-slate-200/70 bg-white p-5 dark:border-slate-800/70 dark:bg-slate-900">
        <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
          <Spinner /> Routing through structured tool…
        </div>
        <div className="mt-4 space-y-2">
          <Bar w="w-2/3" />
          <Bar w="w-5/6" />
          <Bar w="w-1/2" />
        </div>
      </div>
      <div className="rounded-xl border border-slate-200/70 bg-white p-5 dark:border-slate-800/70 dark:bg-slate-900">
        <Bar w="w-1/4" />
        <div className="mt-6 h-48 animate-pulse rounded-md bg-slate-100 dark:bg-slate-800/60" />
      </div>
    </div>
  );
}

function Bar({ w }: { w: string }) {
  return <div className={`h-3 animate-pulse rounded-full bg-slate-100 dark:bg-slate-800/70 ${w}`} />;
}

function Spinner() {
  return (
    <svg
      className="h-3.5 w-3.5 animate-spin text-indigo-500"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
      <path
        d="M22 12a10 10 0 0 1-10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
