import React, { useEffect, useState } from 'react';
import { Plus, Pencil, Power, Trash2, X } from 'lucide-react';
import { adminApi, type CampLocation } from '../api/adminApi';
import { ConfirmModal } from '../components/ConfirmModal';

export const LocationsPage: React.FC = () => {
  const [locations, setLocations] = useState<CampLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Create / Edit modal
  const [editing, setEditing] = useState<CampLocation | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [category, setCategory] = useState('ACTIVITY');
  const [posX, setPosX] = useState(0);
  const [posY, setPosY] = useState(0);
  const [posZ, setPosZ] = useState(0);
  const [triggerRadius, setTriggerRadius] = useState(10);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);

  // Soft delete confirm modal
  const [deleteTarget, setDeleteTarget] = useState<CampLocation | null>(null);
  const [deleting, setDeleting] = useState(false);

  const loadLocations = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.listLocations();
      setLocations(data);
    } catch (err: any) {
      setError(err?.message || 'Failed to load camp locations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadLocations();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setSlug('');
    setName('');
    setCategory('ACTIVITY');
    setPosX(0);
    setPosY(0);
    setPosZ(0);
    setTriggerRadius(10);
    setDescription('');
    setShowModal(true);
  };

  const openEdit = (loc: CampLocation) => {
    setEditing(loc);
    setSlug(loc.slug);
    setName(loc.name);
    setCategory(loc.category);
    setPosX(loc.posX);
    setPosY(loc.posY);
    setPosZ(loc.posZ);
    setTriggerRadius(loc.triggerRadius);
    setDescription(loc.description);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFeedback('');
    try {
      if (editing) {
        await adminApi.updateLocation(editing.id, {
          name: name.trim(),
          category,
          posX: Number(posX),
          posY: Number(posY),
          posZ: Number(posZ),
          triggerRadius: Number(triggerRadius),
          description: description.trim(),
        });
        setFeedback(`Location "${name.trim()}" updated.`);
      } else {
        await adminApi.createLocation({
          slug: slug.trim().toLowerCase(),
          name: name.trim(),
          category,
          posX: Number(posX),
          posY: Number(posY),
          posZ: Number(posZ),
          triggerRadius: Number(triggerRadius),
          description: description.trim(),
        });
        setFeedback(`Location "${name.trim()}" created.`);
      }
      setShowModal(false);
      await loadLocations();
    } catch (err: any) {
      setError(err?.message || 'Failed to save location.');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (loc: CampLocation) => {
    setError('');
    setFeedback('');
    try {
      await adminApi.toggleLocationActive(loc.id, !loc.isActive);
      setFeedback(`Location "${loc.name}" ${!loc.isActive ? 'activated' : 'deactivated'}.`);
      await loadLocations();
    } catch (err: any) {
      setError(err?.message || 'Failed to toggle location.');
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    setError('');
    setFeedback('');
    try {
      const res = await adminApi.softDeleteLocation(deleteTarget.id);
      setFeedback(res.message);
      setDeleteTarget(null);
      await loadLocations();
    } catch (err: any) {
      setError(err?.message || 'Failed to delete location.');
      setDeleteTarget(null);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Location Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure Iseyin Camp 3D zones, coordinates, trigger radiuses, activation, and historical-safe soft deletion.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Camp Location</span>
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
          <div className="p-8 text-center text-xs text-slate-500">Loading 3D camp zones...</div>
        ) : locations.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">No active or inactive camp locations found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">Zone Name</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4">Coordinates (X, Y, Z)</th>
                  <th className="py-2.5 px-4 text-right">Radius</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {locations.map((loc) => (
                  <tr key={loc.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{loc.name}</div>
                      <div className="text-[11px] font-mono text-slate-500">{loc.slug}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-700">{loc.category}</td>
                    <td className="py-3 px-4 font-mono tabular-nums text-slate-700">
                      ({loc.posX}, {loc.posY}, {loc.posZ})
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-700">{loc.triggerRadius}m</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {loc.isActive ? 'ACTIVE' : 'INACTIVE'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openEdit(loc)}
                          title="Edit Coordinates & Details"
                          className="p-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleActive(loc)}
                          title={loc.isActive ? 'Deactivate Location' : 'Activate Location'}
                          className="p-1.5 rounded border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-800"
                        >
                          <Power className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteTarget(loc)}
                          title="Soft-Delete Location"
                          className="p-1.5 rounded border border-rose-200 bg-rose-50 hover:bg-rose-100 text-rose-700"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
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
          <div className="w-full max-w-lg rounded-lg bg-white border border-slate-200 shadow-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editing ? `Edit Location: ${editing.name}` : 'Create New 3D Camp Location'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Zone Slug</label>
                  <input
                    type="text"
                    required
                    disabled={!!editing}
                    value={slug}
                    onChange={(e) => setSlug(e.target.value)}
                    placeholder="camp-clinic"
                    className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono disabled:bg-slate-100"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 bg-white"
                  >
                    <option value="ACTIVITY">ACTIVITY</option>
                    <option value="COMMERCE">COMMERCE</option>
                    <option value="RESIDENTIAL">RESIDENTIAL</option>
                    <option value="SECURITY">SECURITY</option>
                    <option value="RESOURCE">RESOURCE</option>
                    <option value="MEDICAL">MEDICAL</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Display Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Camp Clinic & Red Cross Station"
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pos X</label>
                  <input
                    type="number"
                    step="0.5"
                    value={posX}
                    onChange={(e) => setPosX(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pos Y</label>
                  <input
                    type="number"
                    step="0.5"
                    value={posY}
                    onChange={(e) => setPosY(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Pos Z</label>
                  <input
                    type="number"
                    step="0.5"
                    value={posZ}
                    onChange={(e) => setPosZ(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Radius (m)</label>
                  <input
                    type="number"
                    min={1}
                    step="0.5"
                    value={triggerRadius}
                    onChange={(e) => setTriggerRadius(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
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
                  className="px-4 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 text-white font-semibold disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmModal
        open={deleteTarget !== null}
        title={`Soft-Delete "${deleteTarget?.name}"?`}
        description="Soft-deleting removes this zone from active camp navigation while preserving historical event names and activity records without data corruption."
        confirmLabel="Soft-Delete Location"
        tone="danger"
        loading={deleting}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
};
