import DashboardView from './DashboardView';
import { useAuth } from '../context/AuthContext';

export default function LeaderDashboard() {
  const { user } = useAuth();
  if (!user?.group_id) {
    return <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 text-sm text-amber-900">Sizga hali guruh biriktirilmagan. Administrator bilan bog'laning.</div>;
  }
  return <DashboardView title="Guruh rahbari paneli" groupId={user.group_id} showGroups={false} />;
}
