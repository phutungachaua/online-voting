import { PlusCircle } from 'lucide-react';
import { Suspense, lazy, useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import Loading from '../components/Loading';
import PollCard from '../components/PollCard';
import { useAuth } from '../hooks/useAuth';
import { usePolls } from '../hooks/usePolls';
import { useUserRole } from '../hooks/useUserRole';
import { useUserPollVotes } from '../hooks/useVotes';

const AdminPublish = lazy(() => import('./AdminPublish'));
const PollVoteModal = lazy(() => import('../components/PollVoteModal'));

export default function Polls() {
  const { user, loading: authLoading } = useAuth();
  const { isAdmin, loading: roleLoading } = useUserRole(user);
  const location = useLocation();
  const shouldLoadUserPolls = Boolean(user) && !roleLoading && !isAdmin;
  const { polls, loading, error } = usePolls(shouldLoadUserPolls);
  const [page, setPage] = useState(1);
  const [selectedPoll, setSelectedPoll] = useState(null);
  const pageSize = 12;
  const totalPages = Math.max(1, Math.ceil(polls.length / pageSize));
  const visiblePolls = useMemo(() => {
    const start = (page - 1) * pageSize;
    return polls.slice(start, start + pageSize);
  }, [page, polls]);
  const { votesByPollId } = useUserPollVotes(isAdmin ? [] : visiblePolls, user?.uid);

  useEffect(() => {
    setPage(1);
  }, [polls.length]);

  useEffect(() => {
    setSelectedPoll(null);
  }, [location.pathname, isAdmin]);

  const canOpenVoteModal = Boolean(user) && !isAdmin && !roleLoading;
  const handleOpenPoll = useCallback((poll) => {
    setSelectedPoll(poll);
  }, []);

  if (!authLoading && user && !roleLoading && isAdmin) {
    return (
      <Suspense fallback={<Loading />}>
        <AdminPublish />
      </Suspense>
    );
  }

  return (
    <section className="festival-stage relative min-h-[calc(100vh-76px)] overflow-hidden">
      <div className="stage-grid" />
      <div className="stage-beams" />
      <div className="stage-bars" aria-hidden="true">
        {Array.from({ length: 18 }).map((_, index) => (
          <span key={index} style={{ '--i': index }} />
        ))}
      </div>

      <div className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-10 lg:px-8">
        <div className="mb-5 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="mb-2 w-fit rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-cyan-100 backdrop-blur">
              ACME Star live voting
            </p>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Bình chọn tiết mục ACME Star</h1>
            <p className="mt-2 text-sm text-cyan-50/85 sm:text-base">Chọn một tiết mục để bình chọn hoặc chấm điểm.</p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-slate-950 shadow-md transition hover:bg-cyan-50"
              >
                <PlusCircle size={17} />
                Tạo bình chọn
              </Link>
            )}
          </div>
        </div>

        {authLoading && <Loading />}
        {!authLoading && !user && <EmptyState title="Cần đăng nhập" description="Hãy đăng nhập để xem danh sách bình chọn." />}
        {user && (loading || roleLoading) && <Loading />}
        {user && error && <div className="rounded-2xl bg-red-50 p-4 text-sm font-semibold text-red-700">{error}</div>}
        {user && !loading && !roleLoading && !error && polls.length === 0 && <EmptyState title="Chưa có cuộc bình chọn" description="Admin có thể tạo poll mới trong trang quản trị." />}
        {user && !loading && !roleLoading && !error && polls.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-2 sm:gap-4 xl:grid-cols-3">
              {visiblePolls.map((poll) => (
                <PollCard
                  key={poll.id}
                  poll={poll}
                  userVote={votesByPollId[poll.id]}
                  isAdmin={isAdmin}
                  onOpen={canOpenVoteModal ? handleOpenPoll : undefined}
                />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="mt-6 flex flex-col gap-3 rounded-2xl border border-white/15 bg-white/90 p-3 shadow-soft backdrop-blur sm:flex-row sm:items-center sm:justify-between">
                <p className="text-center text-sm font-semibold text-slate-600 sm:text-left">
                  Trang {page}/{totalPages} · Hiển thị {visiblePolls.length}/{polls.length} poll
                </p>
                <div className="grid grid-cols-2 gap-2 sm:flex">
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.max(1, current - 1))}
                    disabled={page === 1}
                    className="rounded-full bg-slate-100 px-4 py-2 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Trước
                  </button>
                  <button
                    type="button"
                    onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                    disabled={page === totalPages}
                    className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-45"
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {selectedPoll && canOpenVoteModal && (
        <Suspense fallback={null}>
          <PollVoteModal poll={selectedPoll} onClose={() => setSelectedPoll(null)} />
        </Suspense>
      )}
    </section>
  );
}
