import { Inbox } from 'lucide-react';

export default function EmptyState({ title = 'Chưa có dữ liệu', description = 'Dữ liệu sẽ xuất hiện tại đây khi được tạo.' }) {
  return (
    <div className="rounded-3xl border border-dashed border-slate-200 bg-white/80 px-6 py-12 text-center shadow-sm">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
        <Inbox size={26} />
      </div>
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">{description}</p>
    </div>
  );
}
