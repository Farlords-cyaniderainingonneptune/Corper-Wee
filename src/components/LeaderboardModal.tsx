import React, { useEffect, useState } from 'react';
import { api, PlatoonLeaderboardItem } from '../api/client';
import { Trophy, Users, Award, X, Sparkles } from 'lucide-react';

interface LeaderboardModalProps {
  onClose: () => void;
  playerPlatoon: number;
}

export const LeaderboardModal: React.FC<LeaderboardModalProps> = ({ onClose, playerPlatoon }) => {
  const [leaderboard, setLeaderboard] = useState<PlatoonLeaderboardItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLeaderboard();
  }, []);

  const loadLeaderboard = async () => {
    try {
      const data = await api.getLeaderboard();
      setLeaderboard(data);
    } catch {
      // fallback mock list for 10 platoons
      const mock = Array.from({ length: 10 }, (_, i) => ({
        platoonNumber: i + 1,
        name: `Platoon ${i + 1}`,
        totalPoints: Math.floor(1500 - i * 110 + Math.random() * 50),
        memberCount: 45,
        rank: i + 1
      }));
      setLeaderboard(mock);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative flex flex-col w-full max-w-lg max-h-[85vh] rounded-2xl border border-emerald-500/40 bg-slate-900 shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <Trophy className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Platoon Championship
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  Live
                </span>
              </h2>
              <p className="text-xs text-slate-400">Orientation Camp Tournament &bull; Iseyin, Oyo State</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading standings...</div>
          ) : (
            leaderboard.map((item) => {
              const isUserPlatoon = item.platoonNumber === playerPlatoon;
              const isTop3 = item.rank <= 3;
              return (
                <div
                  key={item.platoonNumber}
                  className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                    isUserPlatoon
                      ? 'border-emerald-500 bg-emerald-950/40 shadow-sm shadow-emerald-900/30'
                      : isTop3
                      ? 'border-slate-700 bg-slate-800/70'
                      : 'border-slate-800/80 bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-lg font-black text-xs ${
                        item.rank === 1
                          ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/30'
                          : item.rank === 2
                          ? 'bg-slate-300 text-slate-950'
                          : item.rank === 3
                          ? 'bg-amber-700 text-white'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      #{item.rank}
                    </div>

                    <div>
                      <div className="font-bold text-sm text-white flex items-center gap-1.5">
                        <span>{item.name}</span>
                        {isUserPlatoon && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-medium">
                            Your Platoon
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-2">
                        <span className="flex items-center gap-1">
                          <Users className="h-3 w-3" />
                          {item.memberCount} Corpers
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-emerald-400 text-sm">
                      {item.totalPoints.toLocaleString()} CP
                    </div>
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">Total Score</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
