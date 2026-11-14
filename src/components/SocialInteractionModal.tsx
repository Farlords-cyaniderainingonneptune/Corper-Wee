import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { soundManager } from '../audio/AudioSynthesizer';
import { Users, MessageSquare, ShieldAlert, UserPlus, Heart, X, Check, EyeOff, Sparkles, Smile } from 'lucide-react';

interface SocialInteractionModalProps {
  currentUserId: string;
  onClose: () => void;
  onCharismaGained?: (newScore: number) => void;
}

export const SocialInteractionModal: React.FC<SocialInteractionModalProps> = ({
  currentUserId,
  onClose,
  onCharismaGained
}) => {
  const [activeTab, setActiveTab] = useState<'DISCOVER' | 'FRIENDS' | 'PRIVACY'>('DISCOVER');
  const [nearbyCorpers, setNearbyCorpers] = useState<any[]>([]);
  const [friendsList, setFriendsList] = useState<any[]>([]);
  const [selectedCorper, setSelectedCorper] = useState<any | null>(null);
  const [selectedDialogue, setSelectedDialogue] = useState<string>('greet_comrade');
  const [loading, setLoading] = useState(false);
  const [interactionResult, setInteractionResult] = useState<any | null>(null);
  const [reportReason, setReportReason] = useState('');
  const [showReportDialog, setShowReportDialog] = useState(false);
  const [privacySettings, setPrivacySettings] = useState({
    allowInteractions: true,
    allowFriendRequests: true,
    showOnlineStatus: true
  });
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'DISCOVER') {
        const corpers = await api.getNearbyCorpers();
        setNearbyCorpers(corpers);
      } else if (activeTab === 'FRIENDS') {
        const friends = await api.getFriends();
        setFriendsList(friends);
      } else if (activeTab === 'PRIVACY') {
        const priv = await api.getPrivacy();
        if (priv) setPrivacySettings(priv);
      }
    } catch (e) {
      // offline / mock fallback
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteInteraction = async () => {
    if (!selectedCorper) return;
    setLoading(true);
    try {
      const res = await api.socialInteract(selectedCorper.id, 'CONVERSATION', selectedDialogue);
      setInteractionResult(res);

      if (res.outcome === 'GREAT_SUCCESS' || res.outcome === 'MILD_SUCCESS') {
        soundManager.playCoinSound();
      } else {
        soundManager.playPenaltyBuzz();
      }

      if (onCharismaGained && res.newCharismaScore) {
        onCharismaGained(res.newCharismaScore);
      }
    } catch (err: any) {
      showToast(err.message || 'Interaction failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSendFriendRequest = async (targetUserId: string) => {
    try {
      await api.sendFriendRequest(targetUserId);
      showToast('Friend request sent!');
    } catch (err: any) {
      showToast(err.message || 'Failed to send friend request');
    }
  };

  const handleBlockUser = async (targetUserId: string) => {
    try {
      await api.blockUser(targetUserId, 'User requested block');
      showToast('Corps member blocked.');
      setSelectedCorper(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || 'Failed to block');
    }
  };

  const handleReportUser = async () => {
    if (!selectedCorper || !reportReason) return;
    try {
      await api.reportUser(selectedCorper.id, reportReason);
      showToast('Report filed with Camp Commandant.');
      setShowReportDialog(false);
      setReportReason('');
    } catch (err: any) {
      showToast(err.message || 'Failed to submit report');
    }
  };

  const handleTogglePrivacy = async (key: keyof typeof privacySettings) => {
    const updated = { ...privacySettings, [key]: !privacySettings[key] };
    setPrivacySettings(updated);
    try {
      await api.updatePrivacy(updated);
      showToast('Privacy preferences updated.');
    } catch {
      // fallback
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-4">
      <div className="relative w-full max-w-2xl rounded-2xl border border-emerald-500/40 bg-slate-900/95 p-5 sm:p-6 shadow-2xl text-slate-100 flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-tight text-white">
                Camp Social Hub & Charisma
              </h2>
              <p className="text-[11px] text-slate-400">
                Connect with fellow corps members, test dialogue charisma, manage friends & privacy
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-800 hover:bg-slate-700 px-2.5 py-1 text-xs text-slate-300 transition-colors"
          >
            ✕ Exit
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-4 border-b border-slate-800 pb-2">
          <button
            onClick={() => { setActiveTab('DISCOVER'); setSelectedCorper(null); setInteractionResult(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'DISCOVER'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Smile className="h-3.5 w-3.5" />
            <span>Discover Corpers</span>
          </button>
          <button
            onClick={() => { setActiveTab('FRIENDS'); setSelectedCorper(null); setInteractionResult(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'FRIENDS'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Heart className="h-3.5 w-3.5" />
            <span>Friends & Comrades ({friendsList.length})</span>
          </button>
          <button
            onClick={() => { setActiveTab('PRIVACY'); setSelectedCorper(null); setInteractionResult(null); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'PRIVACY'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-950/40'
                : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <EyeOff className="h-3.5 w-3.5" />
            <span>Privacy & Safety</span>
          </button>
        </div>

        {/* Toast */}
        {toastMessage && (
          <div className="mb-3 rounded-xl bg-emerald-950/80 border border-emerald-500/50 p-2 text-center text-xs text-emerald-200">
            {toastMessage}
          </div>
        )}

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {activeTab === 'DISCOVER' && (
            <div>
              {!selectedCorper ? (
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {nearbyCorpers.length === 0 ? (
                    <div className="col-span-2 py-12 text-center text-xs text-slate-400">
                      No fellow corpers nearby right now. Walk towards the Parade Ground or Mami Market!
                    </div>
                  ) : (
                    nearbyCorpers.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => { setSelectedCorper(c); setInteractionResult(null); }}
                        className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-850 hover:border-emerald-500/50 hover:bg-slate-800 transition-all cursor-pointer shadow-sm group"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-800 flex items-center justify-center text-lg font-black text-white">
                            {c.displayName[0]}
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white group-hover:text-emerald-300">
                              {c.displayName}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {c.stateCode} &bull; Platoon {c.platoon?.number || 1}
                            </div>
                            <div className="text-[9px] text-emerald-400 flex items-center gap-1 mt-0.5">
                              <Sparkles className="h-2.5 w-2.5" />
                              <span>Charisma: {c.charismaScore}</span>
                            </div>
                          </div>
                        </div>
                        <span className="text-[11px] font-bold text-emerald-400 group-hover:translate-x-1 transition-transform">
                          Talk &rarr;
                        </span>
                      </div>
                    ))
                  )}
                </div>
              ) : (
                /* Dialogue Interaction View */
                <div className="space-y-4">
                  <div className="flex items-center justify-between bg-slate-950/60 p-3 rounded-xl border border-slate-800">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => setSelectedCorper(null)}
                        className="text-xs text-slate-400 hover:text-white"
                      >
                        &larr; Back
                      </button>
                      <div>
                        <div className="text-sm font-bold text-white">{selectedCorper.displayName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {selectedCorper.stateCode} &bull; Platoon {selectedCorper.platoon?.number || 1}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSendFriendRequest(selectedCorper.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow"
                      >
                        <UserPlus className="h-3.5 w-3.5" />
                        <span>Add Friend</span>
                      </button>
                      <button
                        onClick={() => handleBlockUser(selectedCorper.id)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-[11px] text-slate-400 hover:text-rose-200"
                        title="Block"
                      >
                        Block
                      </button>
                      <button
                        onClick={() => setShowReportDialog(true)}
                        className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-amber-900/60 text-[11px] text-slate-400 hover:text-amber-200"
                        title="Report"
                      >
                        <ShieldAlert className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Dialogue Options */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-300">Choose Dialogue Approach:</label>
                    <div className="grid gap-2 sm:grid-cols-2">
                      {[
                        { id: 'greet_comrade', title: 'Salute & Greet', req: 5, text: '"Corper Wee! Which platoon are you in, comrade?"' },
                        { id: 'joke_mami_jollof', title: 'Mama Put Humor', req: 15, text: '"Abeg you know the exact time Mama Put is dropping hot jollof?"' },
                        { id: 'drill_bonding', title: 'Drill Sergeant Banter', req: 25, text: '"That Sergeant is shouting like he wants Governor seat!"' },
                        { id: 'smooth_compliment', title: 'Compliment Jungle Boots', req: 35, text: '"Your white sneakers and khaki fit sharp pass everybody here."' }
                      ].map((opt) => (
                        <button
                          key={opt.id}
                          onClick={() => setSelectedDialogue(opt.id)}
                          className={`p-3 rounded-xl border text-left transition-all ${
                            selectedDialogue === opt.id
                              ? 'border-emerald-400 bg-emerald-950/40 ring-1 ring-emerald-400'
                              : 'border-slate-800 bg-slate-850 hover:bg-slate-800'
                          }`}
                        >
                          <div className="flex items-center justify-between text-[11px] font-bold text-emerald-400 mb-1">
                            <span>{opt.title}</span>
                            <span className="text-[10px] text-slate-400">Req: {opt.req} CP</span>
                          </div>
                          <div className="text-xs text-slate-300 italic">{opt.text}</div>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    onClick={handleExecuteInteraction}
                    disabled={loading}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 text-sm font-black text-white hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-emerald-950/50 flex items-center justify-center gap-2"
                  >
                    <Sparkles className="h-4 w-4 text-amber-300" />
                    <span>Deliver Charisma Line!</span>
                  </button>

                  {/* Interaction Outcome Banner */}
                  {interactionResult && (
                    <div className={`p-4 rounded-xl border animate-fade-in ${
                      interactionResult.outcome === 'GREAT_SUCCESS'
                        ? 'border-emerald-400 bg-emerald-950/50 text-emerald-200'
                        : interactionResult.outcome === 'MILD_SUCCESS'
                        ? 'border-teal-400 bg-teal-950/50 text-teal-200'
                        : interactionResult.outcome === 'REJECTED'
                        ? 'border-amber-400 bg-amber-950/50 text-amber-200'
                        : 'border-rose-400 bg-rose-950/50 text-rose-200'
                    }`}>
                      <div className="flex items-center gap-2 font-black text-sm mb-1">
                        <span>{interactionResult.outcome.replace('_', ' ')}!</span>
                        <span className="text-xs font-mono font-normal">
                          ({interactionResult.charismaDelta > 0 ? `+${interactionResult.charismaDelta}` : interactionResult.charismaDelta} Charisma)
                        </span>
                      </div>
                      <div className="text-xs italic">{interactionResult.dialogue}</div>
                      <div className="mt-2 text-[10px] font-mono text-slate-400">
                        Reaction: {interactionResult.reactionAnimation} &bull; Relationship Score: {interactionResult.relationshipScore}/100
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {activeTab === 'FRIENDS' && (
            <div className="space-y-2">
              {friendsList.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  No friends added yet. Approach other corpers on camp ground to make friends!
                </div>
              ) : (
                friendsList.map((f) => (
                  <div
                    key={f.friendshipId}
                    className="flex items-center justify-between p-3 rounded-xl border border-slate-800 bg-slate-850"
                  >
                    <div>
                      <div className="text-xs font-bold text-white">{f.displayName}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        {f.stateCode} &bull; Platoon {f.platoonNumber}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="text-[10px] text-slate-400">Relationship</div>
                        <div className="text-xs font-bold text-emerald-400">{f.relationshipScore}%</div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'PRIVACY' && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-850 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Allow Social Interactions</div>
                  <div className="text-[11px] text-slate-400">Let other corps members approach you for dialogue</div>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.allowInteractions}
                  onChange={() => handleTogglePrivacy('allowInteractions')}
                  className="h-4 w-4 accent-emerald-500 rounded"
                />
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-850 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Allow Friend Requests</div>
                  <div className="text-[11px] text-slate-400">Receive friendship invitations from other corpers</div>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.allowFriendRequests}
                  onChange={() => handleTogglePrivacy('allowFriendRequests')}
                  className="h-4 w-4 accent-emerald-500 rounded"
                />
              </div>

              <div className="p-4 rounded-xl border border-slate-800 bg-slate-850 flex items-center justify-between">
                <div>
                  <div className="text-xs font-bold text-white">Show Online Presence in Camp</div>
                  <div className="text-[11px] text-slate-400">Broadcast your avatar position to other players</div>
                </div>
                <input
                  type="checkbox"
                  checked={privacySettings.showOnlineStatus}
                  onChange={() => handleTogglePrivacy('showOnlineStatus')}
                  className="h-4 w-4 accent-emerald-500 rounded"
                />
              </div>
            </div>
          )}
        </div>

        {/* Report Modal Dialog */}
        {showReportDialog && selectedCorper && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 p-4">
            <div className="w-full max-w-sm rounded-2xl bg-slate-900 border border-slate-700 p-5 space-y-4">
              <h3 className="text-sm font-bold text-white">Report {selectedCorper.displayName}</h3>
              <select
                value={reportReason}
                onChange={(e) => setReportReason(e.target.value)}
                className="w-full rounded-xl bg-slate-800 border border-slate-700 p-2 text-xs text-white"
              >
                <option value="">Select violation reason...</option>
                <option value="HARASSMENT">Harassment or rude dialogue</option>
                <option value="SPAM">Interaction spamming</option>
                <option value="CAMP_RULES">Violation of NYSC camp code</option>
              </select>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowReportDialog(false)}
                  className="flex-1 py-2 rounded-xl bg-slate-800 text-xs text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={handleReportUser}
                  disabled={!reportReason}
                  className="flex-1 py-2 rounded-xl bg-rose-600 text-xs font-bold text-white hover:bg-rose-500 disabled:opacity-50"
                >
                  Submit Report
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
