import { Lock } from 'lucide-react';

export default function VoteOption({ option, selected, disabled, onVote }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={() => onVote(option.id)}
      className={`group flex w-full items-center justify-between rounded-2xl border px-5 py-4 text-left transition duration-200 ${
        selected
          ? 'border-brand-500 bg-brand-50 shadow-md shadow-blue-100'
          : 'border-slate-200 bg-white hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-lg'
      } ${disabled ? 'cursor-not-allowed opacity-70' : ''}`}
    >
      <span className="font-semibold text-slate-800">{option.text}</span>
      {selected ? (
        <span className="rounded-full bg-brand-600 px-3 py-1 text-xs font-semibold text-white">Đã chọn</span>
      ) : disabled ? (
        <Lock size={16} className="text-slate-400" />
      ) : (
        <span className="text-sm font-medium text-brand-600 opacity-0 transition group-hover:opacity-100">Bình chọn</span>
      )}
    </button>
  );
}
