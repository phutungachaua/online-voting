import { LogIn } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { login } from '../services/authService';

const EMAIL_DOMAIN = '@votes.com';

const normalizeAccount = (value) => (
  value
    .trim()
    .toLowerCase()
    .replace(EMAIL_DOMAIN, '')
);

export default function Login() {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [account, setAccount] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const from = location.state?.from?.pathname || '/';

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const email = `${normalizeAccount(account)}${EMAIL_DOMAIN}`;
      await login(email, password);
      navigate(from, { replace: true });
    } catch (err) {
      setError('Tài khoản hoặc mật khẩu không hợp lệ.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-76px)] max-w-7xl items-center justify-center px-4 py-12 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-[2rem] border border-white bg-white p-8 shadow-glow">
        <div className="mb-8">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
            <LogIn size={26} />
          </div>
          <h1 className="text-3xl font-black tracking-tight text-slate-950">Đăng nhập</h1>
          <p className="mt-2 text-sm text-slate-500">Chỉ nhập phần tài khoản, hệ thống tự thêm @votes.com.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="account">Tài khoản</label>
            <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white transition focus-within:border-brand-500 focus-within:ring-4 focus-within:ring-brand-100">
              <input
                id="account"
                type="text"
                required
                autoComplete="username"
                value={account}
                onChange={(event) => setAccount(normalizeAccount(event.target.value))}
                className="min-w-0 flex-1 px-4 py-3 outline-none"
                placeholder="nguyenvanaac"
              />
              <span className="flex shrink-0 items-center border-l border-slate-200 bg-slate-50 px-3 text-sm font-bold text-slate-500">
                {EMAIL_DOMAIN}
              </span>
            </div>
          </div>
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-700" htmlFor="password">Mật khẩu</label>
            <input
              id="password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-brand-500 focus:ring-4 focus:ring-brand-100"
            />
          </div>
          {error && <div className="rounded-2xl bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</div>}
          <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-5 py-3 font-bold text-white transition hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-70">
            <LogIn size={18} /> {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}
