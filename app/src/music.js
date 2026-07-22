// Kaiser authors the four exported stems; per-level intensity is mixed here at runtime.
const BASE = (import.meta.env?.BASE_URL ?? '/').replace(/\/$/, '');
const STEM_FILES = {
  base: `${BASE}/audio/music/matrix_maze_base.ogg`,
  pressure: `${BASE}/audio/music/matrix_maze_pressure.ogg`,
  chase: `${BASE}/audio/music/matrix_maze_chase.ogg`,
  dread: `${BASE}/audio/music/matrix_maze_dread.ogg`,
};
const LEVEL_COMPLETE_FILE = `${BASE}/audio/sfx/level_complete.ogg`;

const STEM_DEFAULTS = {
  base: 0.9,
  pressure: 0.0,
  chase: 0.0,
  dread: 0.0,
  accent: 0.0,
};

/** Per-level mix targets — keep listenable headroom as layers stack. */
const LEVEL_MIXES = [
  { base: 0.9, pressure: 0.0, chase: 0.0, dread: 0.0, accent: 0.0 },
  { base: 0.9, pressure: 0.24, chase: 0.0, dread: 0.0, accent: 0.0 },
  { base: 0.88, pressure: 0.36, chase: 0.0, dread: 0.1, accent: 0.0 },
  { base: 0.84, pressure: 0.34, chase: 0.22, dread: 0.14, accent: 0.0 },
  { base: 0.8, pressure: 0.42, chase: 0.4, dread: 0.22, accent: 0.0 },
  { base: 0.78, pressure: 0.48, chase: 0.52, dread: 0.3, accent: 0.14 },
  { base: 0.74, pressure: 0.52, chase: 0.6, dread: 0.38, accent: 0.22 },
  { base: 0.7, pressure: 0.55, chase: 0.68, dread: 0.46, accent: 0.3 },
];

export class AdaptiveMusic {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.started = false;
    this.unlocked = false;
    this.buffers = new Map();
    this.stems = new Map();
    this.fadeSeconds = 0.7;
    this.usingGeneratedFallback = false;
    this.currentLevel = 1;
    this.levelCompleteBuffer = null;
  }

  async unlock() {
    if (this.unlocked) return true;
    try {
      this.ctx = this.ctx || new AudioContext();
      await this.ctx.resume();
      this.masterGain = this.masterGain || this.ctx.createGain();
      this.masterGain.gain.value = 0.9;
      this.masterGain.connect(this.ctx.destination);
      this.unlocked = true;
      return true;
    } catch (error) {
      console.warn('Music unlock failed:', error);
      return false;
    }
  }

  async startIfNeeded() {
    if (this.started) return;
    if (!(await this.unlock())) return;

    const loaded = await this.loadAllBuffers();
    if (!loaded) return;

    for (const [name, buffer] of this.buffers.entries()) {
      const source = this.ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const gainNode = this.ctx.createGain();
      gainNode.gain.value = STEM_DEFAULTS[name] || 0.0;

      source.connect(gainNode);
      gainNode.connect(this.masterGain);

      source.start();
      this.stems.set(name, { source, gainNode });
    }

    this.started = true;
    this.setLevel(this.currentLevel);
    if (this.usingGeneratedFallback) {
      console.log('Adaptive music started (generated fallback)');
    } else {
      console.log('Adaptive music started (exported stems)');
    }
  }

  async loadAllBuffers() {
    const entries = Object.entries(STEM_FILES);
    this.usingGeneratedFallback = false;
    for (const [name, path] of entries) {
      try {
        const response = await fetch(path);
        if (!response.ok) {
          console.warn(`Music stem missing: ${path}; using generated fallback soundtrack.`);
          this.generateFallbackBuffers();
          this.usingGeneratedFallback = true;
          return true;
        }
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        this.buffers.set(name, audioBuffer);
      } catch (error) {
        console.warn(`Failed to load stem ${name}; using generated fallback soundtrack.`, error);
        this.generateFallbackBuffers();
        this.usingGeneratedFallback = true;
        return true;
      }
    }
    this.buffers.set('accent', this.buildAccentBuffer());
    return true;
  }

  generateFallbackBuffers() {
    this.buffers.clear();
    this.buffers.set('base', this.buildBaseBuffer());
    this.buffers.set('pressure', this.buildPressureBuffer());
    this.buffers.set('chase', this.buildChaseBuffer());
    this.buffers.set('dread', this.buildDreadBuffer());
    this.buffers.set('accent', this.buildAccentBuffer());
  }

  buildBaseBuffer() {
    const duration = 8;
    const sampleRate = this.ctx.sampleRate;
    const frameCount = Math.floor(duration * sampleRate);
    const buffer = this.ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    const bpm = 172;
    const beatSeconds = 60 / bpm;
    const pulseLength = 0.12;
    const noteA = 55;
    const noteB = 65.41;

    for (let i = 0; i < frameCount; i += 1) {
      const t = i / sampleRate;
      const beatPos = (t / beatSeconds) % 1;
      const barPos = (t / (beatSeconds * 8)) % 1;
      const note = barPos < 0.5 ? noteA : noteB;
      const env = beatPos < pulseLength / beatSeconds ? Math.exp(-20 * beatPos) : 0.0;
      const low = Math.sin(2 * Math.PI * note * t);
      const sub = Math.sin(2 * Math.PI * (note * 0.5) * t);
      data[i] = (low * 0.2 + sub * 0.1) * env;
    }
    return buffer;
  }

  buildPressureBuffer() {
    const duration = 8;
    const sampleRate = this.ctx.sampleRate;
    const frameCount = Math.floor(duration * sampleRate);
    const buffer = this.ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    const bpm = 172;
    const stepSeconds = (60 / bpm) / 2;
    const hitLen = 0.035;

    for (let i = 0; i < frameCount; i += 1) {
      const t = i / sampleRate;
      const stepPos = (t / stepSeconds) % 1;
      const env = stepPos < hitLen / stepSeconds ? Math.exp(-45 * stepPos) : 0.0;
      const noise = (Math.random() * 2 - 1) * 0.12;
      data[i] = noise * env;
    }
    return buffer;
  }

  buildChaseBuffer() {
    const duration = 8;
    const sampleRate = this.ctx.sampleRate;
    const frameCount = Math.floor(duration * sampleRate);
    const buffer = this.ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    const bpm = 172;
    const stepSeconds = (60 / bpm) / 4;
    const notes = [110, 146.83, 164.81, 196];

    for (let i = 0; i < frameCount; i += 1) {
      const t = i / sampleRate;
      const step = Math.floor(t / stepSeconds);
      const stepPos = (t / stepSeconds) % 1;
      const note = notes[step % notes.length];
      const env = Math.exp(-18 * stepPos);
      const phase = 2 * Math.PI * note * t;
      const saw = ((phase / Math.PI) % 2) - 1;
      data[i] = saw * 0.12 * env;
    }
    return buffer;
  }

  buildDreadBuffer() {
    const duration = 8;
    const sampleRate = this.ctx.sampleRate;
    const frameCount = Math.floor(duration * sampleRate);
    const buffer = this.ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    const droneA = 46.25;
    const droneB = 49.0;
    const lfoFreq = 0.11;

    for (let i = 0; i < frameCount; i += 1) {
      const t = i / sampleRate;
      const lfo = (Math.sin(2 * Math.PI * lfoFreq * t) + 1) * 0.5;
      const tone = Math.sin(2 * Math.PI * droneA * t) * 0.12;
      const overtone = Math.sin(2 * Math.PI * droneB * t) * 0.06;
      const hiss = (Math.random() * 2 - 1) * 0.02;
      data[i] = (tone + overtone + hiss) * (0.6 + lfo * 0.4);
    }
    return buffer;
  }

  buildAccentBuffer() {
    const duration = 8;
    const sampleRate = this.ctx.sampleRate;
    const frameCount = Math.floor(duration * sampleRate);
    const buffer = this.ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    const bpm = 172;
    const beatSeconds = 60 / bpm;
    const notes = [82.41, 98.0, 110.0, 123.47];

    for (let i = 0; i < frameCount; i += 1) {
      const t = i / sampleRate;
      const beat = Math.floor(t / beatSeconds);
      const beatPos = (t / beatSeconds) % 1;
      const note = notes[beat % notes.length];
      const env = beatPos < 0.08 ? Math.exp(-28 * beatPos) : 0.0;
      const tri = Math.asin(Math.sin(2 * Math.PI * note * t)) * (2 / Math.PI);
      data[i] = tri * 0.16 * env;
    }
    return buffer;
  }

  setLevel(level) {
    this.currentLevel = level;
    if (!this.started || !this.ctx) return;

    const targets = this.levelToMix(level);
    const now = this.ctx.currentTime;

    for (const [name, target] of Object.entries(targets)) {
      const stem = this.stems.get(name);
      if (!stem) continue;
      stem.gainNode.gain.cancelScheduledValues(now);
      stem.gainNode.gain.setValueAtTime(stem.gainNode.gain.value, now);
      stem.gainNode.gain.linearRampToValueAtTime(target, now + this.fadeSeconds);
    }

    const masterTarget = level >= 7 ? 0.82 : level >= 5 ? 0.86 : 0.9;
    this.masterGain.gain.cancelScheduledValues(now);
    this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
    this.masterGain.gain.linearRampToValueAtTime(masterTarget, now + this.fadeSeconds);
  }

  levelToMix(level) {
    const idx = Math.max(0, Math.min(level - 1, LEVEL_MIXES.length - 1));
    return LEVEL_MIXES[idx];
  }

  async suspend() {
    if (!this.ctx || this.ctx.state === 'suspended') return;
    try {
      await this.ctx.suspend();
    } catch (error) {
      console.warn('Audio suspend failed:', error);
    }
  }

  async resume() {
    if (!this.ctx || this.ctx.state === 'running') return;
    try {
      await this.ctx.resume();
    } catch (error) {
      console.warn('Audio resume failed:', error);
    }
  }

  async ensureLevelCompleteBuffer() {
    if (this.levelCompleteBuffer) return this.levelCompleteBuffer;
    if (!(await this.unlock())) return null;

    try {
      const response = await fetch(LEVEL_COMPLETE_FILE);
      if (response.ok) {
        const arrayBuffer = await response.arrayBuffer();
        this.levelCompleteBuffer = await this.ctx.decodeAudioData(arrayBuffer);
        return this.levelCompleteBuffer;
      }
    } catch (error) {
      console.warn('Level complete SFX missing; using generated stinger.', error);
    }

    this.levelCompleteBuffer = this.buildLevelCompleteBuffer();
    return this.levelCompleteBuffer;
  }

  async playLevelComplete(level) {
    if (this.ctx?.state === 'suspended') return;
    if (!(await this.unlock())) return;
    const buffer = await this.ensureLevelCompleteBuffer();
    if (!buffer) return;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.value = 1 + (Math.min(level, 8) - 1) * 0.025;

    const gainNode = this.ctx.createGain();
    gainNode.gain.value = level >= 8 ? 0.95 : 0.82;

    source.connect(gainNode);
    gainNode.connect(this.masterGain);
    source.start();
  }

  buildLevelCompleteBuffer() {
    const duration = 0.85;
    const sampleRate = this.ctx.sampleRate;
    const frameCount = Math.floor(duration * sampleRate);
    const buffer = this.ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    const notes = [523.25, 659.25, 783.99, 1046.5];

    for (let i = 0; i < frameCount; i += 1) {
      const t = i / sampleRate;
      let sample = 0;

      for (let n = 0; n < notes.length; n += 1) {
        const start = n * 0.11;
        const localT = t - start;
        if (localT < 0 || localT > 0.28) continue;
        const env = Math.exp(-10 * localT);
        const freq = notes[n];
        const tone = Math.sin(2 * Math.PI * freq * localT);
        const overtone = Math.sin(2 * Math.PI * freq * 2 * localT) * 0.18;
        sample += (tone + overtone) * env * 0.22;
      }

      if (t < 0.04) {
        sample += (Math.random() * 2 - 1) * 0.08 * Math.exp(-120 * t);
      }

      data[i] = sample;
    }

    return buffer;
  }
}
