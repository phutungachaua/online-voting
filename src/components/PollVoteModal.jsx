import { CheckCircle2, X } from 'lucide-react';
import { useState } from 'react';
import { useToast } from './ToastProvider';
import VoteOption from './VoteOption';
import { useAuth } from '../hooks/useAuth';
import { useUserRole } from '../hooks/useUserRole';
import { useUserVote } from '../hooks/useVotes';
import { submitVote } from '../services/voteService';
import Loading from './Loading';

function getScoreMax(type) {
  return type === 'score100' ? 100 : 10;
}

const typeLabels = {
  vote: 'Bình chọn',
  score10: 'Chấm điểm thang 10',
  score100: 'Chấm điểm thang 100',
};

export default function PollVoteModal({ poll, onClose }) {
  const { user } = useAuth();
  const { isAdmin } = useUserRole(user);
  const { toast } = useToast();
  const { userVote, loading: userVoteLoading } = useUserVote(poll.id, user?.uid);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [score, setScore] = useState(1);
  const [saving, setSaving] = useState(false);

  const type = poll.type || 'vote';
  const closed = poll.status === 'closed';
  const scoreMax = getScoreMax(type);
  const alreadySubmitted = Boolean(userVote);
  const selectedOptionText = poll.options?.find((option) => option.id === userVote?.optionId)?.text;
  const canSubmit = Boolean(user) && !isAdmin && !closed && !alreadySubmitted && !saving;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (closed) {
      toast({ type: 'error', title: 'Poll đã đóng', message: 'Bạn không thể bình chọn hoặc chấm điểm poll đã đóng.' });
      return;
    }

    if (alreadySubmitted) {
      toast({ type: 'error', title: 'Bạn đã gửi rồi', message: 'Mỗi người dùng chỉ được gửi một lần.' });
      return;
    }

    let payload;
    if (type === 'vote') {
      if (!selectedOptionId) {
        toast({ type: 'error', title: 'Chưa chọn lựa chọn', message: 'Vui lòng chọn một lựa chọn trước khi gửi.' });
        return;
      }
      payload = { type: 'vote', optionId: selectedOptionId };
    } else {
      const numericScore = Number(score);
      if (!Number.isFinite(numericScore) || numericScore < 1 || numericScore > scoreMax) {
        toast({ type: 'error', title: 'Điểm không hợp lệ', message: `Điểm phải nằm trong khoảng từ 1 đến ${scoreMax}.` });
        return;
      }
      payload = { type, score: numericScore, optionId: `${type}-score` };
    }

    setSaving(true);
    try {
      await submitVote(poll.id, user.uid, payload);
      toast({ title: type === 'vote' ? 'Đã gửi bình chọn' : 'Đã gửi điểm', message: poll.title });
      onClose();
    } catch (err) {
      toast({ type: 'error', title: 'Không thể gửi', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[75] flex items-center justify-center bg-slate-950/55 px-4 py-4 backdrop-blur-sm md:py-6">
      <div className="vote-modal-panel max-h-[82dvh] overflow-x-hidden overflow-y-auto overscroll-contain rounded-[1.5rem] bg-white p-3.5 shadow-glow md:max-h-[92vh] md:rounded-[2rem] md:p-6">
        <div className="mb-4 flex items-start justify-between gap-3 md:mb-5 md:gap-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap gap-2">
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${closed ? 'bg-slate-100 text-slate-500' : 'bg-emerald-50 text-emerald-700'}`}>
                {closed ? 'Đã đóng' : 'Đang mở'}
              </span>
              <span className="rounded-full bg-brand-50 px-3 py-1 text-xs font-bold text-brand-700">{typeLabels[type]}</span>
            </div>
            <h2 className="break-words text-lg font-black leading-6 text-slate-950 md:text-2xl md:leading-8">{poll.title}</h2>
            {poll.description && <p className="mt-2 break-words text-sm leading-5 text-slate-500 md:leading-6">{poll.description}</p>}
          </div>
          <button type="button" onClick={onClose} className="shrink-0 rounded-full p-2 text-slate-500 hover:bg-slate-100">
            <X size={20} />
          </button>
        </div>

        {isAdmin && (
          <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-600">
            Admin không bình chọn hoặc chấm điểm trong modal này.
          </div>
        )}

        {!isAdmin && userVoteLoading && <Loading label="Đang kiểm tra lượt gửi của bạn..." />}

        {!isAdmin && !userVoteLoading && alreadySubmitted && (
          <div className="min-w-0 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-800">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold">
              <CheckCircle2 size={18} />
              Bạn đã gửi bình chọn cho tiết mục này
            </div>
            {type === 'vote' ? (
              <div className="break-words rounded-xl bg-white px-4 py-3 text-base font-black text-slate-950 shadow-sm">
                {selectedOptionText || 'Lựa chọn đã gửi'}
              </div>
            ) : (
              <div className="flex min-w-0 items-end gap-2 rounded-xl bg-white px-4 py-3 shadow-sm">
                <span className="text-4xl font-black text-brand-700">{Number(userVote.score || 0).toFixed(1)}</span>
                <span className="pb-1 text-sm font-bold text-slate-500">/ {scoreMax}</span>
              </div>
            )}
            <button type="button" onClick={onClose} className="mt-4 w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-brand-700">
              Đóng
            </button>
          </div>
        )}

        {!isAdmin && !userVoteLoading && !alreadySubmitted && closed && (
          <div className="rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-600">
            Poll này đã đóng. Bạn không thể bình chọn hoặc chấm điểm nữa.
            <button type="button" onClick={onClose} className="mt-4 w-full rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-brand-700">
              Đóng
            </button>
          </div>
        )}

        {!isAdmin && !userVoteLoading && !alreadySubmitted && !closed && (
          <form onSubmit={handleSubmit} className="space-y-5">
            {type === 'vote' ? (
              <div className="space-y-3">
                {poll.options?.map((option) => (
                  <VoteOption
                    key={option.id}
                    option={option}
                    selected={selectedOptionId === option.id}
                    disabled={!canSubmit}
                    onVote={setSelectedOptionId}
                  />
                ))}
              </div>
            ) : (
              <div>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <label className="block text-sm font-bold text-slate-700">Kéo để chọn điểm</label>
                  <div className="min-w-[76px] rounded-2xl bg-brand-50 px-4 py-2 text-center text-lg font-black text-brand-700">
                    {Number(score).toFixed(1)}
                  </div>
                </div>
                <input
                  type="range"
                  min="1"
                  max={scoreMax}
                  step="0.5"
                  value={score}
                  onChange={(event) => setScore(Number(event.target.value))}
                  disabled={!canSubmit}
                  className="h-3 w-full cursor-pointer appearance-none rounded-full bg-slate-200 accent-brand-600 disabled:cursor-not-allowed disabled:opacity-60"
                />
                <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-400">
                  <span>1.0</span>
                  <span>{scoreMax.toFixed(1)}</span>
                </div>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2.5 md:flex-row md:justify-end">
              <button type="button" onClick={onClose} className="w-full rounded-2xl bg-slate-100 px-4 py-3 font-bold text-slate-700 transition hover:bg-slate-200 md:w-auto md:px-5">
                Đóng
              </button>
              <button disabled={!canSubmit} className="w-full rounded-2xl bg-slate-950 px-4 py-3 font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 md:w-auto md:px-5">
                {saving ? 'Đang gửi...' : type === 'vote' ? 'Gửi bình chọn' : 'Gửi điểm'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
