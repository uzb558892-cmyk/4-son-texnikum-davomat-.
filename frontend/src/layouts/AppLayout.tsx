import { useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import DemoBanner from '../components/DemoBanner';
import { useAuth } from '../context/AuthContext';
import { APP_NAME, ROLE_LABEL } from '../utils/constants';
import { cx } from '../utils/format';
import type { Role } from '../types';

interface NavItem { to: string; label: string; icon: string; roles: Role[] }

const NAV: NavItem[] = [
  { to: '/admin', label: 'Bosh sahifa', icon: 'home', roles: ['admin'] },
  { to: '/guruh-rahbari', label: 'Bosh sahifa', icon: 'home', roles: ['group_leader'] },
  { to: '/guruhlar', label: 'Guruhlar', icon: 'groups', roles: ['admin', 'group_leader'] },
  { to: '/oquvchilar', label: "O'quvchilar", icon: 'student', roles: ['admin', 'group_leader'] },
  { to: '/davomat', label: 'Davomat', icon: 'check', roles: ['admin', 'group_leader'] },
  { to: '/ogohlantirishlar', label: 'Ogohlantirishlar', icon: 'alert', roles: ['admin', 'group_leader'] },
  { to: '/hisobotlar', label: 'Hisobotlar', icon: 'report', roles: ['admin', 'group_leader'] },
  { to: '/foydalanuvchilar', label: 'Foydalanuvchilar', icon: 'users', roles: ['admin'] },
  { to: '/sozlamalar', label: 'Sozlamalar', icon: 'settings', roles: ['admin', 'group_leader'] }
];

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  if (!user) return null;
  const items = NAV.filter((n) => n.roles.includes(user.role));

  const sidebar = (
    <nav className="flex h-full flex-col bg-brand-900 text-brand-100">
      <div className="flex items-center gap-3 px-5 py-5">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-brand-700"><Icon name="check" /></div>
        <div className="text-sm font-bold leading-tight text-white">4-SON TEXNIKUM<br /><span className="font-medium text-brand-200">DAVOMAT</span></div>
      </div>
      <ul className="flex-1 space-y-1 px-3">
        {items.map((n) => (
          <li key={n.to}>
            <NavLink to={n.to} onClick={() => setOpen(false)}
              className={({ isActive }) => cx('flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors', isActive ? 'bg-white text-brand-800' : 'text-brand-100 hover:bg-brand-800')}>
              <Icon name={n.icon} />{n.label}
            </NavLink>
          </li>
        ))}
      </ul>
      <button onClick={async () => { await signOut(); navigate('/login'); }} className="m-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-brand-100 hover:bg-brand-800">
        <Icon name="logout" />Chiqish
      </button>
    </nav>
  );

  return (
    <div className="flex h-full flex-col">
      <DemoBanner />
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>
        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 bg-slate-900/50" onClick={() => setOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-64">{sidebar}</aside>
          </div>
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-slate-200 bg-white px-4 py-3 sm:px-6">
            <div className="flex items-center gap-3">
              <button className="rounded-md p-1.5 text-slate-600 hover:bg-slate-100 lg:hidden" onClick={() => setOpen(true)} aria-label="Menyuni ochish"><Icon name="menu" /></button>
              <span className="hidden text-sm font-semibold text-slate-500 sm:inline">{APP_NAME}</span>
            </div>
            <div className="text-right">
              <div className="text-sm font-semibold text-slate-800">{user.full_name}</div>
              <div className="text-xs text-slate-500">{ROLE_LABEL[user.role]}</div>
            </div>
          </header>
          <main className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6"><Outlet /></main>
        </div>
      </div>
    </div>
  );
}
