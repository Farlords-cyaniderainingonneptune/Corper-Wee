import React, { useEffect, useRef, useState } from 'react';
import { CharacterPreview3D, PreviewGesture } from '../game/CharacterPreview3D';
import { CharacterAppearance } from '../game/ProceduralModels';
import { api } from '../api/client';
import { soundManager } from '../audio/AudioSynthesizer';
import {
  User,
  Palette,
  Scissors,
  Shield,
  Glasses,
  Check,
  Zap,
  Hand,
  Footprints,
  RotateCw,
  Sparkles
} from 'lucide-react';

interface CharacterStudioProps {
  initialAppearance?: CharacterAppearance | null;
  onSaved: (appearance: CharacterAppearance) => void;
  onCancel?: () => void;
}

export const CharacterStudio: React.FC<CharacterStudioProps> = ({
  initialAppearance,
  onSaved,
  onCancel
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const previewRef = useRef<CharacterPreview3D | null>(null);

  const [appearance, setAppearance] = useState<CharacterAppearance>({
    gender: initialAppearance?.gender || 'MALE',
    skinTone: initialAppearance?.skinTone || 'WARM_BROWN',
    hairstyle: initialAppearance?.hairstyle || 'BUZZ_CUT',
    hairColor: initialAppearance?.hairColor || 'BLACK',
    facialFeature: initialAppearance?.facialFeature || 'NONE',
    uniformType: initialAppearance?.uniformType || 'KHAKI_FULL',
    footwear: initialAppearance?.footwear || 'JUNGLE_BOOTS',
    accessories: initialAppearance?.accessories || 'WAIST_BAG'
  });

  const [activeTab, setActiveTab] = useState<'body' | 'face' | 'kit' | 'actions'>('body');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (containerRef.current && !previewRef.current) {
      previewRef.current = new CharacterPreview3D(containerRef.current, appearance);
    }
    return () => {
      if (previewRef.current) {
        previewRef.current.destroy();
        previewRef.current = null;
      }
    };
  }, []);

  const updateParam = <K extends keyof CharacterAppearance>(key: K, val: CharacterAppearance[K]) => {
    const next = { ...appearance, [key]: val };
    setAppearance(next);
    if (previewRef.current) {
      previewRef.current.updateAppearance(next);
    }
  };

  const triggerGesture = (gesture: PreviewGesture) => {
    if (previewRef.current) {
      previewRef.current.playGesture(gesture);
    }
    if (gesture === 'SALUTE') {
      soundManager.playWhistle();
    } else if (gesture === 'MARCH') {
      soundManager.playDrumHit(true);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.updateCharacter(appearance);
      soundManager.playBugleCall();
      onSaved(appearance);
    } catch (err) {
      // Fallback save locally if network offline
      soundManager.playBugleCall();
      onSaved(appearance);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
      <div className="relative flex flex-col md:flex-row w-full max-w-4xl h-[92vh] max-h-[760px] overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
        {/* Left: 3D Studio Viewport */}
        <div className="relative flex-1 bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col items-center justify-between p-4 overflow-hidden">
          <div className="w-full flex items-center justify-between z-10">
            <span className="rounded-lg bg-black/60 px-3 py-1.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30 backdrop-blur-sm">
              3D Live Corper Preview &bull; {appearance.gender}
            </span>
            <span className="text-[11px] text-slate-400">Turntable View</span>
          </div>

          <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Interactive Gesture Test Bar at bottom of 3D canvas */}
          <div className="w-full flex flex-wrap items-center justify-center gap-2 z-10 pt-2">
            <span className="text-[10px] uppercase font-bold text-slate-400 mr-1 hidden sm:inline">
              Pose Test:
            </span>
            <button
              onClick={() => triggerGesture('SALUTE')}
              className="flex items-center gap-1.5 rounded-lg bg-emerald-600/80 hover:bg-emerald-500 px-3 py-1.5 text-xs font-bold text-white shadow transition-all active:scale-95"
            >
              <Zap className="h-3.5 w-3.5 text-amber-300" />
              <span>Salute</span>
            </button>
            <button
              onClick={() => triggerGesture('WAVE')}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all active:scale-95"
            >
              <Hand className="h-3.5 w-3.5 text-cyan-400" />
              <span>Wave</span>
            </button>
            <button
              onClick={() => triggerGesture('MARCH')}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all active:scale-95"
            >
              <Footprints className="h-3.5 w-3.5 text-amber-400" />
              <span>March</span>
            </button>
            <button
              onClick={() => triggerGesture('AT_EASE')}
              className="flex items-center gap-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700 border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition-all active:scale-95"
            >
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span>At Ease</span>
            </button>
          </div>
        </div>

        {/* Right: Customization Controls Panel */}
        <div className="w-full md:w-88 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900/95 p-5 overflow-y-auto">
          <div>
            <div className="mb-4">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-400" />
                NYSC Corper Kit Studio
              </h2>
              <p className="text-xs text-slate-400">Orientation Camp Character Customization &bull; Iseyin</p>
            </div>

            {/* Category Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 rounded-xl bg-slate-800/70 border border-slate-700 mb-4 text-xs font-medium">
              <button
                onClick={() => setActiveTab('body')}
                className={`py-1.5 rounded-lg transition-all ${
                  activeTab === 'body' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Identity
              </button>
              <button
                onClick={() => setActiveTab('face')}
                className={`py-1.5 rounded-lg transition-all ${
                  activeTab === 'face' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Face & Hair
              </button>
              <button
                onClick={() => setActiveTab('kit')}
                className={`py-1.5 rounded-lg transition-all ${
                  activeTab === 'kit' ? 'bg-emerald-600 text-white font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Uniform & Kit
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {activeTab === 'body' && (
                <>
                  {/* Gender */}
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5 uppercase tracking-wider text-[10px]">
                      Corps Member Gender
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['MALE', 'FEMALE'] as const).map((g) => (
                        <button
                          key={g}
                          onClick={() => updateParam('gender', g)}
                          className={`py-2 rounded-lg font-medium transition-all ${
                            appearance.gender === g
                              ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/30'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {g}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Skin Tone */}
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <Palette className="h-3 w-3 text-amber-400" />
                      Melanin Tone
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'LIGHT', label: 'Light Golden', color: '#b57850' },
                        { id: 'WARM_BROWN', label: 'Warm Brown', color: '#824b2b' },
                        { id: 'DEEP_BROWN', label: 'Deep Rich Brown', color: '#542d17' },
                        { id: 'DARK_EBONY', label: 'Dark Ebony', color: '#30180a' }
                      ].map((s) => (
                        <button
                          key={s.id}
                          onClick={() => updateParam('skinTone', s.id as CharacterAppearance['skinTone'])}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-left transition-all ${
                            appearance.skinTone === s.id
                              ? 'border-emerald-500 bg-emerald-950/40 text-emerald-300 font-semibold'
                              : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <span
                            className="h-3.5 w-3.5 rounded-full border border-white/20 shrink-0"
                            style={{ backgroundColor: s.color }}
                          />
                          <span className="truncate">{s.label}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'face' && (
                <>
                  {/* Hairstyle */}
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <Scissors className="h-3 w-3 text-cyan-400" />
                      Camp Hairstyle
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'BUZZ_CUT', label: 'Camp Buzz' },
                        { id: 'AFRO_FADE', label: 'Afro Fade' },
                        { id: 'CORNROWS', label: 'Cornrows' },
                        { id: 'BRAIDS', label: 'Braids' },
                        { id: 'LOW_TAPER', label: 'Low Taper' }
                      ].map((h) => (
                        <button
                          key={h.id}
                          onClick={() => updateParam('hairstyle', h.id as CharacterAppearance['hairstyle'])}
                          className={`py-2 px-2 rounded-lg font-medium text-center transition-all ${
                            appearance.hairstyle === h.id
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {h.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Facial Features & Eyewear */}
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <Glasses className="h-3 w-3 text-amber-400" />
                      Facial Features & Eyewear
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'NONE', label: 'Clean Face' },
                        { id: 'AVIATOR_SHADES', label: 'Aviator Shades' },
                        { id: 'STUDENT_GLASSES', label: 'Reading Glasses' },
                        { id: 'MUSTACHE', label: 'Trim Mustache' }
                      ].map((f) => (
                        <button
                          key={f.id}
                          onClick={() => updateParam('facialFeature', f.id as CharacterAppearance['facialFeature'])}
                          className={`py-2 px-2 rounded-lg font-medium text-center transition-all ${
                            appearance.facialFeature === f.id
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {f.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {activeTab === 'kit' && (
                <>
                  {/* Uniforms */}
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5 uppercase tracking-wider text-[10px] flex items-center gap-1">
                      <Shield className="h-3 w-3 text-emerald-400" />
                      Camp Uniform Kit
                    </label>
                    <div className="space-y-2">
                      {[
                        {
                          id: 'KHAKI_FULL',
                          name: 'Full Khaki 7/7 Ceremonial',
                          desc: 'Crest cap, jacket, trousers, brass buckle belt, and boots.'
                        },
                        {
                          id: 'WHITE_PT',
                          name: 'White-on-White PT Kit',
                          desc: 'White athletic t-shirt, shorts, and tennis shoes for drills.'
                        },
                        {
                          id: 'PLATOON_JERSEY',
                          name: 'Platoon Track Jersey',
                          desc: 'Green athletic kit for sports competitions and inter-platoon games.'
                        }
                      ].map((u) => (
                        <button
                          key={u.id}
                          onClick={() => updateParam('uniformType', u.id as CharacterAppearance['uniformType'])}
                          className={`w-full p-2.5 rounded-xl border text-left transition-all ${
                            appearance.uniformType === u.id
                              ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
                              : 'border-slate-700 bg-slate-800/80 text-slate-300 hover:border-slate-600'
                          }`}
                        >
                          <div className="font-semibold flex items-center justify-between">
                            <span>{u.name}</span>
                            {appearance.uniformType === u.id && <Check className="h-4 w-4 text-emerald-400" />}
                          </div>
                          <p className="text-[10px] text-slate-400 mt-0.5">{u.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Footwear */}
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5 uppercase tracking-wider text-[10px]">
                      Footwear
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'JUNGLE_BOOTS', label: 'Black Jungle Boots' },
                        { id: 'WHITE_SNEAKERS', label: 'White Tennis Sneakers' }
                      ].map((b) => (
                        <button
                          key={b.id}
                          onClick={() => updateParam('footwear', b.id as CharacterAppearance['footwear'])}
                          className={`py-2 px-2 rounded-lg font-medium text-center transition-all ${
                            appearance.footwear === b.id
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {b.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Accessories */}
                  <div>
                    <label className="block font-semibold text-slate-300 mb-1.5 uppercase tracking-wider text-[10px]">
                      Camp Accessories
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'WAIST_BAG', label: 'Waist Pouch' },
                        { id: 'ID_LANYARD', label: 'Camp ID Lanyard' },
                        { id: 'BOTH', label: 'Both Pouch & ID' },
                        { id: 'NONE', label: 'No Accessories' }
                      ].map((a) => (
                        <button
                          key={a.id}
                          onClick={() => updateParam('accessories', a.id as CharacterAppearance['accessories'])}
                          className={`py-2 px-2 rounded-lg font-medium text-center transition-all ${
                            appearance.accessories === a.id
                              ? 'bg-emerald-600 text-white font-bold'
                              : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                          }`}
                        >
                          {a.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="mt-5 space-y-2 pt-3 border-t border-slate-800">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 py-3 text-sm font-semibold text-white shadow-lg shadow-emerald-950/40 hover:from-emerald-500 hover:to-teal-500 transition-all active:scale-[0.98] disabled:opacity-50"
            >
              <Check className="h-4 w-4" />
              {saving ? 'Saving Corper Kit...' : 'Confirm Character Kit'}
            </button>

            {onCancel && (
              <button
                onClick={onCancel}
                className="w-full py-2 text-xs text-slate-400 hover:text-white transition-colors"
              >
                Back to Camp Ground
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
