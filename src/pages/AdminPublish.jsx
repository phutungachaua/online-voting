import { Megaphone, Trophy } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import EmptyState from '../components/EmptyState';
import Loading from '../components/Loading';
import { useToast } from '../components/ToastProvider';
import { usePolls } from '../hooks/usePolls';
import { listenVotes } from '../services/voteService';

const scoreMaxByType = {
  score10: 10,
  score100: 100,
};

const average = (values) => {
  const validValues = values.map(Number).filter((value) => Number.isFinite(value));
  if (validValues.length === 0) return 0;
  return validValues.reduce((sum, value) => sum + value, 0) / validValues.length;
};

const normalizeAudienceScore = (poll, votes = []) => {
  const type = poll.type || 'vote';
  if (!type.startsWith('score') || votes.length === 0) return 0;

  const max = scoreMaxByType[type] || 10;
  const rawAverage = average(votes.map((vote) => vote.score));
  return Number(((rawAverage / max) * 10).toFixed(1));
};

const normalizeManualScore = (items = []) => {
  const rawAverage = average(items.map((item) => item.score));
  return Number(Math.min(rawAverage, 10).toFixed(1));
};

const weightedTotal = ({ audienceScore, bgkScore, kmScore }) => (
  Number((audienceScore * 0.6 + bgkScore * 0.2 + kmScore * 0.2).toFixed(1))
);

const PUBLISH_ROLL_DURATION_MS = 10000;

const trophyImageUrl = 'https://raw.githubusercontent.com/microsoft/fluentui-emoji/main/assets/Trophy/3D/trophy_3d.png';

const rankCupStyles = [
  {
    label: 'Nhất',
    className: 'bg-amber-50 ring-1 ring-amber-100',
    imageClassName: 'h-12 w-12',
    imageStyle: {},
  },
  {
    label: 'Nhì',
    className: 'bg-slate-100 ring-1 ring-slate-200',
    imageClassName: 'h-10 w-10',
    imageStyle: { filter: 'grayscale(1) saturate(0.25) brightness(1.22) contrast(0.92)' },
  },
  {
    label: 'Ba',
    className: 'bg-orange-50 ring-1 ring-orange-100',
    imageClassName: 'h-9 w-9',
    imageStyle: { filter: 'sepia(0.7) saturate(1.6) hue-rotate(330deg) brightness(0.9)' },
  },
];

export default function AdminPublish() {
  const { toast } = useToast();
  const { polls, loading, error } = usePolls(true);
  const [votesByPollId, setVotesByPollId] = useState({});
  const [published, setPublished] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [rollingScores, setRollingScores] = useState({});
  const pollIdsKey = useMemo(() => polls.map((poll) => poll.id).join('|'), [polls]);

  useEffect(() => {
    if (!polls.length) {
      setVotesByPollId({});
      return undefined;
    }

    const unsubscribes = polls.map((poll) => (
      listenVotes(poll.id, (votes) => {
        setVotesByPollId((current) => ({ ...current, [poll.id]: votes }));
      }, () => {
        setVotesByPollId((current) => ({ ...current, [poll.id]: [] }));
      })
    ));

    return () => unsubscribes.forEach((unsubscribe) => unsubscribe());
  }, [pollIdsKey]);

  const rows = useMemo(() => {
    return polls.map((poll) => {
      const audienceScore = normalizeAudienceScore(poll, votesByPollId[poll.id] || []);
      const bgkScore = normalizeManualScore(poll.bgkScores || []);
      const kmScore = normalizeManualScore(poll.kmScores || []);
      return {
        id: poll.id,
        title: poll.title,
        description: poll.description,
        status: poll.status,
        audienceScore,
        bgkScore,
        kmScore,
        totalScore: weightedTotal({ audienceScore, bgkScore, kmScore }),
      };
    });
  }, [polls, votesByPollId]);

  const rankedRows = useMemo(() => (
    [...rows].sort((a, b) => b.totalScore - a.totalScore)
  ), [rows]);

  const displayScore = (row, key) => {
    if (publishing) return (rollingScores[row.id]?.[key] ?? 0).toFixed(1);
    if (!published) return '--';
    return row[key].toFixed(1);
  };

  const handlePublish = () => {
    if (publishing || published || rows.length === 0) return;

    setPublishing(true);
    const startedAt = Date.now();
    const interval = window.setInterval(() => {
      const elapsed = Date.now() - startedAt;
      if (elapsed >= PUBLISH_ROLL_DURATION_MS) {
        window.clearInterval(interval);
        setPublishing(false);
        setPublished(true);
        setRollingScores({});
        toast({ title: 'Đã công bố kết quả', message: 'Bảng xếp hạng đã hiển thị điểm thật.' });
        return;
      }

      const nextScores = {};
      rows.forEach((row) => {
        nextScores[row.id] = {
          audienceScore: Number((Math.random() * 10).toFixed(1)),
          bgkScore: Number((Math.random() * 10).toFixed(1)),
          kmScore: Number((Math.random() * 10).toFixed(1)),
          totalScore: Number((Math.random() * 10).toFixed(1)),
        };
      });
      setRollingScores(nextScores);
    }, 80);
  };

  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 w-fit rounded-full bg-brand-50 px-3 py-1 text-xs font-black uppercase tracking-wide text-brand-700">
            ACME Star final
          </p>
          <h1 className="text-3xl font-black tracking-tight text-slate-950 sm:text-4xl">Công bố kết quả</h1>
          <p className="mt-2 max-w-3xl text-slate-500">
            Điểm tổng = Khán giả 60% + Ban Giám Khảo 1 20% + Ban Giám Khảo 2 20%. Điểm được ẩn cho tới khi công bố.
          </p>
        </div>
        <button
          type="button"
          onClick={handlePublish}
          disabled={loading || publishing || published || rows.length === 0}
          className="inline-flex items-center justify-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Megaphone size={18} />
          {publishing ? 'Đang công bố...' : published ? 'Đã công bố' : 'Công bố'}
        </button>
      </div>

      {loading && <Loading />}
      {error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
      {!loading && !error && rows.length === 0 && <EmptyState title="Chưa có bình chọn" description="Tạo bình chọn trước khi công bố kết quả." />}

      {!loading && !error && rows.length > 0 && (
        <>
          <div className="overflow-hidden rounded-[2rem] bg-white shadow-soft">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left">
                <thead className="bg-slate-950 text-white">
                  <tr>
                    <th className="px-5 py-4 text-sm font-black">Bình chọn</th>
                    <th className="px-5 py-4 text-center text-sm font-black">Khán giả (60%)</th>
                    <th className="px-5 py-4 text-center text-sm font-black">Ban Giám Khảo 1 (20%)</th>
                    <th className="px-5 py-4 text-center text-sm font-black">Ban Giám Khảo 2 (20%)</th>
                    <th className="px-5 py-4 text-center text-sm font-black">Tổng</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rows.map((row) => (
                    <tr key={row.id} className="bg-white">
                      <td className="px-5 py-4">
                        <div className="font-black text-slate-950">{row.title}</div>
                        {row.description && <div className="mt-1 line-clamp-1 text-sm text-slate-500">{row.description}</div>}
                      </td>
                      <td className="px-5 py-4 text-center text-2xl font-black text-brand-700">{displayScore(row, 'audienceScore')}</td>
                      <td className="px-5 py-4 text-center text-2xl font-black text-brand-700">{displayScore(row, 'bgkScore')}</td>
                      <td className="px-5 py-4 text-center text-2xl font-black text-brand-700">{displayScore(row, 'kmScore')}</td>
                      <td className="px-5 py-4 text-center text-2xl font-black text-slate-950">{displayScore(row, 'totalScore')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <section className="mt-8 rounded-[2rem] bg-white p-6 shadow-soft">
            <div className="mb-5 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
                <Trophy size={22} />
              </div>
              <div>
                <h2 className="text-2xl font-black text-slate-950">Xếp hạng</h2>
                <p className="text-sm text-slate-500">Thứ tự từng bình chọn sau khi công bố.</p>
              </div>
            </div>

            <div className="space-y-3">
              {rankedRows.map((row, index) => {
                const cupStyle = rankCupStyles[index];

                return (
                <div key={row.id} className={`flex min-h-20 items-center justify-between gap-4 rounded-2xl p-4 ${published && cupStyle ? 'bg-white ring-1 ring-slate-100 shadow-sm' : 'bg-slate-50'}`}>
                  <div className="flex min-w-0 items-center gap-4">
                    <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-lg font-black shadow-sm ${published && cupStyle ? cupStyle.className : 'bg-white text-slate-950'}`}>
                      {published && cupStyle ? (
                        <img
                          src={trophyImageUrl}
                          alt={`Cúp hạng ${cupStyle.label}`}
                          className={`object-contain drop-shadow-md ${cupStyle.imageClassName}`}
                          style={cupStyle.imageStyle}
                        />
                      ) : published ? index + 1 : '--'}
                    </div>
                    <div className="min-w-0">
                      <div className="truncate font-black text-slate-950">{published ? row.title : 'Chưa công bố'}</div>
                      <div className="text-sm font-semibold text-slate-500">{published ? (cupStyle ? `Hạng ${cupStyle.label}` : 'Điểm tổng') : 'Bấm Công bố để hiển thị thứ hạng'}</div>
                    </div>
                  </div>
                  <div className="text-2xl font-black text-brand-700">
                    {displayScore(row, 'totalScore')}
                  </div>
                </div>
                );
              })}
            </div>
          </section>
        </>
      )}
    </section>
  );
}
