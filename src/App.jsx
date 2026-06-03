import { Suspense, lazy } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import Navbar from './components/Navbar';
import AdminRoute from './components/AdminRoute';
import ProtectedRoute from './components/ProtectedRoute';
import Loading from './components/Loading';

const AdminPolls = lazy(() => import('./pages/AdminPolls'));
const Home = lazy(() => import('./pages/Home'));
const Login = lazy(() => import('./pages/Login'));
const PollDetail = lazy(() => import('./pages/PollDetail'));
const Polls = lazy(() => import('./pages/Polls'));

export default function App() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main>
        <Suspense fallback={<Loading />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/polls" element={<Polls />} />
            <Route path="/polls/:pollId" element={<ProtectedRoute><PollDetail /></ProtectedRoute>} />
            <Route path="/login" element={<Login />} />
            <Route path="/admin" element={<AdminRoute><AdminPolls /></AdminRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Suspense>
      </main>
    </div>
  );
}
