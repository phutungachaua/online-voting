import { AlertCircle, ArrowLeft, Megaphone } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Loading from '../components/Loading';
import { useToast } from '../components/ToastProvider';
import VoteOption from '../components/VoteOption';
import VoteResultBar from '../components/VoteResultBar';
import { useAuth } from '../hooks/useAuth';
import { usePoll } from '../hooks/usePolls';
import { useUserRole } from '../hooks/useUserRole';
import { useUserVote, useVotes } from '../hooks/useVotes';
import { submitVote } from '../services/voteService';

const typeLabels = {
  vote: 'Bình chọn',
  score10: 'Chấm điểm thang 10',
  score100: 'Chấm điểm thang 100',
};

const PUBLISH_ROLL_DURATION_MS = 10000;

function getScoreMax(type) {
  return type === 'score100' ? 100 : 10;
}

export default function PollDetail() {
  const { pollId } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const { isAdmin } = useUserRole(user);
  const { poll, loading: pollLoading, error: pollError } = usePoll(pollId);
  const { userVote, loading: userVoteLoading, error: userVoteError } = useUserVote(pollId, user?.uid);
  const { results, totalVotes, averageScore, loading: votesLoading, error: votesError } = useVotes(pollId, poll, isAdmin);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [score, setScore] = useState(1);
  const [saving, setSaving] = useState(false);
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [rollingScore, setRollingScore] = useState(null);

  const type = poll?.type || 'vote';
  const closed = poll?.status === 'closed';
  const alreadySubmitted = Boolean(userVote);
  const scoreMax = getScoreMax(type);
  const canSubmit = Boolean(user) && !closed && !isAdmin && !alreadySubmitted && !saving;

  const selectedOption = useMemo(
    () => poll?.options?.find((option) => option.id === selectedOptionId),
    [poll?.options, selectedOptionId],
  );

  useEffect(() => {
    setPublished(false);
    setPublishing(false);
    setRollingScore(null);
    setScore(1);
  }, [pollId]);

  if (pollLoading) return <Loading />;
  if (pollError) return <div className="mx-auto max-w-4xl px-4 py-12 text-red-700">{pollError}</div>;
  if (!poll) return <div className="mx-auto max-w-4xl px-4 py-12 text-slate-600">Không tìm thấy poll.</div>;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (closed) {
      toast({ type: 'error', title: 'Poll đã đóng', message: 'Bạn không thể bình chọn hoặc chấm điểm poll đã đóng.' });
      return;
    }
    if (!canSubmit) return;

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
      await submitVote(pollId, user.uid, payload);
      toast({ title: type === 'vote' ? 'Đã gửi bình chọn' : 'Đã gửi điểm', message: poll.title });
    } catch (err) {
      toast({ type: 'error', title: 'Không thể gửi', message: err.message });
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = () => {
    if (publishing || published) return;
    setPublishing(true);

    if (type.startsWith('score')) {
      const startedAt = Date.now();
      const interval = window.setInterval(() => {
        const elapsed = Date.now() - startedAt;
        if (elapsed >= PUBLISH_ROLL_DURATION_MS) {
          window.clearInterval(interval);
          setRollingScore(averageScore ?? 0);
          setPublishing(false);
          setPublished(true);
          toast({ title: 'Đã công bố kết quả', message: poll.title });
          return;
        }
        setRollingScore(Number((Math.random() * scoreMax).toFixed(1)));
      }, 80);
      return;
    }

    window.setTimeout(() => {
      setPublishing(false);
      setPublished(true);
      toast({ title: 'Đã công bố kết quả', message: poll.title });
    }, PUBLISH_ROLL_DURATION_MS);
  };

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
      <Link
        to="/polls"
        className="mb-5 inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-slate-100 hover:text-slate-950"
      >
        <ArrowLeft size={17} />
        Quay lại danh sách
      </Link>

      <div className="mb-8 rounded-[2rem] bg-gradient-to-br from-white to-brand-50 p-8 shadow-soft">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <span className={`rounded-full px-3 py-1 text-xs font-bold ${closed ? 'bg-slate-200 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>
            {closed ? 'Đã đóng' : 'Đang mở'}
          </span>
          <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">{typeLabels[type] || typeLabels.vote}</span>
          {isAdmin && <span className="rounded-full bg-white px-3 py-1 text-xs font-bold text-slate-500 shadow-sm">{totalVotes} lượt gửi</span>}
        </div>
        <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-5xl">{poll.title}</h1>
        <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600">{poll.description}</p>
      </div>

      {!user && (
        <div className="mb-6 flex items-center justify-between gap-4 rounded-2xl border border-amber-100 bg-amber-50 p-4 text-amber-800">
          <div className="flex items-center gap-3 text-sm font-semibold"><AlertCircle size={18} />Bạn cần đăng nhập để tham gia.</div>
          <Link to="/login" className="rounded-full bg-amber-500 px-4 py-2 text-sm font-bold text-white hover:bg-amber-600">Đăng nhập</Link>
        </div>
      )}

      {closed && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-slate-100 p-4 text-sm font-semibold text-slate-600">
          <AlertCircle size={18} /> Poll này đã đóng, không nhận thêm bình chọn hoặc điểm.
        </div>
      )}

      {isAdmin ? (
        <section className="rounded-[2rem] bg-white p-6 shadow-soft">
          <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-950">Kết quả dành cho admin</h2>
              <p className="mt-1 text-sm text-slate-500">Admin không được bình chọn/chấm điểm trên poll này.</p>
            </div>
            <button
              type="button"
              onClick={handlePublish}
              disabled={publishing || published || votesLoading}
              className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Megaphone size={18} />
              {publishing ? 'Đang công bố...' : published ? 'Đã công bố' : 'Công bố'}
            </button>
          </div>

          {votesError && <div className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{votesError}</div>}
          {votesLoading && <Loading label="Đang tải kết quả..." />}

          {!votesLoading && type === 'vote' && (
            <div className="space-y-4">
              {!published && <div className="rounded-2xl bg-slate-50 p-5 text-sm font-semibold text-slate-500">Bấm Công bố để hiển thị kết quả bình chọn.</div>}
              {published && results.map((option) => (
                <VoteResultBar key={option.id} option={option} selected={false} />
              ))}
            </div>
          )}

          {!votesLoading && type.startsWith('score') && (
            <div className="rounded-[2rem] bg-gradient-to-br from-brand-50 to-cyan-50 p-8 text-center">
              <p className="text-sm font-bold uppercase tracking-wide text-brand-700">Điểm trung bình</p>
              <div className="mt-4 text-6xl font-black tracking-tight text-slate-950">
                {publishing ? (rollingScore ?? 0).toFixed(1) : published ? (averageScore ?? 0).toFixed(1) : '--'}
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-500">Dựa trên <span className="font-bold text-lg">{totalVotes} lượt</span> chấm điểm</p>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-[2rem] bg-white p-6 shadow-soft">
          <h2 className="mb-5 text-xl font-black text-slate-950">{type === 'vote' ? 'Lựa chọn của bạn' : 'Điểm của bạn'}</h2>

          {userVoteLoading && <Loading label="Đang kiểm tra lượt gửi của bạn..." />}
          {userVoteError && <div className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{userVoteError}</div>}

          {!userVoteLoading && alreadySubmitted && (
            <div className="rounded-2xl bg-emerald-50 p-5 text-sm font-semibold text-emerald-700">
              Bạn đã gửi {userVote.type === 'vote' ? `bình chọn: ${poll.options?.find((option) => option.id === userVote.optionId)?.text || 'lựa chọn đã chọn'}` : `điểm: ${userVote.score}`}. Mỗi người dùng chỉ được gửi một lần.
            </div>
          )}

          {!userVoteLoading && !alreadySubmitted && closed && (
            <div className="rounded-2xl bg-slate-100 p-5 text-sm font-semibold text-slate-600">
              Poll này đã đóng. Bạn không thể bình chọn hoặc chấm điểm nữa.
            </div>
          )}

          {!userVoteLoading && !alreadySubmitted && !closed && (
            <form onSubmit={handleSubmit} className="space-y-5">
              {type === 'vote' ? (
                <div className="space-y-3">
                  {poll.options?.map((option) => (
                    <VoteOption
                      key={option.id}
                      option={option}
                      selected={selectedOption?.id === option.id}
                      disabled={!canSubmit}
                      onVote={setSelectedOptionId}
                    />
                  ))}
                </div>
              ) : (
                <div>
                  <div className="mb-3 flex items-center justify-between gap-4">
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
                    aria-label={`Chọn điểm từ 1 đến ${scoreMax}`}
                  />
                  <div className="mt-2 flex items-center justify-between text-xs font-bold text-slate-400">
                    <span>1.0</span>
                    <span>{scoreMax.toFixed(1)}</span>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={!canSubmit}
                className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
              >
                {saving ? 'Đang gửi...' : type === 'vote' ? 'Gửi bình chọn' : 'Gửi điểm'}
              </button>
            </form>
          )}
        </section>
      )}
    </div>
  );
}
