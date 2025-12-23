
export type OscillatorType = 'sine' | 'square' | 'sawtooth' | 'triangle';

export interface ADSRConfig {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

export interface SynthConfig {
  osc1Waveform: OscillatorType;
  osc2Waveform: OscillatorType;
  ampADSR: ADSRConfig;
  filterADSR: ADSRConfig;
  filterCutoff: number;
  filterResonance: number;
  oscMix: number; // 0 to 1, mix between osc1 and osc2
  octave: number; // -3 to +3
  distortion: number; // 0 to 1 (Dry/Wet)
}

export class AudioEngine {
  private context: AudioContext;
  private masterGain: GainNode;
  private distortionNode: WaveShaperNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private config: SynthConfig;

  constructor() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    this.context = new (window.AudioContext || (window as any).webkitAudioContext)();
    this.masterGain = this.context.createGain();
    this.masterGain.connect(this.context.destination);
    // Adjusted master gain to prevent clipping with multiple voices
    this.masterGain.gain.value = 0.3;

    // Mixing Bus
    this.dryGain = this.context.createGain();
    this.wetGain = this.context.createGain();

    // Distortion Node
    this.distortionNode = this.context.createWaveShaper();
    this.distortionNode.curve = this.makeDistortionCurve(400);
    this.distortionNode.oversample = '4x';

    // Chain: Wet Path (Distortion -> WetGain -> Master)
    this.distortionNode.connect(this.wetGain);
    this.wetGain.connect(this.masterGain);

    // Chain: Dry Path (DryGain -> Master)
    this.dryGain.connect(this.masterGain);

    // Default Configuration
    this.config = {
      osc1Waveform: 'triangle',
      osc2Waveform: 'sawtooth',
      ampADSR: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.5 },
      filterADSR: { attack: 0.05, decay: 0.5, sustain: 0.2, release: 0.5 },
      filterCutoff: 1000,
      filterResonance: 5,
      oscMix: 0.5,
      octave: 0,
      distortion: 0
    };

    this.updateMixNodes();
  }

  // Soft clipping distortion curve
  private makeDistortionCurve(amount: number) {
    const k = typeof amount === 'number' ? amount : 50;
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const deg = Math.PI / 180;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    return curve;
  }

  private updateMixNodes() {
    const now = this.context.currentTime;
    // Use equal power crossfade or simple linear? Linear for dry/wet effect usually feels fine.
    this.dryGain.gain.setTargetAtTime(1 - this.config.distortion, now, 0.02);
    this.wetGain.gain.setTargetAtTime(this.config.distortion, now, 0.02);
  }

  updateConfig(newConfig: Partial<SynthConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.updateMixNodes();
  }

  playNote(frequency: number) {
    if (this.context.state === 'suspended') {
      this.context.resume();
    }

    const now = this.context.currentTime;
    // Apply Octave Shift
    const finalFreq = frequency * Math.pow(2, this.config.octave);

    // --- Nodes ---
    const osc1 = this.context.createOscillator();
    const osc2 = this.context.createOscillator();
    const osc1Gain = this.context.createGain();
    const osc2Gain = this.context.createGain();
    const filter = this.context.createBiquadFilter();
    const ampGain = this.context.createGain();

    // --- Configuration ---
    osc1.type = this.config.osc1Waveform;
    osc1.frequency.setValueAtTime(finalFreq, now);

    osc2.type = this.config.osc2Waveform;
    osc2.frequency.setValueAtTime(finalFreq, now); // Can add detune here later

    filter.type = 'lowpass';
    filter.Q.value = this.config.filterResonance;

    // Oscillator Mix
    osc1Gain.gain.value = 1 - this.config.oscMix;
    osc2Gain.gain.value = this.config.oscMix;

    // --- Routing ---
    // Oscs -> Filter -> Amp
    osc1.connect(osc1Gain);
    osc2.connect(osc2Gain);
    osc1Gain.connect(filter);
    osc2Gain.connect(filter);
    filter.connect(ampGain);

    // Amp -> Dry/Wet Bus (Both paths, controlled by gains)
    ampGain.connect(this.dryGain);
    ampGain.connect(this.distortionNode);


    // --- Envelopes ---

    // Amplitude ADSR
    const amp = this.config.ampADSR;
    ampGain.gain.setValueAtTime(0, now);
    ampGain.gain.linearRampToValueAtTime(1, now + amp.attack);
    ampGain.gain.exponentialRampToValueAtTime(amp.sustain, now + amp.attack + amp.decay);

    // Filter ADSR
    const filt = this.config.filterADSR;
    const baseFreq = this.config.filterCutoff;
    const peakFreq = baseFreq + 2000; // Modulation amount

    filter.frequency.setValueAtTime(baseFreq, now);
    filter.frequency.linearRampToValueAtTime(peakFreq, now + filt.attack);
    filter.frequency.exponentialRampToValueAtTime(baseFreq + (peakFreq - baseFreq) * filt.sustain, now + filt.attack + filt.decay);

    osc1.start(now);
    osc2.start(now);

    // Return a stop function to trigger release
    return () => {
      const releaseNow = this.context.currentTime;
      // Amp Release
      ampGain.gain.cancelScheduledValues(releaseNow);
      ampGain.gain.setValueAtTime(ampGain.gain.value, releaseNow); // value at release
      ampGain.gain.exponentialRampToValueAtTime(0.001, releaseNow + amp.release);

      // Filter Release
      filter.frequency.cancelScheduledValues(releaseNow);
      filter.frequency.setValueAtTime(filter.frequency.value, releaseNow);
      filter.frequency.exponentialRampToValueAtTime(baseFreq, releaseNow + filt.release);

      osc1.stop(releaseNow + amp.release + 0.1);
      osc2.stop(releaseNow + amp.release + 0.1);
    };
  }
}

export const audioEngine = new AudioEngine();
