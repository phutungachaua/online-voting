export default function Loading({ label = 'Đang tải dữ liệu...' }) {
  return (
    <div className="flex min-h-[220px] items-center justify-center">
      <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-soft">
        <span className="h-5 w-5 animate-spin rounded-full border-2 border-brand-100 border-t-brand-600" />
        <span className="text-sm font-medium text-slate-600">{label}</span>
      </div>
    </div>
  );
}
