import React, { useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Activity,
  CalendarDays,
  MapPin,
  Flag,
  ShoppingBag,
  Coins,
  ShieldCheck,
  LogOut,
  Menu,
  X,
  ArrowUpRight,
  ChevronRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface NavItem {
  to: string;
  label: string;
  icon: React.FC<{ className?: string }>;
  superadminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/users', label: 'User Management', icon: Users },
  { to: '/activities', label: 'Activity Monitoring', icon: Activity },
  { to: '/events', label: 'Events', icon: CalendarDays },
  { to: '/locations', label: 'Locations', icon: MapPin },
  { to: '/platoons', label: 'Platoons', icon: Flag },
  { to: '/market', label: 'Mami Market', icon: ShoppingBag },
  { to: '/economy', label: 'Game Config', icon: Coins },
  { to: '/staff', label: 'Admins & Invites', icon: ShieldCheck, superadminOnly: true },
];

const ROUTE_TITLES: Record<string, string> = {
  dashboard: 'Command Overview',
  users: 'User Management',
  activities: 'Activity & Moderation',
  events: 'Camp Events',
  locations: '3D Camp Locations',
  platoons: 'Platoons & Standings',
  market: 'Mami Market Catalog',
  economy: 'Live Game Configuration',
  config: 'Live Game Configuration',
  staff: 'Admin Invitations & Audit',
};

export const AdminLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const segments = location.pathname.split('/').filter(Boolean);
  const currentSection = segments[0] || 'dashboard';
  const sectionLabel = ROUTE_TITLES[currentSection] || 'Administration';

  const handleSignOut = async () => {
    await logout();
    navigate('/login');
  };

  const visibleNav = NAV_ITEMS.filter((item) => !item.superadminOnly || user?.role === 'SUPERADMIN');

  const sidebarContent = (
    <div className="flex flex-col h-full bg-slate-900 text-slate-200 select-none">
      {/* Brand */}
      <div className="h-14 px-4 flex items-center justify-between border-b border-slate-800">
        <div>
          <div className="text-sm font-bold tracking-tight text-white">Corper Wee Admin</div>
          <div className="text-[11px] text-slate-400">Iseyin Camp · Oyo State</div>
        </div>
        <button
          type="button"
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden p-1 text-slate-400 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {visibleNav.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setMobileMenuOpen(false)}
              className={({ isActive }) =>
                `flex items-center gap-2.5 px-3 py-2 rounded-md text-xs font-medium transition-colors ${
                  isActive
                    ? 'bg-emerald-700 text-white'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </NavLink>
          );
        })}
      </nav>

      {/* Footer / Account */}
      <div className="p-3 border-t border-slate-800 space-y-2.5">
        <a
          href="/"
          className="flex items-center justify-between px-3 py-1.5 rounded-md bg-slate-800/80 hover:bg-slate-800 text-xs font-medium text-slate-300 transition-colors"
        >
          <span>Return to 3D Camp</span>
          <ArrowUpRight className="h-3.5 w-3.5 text-slate-400" />
        </a>

        <div className="px-2 py-1">
          <div className="text-xs font-semibold text-white truncate">{user?.displayName}</div>
          <div className="text-[11px] font-mono text-slate-400 truncate">{user?.email}</div>
          <div className="text-[11px] text-emerald-400 font-medium mt-0.5">
            {user?.role} · {user?.stateCode || 'Command'}
          </div>
        </div>

        <button
          type="button"
          onClick={handleSignOut}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-xs font-medium text-slate-300 hover:bg-rose-950/60 hover:text-rose-200 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex bg-slate-50 text-slate-900">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:block w-60 shrink-0 border-r border-slate-800 sticky top-0 h-screen">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 lg:hidden flex">
          <div className="w-64 h-full">{sidebarContent}</div>
          <div className="flex-1 bg-slate-950/60" onClick={() => setMobileMenuOpen(false)} />
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar */}
        <header className="h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-1.5 rounded-md border border-slate-200 text-slate-600 hover:bg-slate-50"
            >
              <Menu className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-1.5 text-xs text-slate-500 truncate">
              <span className="font-medium text-slate-600">Camp Portal</span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span className="font-semibold text-slate-900 truncate">{sectionLabel}</span>
              {segments.length > 1 && (
                <>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="font-mono text-slate-600 truncate">Record Detail</span>
                </>
              )}
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-3 text-xs text-slate-600">
            <span>Authenticated REST API</span>
            <span className="text-slate-300">·</span>
            <span className="font-mono text-slate-800">{user?.stateCode || user?.role}</span>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-4 sm:p-6 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
