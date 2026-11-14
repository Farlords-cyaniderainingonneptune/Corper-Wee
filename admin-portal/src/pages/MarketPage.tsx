import React, { useEffect, useState } from 'react';
import { Plus, Pencil, X } from 'lucide-react';
import { adminApi, type MarketProductItem } from '../api/adminApi';

const CATEGORY_LABELS: Record<number, string> = {
  1: 'Hydration & Drinks',
  2: 'Camp Chow & Snacks',
  3: 'Uniforms & Accessories',
  4: 'Daily Essentials',
};

export const MarketPage: React.FC = () => {
  const [products, setProducts] = useState<MarketProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState('');

  // Modal state
  const [editing, setEditing] = useState<MarketProductItem | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [categoryId, setCategoryId] = useState(1);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [priceNaira, setPriceNaira] = useState(100);
  const [waterRefillValue, setWaterRefillValue] = useState(0);
  const [staminaBoostValue, setStaminaBoostValue] = useState(0);
  const [charismaBoostValue, setCharismaBoostValue] = useState(0);
  const [stockQuantity, setStockQuantity] = useState(200);
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadProducts = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await adminApi.listMarketProducts();
      setProducts(data.products);
    } catch (err: any) {
      setError(err?.message || 'Failed to load Mami Market catalog.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadProducts();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setCategoryId(1);
    setName('');
    setDescription('');
    setPriceNaira(150);
    setWaterRefillValue(20);
    setStaminaBoostValue(10);
    setCharismaBoostValue(0);
    setStockQuantity(250);
    setIsActive(true);
    setShowModal(true);
  };

  const openEdit = (p: MarketProductItem) => {
    setEditing(p);
    setCategoryId(p.categoryId);
    setName(p.name);
    setDescription(p.description);
    setPriceNaira(p.priceNaira);
    setWaterRefillValue(p.waterRefillValue);
    setStaminaBoostValue(p.staminaBoostValue);
    setCharismaBoostValue(p.charismaBoostValue);
    setStockQuantity(p.stockQuantity);
    setIsActive(p.isActive);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFeedback('');
    try {
      if (editing) {
        await adminApi.updateMarketProduct(editing.id, {
          name: name.trim(),
          description: description.trim(),
          priceNaira: Number(priceNaira),
          stockQuantity: Number(stockQuantity),
          waterRefillValue: Number(waterRefillValue),
          isActive,
        });
        setFeedback(`Product "${name.trim()}" updated.`);
      } else {
        await adminApi.createMarketProduct({
          categoryId: Number(categoryId),
          name: name.trim(),
          description: description.trim(),
          priceNaira: Number(priceNaira),
          waterRefillValue: Number(waterRefillValue),
          staminaBoostValue: Number(staminaBoostValue),
          charismaBoostValue: Number(charismaBoostValue),
          stockQuantity: Number(stockQuantity),
        });
        setFeedback(`Product "${name.trim()}" added to Mami Market.`);
      }
      setShowModal(false);
      await loadProducts();
    } catch (err: any) {
      setError(err?.message || 'Failed to save product.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Mami Market Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage store inventory, Virtual Naira pricing, hydration/stamina effects, and item availability.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreate}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-md bg-emerald-700 hover:bg-emerald-800 text-xs font-semibold text-white"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Add Market Item</span>
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
          <div className="p-8 text-center text-xs text-slate-500">Loading Mami Market inventory...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-2.5 px-4">Product</th>
                  <th className="py-2.5 px-4">Category</th>
                  <th className="py-2.5 px-4 text-right">Price (₦)</th>
                  <th className="py-2.5 px-4 text-right">Water / Stamina</th>
                  <th className="py-2.5 px-4 text-right">Stock</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900">{p.name}</div>
                      <div className="text-[11px] text-slate-500 truncate">{p.description}</div>
                    </td>
                    <td className="py-3 px-4 text-slate-700">{CATEGORY_LABELS[p.categoryId] || `Cat #${p.categoryId}`}</td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900">
                      ₦{p.priceNaira.toLocaleString()}
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-600">
                      +{p.waterRefillValue}% H₂O · +{p.staminaBoostValue}% Sta
                    </td>
                    <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-800">{p.stockQuantity}</td>
                    <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                      {p.isActive ? 'ACTIVE' : 'HIDDEN'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        onClick={() => openEdit(p)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                        <span>Edit</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-lg bg-white border border-slate-200 shadow-lg overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">
                {editing ? `Edit Product: ${editing.name}` : 'Add Mami Market Product'}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-700">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-5 space-y-3.5 text-xs">
              {!editing && (
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 bg-white"
                  >
                    <option value={1}>1 · Hydration & Drinks</option>
                    <option value={2}>2 · Camp Chow & Snacks</option>
                    <option value={3}>3 · Uniforms & Accessories</option>
                    <option value={4}>4 · Daily Essentials</option>
                  </select>
                </div>
              )}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Product Name</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  required
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full rounded-md border border-slate-300 px-3 py-2"
                />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price (₦)</label>
                  <input
                    type="number"
                    min={0}
                    value={priceNaira}
                    onChange={(e) => setPriceNaira(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Stock Qty</label>
                  <input
                    type="number"
                    min={0}
                    value={stockQuantity}
                    onChange={(e) => setStockQuantity(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Water Refill (%)</label>
                  <input
                    type="number"
                    value={waterRefillValue}
                    onChange={(e) => setWaterRefillValue(Number(e.target.value))}
                    className="w-full rounded-md border border-slate-300 px-3 py-2 font-mono"
                  />
                </div>
              </div>
              {editing && (
                <label className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    checked={isActive}
                    onChange={(e) => setIsActive(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="font-semibold text-slate-700">Active in Mami Market storefront</span>
                </label>
              )}
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
                  {saving ? 'Saving...' : 'Save Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
