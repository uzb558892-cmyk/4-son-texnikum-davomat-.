import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import Icon from '../components/Icon';
import { useAuth } from '../context/AuthContext';
import { useAsync } from '../hooks/useAsync';
import { dutyService, todayTashkent, type DutyRow } from '../services/dutyService';
import { APP_NAME, ROLE_LABEL } from '../utils/constants';
import { cx } from '../utils/format';
import type { Role } from '../types';

interface NavItem { to: string; label: string; short?: string; icon: string; roles: Role[] }

const ALL: Role[] = ['admin', 'group_leader', 'manaviyatchi', 'direktor', 'navbatchi'];

const NAV: NavItem[] = [
  { to: '/admin', label: 'Bosh sahifa', icon: 'home', roles: ['admin', 'manaviyatchi', 'direktor'] },
  { to: '/guruh-rahbari', label: 'Bosh sahifa', icon: 'home', roles: ['group_leader'] },
  { to: '/navbatchi', label: 'Bosh sahifa', icon: 'home', roles: ['navbatchi'] },
  { to: '/davomat-belgilash', label: 'Davomat belgilash', short: 'Belgilash', icon: 'check', roles: ['admin', 'navbatchi', 'group_leader'] },
  { to: '/guruhlar', label: 'Guruhlar', icon: 'groups', roles: ALL },
  { to: '/oquvchilar', label: "O'quvchilar", icon: 'student', roles: ALL },
  { to: '/davomat', label: 'Davomat', icon: 'check', roles: ALL },
  { to: '/ogohlantirishlar', label: 'Ogohlantirishlar', short: 'Xatlar', icon: 'alert', roles: ALL },
  { to: '/hisobotlar', label: 'Hisobotlar', icon: 'report', roles: ALL },
  { to: '/navbatchilar', label: 'Navbatchilar jadvali', icon: 'users', roles: ['admin', 'manaviyatchi', 'direktor'] },
  { to: '/foydalanuvchilar', label: 'Foydalanuvchilar', icon: 'users', roles: ['admin'] },
  { to: '/sozlamalar', label: 'Sozlamalar', icon: 'settings', roles: ALL }
];

const BOTTOM = ['/admin', '/guruh-rahbari', '/navbatchi', '/davomat', '/oquvchilar', '/ogohlantirishlar'];

export default function AppLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);

  const canCheckDuty = user?.role === 'navbatchi' || user?.role === 'group_leader';
  const today = todayTashkent();
  const duty = useAsync(
    () => (canCheckDuty ? dutyService.list(today.slice(0, 7)) : Promise.resolve([] as DutyRow[])),
    [canCheckDuty, today]
  );

  if (!user) return null;

  const meOnDutyToday =
    canCheckDuty && (duty.data ?? []).some((r) => r.duty_date === today && r.duty_user_id === user.id);

  const items = NAV.filter((n) => {
    if (!n.roles.includes(user.role)) return false;
    if (n.to === '/davomat-belgilash' && user?.role !== 'admin') return meOnDutyToday;
    return true;
  });
  const bottomItems = items.filter((n) => BOTTOM.includes(n.to));

  const initials = (user.full_name || 'A')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((s) => s[0]?.toUpperCase())
    .join('');

  const sidebar = (
    <nav className="flex h-full flex-col bg-gradient-to-b from-slate-950 via-indigo-950 to-slate-900 text-indigo-100 select-none">
      <div className="flex items-center gap-3 border-b border-white/10 px-5 py-5">
        <img
          src="/logo.png"
          alt="4-son texnikum davomat logotipi"
          className="h-11 w-11 shrink-0 rounded-xl object-cover shadow-md shadow-indigo-950/50 ring-1 ring-amber-300/40"
        />
        <div className="min-w-0 leading-tight">
          <div className="truncate text-sm font-extrabold tracking-wide text-white">4-SON TEXNIKUM</div>
          <div className="mt-0.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-300">Davomat tizimi</div>
        </div>
      </div>

      <div className="px-4 pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-indigo-300/75">
        Asosiy menyu
      </div>

      <ul className="flex-1 space-y-1 overflow-y-auto px-3 pb-3">
        {items.map((n) => (
          <li key={n.to}>
            <NavLink
              to={n.to}
              onClick={() => setOpen(false)}
              className={({ isActive }) =>
                cx(
                  'group flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all duration-150',
                  isActive
                    ? 'bg-gradient-to-r from-indigo-500/30 via-indigo-400/20 to-amber-400/15 text-white font-semibold shadow-sm shadow-slate-950/40 ring-1 ring-amber-300/35'
                    : 'text-indigo-100/85 hover:bg-white/10 hover:text-white'
                )
              }
            >
              <Icon name={n.icon} />
              <span className="truncate">{n.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="border-t border-white/10 p-3 space-y-2">
        <div className="flex items-center gap-2.5 rounded-xl bg-white/5 px-3 py-2.5 ring-1 ring-white/10">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow-2xs">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs font-semibold text-white">{user.full_name}</div>
            <div className="truncate text-[11px] text-indigo-200/80">{ROLE_LABEL[user.role]}</div>
          </div>
        </div>
        <button
          type="button"
          onClick={async () => { await signOut(); navigate('/login'); }}
          className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-rose-200 transition-colors duration-150 hover:bg-rose-500/15 hover:text-rose-100"
        >
          <Icon name="logout" />
          <span>Chiqish</span>
        </button>
      </div>
    </nav>
  );

  return (
    <div className="flex h-full flex-col bg-slate-50">
      <div className="flex min-h-0 flex-1">
        <aside className="hidden w-64 shrink-0 lg:block">{sidebar}</aside>

        {open && (
          <div className="fixed inset-0 z-40 lg:hidden">
            <div className="absolute inset-0 animate-fadeIn bg-slate-950/60 backdrop-blur-[1px]" onClick={() => setOpen(false)} />
            <aside className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-fadeIn shadow-2xl">{sidebar}</aside>
          </div>
        )}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-30 flex items-center justify-between border-b border-slate-200/85 bg-white/95 px-4 py-3 shadow-2xs backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-2.5 min-w-0">
              <img
                src="/logo.png"
                alt="4-son texnikum davomat logotipi"
                className="h-8 w-8 shrink-0 rounded-lg object-cover ring-1 ring-amber-300/40 lg:hidden"
              />
              <span className="truncate text-sm font-bold text-slate-900 lg:hidden">4-SON TEXNIKUM</span>
              <span className="hidden truncate text-sm font-semibold tracking-tight text-slate-700 lg:inline">{APP_NAME}</span>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <div className="text-right">
                <div className="text-sm font-semibold leading-tight text-slate-900">{user.full_name}</div>
                <div className="text-xs font-medium text-slate-500">{ROLE_LABEL[user.role]}</div>
              </div>
              <div className="hidden sm:flex h-9 w-9 items-center justify-center rounded-full bg-indigo-50 text-xs font-bold text-indigo-700 ring-1 ring-indigo-200">
                {initials}
              </div>
            </div>
          </header>

          <main className="min-h-0 flex-1 overflow-y-auto px-4 py-5 pb-24 sm:px-6 sm:py-6 sm:pb-24 lg:pb-8">
            <div className="mx-auto max-w-[1440px]">
              <Outlet />
            </div>
            <footer className="mx-auto mt-10 flex max-w-[1440px] flex-wrap items-center justify-between gap-2 border-t border-slate-200/80 pt-4 text-xs text-slate-400">
              <span>4-son Texnikum Davomat</span>
              <div className="flex items-center gap-4">
                <Link to="/maxfiylik-siyosati" className="hover:text-slate-700 underline">
                  Maxfiylik siyosati
                </Link>
                <Link to="/foydalanish-shartlari" className="hover:text-slate-700 underline">
                  Foydalanish shartlari
                </Link>
              </div>
            </footer>
          </main>
        </div>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.05)] lg:hidden"
        aria-label="Asosiy navigatsiya"
      >
        <ul className="grid grid-cols-5">
          {bottomItems.map((n) => (
            <li key={n.to}>
              <NavLink
                to={n.to}
                className={({ isActive }) =>
                  cx(
                    'flex min-h-[56px] flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium transition-colors',
                    isActive ? 'text-indigo-700 font-semibold' : 'text-slate-500 hover:text-slate-800'
                  )
                }
              >
                <Icon name={n.icon} />
                <span className="truncate max-w-full">{n.short ?? n.label}</span>
              </NavLink>
            </li>
          ))}
          <li>
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="flex min-h-[56px] w-full flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-medium text-slate-500 hover:text-slate-800"
            >
              <Icon name="menu" />
              <span>Menyu</span>
            </button>
          </li>
        </ul>
      </nav>
    </div>
  );
}
