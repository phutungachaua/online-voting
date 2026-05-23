import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import AdminRoute from './components/AdminRoute';
import ProtectedRoute from './components/ProtectedRoute';
import AdminPolls from './pages/AdminPolls';
import Home from './pages/Home';
import Login from './pages/Login';
import PollDetail from './pages/PollDetail';
import Polls from './pages/Polls';

export default function App() {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <Navbar />
      <main>
        <Routes location={location} key={location.pathname}>
          <Route path="/" element={<Home />} />
          <Route path="/polls" element={<Polls />} />
          <Route path="/polls/:pollId" element={<ProtectedRoute><PollDetail /></ProtectedRoute>} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<AdminRoute><AdminPolls /></AdminRoute>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}
