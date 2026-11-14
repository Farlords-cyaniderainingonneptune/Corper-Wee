/**
 * Procedural Web Audio API sound synthesizer & spatial ambient soundscape manager for Corper Wee.
 * Generates UI/gameplay SFX and multi-layered camp ambient audio (distant camp chatter,
 * morning bugle echoes, crickets at night, borehole water flow, market buzz, and parade cadence)
 * dynamically crossfaded by active camp zone and time of day.
 */

import type { CampWeatherState } from '../game/WeatherSystem';

export type CampTimeOfDay = 'MORNING' | 'DAY' | 'NIGHT';

export interface AmbientLayerWeights {
  wind: number;
  chatter: number;
  bugle: number;
  crickets: number;
  birds: number;
  water: number;
  marketBuzz: number;
  indoorHum: number;
  paradeCadence: number;
  rain: number;
}

export interface AmbientSoundscapeState {
  activeZoneId: string | null;
  timeOfDay: CampTimeOfDay;
  weather: CampWeatherState;
  isMuted: boolean;
  isDucked: boolean;
  isRunning: boolean;
  weights: AmbientLayerWeights;
  activeLabels: string[];
}

const ZERO_WEIGHTS: AmbientLayerWeights = {
  wind: 0,
  chatter: 0,
  bugle: 0,
  crickets: 0,
  birds: 0,
  water: 0,
  marketBuzz: 0,
  indoorHum: 0,
  paradeCadence: 0,
  rain: 0,
};

/**
 * Computes normalized ambient layer weights [0..1] for a given Iseyin camp zone, time of day, and weather.
 */
export function computeAmbientProfile(
  zoneId: string | null,
  timeOfDay: CampTimeOfDay,
  weather: CampWeatherState = 'SUNNY'
): AmbientLayerWeights {
  const w: AmbientLayerWeights = { ...ZERO_WEIGHTS };

  switch (zoneId) {
    case 'parade_ground':
      if (timeOfDay === 'MORNING') {
        w.wind = 0.45;
        w.bugle = 1.0;
        w.paradeCadence = 0.6;
        w.chatter = 0.25;
        w.birds = 0.25;
      } else if (timeOfDay === 'DAY') {
        w.wind = 0.4;
        w.paradeCadence = 0.75;
        w.bugle = 0.45;
        w.chatter = 0.3;
      } else {
        w.wind = 0.42;
        w.crickets = 0.85;
        w.bugle = 0.15;
      }
      break;

    case 'mami_market':
      if (timeOfDay === 'MORNING') {
        w.chatter = 0.75;
        w.marketBuzz = 0.6;
        w.wind = 0.2;
        w.bugle = 0.35;
        w.birds = 0.2;
      } else if (timeOfDay === 'DAY') {
        w.chatter = 1.0;
        w.marketBuzz = 0.9;
        w.wind = 0.15;
      } else {
        w.chatter = 0.8;
        w.marketBuzz = 0.65;
        w.crickets = 0.55;
        w.wind = 0.15;
      }
      break;

    case 'camp_canteen':
      if (timeOfDay === 'MORNING') {
        w.chatter = 0.85;
        w.marketBuzz = 0.7;
        w.bugle = 0.3;
        w.indoorHum = 0.2;
      } else if (timeOfDay === 'DAY') {
        w.chatter = 0.92;
        w.marketBuzz = 0.75;
        w.indoorHum = 0.25;
      } else {
        w.indoorHum = 0.35;
        w.crickets = 0.75;
        w.chatter = 0.15;
        w.wind = 0.2;
      }
      break;

    case 'water_borehole':
      if (timeOfDay === 'MORNING') {
        w.water = 0.95;
        w.indoorHum = 0.45;
        w.chatter = 0.35;
        w.bugle = 0.3;
        w.birds = 0.35;
      } else if (timeOfDay === 'DAY') {
        w.water = 1.0;
        w.indoorHum = 0.45;
        w.chatter = 0.45;
        w.wind = 0.2;
      } else {
        w.water = 0.65;
        w.indoorHum = 0.38;
        w.crickets = 0.82;
        w.wind = 0.2;
      }
      break;

    case 'male_hostel':
    case 'female_hostel':
      if (timeOfDay === 'MORNING') {
        w.bugle = 0.8;
        w.chatter = 0.55;
        w.indoorHum = 0.25;
        w.birds = 0.35;
      } else if (timeOfDay === 'DAY') {
        w.chatter = 0.55;
        w.indoorHum = 0.4;
        w.wind = 0.25;
      } else {
        w.crickets = 0.95;
        w.chatter = 0.32;
        w.indoorHum = 0.4;
        w.wind = 0.2;
      }
      break;

    case 'lecture_pavilion':
      if (timeOfDay === 'MORNING') {
        w.chatter = 0.72;
        w.bugle = 0.5;
        w.wind = 0.25;
        w.birds = 0.25;
      } else if (timeOfDay === 'DAY') {
        w.chatter = 0.82;
        w.indoorHum = 0.2;
        w.wind = 0.2;
      } else {
        w.crickets = 0.85;
        w.wind = 0.32;
      }
      break;

    case 'admin_hq':
      if (timeOfDay === 'MORNING') {
        w.indoorHum = 0.6;
        w.bugle = 0.48;
        w.chatter = 0.22;
        w.birds = 0.2;
      } else if (timeOfDay === 'DAY') {
        w.indoorHum = 0.7;
        w.chatter = 0.28;
        w.wind = 0.15;
      } else {
        w.indoorHum = 0.5;
        w.crickets = 0.65;
        w.wind = 0.15;
      }
      break;

    case 'main_entrance':
      if (timeOfDay === 'MORNING') {
        w.wind = 0.48;
        w.bugle = 0.68;
        w.chatter = 0.35;
        w.birds = 0.4;
      } else if (timeOfDay === 'DAY') {
        w.wind = 0.45;
        w.chatter = 0.45;
      } else {
        w.wind = 0.38;
        w.crickets = 0.95;
        w.chatter = 0.1;
      }
      break;

    default:
      // Open camp grounds / walkways between buildings
      if (timeOfDay === 'MORNING') {
        w.wind = 0.45;
        w.bugle = 0.82;
        w.chatter = 0.26;
        w.birds = 0.45;
      } else if (timeOfDay === 'DAY') {
        w.wind = 0.42;
        w.chatter = 0.32;
        w.paradeCadence = 0.22;
      } else {
        w.wind = 0.36;
        w.crickets = 0.92;
        w.chatter = 0.1;
      }
      break;
  }

  if (weather === 'CLOUDY') {
    w.wind = Math.min(1, +(w.wind + 0.14).toFixed(2));
    w.birds = +(w.birds * 0.8).toFixed(2);
  } else if (weather === 'LIGHT_RAIN') {
    w.rain = 0.72;
    w.wind = Math.min(1, +(w.wind + 0.12).toFixed(2));
    w.birds = +(w.birds * 0.45).toFixed(2);
    w.crickets = +(w.crickets * 0.65).toFixed(2);
    w.chatter = +(w.chatter * 0.8).toFixed(2);
  }

  return w;
}

export function describeActiveLayers(weights: AmbientLayerWeights): string[] {
  const labels: string[] = [];
  if (weights.rain >= 0.3) labels.push('Light Rain Drizzle');
  if (weights.bugle >= 0.3) labels.push('Morning Bugle');
  if (weights.crickets >= 0.35) labels.push('Night Crickets');
  if (weights.chatter >= 0.25) labels.push('Camp Chatter');
  if (weights.water >= 0.35) labels.push('Borehole Flow');
  if (weights.marketBuzz >= 0.35) labels.push('Market & Mess Buzz');
  if (weights.paradeCadence >= 0.35) labels.push('Parade Cadence');
  if (weights.birds >= 0.25) labels.push('Dawn Birds');
  if (weights.indoorHum >= 0.35) labels.push('Camp Hum');
  if (weights.wind >= 0.3) labels.push('Camp Breeze');
  return labels;
}

class AudioSynthesizer {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // Ambient Soundscape State
  private ambientDesired: boolean = false;
  private ambientInitialized: boolean = false;
  private activeZoneId: string | null = null;
  private timeOfDay: CampTimeOfDay = 'MORNING';
  private weather: CampWeatherState = 'SUNNY';
  private isDucked: boolean = false;
  private weights: AmbientLayerWeights = computeAmbientProfile(null, 'MORNING', 'SUNNY');

  // Continuous Ambient Audio Graph Nodes
  private ambientMasterGain: GainNode | null = null;
  private windGain: GainNode | null = null;
  private waterGain: GainNode | null = null;
  private marketGain: GainNode | null = null;
  private humGain: GainNode | null = null;
  private rainGain: GainNode | null = null;
  private ambientNodes: AudioNode[] = [];

  // Periodic Scheduler Timers
  private schedulerIntervalId: number | null = null;
  private lastBuglePlayedAt: number = 0;
  private nextBugleDelayMs: number = 14_000;
  private lastCadencePlayedAt: number = 0;
  private unlockBound: boolean = false;

  constructor() {
    this.bindUserGestureUnlock();
  }

  private bindUserGestureUnlock() {
    if (this.unlockBound || typeof window === 'undefined') return;
    this.unlockBound = true;

    const handleGesture = () => {
      if (this.ctx && this.ctx.state === 'suspended') {
        this.ctx.resume().then(() => {
          if (this.ambientDesired && !this.ambientInitialized) {
            this.ensureAmbientGraph();
          }
          this.applyAmbientGains();
        }).catch(() => {});
      } else if (this.ambientDesired && !this.ambientInitialized) {
        this.ensureAmbientGraph();
        this.applyAmbientGains();
      }
    };

    window.addEventListener('pointerdown', handleGesture, { passive: true });
    window.addEventListener('keydown', handleGesture, { passive: true });
    window.addEventListener('touchstart', handleGesture, { passive: true });
  }

  private getContext(): AudioContext {
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    this.applyAmbientGains();
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  /**
   * Starts or resumes the zone-aware ambient soundscape.
   */
  public startAmbient() {
    if (typeof window === 'undefined') return;
    this.ambientDesired = true;
    try {
      this.ensureAmbientGraph();
      this.applyAmbientGains();
      this.startScheduler();
    } catch {
      // Will finish initializing on first user gesture
    }
  }

  /**
   * Stops and tears down continuous ambient layers (e.g. on logout or unmount).
   */
  public stopAmbient() {
    this.ambientDesired = false;
    if (this.schedulerIntervalId !== null && typeof window !== 'undefined') {
      window.clearInterval(this.schedulerIntervalId);
      this.schedulerIntervalId = null;
    }

    for (const node of this.ambientNodes) {
      try {
        if ('stop' in node && typeof (node as AudioScheduledSourceNode).stop === 'function') {
          (node as AudioScheduledSourceNode).stop();
        }
        node.disconnect();
      } catch {
        // Ignore already-stopped nodes
      }
    }

    this.ambientNodes = [];
    this.ambientMasterGain = null;
    this.windGain = null;
    this.waterGain = null;
    this.marketGain = null;
    this.humGain = null;
    this.rainGain = null;
    this.ambientInitialized = false;
  }

  /**
   * Updates the active camp zone and smoothly crossfades ambient sound layers.
   */
  public setActiveZone(zoneId: string | null) {
    if (this.activeZoneId === zoneId) return;
    const prevBugle = this.weights.bugle;
    this.activeZoneId = zoneId;
    this.weights = computeAmbientProfile(this.activeZoneId, this.timeOfDay, this.weather);
    this.applyAmbientGains();

    // If stepping into a bugle-prominent zone like Parade Ground after a cooldown, gently cue a distant bugle
    if (
      this.ambientDesired &&
      !this.isMuted &&
      this.weights.bugle >= 0.7 &&
      prevBugle < 0.7 &&
      Date.now() - this.lastBuglePlayedAt > 12_000
    ) {
      this.lastBuglePlayedAt = Date.now();
      this.playDistantBugle(this.weights.bugle);
    }
  }

  /**
   * Updates camp time of day (MORNING / DAY / NIGHT), shifting between morning bugles,
   * daytime camp bustle, and nighttime crickets.
   */
  public setTimeOfDay(timeOfDay: CampTimeOfDay) {
    if (this.timeOfDay === timeOfDay) return;
    this.timeOfDay = timeOfDay;
    this.weights = computeAmbientProfile(this.activeZoneId, this.timeOfDay, this.weather);
    this.applyAmbientGains();

    if (
      this.ambientDesired &&
      !this.isMuted &&
      timeOfDay === 'MORNING' &&
      this.weights.bugle >= 0.45 &&
      Date.now() - this.lastBuglePlayedAt > 6_000
    ) {
      this.lastBuglePlayedAt = Date.now();
      this.playDistantBugle(this.weights.bugle);
    }
  }

  public getTimeOfDay(): CampTimeOfDay {
    return this.timeOfDay;
  }

  /**
   * Updates camp weather (SUNNY / CLOUDY / LIGHT_RAIN), blending light rainfall hiss & drizzle.
   */
  public setWeather(weather: CampWeatherState) {
    if (this.weather === weather) return;
    this.weather = weather;
    this.weights = computeAmbientProfile(this.activeZoneId, this.timeOfDay, this.weather);
    this.applyAmbientGains();
  }

  public getWeather(): CampWeatherState {
    return this.weather;
  }

  /**
   * Ducks ambient volume softly while interactive minigame modals are open.
   */
  public setAmbientDucked(ducked: boolean) {
    if (this.isDucked === ducked) return;
    this.isDucked = ducked;
    this.applyAmbientGains();
  }

  public getAmbientState(): AmbientSoundscapeState {
    return {
      activeZoneId: this.activeZoneId,
      timeOfDay: this.timeOfDay,
      weather: this.weather,
      isMuted: this.isMuted,
      isDucked: this.isDucked,
      isRunning: this.ambientDesired && this.ambientInitialized && !this.isMuted,
      weights: { ...this.weights },
      activeLabels: describeActiveLayers(this.weights),
    };
  }

  private createPinkNoiseBuffer(ctx: AudioContext, durationSeconds: number): AudioBuffer {
    const length = Math.floor(ctx.sampleRate * durationSeconds);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const output = buffer.getChannelData(0);

    let b0 = 0;
    let b1 = 0;
    let b2 = 0;
    let b3 = 0;
    let b4 = 0;
    let b5 = 0;
    let b6 = 0;

    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }

    // Crossfade start & end 0.15s for seamless looping
    const fadeSamples = Math.min(Math.floor(ctx.sampleRate * 0.15), Math.floor(length / 4));
    for (let i = 0; i < fadeSamples; i++) {
      const fade = i / fadeSamples;
      output[i] = output[i] * fade + output[length - fadeSamples + i] * (1 - fade);
    }

    return buffer;
  }

  private ensureAmbientGraph() {
    if (this.ambientInitialized || typeof window === 'undefined') return;

    const ctx = this.getContext();
    const now = ctx.currentTime;

    const master = ctx.createGain();
    master.gain.setValueAtTime(0, now);
    master.connect(ctx.destination);
    this.ambientMasterGain = master;

    const pinkBuffer = this.createPinkNoiseBuffer(ctx, 3.5);

    // 1. Tropical Camp Wind Bed
    const windSrc = ctx.createBufferSource();
    windSrc.buffer = pinkBuffer;
    windSrc.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'lowpass';
    windFilter.frequency.setValueAtTime(340, now);
    windFilter.Q.setValueAtTime(0.7, now);

    const windLfo = ctx.createOscillator();
    const windLfoGain = ctx.createGain();
    windLfo.frequency.setValueAtTime(0.12, now);
    windLfoGain.gain.setValueAtTime(110, now);
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0, now);

    windSrc.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(master);

    windSrc.start(now);
    windLfo.start(now);
    this.windGain = windGain;
    this.ambientNodes.push(windSrc, windFilter, windLfo, windLfoGain, windGain);

    // 2. Borehole Water Flow Bed
    const waterSrc = ctx.createBufferSource();
    waterSrc.buffer = pinkBuffer;
    waterSrc.loop = true;
    waterSrc.playbackRate.setValueAtTime(1.25, now);

    const waterFilter = ctx.createBiquadFilter();
    waterFilter.type = 'bandpass';
    waterFilter.frequency.setValueAtTime(1150, now);
    waterFilter.Q.setValueAtTime(1.3, now);

    const waterLfo = ctx.createOscillator();
    const waterLfoGain = ctx.createGain();
    waterLfo.frequency.setValueAtTime(0.38, now);
    waterLfoGain.gain.setValueAtTime(220, now);
    waterLfo.connect(waterLfoGain);
    waterLfoGain.connect(waterFilter.frequency);

    const waterGain = ctx.createGain();
    waterGain.gain.setValueAtTime(0, now);

    waterSrc.connect(waterFilter);
    waterFilter.connect(waterGain);
    waterGain.connect(master);

    waterSrc.start(now);
    waterLfo.start(now);
    this.waterGain = waterGain;
    this.ambientNodes.push(waterSrc, waterFilter, waterLfo, waterLfoGain, waterGain);

    // 3. Mami Market / Mess Hall Crowd & Sizzle Bed
    const marketSrc = ctx.createBufferSource();
    marketSrc.buffer = pinkBuffer;
    marketSrc.loop = true;
    marketSrc.playbackRate.setValueAtTime(0.92, now);

    const marketFilter = ctx.createBiquadFilter();
    marketFilter.type = 'bandpass';
    marketFilter.frequency.setValueAtTime(760, now);
    marketFilter.Q.setValueAtTime(0.85, now);

    const marketGain = ctx.createGain();
    marketGain.gain.setValueAtTime(0, now);

    marketSrc.connect(marketFilter);
    marketFilter.connect(marketGain);
    marketGain.connect(master);

    marketSrc.start(now);
    this.marketGain = marketGain;
    this.ambientNodes.push(marketSrc, marketFilter, marketGain);

    // 4. Indoor AC / Ceiling Fan / Pump Hum Bed
    const humOsc1 = ctx.createOscillator();
    humOsc1.type = 'sine';
    humOsc1.frequency.setValueAtTime(92, now);

    const humOsc2 = ctx.createOscillator();
    humOsc2.type = 'triangle';
    humOsc2.frequency.setValueAtTime(184, now);

    const humOsc2Gain = ctx.createGain();
    humOsc2Gain.gain.setValueAtTime(0.25, now);

    const humFilter = ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.setValueAtTime(240, now);

    const humGain = ctx.createGain();
    humGain.gain.setValueAtTime(0, now);

    humOsc1.connect(humFilter);
    humOsc2.connect(humOsc2Gain);
    humOsc2Gain.connect(humFilter);
    humFilter.connect(humGain);
    humGain.connect(master);

    humOsc1.start(now);
    humOsc2.start(now);
    this.humGain = humGain;
    this.ambientNodes.push(humOsc1, humOsc2, humOsc2Gain, humFilter, humGain, master);

    // 5. Light Rain Drizzle Wash Bed
    const rainSrc = ctx.createBufferSource();
    rainSrc.buffer = pinkBuffer;
    rainSrc.loop = true;
    rainSrc.playbackRate.setValueAtTime(1.55, now);

    const rainHighpass = ctx.createBiquadFilter();
    rainHighpass.type = 'highpass';
    rainHighpass.frequency.setValueAtTime(900, now);

    const rainLowpass = ctx.createBiquadFilter();
    rainLowpass.type = 'lowpass';
    rainLowpass.frequency.setValueAtTime(4200, now);

    const rainGain = ctx.createGain();
    rainGain.gain.setValueAtTime(0, now);

    rainSrc.connect(rainHighpass);
    rainHighpass.connect(rainLowpass);
    rainLowpass.connect(rainGain);
    rainGain.connect(master);

    rainSrc.start(now);
    this.rainGain = rainGain;
    this.ambientNodes.push(rainSrc, rainHighpass, rainLowpass, rainGain);

    this.ambientInitialized = true;
  }

  private applyAmbientGains() {
    if (!this.ctx || !this.ambientInitialized || !this.ambientMasterGain) return;

    const now = this.ctx.currentTime;
    const masterTarget =
      this.isMuted || !this.ambientDesired ? 0 : this.isDucked ? 0.16 : 0.72;

    this.ambientMasterGain.gain.setTargetAtTime(masterTarget, now, 0.25);

    if (this.windGain) {
      this.windGain.gain.setTargetAtTime(this.weights.wind * 0.22, now, 0.45);
    }
    if (this.waterGain) {
      this.waterGain.gain.setTargetAtTime(this.weights.water * 0.14, now, 0.45);
    }
    if (this.marketGain) {
      this.marketGain.gain.setTargetAtTime(this.weights.marketBuzz * 0.085, now, 0.45);
    }
    if (this.humGain) {
      this.humGain.gain.setTargetAtTime(this.weights.indoorHum * 0.032, now, 0.45);
    }
    if (this.rainGain) {
      this.rainGain.gain.setTargetAtTime(this.weights.rain * 0.18, now, 0.55);
    }
  }

  private startScheduler() {
    if (this.schedulerIntervalId !== null || typeof window === 'undefined') return;

    this.schedulerIntervalId = window.setInterval(() => {
      if (!this.ambientDesired || this.isMuted) return;
      if (!this.ctx || this.ctx.state !== 'running' || !this.ambientMasterGain) return;

      const w = this.weights;
      const nowMs = Date.now();

      // 1. Distant camp chatter bursts
      if (w.chatter > 0.08 && Math.random() < w.chatter * 0.72) {
        this.playDistantChatterBurst(w.chatter);
      }

      // 2. Night crickets
      if (w.crickets > 0.1 && Math.random() < w.crickets * 0.78) {
        this.playNightCricketChirp(w.crickets);
      }

      // 3. Morning birds
      if (w.birds > 0.15 && Math.random() < w.birds * 0.42) {
        this.playDawnBirdChirp(w.birds);
      }

      // 4. Distant morning bugle echo
      if (w.bugle >= 0.25 && nowMs - this.lastBuglePlayedAt >= this.nextBugleDelayMs) {
        this.lastBuglePlayedAt = nowMs;
        this.nextBugleDelayMs = 15_000 + Math.random() * 10_000;
        this.playDistantBugle(w.bugle);
      }

      // 5. Distant parade cadence
      if (
        w.paradeCadence >= 0.2 &&
        nowMs - this.lastCadencePlayedAt >= 5_500 &&
        Math.random() < w.paradeCadence * 0.55
      ) {
        this.lastCadencePlayedAt = nowMs;
        this.playDistantParadeCadence(w.paradeCadence);
      }

      // 6. Borehole droplets
      if (w.water >= 0.4 && Math.random() < w.water * 0.45) {
        this.playWaterDroplet(w.water);
      }

      // 7. Mami market / mess tray clinks
      if (w.marketBuzz >= 0.4 && Math.random() < w.marketBuzz * 0.35) {
        this.playMarketClink(w.marketBuzz);
      }
    }, 850);
  }

  private createPanNode(ctx: AudioContext, panValue: number): AudioNode {
    if (typeof ctx.createStereoPanner === 'function') {
      const panner = ctx.createStereoPanner();
      panner.pan.setValueAtTime(Math.max(-0.9, Math.min(0.9, panValue)), ctx.currentTime);
      panner.connect(this.ambientMasterGain!);
      return panner;
    }
    return this.ambientMasterGain!;
  }

  /**
   * Distant multi-syllable formant-filtered camp chatter murmur
   */
  private playDistantChatterBurst(intensity: number) {
    if (!this.ctx || !this.ambientMasterGain) return;
    const ctx = this.ctx;
    const baseTime = ctx.currentTime + Math.random() * 0.2;
    const panOut = this.createPanNode(ctx, (Math.random() * 2 - 1) * 0.75);
    const syllables = 2 + Math.floor(Math.random() * 3);
    const basePitch = 125 + Math.random() * 115;

    let offset = 0;
    for (let i = 0; i < syllables; i++) {
      const dur = 0.09 + Math.random() * 0.11;
      const start = baseTime + offset;

      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      const pitchShift = basePitch * (0.92 + Math.random() * 0.18);
      osc.frequency.setValueAtTime(pitchShift, start);
      osc.frequency.linearRampToValueAtTime(pitchShift * (0.88 + Math.random() * 0.2), start + dur);

      // Vowel formant filter + distance lowpass
      const formant = ctx.createBiquadFilter();
      formant.type = 'bandpass';
      formant.frequency.setValueAtTime(550 + Math.random() * 650, start);
      formant.Q.setValueAtTime(2.6, start);

      const distanceLowpass = ctx.createBiquadFilter();
      distanceLowpass.type = 'lowpass';
      distanceLowpass.frequency.setValueAtTime(1250, start);

      const gain = ctx.createGain();
      const peak = 0.045 * intensity;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(peak, start + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

      osc.connect(formant);
      formant.connect(distanceLowpass);
      distanceLowpass.connect(gain);
      gain.connect(panOut);

      osc.start(start);
      osc.stop(start + dur + 0.02);

      offset += dur + 0.03 + Math.random() * 0.05;
    }
  }

  /**
   * Field crickets at night: crisp 3-4 pulse 4.1-4.6kHz chirps with stereo spread
   */
  private playNightCricketChirp(intensity: number) {
    if (!this.ctx || !this.ambientMasterGain) return;
    const ctx = this.ctx;
    const baseTime = ctx.currentTime + Math.random() * 0.25;
    const panOut = this.createPanNode(ctx, (Math.random() > 0.5 ? 1 : -1) * (0.25 + Math.random() * 0.6));
    const carrierFreq = 4080 + Math.random() * 580;

    const bursts = 2;
    const pulsesPerBurst = 3 + (Math.random() > 0.5 ? 1 : 0);

    for (let b = 0; b < bursts; b++) {
      const burstStart = baseTime + b * 0.28;
      for (let p = 0; p < pulsesPerBurst; p++) {
        const start = burstStart + p * 0.044;
        const dur = 0.028;

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(carrierFreq, start);

        const gain = ctx.createGain();
        const peak = 0.028 * intensity;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(peak, start + 0.004);
        gain.gain.setValueAtTime(peak, start + dur - 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + dur);

        osc.connect(gain);
        gain.connect(panOut);

        osc.start(start);
        osc.stop(start + dur + 0.01);
      }
    }
  }

  /**
   * Distant morning bugle echo across the parade ground
   */
  private playDistantBugle(intensity: number) {
    if (!this.ctx || !this.ambientMasterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime + 0.1;
    const panOut = this.createPanNode(ctx, (Math.random() * 2 - 1) * 0.45);

    const phrases = [
      [
        { freq: 392.0, dur: 0.2 },
        { freq: 523.25, dur: 0.2 },
        { freq: 659.25, dur: 0.22 },
        { freq: 783.99, dur: 0.55 },
      ],
      [
        { freq: 523.25, dur: 0.18 },
        { freq: 659.25, dur: 0.18 },
        { freq: 783.99, dur: 0.36 },
        { freq: 659.25, dur: 0.48 },
      ],
    ];

    const notes = phrases[Math.floor(Math.random() * phrases.length)];
    const echoes = [
      { delay: 0, gainScale: 1.0 },
      { delay: 0.26, gainScale: 0.34 },
      { delay: 0.54, gainScale: 0.14 },
    ];

    let cursor = 0;
    for (const note of notes) {
      for (const echo of echoes) {
        const start = now + cursor + echo.delay;
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(note.freq, start);

        // Air absorption filter for distant brass feel
        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1250, start);

        const gain = ctx.createGain();
        const peak = 0.045 * intensity * echo.gainScale;
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.linearRampToValueAtTime(peak, start + 0.045);
        gain.gain.setValueAtTime(peak * 0.85, start + note.dur - 0.05);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + note.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(panOut);

        osc.start(start);
        osc.stop(start + note.dur + 0.02);
      }
      cursor += note.dur + 0.05;
    }
  }

  /**
   * Gentle dawn bird calls for Morning in open camp / hostels
   */
  private playDawnBirdChirp(intensity: number) {
    if (!this.ctx || !this.ambientMasterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime + Math.random() * 0.2;
    const panOut = this.createPanNode(ctx, (Math.random() * 2 - 1) * 0.8);

    const chirps = 2 + Math.floor(Math.random() * 2);
    for (let i = 0; i < chirps; i++) {
      const start = now + i * 0.13;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const base = 2100 + Math.random() * 700;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(base, start);
      osc.frequency.exponentialRampToValueAtTime(base * 1.45, start + 0.065);

      const peak = 0.018 * intensity;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.linearRampToValueAtTime(peak, start + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.08);

      osc.connect(gain);
      gain.connect(panOut);
      osc.start(start);
      osc.stop(start + 0.09);
    }
  }

  /**
   * Muffled distant snare cadence from the Parade Ground
   */
  private playDistantParadeCadence(intensity: number) {
    if (!this.ctx || !this.ambientMasterGain) return;
    const ctx = this.ctx;
    const now = ctx.currentTime + 0.05;
    const panOut = this.createPanNode(ctx, (Math.random() * 2 - 1) * 0.4);

    [0, 0.28, 0.56, 0.84].forEach((offset, idx) => {
      const start = now + offset;
      const osc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      const gain = ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(idx === 0 ? 175 : 145, start);
      osc.frequency.exponentialRampToValueAtTime(58, start + 0.075);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(420, start);

      const peak = (idx === 0 ? 0.055 : 0.035) * intensity;
      gain.gain.setValueAtTime(peak, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(panOut);

      osc.start(start);
      osc.stop(start + 0.1);
    });
  }

  private playWaterDroplet(intensity: number) {
    if (!this.ctx || !this.ambientMasterGain) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + Math.random() * 0.3;
    const panOut = this.createPanNode(ctx, (Math.random() * 2 - 1) * 0.35);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const f0 = 620 + Math.random() * 450;

    osc.type = 'sine';
    osc.frequency.setValueAtTime(f0, start);
    osc.frequency.exponentialRampToValueAtTime(f0 * 1.9, start + 0.055);

    gain.gain.setValueAtTime(0.022 * intensity, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.065);

    osc.connect(gain);
    gain.connect(panOut);
    osc.start(start);
    osc.stop(start + 0.075);
  }

  private playMarketClink(intensity: number) {
    if (!this.ctx || !this.ambientMasterGain) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + Math.random() * 0.3;
    const panOut = this.createPanNode(ctx, (Math.random() * 2 - 1) * 0.65);

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1850 + Math.random() * 900, start);

    gain.gain.setValueAtTime(0.015 * intensity, start);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.045);

    osc.connect(gain);
    gain.connect(panOut);
    osc.start(start);
    osc.stop(start + 0.055);
  }

  /**
   * Snare drum parade cadence hit (marching beat)
   */
  public playDrumHit(isAccent: boolean = false) {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const bufferSize = ctx.sampleRate * 0.12;
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.03));
      }

      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const noiseFilter = ctx.createBiquadFilter();
      noiseFilter.type = 'highpass';
      noiseFilter.frequency.setValueAtTime(800, now);

      const noiseGain = ctx.createGain();
      noiseGain.gain.setValueAtTime(isAccent ? 0.45 : 0.25, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(ctx.destination);

      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(isAccent ? 220 : 180, now);
      osc.frequency.exponentialRampToValueAtTime(60, now + 0.08);

      oscGain.gain.setValueAtTime(isAccent ? 0.5 : 0.3, now);
      oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

      osc.connect(oscGain);
      oscGain.connect(ctx.destination);

      noise.start(now);
      osc.start(now);
      osc.stop(now + 0.12);
    } catch {
      // AudioContext policy fallback
    }
  }

  /**
   * NYSC Bugle Call: "Wake Up / Reveille" or Parade Alert (G4 - C5 - E5 - G5)
   */
  public playBugleCall() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const notes = [
        { freq: 392.0, dur: 0.18, pause: 0.02 },
        { freq: 523.25, dur: 0.18, pause: 0.02 },
        { freq: 659.25, dur: 0.18, pause: 0.02 },
        { freq: 783.99, dur: 0.45, pause: 0.1 },
        { freq: 659.25, dur: 0.18, pause: 0.02 },
        { freq: 783.99, dur: 0.6, pause: 0.05 },
      ];

      let t = now;
      notes.forEach((n) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(n.freq * 3.5, t);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(n.freq, t);

        gain.gain.setValueAtTime(0, t);
        gain.gain.linearRampToValueAtTime(0.25, t + 0.03);
        gain.gain.setValueAtTime(0.22, t + n.dur - 0.03);
        gain.gain.linearRampToValueAtTime(0.001, t + n.dur);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        osc.start(t);
        osc.stop(t + n.dur);
        t += n.dur + n.pause;
      });
    } catch {
      // AudioContext policy
    }
  }

  /**
   * Drill Sergeant Whistle (high-pitch modulation)
   */
  public playWhistle() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(2600, now);
      osc.frequency.linearRampToValueAtTime(2850, now + 0.15);
      osc.frequency.linearRampToValueAtTime(2500, now + 0.35);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.35, now + 0.03);
      gain.gain.setValueAtTime(0.35, now + 0.32);
      gain.gain.linearRampToValueAtTime(0.001, now + 0.38);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.38);
    } catch {
      // AudioContext policy
    }
  }

  /**
   * Corper marching footstep
   */
  public playFootstep() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(110, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.06);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {
      // AudioContext policy
    }
  }

  /**
   * Cash / Naira purchase register sound
   */
  public playCoinSound() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      [987.77, 1318.51].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.08;

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.25);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.25);
      });
    } catch {
      // AudioContext policy
    }
  }

  /**
   * Hydration gulp / water splash sound
   */
  public playWaterGulp() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(450, now);
      osc.frequency.exponentialRampToValueAtTime(750, now + 0.12);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.15);
    } catch {
      // AudioContext policy
    }
  }

  /**
   * Rhythm Drill Success Fanfare
   */
  public playDrillSuccess() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      [523.25, 659.25, 783.99, 1046.5].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = now + idx * 0.07;

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.2, start);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.3);
      });
    } catch {
      // AudioContext policy
    }
  }

  /**
   * Missed drill command or penalty buzz sound
   */
  public playPenaltyBuzz() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.linearRampToValueAtTime(80, now + 0.22);

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {
      // AudioContext policy
    }
  }

  /**
   * High-pitch command alert pip when sergeant shouts
   */
  public playCommandAlert() {
    if (this.isMuted) return;
    try {
      const ctx = this.getContext();
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);

      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.1);
    } catch {
      // AudioContext policy
    }
  }
}

export const soundManager = new AudioSynthesizer();
