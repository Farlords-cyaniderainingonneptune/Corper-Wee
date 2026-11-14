import React, { useState } from 'react';
import { CAMP_LOCATION_REGISTRY, CampLocationZone, CampLocationManager } from '../game/CampLocationSystem';
import { Map, Navigation, Compass, MapPin, FastForward, X, ChevronRight, LocateFixed } from 'lucide-react';

interface InteractiveMinimapProps {
  playerPos: { x: number; z: number; rotationY: number };
  activeWaypointId: string | null;
  onSelectWaypoint: (zoneId: string | null) => void;
  onFastTravel: (x: number, z: number) => void;
}

export const InteractiveMinimap: React.FC<InteractiveMinimapProps> = ({
  playerPos,
  activeWaypointId,
  onSelectWaypoint,
  onFastTravel
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [selectedZone, setSelectedZone] = useState<CampLocationZone | null>(null);

  // Map coordinate conversion: world is [-120, 120] in X and [-120, 120] in Z
  const worldToMapPct = (x: number, z: number) => {
    const left = ((x + 120) / 240) * 100;
    const top = ((z + 120) / 240) * 100;
    return { left: `${Math.max(5, Math.min(95, left))}%`, top: `${Math.max(5, Math.min(95, top))}%` };
  };

  const activeWaypointInfo = activeWaypointId
    ? CampLocationManager.getNavigationInfo(playerPos.x, playerPos.z, activeWaypointId)
    : null;

  return (
    <>
      {/* 1. Compact HUD Radar (Bottom-Right or Top-Right) */}
      <div className="pointer-events-auto flex flex-col items-end gap-1.5">
        {/* Active Waypoint Compass Tracker Pill */}
        {activeWaypointInfo && activeWaypointInfo.zone && (
          <div className="flex items-center gap-1.5 rounded-xl bg-slate-900/90 border border-amber-500/40 px-2.5 py-1 text-[11px] sm:text-xs text-amber-300 shadow-xl backdrop-blur-md max-w-[165px] sm:max-w-[270px]">
            <Compass className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <span className="font-semibold truncate">{activeWaypointInfo.zone.name}</span>
            <span className="font-mono text-white text-[10px] sm:text-[11px] shrink-0">
              {activeWaypointInfo.distance}m {activeWaypointInfo.compassBearing}
            </span>
            <button
              onClick={() => onSelectWaypoint(null)}
              className="ml-1 text-slate-400 hover:text-white"
              title="Clear waypoint"
            >
              <X className="h-3 w-3" />
            </button>
          </div>
        )}

        {/* Circular Radar Button */}
        <button
          onClick={() => setIsExpanded(true)}
          className="relative h-20 w-20 sm:h-24 sm:w-24 rounded-full border-2 border-emerald-500/50 bg-slate-950/85 p-1 shadow-2xl backdrop-blur-md overflow-hidden hover:scale-105 active:scale-95 transition-all group"
          title="Click to open Full Camp Map"
        >
          {/* Radar Grid Circles */}
          <div className="absolute inset-2 rounded-full border border-emerald-500/20" />
          <div className="absolute inset-5 rounded-full border border-emerald-500/10" />

          {/* Compass Axis */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-full w-[1px] bg-emerald-500/15" />
            <div className="h-[1px] w-full bg-emerald-500/15 absolute" />
          </div>

          {/* North Label */}
          <span className="absolute top-1 left-1/2 -translate-x-1/2 text-[9px] font-black text-emerald-400">
            N
          </span>

          {/* Mini Location Dots */}
          {CAMP_LOCATION_REGISTRY.map((z) => {
            const pos = worldToMapPct(z.x, z.z);
            return (
              <div
                key={z.id}
                className="absolute h-1.5 w-1.5 rounded-full -translate-x-1/2 -translate-y-1/2"
                style={{
                  left: pos.left,
                  top: pos.top,
                  backgroundColor: z.colorHex
                }}
              />
            );
          })}

          {/* Player Marker Arrow */}
          {(() => {
            const pPos = worldToMapPct(playerPos.x, playerPos.z);
            return (
              <div
                className="absolute h-3 w-3 -translate-x-1/2 -translate-y-1/2 flex items-center justify-center"
                style={{
                  left: pPos.left,
                  top: pPos.top,
                  transform: `translate(-50%, -50%) rotate(${playerPos.rotationY}rad)`
                }}
              >
                <div className="h-0 w-0 border-x-4 border-x-transparent border-b-[9px] border-b-cyan-400 drop-shadow-[0_0_4px_#38bdf8]" />
              </div>
            );
          })()}

          {/* Hover overlay hint */}
          <div className="absolute inset-0 bg-emerald-950/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
            <Map className="h-5 w-5 text-emerald-300" />
          </div>
        </button>
      </div>

      {/* 2. Expandable Full-Screen Camp Map Modal */}
      {isExpanded && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4">
          <div className="relative flex flex-col md:flex-row w-full max-w-4xl max-h-[90vh] rounded-2xl border border-emerald-500/40 bg-slate-900 shadow-2xl text-slate-100 overflow-hidden">
            {/* Left: 2D Camp Tactical Map */}
            <div className="relative flex-1 bg-slate-950 p-4 flex flex-col items-center justify-center min-h-[340px] md:min-h-[500px]">
              <div className="absolute top-4 left-4 z-10 flex items-center gap-2 rounded-lg bg-slate-900/90 border border-slate-700/80 px-3 py-1.5 text-xs">
                <Compass className="h-4 w-4 text-emerald-400" />
                <span className="font-bold text-white">ISEYIN ORIENTATION CAMP &bull; TACTICAL MAP</span>
              </div>

              {/* Map Canvas Frame */}
              <div className="relative w-full h-full max-w-[500px] max-h-[500px] rounded-2xl border-2 border-emerald-500/30 bg-gradient-to-b from-amber-950/30 via-slate-900 to-amber-950/20 overflow-hidden shadow-inner">
                {/* Roads and parade markings */}
                <div className="absolute left-1/2 top-1/4 -translate-x-1/2 w-4 h-1/2 bg-slate-700/50 rounded" />
                <div className="absolute left-1/2 top-[18%] -translate-x-1/2 w-32 h-20 border-2 border-dashed border-amber-500/40 rounded-lg flex items-center justify-center text-[10px] font-bold text-amber-500/60 uppercase">
                  Parade Square
                </div>

                {/* Location Zone Interactive Pins */}
                {CAMP_LOCATION_REGISTRY.map((zone) => {
                  const pos = worldToMapPct(zone.x, zone.z);
                  const isSelected = selectedZone?.id === zone.id;
                  const isWaypoint = activeWaypointId === zone.id;

                  return (
                    <button
                      key={zone.id}
                      onClick={() => setSelectedZone(zone)}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 flex items-center gap-1.5 p-1 rounded-lg transition-transform hover:scale-125 z-20 ${
                        isSelected ? 'scale-125 ring-2 ring-white shadow-lg' : ''
                      }`}
                      style={{ left: pos.left, top: pos.top }}
                    >
                      <span
                        className="flex h-5 w-5 items-center justify-center rounded-full text-[9px] font-black text-slate-950 shadow-md"
                        style={{ backgroundColor: zone.colorHex }}
                      >
                        {zone.badge[0]}
                      </span>
                      <span className="hidden sm:inline text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-900/90 text-white border border-slate-700 shadow whitespace-nowrap">
                        {zone.name.split(' ')[0]}
                      </span>
                      {isWaypoint && (
                        <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping absolute -top-1 -right-1" />
                      )}
                    </button>
                  );
                })}

                {/* Player Current Location Dot & Radar Pulse */}
                {(() => {
                  const pPos = worldToMapPct(playerPos.x, playerPos.z);
                  return (
                    <div
                      className="absolute -translate-x-1/2 -translate-y-1/2 z-30"
                      style={{ left: pPos.left, top: pPos.top }}
                    >
                      <div className="relative flex items-center justify-center">
                        <div className="h-4 w-4 rounded-full bg-cyan-400 shadow-[0_0_12px_#38bdf8] flex items-center justify-center">
                          <LocateFixed className="h-3 w-3 text-slate-950" />
                        </div>
                        <div className="absolute h-8 w-8 rounded-full border border-cyan-400/60 animate-ping" />
                      </div>
                    </div>
                  );
                })()}

                {/* North Compass Cardinal Marker */}
                <div className="absolute top-2 right-2 flex flex-col items-center bg-slate-900/80 px-2 py-1 rounded border border-slate-700 text-[10px]">
                  <span className="font-bold text-emerald-400">N</span>
                  <div className="h-4 w-[1px] bg-emerald-500/50" />
                </div>
              </div>
            </div>

            {/* Right: Zone Inspector & Quick Navigation Actions */}
            <div className="w-full md:w-80 flex flex-col justify-between border-t md:border-t-0 md:border-l border-slate-800 bg-slate-900 p-5 overflow-y-auto">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <Navigation className="h-5 w-5 text-emerald-400" />
                    <h3 className="font-bold text-sm text-white">Location Guide</h3>
                  </div>
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="rounded-lg p-1 text-slate-400 hover:text-white hover:bg-slate-800"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {selectedZone ? (
                  <div className="space-y-4">
                    <div className="rounded-xl border border-slate-800 bg-slate-800/40 p-4">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold text-slate-950"
                          style={{ backgroundColor: selectedZone.colorHex }}
                        >
                          {selectedZone.badge[0]}
                        </span>
                        <div>
                          <h4 className="font-bold text-sm text-white leading-tight">{selectedZone.name}</h4>
                          <span className="text-[10px] text-emerald-400 font-semibold">{selectedZone.category}</span>
                        </div>
                      </div>
                      <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">{selectedZone.description}</p>
                    </div>

                    {/* Nav Calculation */}
                    {(() => {
                      const nav = CampLocationManager.getNavigationInfo(playerPos.x, playerPos.z, selectedZone.id);
                      return (
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-lg bg-slate-800/60 p-2.5 border border-slate-700/60">
                            <span className="text-[10px] text-slate-400 uppercase">Distance</span>
                            <div className="font-mono font-bold text-amber-300 text-sm mt-0.5">{nav.distance} meters</div>
                          </div>
                          <div className="rounded-lg bg-slate-800/60 p-2.5 border border-slate-700/60">
                            <span className="text-[10px] text-slate-400 uppercase">Heading</span>
                            <div className="font-mono font-bold text-emerald-300 text-sm mt-0.5">
                              {nav.compassBearing} ({nav.angleDegrees}&deg;)
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Action Buttons */}
                    <div className="space-y-2 pt-2">
                      <button
                        onClick={() => {
                          onSelectWaypoint(selectedZone.id);
                          setIsExpanded(false);
                        }}
                        className={`w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all ${
                          activeWaypointId === selectedZone.id
                            ? 'bg-amber-600 text-white'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/40'
                        }`}
                      >
                        <MapPin className="h-4 w-4" />
                        <span>{activeWaypointId === selectedZone.id ? 'Waypoint Active' : 'Set Waypoint Beacon'}</span>
                      </button>

                      <button
                        onClick={() => {
                          onFastTravel(selectedZone.x, selectedZone.z);
                          setIsExpanded(false);
                        }}
                        className="w-full py-2.5 rounded-xl border border-slate-700 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-colors"
                      >
                        <FastForward className="h-4 w-4 text-cyan-400" />
                        <span>Fast Travel Here</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-slate-400 space-y-2">
                    <p>Select any location marker on the tactical map to inspect its distance, set a waypoint beacon, or fast travel.</p>
                  </div>
                )}
              </div>

              {/* Quick Directory */}
              <div className="mt-4 border-t border-slate-800 pt-3">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
                  All Camp Locations
                </span>
                <div className="space-y-1 max-h-36 overflow-y-auto text-xs">
                  {CAMP_LOCATION_REGISTRY.map((z) => (
                    <button
                      key={z.id}
                      onClick={() => setSelectedZone(z)}
                      className={`w-full flex items-center justify-between p-2 rounded-lg text-left transition-colors ${
                        selectedZone?.id === z.id ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800/40'
                      }`}
                    >
                      <span className="truncate">{z.name}</span>
                      <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-50" />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
