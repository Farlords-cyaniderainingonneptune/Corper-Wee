import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Users, X } from 'lucide-react';
import { adminApi, type PlatoonItem } from '../api/adminApi';

export const PlatoonsPage: React.FC = () => {
  const [platoons, setPlatoons] = useState<PlatoonItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Create / Edit Modal
  const [editing, setEditing] = useState<PlatoonItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [number, setNumber] = useState(11);
  const [name, setName] = useState('');
  const [colorHex, setColorHex] = useState('#15803d');
  const [motto, setMotto] = useState('');
  const [saving, setSaving] = useState(false);

  // Roster Modal
  const [rosterModal, setRosterModal] = useState<{
    platoon: PlatoonItem;
    members: Array<{
      userId: string;
      displayName: string;
      stateCode: string;
      paradeRank: string;
      level: number;
      experiencePoints: number;
      charismaScore: number;
    }>;
  } | null>(null);

  const loadPlatoons = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.listPlatoons();
      setPlatoons(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load platoons.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadPlatoons();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setNumber(platoons.length + 1);
    setName('');
    setColorHex('#15803d');
    setMotto('');
    setShowModal(true);
  };

  const openEdit = (p: PlatoonItem) => {
    setEditing(p);
    setNumber(p.number);
    setName(p.name);
    setColorHex(p.colorHex);
    setMotto(p.motto);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFeedback('');
    try {
      if (editing) {
        await adminApi.updatePlatoon(editing.id, { name: name.trim(), colorHex, motto: motto.trim() });
        setFeedback(`Platoon #${editing.number} updated.`);
      } else {
        await adminApi.createPlatoon({ number: Number(number), name: name.trim(), colorHex, motto: motto.trim() });
        setFeedback(`Platoon #${number} created.`);
      }
      setShowModal(false);
      await loadPlatoons();
    } catch (err: any) {
      setError(err?.message || 'Failed to save platoon.');
    } finally {
      setSaving(false);
    }
  };

  const handleOpenRoster = async (p: PlatoonItem) => {
    setError('');
    try {
      const details = await adminApi.getPlatoonDetails(p.id);
      setRosterModal({ platoon: details.platoon, members: details.members });
    } catch (err: any) {
      setError(err?.message || 'Failed to load platoon roster.');
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Platoon Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure Iseyin camp platoons, inspect active rosters, and monitor total Corper Points standings.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Platoon</span>
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
          <div className="p-8 text-center text-xs text-slate-500">Loading platoons...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">#</th>
                  <th className="py-2.5 px-4">Platoon Name</th>
                  <th className="py-2.5 px-4">Motto</th>
                  <th className="py-2.5 px-4 text-right">Members</th>
                  <th className="py-2.5 px-4 text-right">Total Points</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {platoons.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-mono text-slate-500">{p.number}</td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <span className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: p.colorHex }} />
                        <span className="font-semibold text-slate-900">{p.name}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-slate-600">{p.motto}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums">{p.memberCount}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      {p.totalPoints.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenRoster(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium"
                        >
                          <Users className="h-3.5 w-3.5" />
                          <span>Roster</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => openEdit(p)}
                          className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-md rounded-lg bg-white border border-slate-200 shadow-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editing ? `Edit Platoon #${editing.number}` : 'Create Platoon'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3.5 text-xs">
              {!editing && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Platoon Number</label>
                  <input
                    type="number"
                    min={1}
                    required
                    value={number}
                    onChange={(e) => setNumber(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Platoon Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Platoon 11 (The Falcons)"
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Motto</label>
                <input
                  type="text"
                  required
                  value={motto}
                  onChange={(e) => setMotto(e.target.value)}
                  placeholder="Discipline and Service"
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Flag Color Hex</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="h-9 w-12 rounded border border-slate-300"
                  />
                  <input
                    type="text"
                    value={colorHex}
                    onChange={(e) => setColorHex(e.target.value)}
                    className="flex-1 rounded-md border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
              </div>
              <div className="pt-3 border-t border-slate-100 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-3.5 py-2 rounded-md border border-slate-300 text-slate-700 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold"
                >
                  {saving ? 'Saving...' : 'Save Platoon'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Roster Modal */}
      {rosterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-2xl rounded-lg bg-white border border-slate-200 shadow-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{rosterModal.platoon.name} — Roster</h3>
                <p className="text-xs text-slate-500">{rosterModal.members.length} registered players</p>
              </div>
              <button type="button" onClick={() => setRosterModal(null)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
              {rosterModal.members.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-500">No active player accounts assigned to this platoon yet.</div>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                      <th className="py-2.5 px-4">Corper</th>
                      <th className="py-2.5 px-4">State Code</th>
                      <th className="py-2.5 px-4">Rank</th>
                      <th className="py-2.5 px-4 text-right">XP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {rosterModal.members.map((m) => (
                      <tr key={m.userId}>
                        <td className="py-2.5 px-4 font-semibold text-slate-900">{m.displayName}</td>
                        <td className="py-2.5 px-4 font-mono text-slate-600">{m.stateCode}</td>
                        <td className="py-2.5 px-4 text-slate-700">{m.paradeRank}</td>
                        <td className="py-2.5 px-4 text-right font-mono tabular-nums">{m.experiencePoints}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
