import { ArrowRight, PlusCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import Loading from '../components/Loading';
import { useAuth } from '../hooks/useAuth';
import { usePolls } from '../hooks/usePolls';
import { useUserRole } from '../hooks/useUserRole';

export default function Home() {
  const { user } = useAuth();
  const { isAdmin } = useUserRole(user);
  const { polls, loading } = usePolls(Boolean(user));
  const activePolls = polls.filter((poll) => poll.status === 'active');

  return (
    <section className="relative min-h-[calc(100vh-76px)] overflow-hidden bg-gradient-to-br from-brand-50 via-white to-cyan-50">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-16 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:px-8 lg:py-20">
        <div className="flex flex-col justify-center">
          <span className="mb-5 w-fit rounded-full bg-white px-4 py-2 text-sm font-bold text-brand-700 shadow-sm">Firebase realtime voting</span>
          <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl lg:text-6xl">
            Bình chọn trực tuyến, kết quả cập nhật tức thì.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-8 text-slate-600">
            VoteNow dùng Firebase Authentication, Firestore và onSnapshot để tạo trải nghiệm bình chọn realtime không cần backend riêng.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              to="/polls"
              className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-brand-700"
            >
              Xem bình chọn <ArrowRight size={18} />
            </Link>
            {isAdmin && (
              <Link
                to="/admin"
                className="inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-brand-700"
              >
                <PlusCircle size={18} />
                Tạo bình chọn
              </Link>
            )}
          </div>
        </div>

        <div className="relative min-h-[280px] rounded-[2rem] bg-white p-6 shadow-glow">
          <div className="absolute inset-0 rounded-[2rem] bg-gradient-to-br from-white to-brand-50" />
          <div className="relative space-y-4">
            {loading && user && <Loading label="Đang tải poll..." />}
            {!loading && activePolls.slice(0, 3).map((poll, index) => (
              <div key={poll.id} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm" style={{ transform: `translateX(${index * 14}px)` }}>
                <div className="h-3 w-24 rounded-full bg-brand-100" />
                <div className="mt-3 h-4 w-3/4 rounded-full bg-slate-200" />
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-cyan-400" style={{ width: `${45 + index * 15}%` }} />
                </div>
              </div>
            ))}
            {!loading && activePolls.length === 0 && <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-slate-500">Vào trang Bình chọn để xem danh sách poll</div>}
          </div>
        </div>
      </div>
    </section>
  );
}
