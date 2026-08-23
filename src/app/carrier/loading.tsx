export default function CarrierLoading() {
  return (
    <div className="space-y-6 animate-pulse">
      <div className="space-y-2">
        <div className="h-8 w-56 rounded-lg bg-slate-200" />
        <div className="h-4 w-80 max-w-full rounded bg-slate-100" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-24 rounded-[10px] bg-white shadow-sm">
            <div className="h-full rounded-[10px] bg-slate-100/80" />
          </div>
        ))}
      </div>
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="h-72 rounded-xl bg-slate-100" />
        <div className="h-72 rounded-xl bg-slate-100" />
      </div>
    </div>
  );
}
