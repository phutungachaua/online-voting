import { Home, LogOut, Megaphone, Menu, Shield, Vote } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import logo from '../../logo-AC.png';
import { useAuth } from '../hooks/useAuth';
import { useUserRole } from '../hooks/useUserRole';
import { logout } from '../services/authService';
import UserAvatar from './UserAvatar';

const linkClass = ({ isActive }) =>
  `rounded-full px-4 py-2 text-sm font-semibold transition ${isActive ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-950'}`;

export default function Navbar() {
  const { user } = useAuth();
  const { role, isAdmin } = useUserRole(user);
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className="sticky top-0 z-40 border-b border-white/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <Link to="/" className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-2xl bg-white shadow-md ring-1 ring-slate-100">
            <img src={logo} alt="ACMEVote" className="h-full w-full object-contain p-1.5" />
          </div>
          <div>
            <div className="text-lg font-black tracking-tight text-slate-950">ACMEVote</div>
            <div className="text-xs font-medium text-slate-500">online voting</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-2 md:flex">
          <NavLink end to="/" className={linkClass}><span className="inline-flex items-center gap-2"><Home size={16} />Trang chủ</span></NavLink>
          <NavLink to="/polls" className={linkClass}>
            <span className="inline-flex items-center gap-2">
              {isAdmin ? <Megaphone size={16} /> : <Vote size={16} />}
              {isAdmin ? 'Công bố' : 'Bình chọn'}
            </span>
          </NavLink>
          {isAdmin && <NavLink to="/admin" className={linkClass}><span className="inline-flex items-center gap-2"><Shield size={16} />Quản trị bình chọn</span></NavLink>}
        </nav>

        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative">
              <button type="button" onClick={() => setOpen((value) => !value)} className="rounded-full outline-none ring-brand-200 transition focus:ring-4">
                <UserAvatar user={user} />
              </button>
              {open && (
                <div className="absolute right-0 mt-3 w-72 rounded-3xl border border-slate-100 bg-white p-4 shadow-soft">
                  <div className="mb-4 flex items-center gap-3 border-b border-slate-100 pb-4">
                    <UserAvatar user={user} />
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-slate-900">{user.email}</p>
                      <p className="text-xs font-semibold uppercase tracking-wide text-brand-600">{role || 'user'}</p>
                    </div>
                  </div>
                  <button type="button" onClick={logout} className="flex w-full items-center justify-center gap-2 rounded-2xl bg-slate-950 px-4 py-3 text-sm font-bold text-white transition hover:bg-brand-700">
                    <LogOut size={16} /> Đăng xuất
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-brand-700">Đăng nhập</Link>
          )}
          <button type="button" onClick={() => setMobileOpen((value) => !value)} className="rounded-full p-2 text-slate-600 hover:bg-slate-100 md:hidden">
            <Menu size={22} />
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-100 bg-white px-4 py-3 md:hidden">
          <div className="flex flex-col gap-2">
            <NavLink end to="/" className={linkClass}>Trang chủ</NavLink>
            <NavLink to="/polls" className={linkClass}>{isAdmin ? 'Công bố' : 'Bình chọn'}</NavLink>
            {isAdmin && <NavLink to="/admin" className={linkClass}>Quản trị bình chọn</NavLink>}
          </div>
        </div>
      )}
    </header>
  );
}
