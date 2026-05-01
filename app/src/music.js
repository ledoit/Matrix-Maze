const STEM_FILES = {
  base: '/audio/music/matrix_maze_base.ogg',
  pressure: '/audio/music/matrix_maze_pressure.ogg',
  chase: '/audio/music/matrix_maze_chase.ogg',
  dread: '/audio/music/matrix_maze_dread.ogg',
};

const STEM_DEFAULTS = {
  base: 0.9,
  pressure: 0.0,
  chase: 0.0,
  dread: 0.0,
};

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
    return true;
  }

  generateFallbackBuffers() {
    this.buffers.clear();
    this.buffers.set('base', this.buildBaseBuffer());
    this.buffers.set('pressure', this.buildPressureBuffer());
    this.buffers.set('chase', this.buildChaseBuffer());
    this.buffers.set('dread', this.buildDreadBuffer());
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
      const env = beatPos < pulseLength / beatSeconds
        ? Math.exp(-20 * beatPos)
        : 0.0;
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
      const env = stepPos < hitLen / stepSeconds
        ? Math.exp(-45 * stepPos)
        : 0.0;
      // White-noise hats for "pressure" texture.
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

  setLevel(level) {
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
  }

  levelToMix(level) {
    if (level <= 1) {
      return { base: 0.9, pressure: 0.0, chase: 0.0, dread: 0.0 };
    }
    if (level === 2) {
      return { base: 0.9, pressure: 0.22, chase: 0.0, dread: 0.0 };
    }
    if (level === 3) {
      return { base: 0.9, pressure: 0.36, chase: 0.0, dread: 0.08 };
    }
    if (level === 4) {
      return { base: 0.85, pressure: 0.34, chase: 0.3, dread: 0.12 };
    }
    return { base: 0.82, pressure: 0.38, chase: 0.44, dread: 0.18 };
  }
}

