import React, { useEffect, useState } from 'react';
import { Plus, Users, XCircle, X } from 'lucide-react';
import { adminApi, type CampEventItem, type CampLocation, type PlatoonItem } from '../api/adminApi';
import { ConfirmModal } from '../components/ConfirmModal';

export const EventsPage: React.FC = () => {
  const [events, setEvents] = useState<CampEventItem[]>([]);
  const [locations, setLocations] = useState<CampLocation[]>([]);
  const [platoons, setPlatoons] = useState<PlatoonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Create Event modal
  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [locationId, setLocationId] = useState<string>('');
  const [targetPlatoonId, setTargetPlatoonId] = useState<string>('');
  const [startTime, setStartTime] = useState(() => new Date(Date.now() + 3600000).toISOString().slice(0, 16));
  const [endTime, setEndTime] = useState(() => new Date(Date.now() + 7200000).toISOString().slice(0, 16));
  const [rewardCp, setRewardCp] = useState(250);
  const [rewardNaira, setRewardNaira] = useState(1500);
  const [maxParticipants, setMaxParticipants] = useState(100);
  const [minCharismaRequired, setMinCharismaRequired] = useState(0);
  const [creating, setCreating] = useState(false);

  // Participants modal
  const [rosterModal, setRosterModal] = useState<{
    eventId: string;
    title: string;
    totalParticipants: number;
    maxParticipants: number;
    participants: Array<{
      id: string;
      userId: string;
      displayName: string;
      stateCode: string;
      platoon: { id: number; number: number; name: string } | null;
      registeredAt: string;
      rewardClaimed: boolean;
    }>;
  } | null>(null);

  // Cancel confirmation modal
  const [cancelTarget, setCancelTarget] = useState<CampEventItem | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError('');
    try {
      const [evts, locs, plats] = await Promise.all([
        adminApi.listEvents(),
        adminApi.listLocations(),
        adminApi.listPlatoons(),
      ]);
      setEvents(evts);
      setLocations(locs.filter((l) => l.isActive));
      setPlatoons(plats);
      if (!locationId && locs.length > 0) {
        setLocationId(String(locs[0].id));
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load camp events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, []);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setError('');
    setFeedback('');
    try {
      await adminApi.createEvent({
        locationId: locationId ? Number(locationId) : undefined,
        targetPlatoonId: targetPlatoonId ? Number(targetPlatoonId) : undefined,
        title: title.trim(),
        description: description.trim(),
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        rewardCp: Number(rewardCp),
        rewardNaira: Number(rewardNaira),
        maxParticipants: Number(maxParticipants),
        minCharismaRequired: Number(minCharismaRequired),
      });
      setFeedback(`Event "${title.trim()}" scheduled.`);
      setShowCreate(false);
      setTitle('');
      setDescription('');
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to schedule event.');
    } finally {
      setCreating(false);
    }
  };

  const handleViewRoster = async (evt: CampEventItem) => {
    setError('');
    try {
      const roster = await adminApi.getEventParticipants(evt.id);
      setRosterModal(roster);
    } catch (err: any) {
      setError(err?.message || 'Failed to load event participants.');
    }
  };

  const handleCancelEvent = async (reason: string) => {
    if (!cancelTarget) return;
    setCancelling(true);
    setError('');
    setFeedback('');
    try {
      await adminApi.cancelEvent(cancelTarget.id, reason);
      setFeedback(`Event "${cancelTarget.title}" cancelled.`);
      setCancelTarget(null);
      await loadData();
    } catch (err: any) {
      setError(err?.message || 'Failed to cancel event.');
      setCancelTarget(null);
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Event Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Schedule orientation camp events, configure CP/Naira rewards, inspect participant rosters, or cancel events.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Schedule Event</span>
        </button>
      </div>

      {feedback && (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-medium text-emerald-800">
          {feedback}
        </div>
      )}
      {error && (
        <div className="rounded-md border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-medium text-rose-800">
          {error}
        </div>
      )}

      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-xs text-slate-500">Loading camp events...</div>
        ) : events.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No camp events scheduled.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">Event</th>
                  <th className="py-2.5 px-4">Location</th>
                  <th className="py-2.5 px-4">Schedule Window</th>
                  <th className="py-2.5 px-4 text-right">Rewards</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {events.map((evt) => (
                  <tr key={evt.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900">{evt.title}</div>
                      <div className="text-[11px] text-slate-500 truncate">{evt.description}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">
                      <div>{evt.locationName}</div>
                      <div className="text-[11px] font-mono text-slate-500">
                        Max {evt.maxParticipants} · Min Charisma {evt.minCharismaRequired}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      <div>{new Date(evt.startTime).toLocaleString()}</div>
                      <div className="text-[11px] text-slate-400">to {new Date(evt.endTime).toLocaleString()}</div>
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">
                      <div className="font-semibold text-slate-900">+{evt.rewardCp} CP</div>
                      <div className="text-[11px] text-emerald-700">₦{evt.rewardNaira.toLocaleString()}</div>
                    </td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">{evt.status}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewRoster(evt)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium"
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>Roster</span>
                        </button>
                        {evt.status !== 'CANCELLED' && evt.status !== 'COMPLETED' && (
                          <button
                            type="button"
                            onClick={() => setCancelTarget(evt)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>Cancel</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white border border-slate-200 shadow-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Schedule New Camp Event</h3>
              <button type="button" onClick={() => setShowCreate(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleCreateEvent} className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Inter-Platoon Tug of War"
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Camp-wide athletic challenge on the main parade field."
                  className="w-full rounded-md border border-slate-300 px-3 py-2 text-slate-900"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">3D Camp Location</label>
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-900"
                  >
                    {locations.map((loc) => (
                      <option key={loc.id} value={String(loc.id)}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Target Platoon (Optional)</label>
                  <select
                    value={targetPlatoonId}
                    onChange={(e) => setTargetPlatoonId(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 bg-white text-slate-900"
                  >
                    <option value="">All Platoons</option>
                    {platoons.map((p) => (
                      <option key={p.id} value={String(p.id)}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-slate-900"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    required
                    value={endTime}
                    onChange={(e) => setEndTime(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono text-slate-900"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reward CP</label>
                  <input
                    type="number"
                    min={0}
                    value={rewardCp}
                    onChange={(e) => setRewardCp(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Reward ₦</label>
                  <input
                    type="number"
                    min={0}
                    value={rewardNaira}
                    onChange={(e) => setRewardNaira(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Max Slots</label>
                  <input
                    type="number"
                    min={1}
                    value={maxParticipants}
                    onChange={(e) => setMaxParticipants(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Min Charisma</label>
                  <input
                    type="number"
                    min={0}
                    value={minCharismaRequired}
                    onChange={(e) => setMinCharismaRequired(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="px-3.5 py-2 rounded-md border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold disabled:opacity-50"
                >
                  {creating ? 'Scheduling...' : 'Schedule Event'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Participant Roster Modal */}
      {rosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white border border-slate-200 shadow-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{rosterModal.title} — Participants</h3>
                <p className="text-xs font-mono text-slate-500">
                  {rosterModal.totalParticipants} / {rosterModal.maxParticipants} registered
                </p>
              </div>
              <button type="button" onClick={() => setRosterModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {rosterModal.participants.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No corps members have registered for this event yet.</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 px-4">Corper</th>
                      <th className="py-2.5 px-4">State Code</th>
                      <th className="py-2.5 px-4">Platoon</th>
                      <th className="py-2.5 px-4">Reward Claimed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rosterModal.participants.map((p) => (
                      <tr key={p.id}>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{p.displayName}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">{p.stateCode}</td>
                        <td className="py-2.5 px-4 text-slate-700">{p.platoon?.name || '—'}</td>
                        <td className="py-2.5 px-4 font-mono">{p.rewardClaimed ? 'Claimed' : 'Pending'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        open={cancelTarget !== null}
        title={`Cancel Event "${cancelTarget?.title}"?`}
        description="Cancelling this event stops any further registrations and records the cancellation reason in the camp audit log."
        confirmLabel="Cancel Event"
        tone="danger"
        requireReason={true}
        reasonLabel="Cancellation Reason"
        loading={cancelling}
        onCancel={() => setCancelTarget(null)}
        onConfirm={handleCancelEvent}
      />
    </div>
  );
};
