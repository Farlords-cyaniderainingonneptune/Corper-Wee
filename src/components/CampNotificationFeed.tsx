import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Trophy,
  UserPlus,
  Users,
  Calendar,
  Zap,
  ChevronDown,
  ChevronUp,
  Trash2,
  BellRing,
  CloudSun,
} from 'lucide-react';
import type { CampNotificationItem } from '../api/client';

interface CampNotificationFeedProps {
  notifications: CampNotificationItem[];
  onClear?: () => void;
}

function formatRelativeTime(iso: string, nowMs: number): string {
  const diffSec = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000));
  if (diffSec < 15) return 'just now';
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return `${Math.floor(diffHr / 24)}d ago`;
}

function getCategoryIcon(category: CampNotificationItem['category']) {
  switch (category) {
    case 'MEDAL_EARNED':
      return <Trophy className="h-3.5 w-3.5 text-amber-400 shrink-0 mt-0.5" />;
    case 'CAMP_JOIN':
      return <UserPlus className="h-3.5 w-3.5 text-emerald-400 shrink-0 mt-0.5" />;
    case 'SOCIAL_MILESTONE':
      return <Users className="h-3.5 w-3.5 text-sky-400 shrink-0 mt-0.5" />;
    case 'EVENT_UPDATE':
      return <Calendar className="h-3.5 w-3.5 text-violet-400 shrink-0 mt-0.5" />;
    case 'DAILY_TASK_ALERT':
      return <BellRing className="h-3.5 w-3.5 text-orange-400 shrink-0 mt-0.5" />;
    case 'WEATHER_UPDATE':
      return <CloudSun className="h-3.5 w-3.5 text-sky-300 shrink-0 mt-0.5" />;
    default:
      return <Zap className="h-3.5 w-3.5 text-teal-400 shrink-0 mt-0.5" />;
  }
}

export const CampNotificationFeed: React.FC<CampNotificationFeedProps> = ({
  notifications,
  onClear,
}) => {
  const [expanded, setExpanded] = useState<boolean>(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 640 : true
  );
  const [unreadCount, setUnreadCount] = useState(0);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const prevTopIdRef = useRef<string | null>(notifications[0]?.id ?? null);

  // Refresh relative timestamps cleanly every 30s
  useEffect(() => {
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  // Track unseen arriving events when feed is collapsed
  useEffect(() => {
    const newestId = notifications[0]?.id ?? null;
    if (newestId && newestId !== prevTopIdRef.current) {
      prevTopIdRef.current = newestId;
      if (!expanded) {
        setUnreadCount((c) => c + 1);
      }
    } else if (!newestId) {
      prevTopIdRef.current = null;
    }
  }, [notifications, expanded]);

  const handleToggle = () => {
    setExpanded((prev) => {
      const next = !prev;
      if (next) setUnreadCount(0);
      return next;
    });
  };

  return (
    <div className="w-44 sm:w-64 md:w-72 rounded-xl bg-slate-900/85 border border-slate-700/70 backdrop-blur-md shadow-xl text-white overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2 border-b border-slate-800/80">
        <button
          type="button"
          onClick={handleToggle}
          className="flex items-center gap-2 text-xs font-bold text-slate-100 hover:text-emerald-300 transition-colors min-w-0"
          aria-expanded={expanded}
          aria-label="Toggle Camp Feed notifications"
        >
          <Bell className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
          <span className="truncate">Camp Feed</span>
          <span className="font-mono tabular-nums text-[10px] text-slate-400">
            · {notifications.length}
          </span>
          {!expanded && unreadCount > 0 && (
            <span className="font-mono tabular-nums text-[10px] font-bold text-amber-300">
              (+{unreadCount} new)
            </span>
          )}
        </button>

        <div className="flex items-center gap-1.5 shrink-0">
          {expanded && onClear && notifications.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="p-1 rounded text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
              title="Clear feed"
              aria-label="Clear notifications"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          )}
          <button
            type="button"
            onClick={handleToggle}
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            aria-label={expanded ? 'Collapse feed' : 'Expand feed'}
          >
            {expanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="max-h-48 overflow-y-auto divide-y divide-slate-800/70">
          {notifications.length === 0 ? (
            <div className="px-3 py-3 text-[11px] text-slate-400 leading-relaxed">
              No recent camp activity yet. Parade medals, camp joins, and milestones appear live.
            </div>
          ) : (
            notifications.slice(0, 12).map((item) => (
              <div key={item.id} className="px-3 py-2 flex items-start gap-2 hover:bg-slate-800/40 transition-colors">
                {getCategoryIcon(item.category)}
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] text-slate-100 leading-snug break-words">
                    {item.message}
                  </p>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[10px] font-mono tabular-nums text-slate-400">
                    {item.platoonNumber ? <span>Platoon {item.platoonNumber}</span> : <span>Iseyin Camp</span>}
                    <span aria-hidden="true">·</span>
                    <span>{formatRelativeTime(item.createdAt, nowMs)}</span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
