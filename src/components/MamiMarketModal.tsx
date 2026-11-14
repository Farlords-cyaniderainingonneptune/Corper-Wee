import React, { useEffect, useState } from 'react';
import { api, MarketProduct } from '../api/client';
import { soundManager } from '../audio/AudioSynthesizer';
import { ShoppingBag, ArrowRightLeft, Droplets, CheckCircle, AlertCircle, X, Sparkles } from 'lucide-react';

interface MamiMarketModalProps {
  corperPoints: number;
  virtualNaira: string;
  waterLevel: number;
  onClose: () => void;
  onBalanceUpdated: (points: number, naira: string, waterLevel: number) => void;
}

export const MamiMarketModal: React.FC<MamiMarketModalProps> = ({
  corperPoints,
  virtualNaira,
  waterLevel,
  onClose,
  onBalanceUpdated
}) => {
  const [activeTab, setActiveTab] = useState<'shop' | 'atm'>('shop');
  const [products, setProducts] = useState<MarketProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [purchasing, setPurchasing] = useState<string | null>(null);
  const [pointsToConvert, setPointsToConvert] = useState<number>(20);
  const [feedback, setFeedback] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch {
      // fallback catalogue
      setProducts([
        {
          id: 'prod-water',
          name: 'Cold Sachet Water (Pure Water)',
          category: 'DRINK',
          priceNaira: '50.00',
          waterRestoration: 35,
          staminaBoost: 0,
          description: 'Ice-cold pure water sachet from Mami vendor freezer.'
        },
        {
          id: 'prod-jollof',
          name: 'Mama Put Smoky Jollof & Chicken',
          category: 'FOOD',
          priceNaira: '1200.00',
          waterRestoration: 25,
          staminaBoost: 50,
          description: 'Hot party jollof with fried chicken and plantain.'
        },
        {
          id: 'prod-indomie',
          name: 'Mami Special Indomie & 2 Fried Eggs',
          category: 'FOOD',
          priceNaira: '800.00',
          waterRestoration: 15,
          staminaBoost: 40,
          description: 'Spicy noodles garnished with onions, peppers and fried eggs.'
        },
        {
          id: 'prod-malt',
          name: 'Chilled Malt Drink',
          category: 'DRINK',
          priceNaira: '500.00',
          waterRestoration: 40,
          staminaBoost: 30,
          description: 'Nourishing canned malt drink to beat afternoon heat.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = async (prod: MarketProduct) => {
    const cost = parseFloat(prod.priceNaira);
    const balance = parseFloat(virtualNaira);

    if (balance < cost) {
      setFeedback({ text: `Insufficient Virtual Naira! Convert some CP at the camp ATM.`, error: true });
      return;
    }

    setPurchasing(prod.id);
    try {
      const result = await api.purchaseProduct(prod.id, 1);
      soundManager.playCoinSound();
      if (prod.waterRestoration > 0) {
        soundManager.playWaterGulp();
      }

      const nextWater = Math.min(100, waterLevel + prod.waterRestoration);
      onBalanceUpdated(corperPoints, result.remainingNaira, nextWater);
      setFeedback({ text: `Purchased ${prod.name}! +${prod.waterRestoration}% Hydration.` });
    } catch (err: unknown) {
      setFeedback({ text: err instanceof Error ? err.message : 'Purchase failed', error: true });
    } finally {
      setPurchasing(null);
    }
  };

  const handleConvertPoints = async () => {
    if (pointsToConvert <= 0 || pointsToConvert > corperPoints) {
      setFeedback({ text: 'Invalid CP amount or insufficient points balance', error: true });
      return;
    }

    setPurchasing('atm');
    try {
      const result = await api.convertPointsToNaira(pointsToConvert);
      soundManager.playCoinSound();
      onBalanceUpdated(result.remainingCP, result.newBalanceNaira, waterLevel);
      setFeedback({ text: `Converted ${pointsToConvert} CP into +₦${result.nairaCredited} Virtual Naira!` });
    } catch (err: unknown) {
      setFeedback({ text: err instanceof Error ? err.message : 'Conversion failed', error: true });
    } finally {
      setPurchasing(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
      <div className="relative flex flex-col w-full max-w-2xl max-h-[85vh] rounded-2xl border border-amber-500/40 bg-slate-900 shadow-2xl text-slate-100 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 p-4 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Mami Market &bull; Iseyin Camp
              </h2>
              <p className="text-xs text-slate-400">Mama Put Stalls, Refreshments & Camp Bank Kiosk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Live Balance Banner */}
        <div className="grid grid-cols-3 gap-2 border-b border-slate-800/80 bg-slate-950/40 px-4 py-2.5 text-xs">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Corper Points</span>
            <span className="font-bold text-emerald-400 text-sm">{corperPoints} CP</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Virtual Naira</span>
            <span className="font-bold text-amber-400 text-sm">₦{parseFloat(virtualNaira).toLocaleString()}</span>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-wider text-slate-400">Hydration</span>
            <span className="font-bold text-cyan-400 text-sm">{waterLevel.toFixed(0)}%</span>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div
            className={`flex items-center gap-2 mx-4 mt-3 rounded-lg p-2.5 text-xs ${
              feedback.error
                ? 'bg-rose-950/60 border border-rose-500/40 text-rose-300'
                : 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300'
            }`}
          >
            {feedback.error ? <AlertCircle className="h-4 w-4 shrink-0" /> : <CheckCircle className="h-4 w-4 shrink-0" />}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 px-4 mt-2">
          <button
            onClick={() => setActiveTab('shop')}
            className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors ${
              activeTab === 'shop'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Vendor Stalls
          </button>
          <button
            onClick={() => setActiveTab('atm')}
            className={`py-2 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'atm'
                ? 'border-amber-500 text-amber-300'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ArrowRightLeft className="h-3.5 w-3.5" />
            Camp ATM (CP &rarr; Naira)
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-4">
          {activeTab === 'shop' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {products.map((p) => (
                <div
                  key={p.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-800/40 p-3 hover:border-slate-700 transition-all"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-sm text-white">{p.name}</span>
                      <span className="font-mono font-bold text-amber-400 text-xs">
                        ₦{parseFloat(p.priceNaira).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">{p.description}</p>
                    {p.waterRestoration > 0 && (
                      <div className="mt-2 inline-flex items-center gap-1 text-[11px] text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
                        <Droplets className="h-3 w-3" />
                        <span>+{p.waterRestoration}% Hydration</span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => handleBuy(p)}
                    disabled={purchasing === p.id}
                    className="mt-3 w-full py-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-semibold text-white transition-colors disabled:opacity-50"
                  >
                    {purchasing === p.id ? 'Processing...' : 'Buy Now'}
                  </button>
                </div>
              ))}
            </div>
          ) : (
            /* ATM Bank Tab */
            <div className="max-w-md mx-auto space-y-4 py-4">
              <div className="rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4 text-center">
                <span className="text-xs uppercase font-bold text-emerald-400 tracking-wider">
                  Official Camp Exchange Rate
                </span>
                <div className="text-2xl font-black text-white mt-1">10 CP = ₦100.00</div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Corper Points earned on the parade ground and in camp drills can be converted directly into Virtual Naira for Mami Market purchases.
                </p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Corper Points to Convert (Balance: {corperPoints} CP)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    max={corperPoints}
                    value={pointsToConvert}
                    onChange={(e) => setPointsToConvert(parseInt(e.target.value) || 0)}
                    className="flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                  <button
                    onClick={() => setPointsToConvert(corperPoints)}
                    className="px-3 py-2 text-xs font-medium rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700"
                  >
                    Max
                  </button>
                </div>
                <div className="mt-1 text-xs text-slate-400">
                  Yield: <span className="font-bold text-amber-400">₦{(pointsToConvert * 10).toLocaleString()} Virtual Naira</span>
                </div>
              </div>

              <button
                onClick={handleConvertPoints}
                disabled={purchasing === 'atm' || pointsToConvert <= 0 || pointsToConvert > corperPoints}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-sm font-bold text-white shadow-lg shadow-emerald-950/40 hover:from-emerald-500 hover:to-teal-500 transition-all disabled:opacity-50"
              >
                {purchasing === 'atm' ? 'Dispensing Naira...' : 'Convert Points to Naira'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
