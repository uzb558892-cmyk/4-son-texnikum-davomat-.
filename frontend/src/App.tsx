import { lazy, Suspense } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Splash from './components/Splash';
import CookieBanner from './components/CookieBanner';
import AppLayout from './layouts/AppLayout';
import { useAuth } from './context/AuthContext';
import type { Role } from './types';

const Login = lazy(() => import('./pages/Login'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const LeaderDashboard = lazy(() => import('./pages/LeaderDashboard'));
const Groups = lazy(() => import('./pages/Groups'));
const Students = lazy(() => import('./pages/Students'));
const Attendance = lazy(() => import('./pages/Attendance'));
const QuickAttendance = lazy(() => import('./pages/QuickAttendance'));
const Warnings = lazy(() => import('./pages/Warnings'));
const Reports = lazy(() => import('./pages/Reports'));
const Users = lazy(() => import('./pages/Users'));
const Settings = lazy(() => import('./pages/Settings'));
const ParentPage = lazy(() => import('./pages/ParentPage'));
const DutySchedule = lazy(() => import('./pages/DutySchedule'));
const PrivacyPolicy = lazy(() => import('./pages/PrivacyPolicy'));
const TermsOfUse = lazy(() => import('./pages/TermsOfUse'));

const HOME: Record<Role, string> = {
  admin: '/admin',
  manaviyatchi: '/admin',
  direktor: '/admin',
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
    <>
      <Suspense fallback={<Splash />}>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/ota-ona" element={<ParentPage />} />
          <Route path="/maxfiylik-siyosati" element={<PrivacyPolicy />} />
          <Route path="/foydalanish-shartlari" element={<TermsOfUse />} />
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
              <Route element={<ProtectedRoute roles={['admin', 'manaviyatchi', 'direktor']} />}>
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
      </Suspense>
      <CookieBanner />
    </>
  );
}
