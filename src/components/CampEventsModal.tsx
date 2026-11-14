import React, { useEffect, useState } from 'react';
import { api, CampEventItem } from '../api/client';
import { soundManager } from '../audio/AudioSynthesizer';
import { Calendar, Award, Coins, Users, MapPin, CheckCircle2, AlertCircle, X } from 'lucide-react';

interface CampEventsModalProps {
  onClose: () => void;
  onEventJoined?: (rewardCp: number, rewardNaira: number) => void;
}

export const CampEventsModal: React.FC<CampEventsModalProps> = ({
  onClose,
  onEventJoined,
}) => {
  const [events, setEvents] = useState<CampEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [joinedIds, setJoinedIds] = useState<Record<string, boolean>>({});
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    const loadEvents = async () => {
      try {
        const list = await api.getEvents();
        setEvents(list);
      } catch {
        setFeedback({ text: 'Unable to load camp events right now.', error: true });
      } finally {
        setLoading(false);
      }
    };
    loadEvents();
  }, []);

  const handleJoin = async (evt: CampEventItem) => {
    setJoiningId(evt.id);
    setFeedback(null);
    try {
      await api.joinEvent(evt.id);
      const claimRes = await api.claimEventReward(evt.id);
      soundManager.playDrillSuccess();
      setJoinedIds((prev) => ({ ...prev, [evt.id]: true }));
      setEvents((prev) =>
        prev.map((item) =>
          item.id === evt.id
            ? { ...item, currentParticipantsCount: item.currentParticipantsCount + 1 }
            : item
        )
      );
      const rewardCp = claimRes?.rewardCp ?? evt.rewardCp;
      const rewardNaira = Number(claimRes?.rewardNaira ?? evt.rewardNaira);
      if (onEventJoined) {
        onEventJoined(rewardCp, rewardNaira);
      }
      setFeedback({
        text: `Joined "${evt.title}"! Credited +${rewardCp} CP and +₦${Number(rewardNaira).toLocaleString()}.`,
      });
    } catch (err: unknown) {
      setFeedback({
        text: err instanceof Error ? err.message : 'Unable to join event',
        error: true,
      });
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4">
      <div className="relative flex flex-col w-full max-w-xl max-h-[88vh] rounded-2xl border border-violet-500/40 bg-slate-900 shadow-2xl text-slate-100 overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 p-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-500/20 text-violet-400 border border-violet-500/30">
              <Calendar className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">Camp Schedule & Events</h2>
              <p className="text-xs text-slate-400">
                Orientation activities, SAED workshops & platoon competitions
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Close Camp Events"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {feedback && (
          <div
            className={`mx-4 mt-3 flex items-center gap-2 rounded-xl border p-2.5 text-xs ${
              feedback.error
                ? 'bg-rose-950/60 border-rose-500/40 text-rose-300'
                : 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
            }`}
          >
            {feedback.error ? (
              <AlertCircle className="h-4 w-4 shrink-0" />
            ) : (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-12 text-center text-xs text-slate-400">Loading scheduled events...</div>
          ) : events.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No scheduled camp events right now. Check back soon!
            </div>
          ) : (
            events.map((evt) => {
              const isJoined = !!joinedIds[evt.id];
              const isCancelled = evt.status === 'CANCELLED';
              return (
                <div
                  key={evt.id}
                  className="rounded-xl border border-slate-800 bg-slate-950/50 p-4 space-y-3"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-sm font-bold text-white">{evt.title}</h3>
                      <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                        {evt.description}
                      </p>
                    </div>
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                        isCancelled
                          ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                          : 'bg-violet-500/15 text-violet-300 border-violet-500/30'
                      }`}
                    >
                      {evt.status}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
                    {evt.locationName && (
                      <span className="flex items-center gap-1 text-slate-400">
                        <MapPin className="h-3.5 w-3.5 text-emerald-400" />
                        {evt.locationName}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-emerald-300 font-semibold">
                      <Award className="h-3.5 w-3.5" />+{evt.rewardCp} CP
                    </span>
                    <span className="flex items-center gap-1 text-amber-300 font-semibold">
                      <Coins className="h-3.5 w-3.5" />+₦{Number(evt.rewardNaira).toLocaleString()}
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <Users className="h-3.5 w-3.5" />
                      {evt.currentParticipantsCount}/{evt.maxParticipants}
                    </span>
                  </div>

                  <button
                    onClick={() => handleJoin(evt)}
                    disabled={joiningId === evt.id || isJoined || isCancelled}
                    className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all ${
                      isJoined
                        ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
                        : isCancelled
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : 'bg-violet-600 hover:bg-violet-500 text-white shadow-lg shadow-violet-950/40 active:scale-[0.98]'
                    }`}
                  >
                    {isJoined
                      ? 'Joined & Reward Claimed'
                      : isCancelled
                      ? 'Event Cancelled'
                      : joiningId === evt.id
                      ? 'Registering...'
                      : 'Join Event & Claim Bonus'}
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
