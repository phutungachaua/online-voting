export default function VoteResultBar({ option, selected }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="mb-2 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-slate-800">{option.text}</span>
          {selected && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">Bạn chọn</span>}
        </div>
        <span className="text-sm font-semibold text-slate-600">{option.count} vote</span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-slate-100">
        <div
          className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400 transition-all duration-500"
          style={{ width: `${option.percent}%` }}
        />
      </div>
      <div className="mt-1 text-right text-sm font-semibold text-brand-700">{option.percent}%</div>
    </div>
  );
}
