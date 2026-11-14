import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import AppLayout from './layouts/AppLayout';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import LeaderDashboard from './pages/LeaderDashboard';
import Groups from './pages/Groups';
import Students from './pages/Students';
import Attendance from './pages/Attendance';
import Warnings from './pages/Warnings';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';

function Home() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={user.role === 'admin' ? '/admin' : '/guruh-rahbari'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<Home />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/guruhlar" element={<Groups />} />
          <Route path="/oquvchilar" element={<Students />} />
          <Route path="/davomat" element={<Attendance />} />
          <Route path="/ogohlantirishlar" element={<Warnings />} />
          <Route path="/hisobotlar" element={<Reports />} />
          <Route path="/sozlamalar" element={<Settings />} />
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/foydalanuvchilar" element={<Users />} />
          </Route>
          <Route element={<ProtectedRoute roles={['group_leader']} />}>
            <Route path="/guruh-rahbari" element={<LeaderDashboard />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
