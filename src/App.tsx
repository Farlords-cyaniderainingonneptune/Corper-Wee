/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useRef, useState } from 'react';
import { CampScene3D, CampZoneTrigger } from './game/CampScene3D';
import { CharacterAppearance } from './game/ProceduralModels';
import {
  api,
  UserSession,
  type CampNotificationItem,
  type DailyDutyType,
  type DailyTasksSummary,
} from './api/client';
import { soundManager, type CampTimeOfDay } from './audio/AudioSynthesizer';
import { AuthModal } from './components/AuthModal';
import { CharacterStudio } from './components/CharacterStudio';
import { CampHUD } from './components/CampHUD';
import { ParadeMinigame } from './components/ParadeMinigame';
import { CanteenRushMinigame } from './components/CanteenRushMinigame';
import { MamiMarketModal } from './components/MamiMarketModal';
import { LeaderboardModal } from './components/LeaderboardModal';
import { AdminDashboard } from './components/AdminDashboard';
import { SocialInteractionModal } from './components/SocialInteractionModal';
import { CampEventsModal } from './components/CampEventsModal';
import { DailyTasksModal } from './components/DailyTasksModal';
import { multiplayerClient } from './network/MultiplayerClient';
import { detectRecommendedPerformanceTier, type PerformanceTier } from './game/DevicePerformance';
import {
  getNextWeatherState,
  getWeatherHydrationMultiplier,
  getWeatherProfile,
  WEATHER_CYCLE_INTERVAL_MS,
  type CampWeatherState,
} from './game/WeatherSystem';

const DEFAULT_CHARACTER: CharacterAppearance = {
  gender: 'MALE',
  skinTone: 'WARM_BROWN',
  hairstyle: 'BUZZ_CUT',
  hairColor: 'BLACK',
  facialFeature: 'NONE',
  uniformType: 'KHAKI_FULL',
  footwear: 'JUNGLE_BOOTS',
  accessories: 'WAIST_BAG'
};

import { SoldierDetectionEvent } from './game/SoldierPatrolAI';

export default function App() {
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const campEngineRef = useRef<CampScene3D | null>(null);

  // App & Session State
  const [session, setSession] = useState<UserSession | null>(null);
  const [waterLevel, setWaterLevel] = useState<number>(100);
  const [soldierAlert, setSoldierAlert] = useState<SoldierDetectionEvent | null>(null);
  const [playerPos, setPlayerPos] = useState<{ x: number; z: number; rotationY: number }>({
    x: 0,
    z: 65,
    rotationY: 0
  });
  const [activeWaypointId, setActiveWaypointId] = useState<string | null>('parade_ground');

  const [activeZone, setActiveZone] = useState<CampZoneTrigger>({
    id: null,
    name: '',
    actionText: '',
    zone: null
  });

  // Modals & Sub-scenes
  const [showAuthModal, setShowAuthModal] = useState<boolean>(true);
  const [showCharacterStudio, setShowCharacterStudio] = useState<boolean>(false);
  const [showParadeMinigame, setShowParadeMinigame] = useState<boolean>(false);
  const [showCanteenRush, setShowCanteenRush] = useState<boolean>(false);
  const [showMamiMarket, setShowMamiMarket] = useState<boolean>(false);
  const [showLeaderboard, setShowLeaderboard] = useState<boolean>(false);
  const [showAdminPortal, setShowAdminPortal] = useState<boolean>(false);
  const [showSocialHub, setShowSocialHub] = useState<boolean>(false);
  const [showEventsModal, setShowEventsModal] = useState<boolean>(false);
  const [showDailyTasks, setShowDailyTasks] = useState<boolean>(false);
  const [activeDutyMode, setActiveDutyMode] = useState<DailyDutyType | null>(null);
  const [dailyTasksSummary, setDailyTasksSummary] = useState<DailyTasksSummary | null>(null);
  const [dailyAlertBanner, setDailyAlertBanner] = useState<{
    taskType: DailyDutyType;
    title: string;
    message: string;
    rewardCp: number;
  } | null>(null);
  const [onlinePlayersCount, setOnlinePlayersCount] = useState<number>(1);
  const [notifications, setNotifications] = useState<CampNotificationItem[]>([]);
  const [timeOfDay, setTimeOfDay] = useState<CampTimeOfDay>('MORNING');
  const [weather, setWeather] = useState<CampWeatherState>('SUNNY');
  const [performanceTier, setPerformanceTier] = useState<PerformanceTier>(() =>
    detectRecommendedPerformanceTier()
  );

  const mergeNotifications = (incoming: CampNotificationItem[]) => {
    if (!incoming.length) return;
    setNotifications((prev) => {
      const byId = new Map<string, CampNotificationItem>();
      for (const item of incoming) {
        if (item?.id) byId.set(item.id, item);
      }
      for (const item of prev) {
        if (item?.id && !byId.has(item.id)) byId.set(item.id, item);
      }
      return Array.from(byId.values())
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 25);
    });
  };

  // 1. Check for stored login session on mount
  useEffect(() => {
    const tryRestoreSession = async () => {
      try {
        const profile = await api.getMyProfile();
        if (profile && profile.user) {
          handleAuthSuccess(profile);
        }
      } catch {
        // Not logged in or expired
      }
    };
    tryRestoreSession();
  }, []);

  // 2. Initialize Camp 3D Engine once container mounts
  useEffect(() => {
    if (canvasContainerRef.current && !campEngineRef.current) {
      campEngineRef.current = new CampScene3D(
        canvasContainerRef.current,
        session?.character || DEFAULT_CHARACTER,
        (zone) => setActiveZone(zone),
        (alert) => {
          setSoldierAlert(alert);
          if (alert.state === 'CAPTURED') {
            soundManager.playPenaltyBuzz();
            // Report stealth capture penalty to backend
            api.reportStealth(false, 5).catch(() => {});
            setTimeout(() => {
              if (campEngineRef.current) {
                campEngineRef.current.resetSoldierAlerts();
              }
              setSoldierAlert(null);
            }, 3500);
          } else if (alert.state === 'CHASE') {
            soundManager.playPenaltyBuzz();
          }
        }
      );

      // Set initial waypoint
      campEngineRef.current.setWaypointTarget('parade_ground');
    }

    return () => {
      if (campEngineRef.current) {
        campEngineRef.current.destroy();
        campEngineRef.current = null;
      }
    };
  }, []);

  // 3. Minimap Position Tracker & Multiplayer Movement Broadcaster
  useEffect(() => {
    let lastSentX = 0;
    let lastSentZ = 0;

    const posInterval = setInterval(() => {
      if (campEngineRef.current) {
        const p = campEngineRef.current.getPlayerPosition();
        setPlayerPos(p);

        // Only send network update if position moved by > 0.15m
        if (session && (Math.abs(p.x - lastSentX) > 0.15 || Math.abs(p.z - lastSentZ) > 0.15)) {
          lastSentX = p.x;
          lastSentZ = p.z;
          multiplayerClient.sendMovement(p.x, 0, p.z, p.rotationY);
        }
      }
    }, 120);

    return () => clearInterval(posInterval);
  }, [session]);

  // 4. Multiplayer WebSocket Session Connect & Event Subscriptions
  useEffect(() => {
    if (!session || !session.user) return;

    multiplayerClient.connect({
      userId: session.user.id,
      stateCode: session.user.stateCode,
      displayName: session.user.fullName || session.user.email.split('@')[0],
      platoonNumber: session.user.platoonNumber,
      posX: 0,
      posY: 0,
      posZ: 65,
      rotationY: 0,
    });

    api.getCampNotifications(20).then((items) => mergeNotifications(items)).catch(() => {});

    const unsubscribe = multiplayerClient.subscribe((type, data) => {
      if (type === 'ROOM_INIT') {
        if (data.players && Array.isArray(data.players)) {
          setOnlinePlayersCount(data.players.length + 1);
          data.players.forEach((p: any) => {
            if (campEngineRef.current) {
              campEngineRef.current.syncRemotePlayer(p);
            }
          });
        }
        if (Array.isArray(data.notifications)) {
          mergeNotifications(data.notifications);
        }
      } else if (type === 'CAMP_NOTIFICATION') {
        if (data && data.id) {
          mergeNotifications([data as CampNotificationItem]);
        }
      } else if (type === 'PLAYER_JOINED') {
        setOnlinePlayersCount((prev) => prev + 1);
        if (campEngineRef.current) {
          campEngineRef.current.syncRemotePlayer(data);
        }
      } else if (type === 'PLAYER_MOVED') {
        if (campEngineRef.current) {
          campEngineRef.current.syncRemotePlayer({
            userId: data.userId,
            displayName: 'Corper',
            stateCode: 'NYSC',
            platoonNumber: 1,
            posX: data.x,
            posY: data.y,
            posZ: data.z,
            rotationY: data.rotationY,
          });
        }
      } else if (type === 'PLAYER_LEFT') {
        setOnlinePlayersCount((prev) => Math.max(1, prev - 1));
        if (campEngineRef.current) {
          campEngineRef.current.removeRemotePlayer(data.userId);
        }
      }
    });

    return () => {
      unsubscribe();
      multiplayerClient.disconnect();
    };
  }, [session]);

  // 5. Hydration Depletion Loop (scaled by active Camp Weather modifier)
  useEffect(() => {
    if (!session) return;

    const hydrationMultiplier = getWeatherHydrationMultiplier(weather);
    let tickCount = 0;

    const interval = setInterval(() => {
      tickCount += 1;
      setWaterLevel((prev) => Math.max(0, +(prev - 0.35 * hydrationMultiplier).toFixed(2)));

      // Reconcile authoritative hydration drain with backend every 30 seconds
      if (tickCount % 10 === 0) {
        api
          .depleteWater(30, false, weather)
          .then((res) => {
            if (res && typeof res.currentLevel === 'number') {
              setWaterLevel(res.currentLevel);
            }
          })
          .catch(() => {});
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [session, weather]);

  // 6. Ambient Soundscape Lifecycle, Zone Crossfading & Minigame Ducking
  useEffect(() => {
    if (!session) {
      soundManager.stopAmbient();
      return;
    }
    soundManager.startAmbient();
    soundManager.setTimeOfDay(timeOfDay);
    soundManager.setWeather(weather);
    soundManager.setActiveZone(activeZone.id);

    return () => {
      soundManager.stopAmbient();
    };
  }, [session]);

  useEffect(() => {
    if (!session) return;
    soundManager.setActiveZone(activeZone.id);
  }, [session, activeZone.id]);

  useEffect(() => {
    soundManager.setTimeOfDay(timeOfDay);
    if (campEngineRef.current) {
      campEngineRef.current.setTimeOfDay(timeOfDay);
    }
  }, [timeOfDay]);

  // 6b. Dynamic Weather Sync & Periodic Cycle (Sunny -> Cloudy -> Light Rain)
  useEffect(() => {
    soundManager.setWeather(weather);
    if (campEngineRef.current) {
      campEngineRef.current.setWeather(weather);
    }
  }, [weather]);

  useEffect(() => {
    if (!session) return;

    const weatherTimer = setInterval(() => {
      setWeather((prev) => {
        const next = getNextWeatherState(prev);
        const profile = getWeatherProfile(next);
        mergeNotifications([
          {
            id: `weather-${Date.now()}`,
            category: 'WEATHER_UPDATE',
            actorUserId: session.user.id,
            actorName: 'Camp Weather',
            message: `Weather shifted to ${profile.label} (${profile.modifierBadge}): ${profile.description}`,
            createdAt: new Date().toISOString(),
          },
        ]);
        return next;
      });
    }, WEATHER_CYCLE_INTERVAL_MS);

    return () => clearInterval(weatherTimer);
  }, [session?.user?.id]);

  // 7. Sync Daily Morning Drill / Evening Parade tasks & trigger shift notification alerts
  useEffect(() => {
    if (!session) {
      setDailyTasksSummary(null);
      setDailyAlertBanner(null);
      return;
    }

    let cancelled = false;
    api
      .triggerDailyTaskAlert(timeOfDay)
      .then((res) => {
        if (cancelled) return;
        setDailyTasksSummary(res.summary);
        if (res.alertTriggered && res.notification) {
          mergeNotifications([res.notification]);
          soundManager.playBugleCall();
          const matchedTask = res.summary.tasks.find((t) => t.taskType === res.targetTask);
          setDailyAlertBanner({
            taskType: res.targetTask,
            title: matchedTask?.title || (res.targetTask === 'MORNING_DRILL' ? 'Morning Drill' : 'Evening Parade'),
            message: res.notification.message,
            rewardCp: matchedTask?.rewardCp ?? (res.targetTask === 'MORNING_DRILL' ? 50 : 60),
          });
        }
      })
      .catch(() => {
        // Fallback: still load daily task status quietly
        api.getDailyTasks(timeOfDay).then((sum) => !cancelled && setDailyTasksSummary(sum)).catch(() => {});
      });

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id, timeOfDay]);

  useEffect(() => {
    const shouldDuck =
      showParadeMinigame || showCanteenRush || showCharacterStudio || showAdminPortal;
    soundManager.setAmbientDucked(shouldDuck);
  }, [showParadeMinigame, showCanteenRush, showCharacterStudio, showAdminPortal]);

  const handleCycleTimeOfDay = () => {
    setTimeOfDay((prev) =>
      prev === 'MORNING' ? 'DAY' : prev === 'DAY' ? 'NIGHT' : 'MORNING'
    );
  };

  const handleCycleWeather = () => {
    setWeather((prev) => getNextWeatherState(prev));
  };

  const handleCyclePerformanceTier = () => {
    setPerformanceTier((prev) => {
      const next: PerformanceTier = prev === 'LOW' ? 'MID' : prev === 'MID' ? 'HIGH' : 'LOW';
      if (campEngineRef.current) {
        campEngineRef.current.setPerformanceTier(next);
      }
      return next;
    });
  };

  // Auth Success Handler (loads and applies saved character)
  const handleAuthSuccess = (newSession: UserSession) => {
    setSession(newSession);
    setShowAuthModal(false);
    setWaterLevel(newSession.water?.waterLevel ?? 100);

    const characterToApply = newSession.character || DEFAULT_CHARACTER;
    if (campEngineRef.current) {
      campEngineRef.current.updatePlayerModel(characterToApply);
    }

    if (newSession.isNewUser || newSession.requiresOnboarding || !newSession.character) {
      setShowCharacterStudio(true);
    }
  };

  // Character Saved Handler
  const handleCharacterSaved = (newAppearance: CharacterAppearance) => {
    setShowCharacterStudio(false);
    if (campEngineRef.current) {
      campEngineRef.current.updatePlayerModel(newAppearance);
    }
    if (session) {
      setSession({
        ...session,
        character: newAppearance,
        requiresOnboarding: false
      });
    }
  };

  // Waypoint Selection
  const handleSelectWaypoint = (zoneId: string | null) => {
    setActiveWaypointId(zoneId);
    if (campEngineRef.current) {
      campEngineRef.current.setWaypointTarget(zoneId);
    }
  };

  // Fast Travel to Location
  const handleFastTravel = (x: number, z: number) => {
    if (campEngineRef.current) {
      campEngineRef.current.teleportToLocation(x, z);
      setPlayerPos({ x, z, rotationY: 0 });
    }
  };

  // Proximity Zone Trigger
  const handleTriggerZoneAction = () => {
    if (!activeZone.id) return;

    if (activeZone.id === 'parade_ground') {
      const pendingShift =
        dailyTasksSummary?.tasks.find((t) => t.status === 'PENDING' && t.isActiveWindow) ||
        dailyTasksSummary?.tasks.find((t) => t.status === 'PENDING') ||
        null;
      setActiveDutyMode(pendingShift ? pendingShift.taskType : null);
      setShowParadeMinigame(true);
    } else if (activeZone.id === 'camp_canteen') {
      setShowCanteenRush(true);
    } else if (activeZone.id === 'mami_market') {
      setShowMamiMarket(true);
    } else if (activeZone.id === 'water_borehole') {
      handleRefillWater();
    } else if (activeZone.id === 'admin_hq') {
      setShowAdminPortal(true);
    } else if (activeZone.id === 'lecture_pavilion') {
      soundManager.playBugleCall();
    }
  };

  // Hydration refill action
  const handleRefillWater = async () => {
    soundManager.playWaterGulp();
    setWaterLevel(100);
    try {
      await api.consumeWater(1);
    } catch {
      // borehole free refill fallback
    }
  };

  // Parade drill score callback
  const handleDrillPointsAwarded = (
    pointsEarned: number,
    completedDailyTask?: DailyDutyType | null
  ) => {
    if (session) {
      setSession({
        ...session,
        wallet: {
          ...session.wallet,
          corperPoints: session.wallet.corperPoints + pointsEarned
        }
      });
    }
    if (completedDailyTask) {
      if (dailyAlertBanner?.taskType === completedDailyTask) {
        setDailyAlertBanner(null);
      }
      api
        .getDailyTasks(timeOfDay)
        .then((sum) => setDailyTasksSummary(sum))
        .catch(() => {});
    }
  };

  // Canteen rush score callback
  const handleCanteenRushFinished = (pointsEarned: number) => {
    if (session) {
      setSession({
        ...session,
        wallet: {
          ...session.wallet,
          corperPoints: session.wallet.corperPoints + pointsEarned
        }
      });
    }
  };

  // Mami market balance updated
  const handleMarketBalanceUpdated = (points: number, naira: string, newWater: number) => {
    setWaterLevel(newWater);
    if (session) {
      setSession({
        ...session,
        wallet: {
          corperPoints: points,
          virtualNaira: naira
        }
      });
    }
  };

  // Attention Salute & Wave triggers
  const handleSalute = () => {
    if (campEngineRef.current) {
      campEngineRef.current.triggerSalute();
    }
  };

  const handleWave = () => {
    if (campEngineRef.current) {
      campEngineRef.current.triggerWave();
    }
  };

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-slate-950 font-sans text-slate-100">
      {/* 3D WebGL Canvas Layer */}
      <div ref={canvasContainerRef} className="absolute inset-0 w-full h-full" />

      {/* Camp HUD Overlay (Low-occlusion interactive UI & Minimap) */}
      {session && (
        <CampHUD
          session={session}
          waterLevel={waterLevel}
          activeZone={activeZone}
          soldierAlert={soldierAlert}
          playerPos={playerPos}
          activeWaypointId={activeWaypointId}
          onlinePlayersCount={onlinePlayersCount}
          notifications={notifications}
          dailyTasksSummary={dailyTasksSummary}
          dailyAlertBanner={dailyAlertBanner}
          timeOfDay={timeOfDay}
          onCycleTimeOfDay={handleCycleTimeOfDay}
          weather={weather}
          onCycleWeather={handleCycleWeather}
          performanceTier={performanceTier}
          onCyclePerformanceTier={handleCyclePerformanceTier}
          onClearNotifications={() => setNotifications([])}
          onSelectWaypoint={handleSelectWaypoint}
          onFastTravel={handleFastTravel}
          onOpenCharacterStudio={() => setShowCharacterStudio(true)}
          onOpenLeaderboard={() => setShowLeaderboard(true)}
          onOpenAdminPortal={() => setShowAdminPortal(true)}
          onOpenSocialHub={() => setShowSocialHub(true)}
          onOpenEvents={() => setShowEventsModal(true)}
          onOpenDailyTasks={() => setShowDailyTasks(true)}
          onStartDutyFromAlert={(taskType) => {
            setDailyAlertBanner(null);
            setActiveDutyMode(taskType);
            setShowParadeMinigame(true);
          }}
          onDismissDailyAlert={() => setDailyAlertBanner(null)}
          onTriggerZoneAction={handleTriggerZoneAction}
          onSalute={handleSalute}
          onWave={handleWave}
          onJump={() => {
            if (campEngineRef.current) {
              campEngineRef.current.triggerJump();
            }
          }}
          onRefillWater={handleRefillWater}
          onTouchMove={(vec, isSprinting) => {
            if (campEngineRef.current) {
              campEngineRef.current.setTouchInput(vec, isSprinting);
            }
          }}
        />
      )}

      {/* Scene 1: Authentication Modal */}
      {showAuthModal && <AuthModal onSuccess={handleAuthSuccess} />}

      {/* Scene 2: 3D Character Creation Studio */}
      {showCharacterStudio && (
        <CharacterStudio
          initialAppearance={session?.character}
          onSaved={handleCharacterSaved}
          onCancel={session?.character ? () => setShowCharacterStudio(false) : undefined}
        />
      )}

      {/* Scene 4: Parade Ground Rhythm QTE Drill Minigame */}
      {showParadeMinigame && (
        <ParadeMinigame
          dutyMode={activeDutyMode}
          onClose={() => {
            setShowParadeMinigame(false);
            setActiveDutyMode(null);
          }}
          onDrillComplete={handleDrillPointsAwarded}
        />
      )}

      {/* Scene 5: Canteen Rush Minigame */}
      {showCanteenRush && (
        <CanteenRushMinigame
          onClose={() => setShowCanteenRush(false)}
          onFinish={handleCanteenRushFinished}
        />
      )}

      {/* Scene 6: Mami Market Vendor Shopping & ATM */}
      {showMamiMarket && session && (
        <MamiMarketModal
          corperPoints={session.wallet.corperPoints}
          virtualNaira={session.wallet.virtualNaira}
          waterLevel={waterLevel}
          onClose={() => setShowMamiMarket(false)}
          onBalanceUpdated={handleMarketBalanceUpdated}
        />
      )}

      {/* 10-Platoon Championship Leaderboard */}
      {showLeaderboard && session && (
        <LeaderboardModal
          playerPlatoon={session.user.platoonNumber}
          onClose={() => setShowLeaderboard(false)}
        />
      )}

      {/* Social Hub & Charisma Interaction Center */}
      {showSocialHub && session && (
        <SocialInteractionModal
          currentUserId={session.user.id}
          onClose={() => setShowSocialHub(false)}
          onCharismaGained={(newScore) => {
            // Charisma updated
          }}
        />
      )}

      {/* Admin / Superadmin Command Portal */}
      {showAdminPortal && session && (
        <AdminDashboard
          session={session}
          onClose={() => setShowAdminPortal(false)}
        />
      )}

      {/* Camp Schedule & Events Modal */}
      {showEventsModal && session && (
        <CampEventsModal
          onClose={() => setShowEventsModal(false)}
          onEventJoined={(rewardCp, rewardNaira) => {
            setSession((prev) =>
              prev
                ? {
                    ...prev,
                    wallet: {
                      corperPoints: prev.wallet.corperPoints + rewardCp,
                      virtualNaira: (
                        parseFloat(prev.wallet.virtualNaira) + rewardNaira
                      ).toFixed(2),
                    },
                  }
                : prev
            );
          }}
        />
      )}
      {/* Daily Morning Drill & Evening Parade Duties Modal */}
      {showDailyTasks && session && (
        <DailyTasksModal
          timeOfDay={timeOfDay}
          onClose={() => setShowDailyTasks(false)}
          onStartDutyDrill={(dutyType) => {
            setShowDailyTasks(false);
            setActiveDutyMode(dutyType);
            setShowParadeMinigame(true);
          }}
          onNavigateToParadeGround={() => {
            setShowDailyTasks(false);
            handleSelectWaypoint('parade_ground');
          }}
          onSummaryUpdated={(summary) => setDailyTasksSummary(summary)}
        />
      )}
    </div>
  );
}
