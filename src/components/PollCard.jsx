import { ArrowRight, BarChart3, CheckCircle2, LockKeyhole } from 'lucide-react';
import { memo } from 'react';
import { Link } from 'react-router-dom';

function PollCard({ poll, userVote = null, onOpen, isAdmin = false }) {
  const isClosed = poll.status === 'closed';
  const type = poll.type || 'vote';
  const submittedLabel = type === 'vote' ? 'Đã bình chọn' : 'Đã chấm điểm';
  const adminCanViewResults = isAdmin && isClosed;
  const isDisabledForAdmin = isAdmin && !isClosed && !onOpen;
  const isUserCard = Boolean(onOpen) && !isAdmin;
  const canUserSubmit = isUserCard && !userVote && !isClosed;
  const openLabel = isAdmin ? 'Xem kết quả' : type === 'vote' ? 'Bình chọn' : 'Chấm điểm';
  const cardClass = `group relative flex min-h-24 flex-col items-center justify-center rounded-xl border bg-white p-2 text-left shadow-sm transition duration-200 sm:block sm:min-h-0 sm:rounded-2xl sm:p-5 ${
    isDisabledForAdmin
      ? 'cursor-default border-slate-100'
      : 'hover:-translate-y-0.5 hover:shadow-soft'
  } ${userVote ? 'border-emerald-200 ring-2 ring-emerald-50' : 'border-slate-100'}`;

  const actionClass = adminCanViewResults || canUserSubmit
    ? 'bg-slate-950 text-white transition group-hover:bg-brand-700'
    : 'bg-slate-200 text-slate-500';

  const cardContent = (
    <>
      {userVote && (
        <div className="absolute left-1.5 top-1.5 rounded-full bg-emerald-600 px-2 py-1 text-[10px] font-bold leading-none text-white sm:hidden">
          Đã gửi
        </div>
      )}

      <div className="mb-3 hidden items-start justify-between gap-3 sm:flex">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-brand-50 to-cyan-50 text-brand-600">
          <BarChart3 size={20} />
        </div>
        <div className="flex flex-wrap justify-end gap-1.5">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${isClosed ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
            {isClosed ? 'Đã đóng' : 'Đang mở'}
          </span>
          {userVote && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow-sm">
              <CheckCircle2 size={14} />
              {submittedLabel}
            </span>
          )}
        </div>
      </div>

      <h3 className="line-clamp-3 w-full text-center text-xs font-bold leading-4 text-slate-950 sm:line-clamp-2 sm:text-left sm:text-lg sm:leading-6">
        {poll.title}
      </h3>

      <p className="mt-2 hidden text-sm leading-5 text-slate-500 sm:line-clamp-2">{poll.description}</p>

      {userVote && (
        <div className="mt-3 hidden rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 sm:block sm:text-sm">
          {type === 'vote' ? 'Bạn đã gửi bình chọn cho tiết mục này.' : `Bạn đã chấm ${Number(userVote.score || 0).toFixed(1)} điểm.`}
        </div>
      )}

      {!userVote && isClosed && !isAdmin && (
        <div className="mt-3 hidden rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500 sm:block sm:text-sm">
          Bình chọn đã đóng.
        </div>
      )}

      {(isAdmin || canUserSubmit || isDisabledForAdmin) && (
        <div className="mt-4 hidden justify-end border-t border-slate-100 pt-4 sm:flex">
          <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-2 text-xs font-semibold sm:text-sm ${actionClass}`}>
            {isDisabledForAdmin && <LockKeyhole size={15} />}
            {openLabel}
            {(adminCanViewResults || canUserSubmit) && <ArrowRight size={16} />}
          </span>
        </div>
      )}
    </>
  );

  if (isUserCard) {
    return (
      <button type="button" onClick={() => onOpen(poll)} className={cardClass}>
        {cardContent}
      </button>
    );
  }

  if (isDisabledForAdmin) {
    return (
      <article aria-disabled="true" className={cardClass} title="Chỉ xem kết quả sau khi bình chọn đã đóng">
        {cardContent}
      </article>
    );
  }

  return (
    <Link to={`/polls/${poll.id}`} className={cardClass}>
      {cardContent}
    </Link>
  );
}

export default memo(PollCard);
