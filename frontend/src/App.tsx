import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Splash from './components/Splash';
import AppLayout from './layouts/AppLayout';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import LeaderDashboard from './pages/LeaderDashboard';
import Groups from './pages/Groups';
import Students from './pages/Students';
import Attendance from './pages/Attendance';
import QuickAttendance from './pages/QuickAttendance';
import Warnings from './pages/Warnings';
import Reports from './pages/Reports';
import Users from './pages/Users';
import Settings from './pages/Settings';
import ParentPage from './pages/ParentPage';
import DutySchedule from './pages/DutySchedule';
import type { Role } from './types';

const HOME: Record<Role, string> = {
  admin: '/admin',
  manaviyatchi: '/admin',
  group_leader: '/guruh-rahbari',
  navbatchi: '/navbatchi'
};

function Home() {
  const { user, loading } = useAuth();
  if (loading) return <Splash />;
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={HOME[user.role] ?? '/guruh-rahbari'} replace />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/ota-ona" element={<ParentPage />} />
      <Route path="/" element={<Home />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/guruhlar" element={<Groups />} />
          <Route path="/oquvchilar" element={<Students />} />
          <Route path="/davomat" element={<Attendance />} />
          <Route path="/ogohlantirishlar" element={<Warnings />} />
          <Route path="/hisobotlar" element={<Reports />} />
          <Route path="/sozlamalar" element={<Settings />} />
          <Route element={<ProtectedRoute roles={['admin', 'navbatchi']} />}>
            <Route path="/davomat-belgilash" element={<QuickAttendance />} />
          </Route>
          <Route element={<ProtectedRoute roles={['admin', 'manaviyatchi']} />}>
            <Route path="/admin" element={<AdminDashboard />} />
            <Route path="/navbatchilar" element={<DutySchedule />} />
          </Route>
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/foydalanuvchilar" element={<Users />} />
          </Route>
          <Route element={<ProtectedRoute roles={['group_leader']} />}>
            <Route path="/guruh-rahbari" element={<LeaderDashboard />} />
          </Route>
          <Route element={<ProtectedRoute roles={['navbatchi']} />}>
            <Route path="/navbatchi" element={<DutySchedule />} />
          </Route>
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
