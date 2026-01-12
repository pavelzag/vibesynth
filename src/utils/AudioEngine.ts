
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
  lfoWaveform: OscillatorType;
  lfoRate: number; // Hz
  lfoDepth: number; // 0-1
  lfoFilterMod: boolean;
  lfoAmpMod: boolean;
}


export interface ActiveVoice {
  filter: BiquadFilterNode;
  osc1: OscillatorNode;
  osc2: OscillatorNode;
  osc1Gain: GainNode;
  osc2Gain: GainNode;
  filterEnvSource?: ConstantSourceNode; // Optional, might use buffer fallback if needed but we'll stick to ConstantSource
  lfo: OscillatorNode;
  lfoGain: GainNode;      // Controls mod to filter
  lfoAmpGain: GainNode;   // Controls mod to amp (tremolo)
  tremoloGain: GainNode;  // The node being modulated for volume
}

export class AudioEngine {
  private context: AudioContext;
  private masterGain: GainNode;
  private distortionNode: WaveShaperNode;
  private dryGain: GainNode;
  private wetGain: GainNode;
  private config: SynthConfig;
  private activeVoices: Set<ActiveVoice> = new Set();

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
      distortion: 0,
      lfoWaveform: 'sine',
      lfoRate: 5,
      lfoDepth: 0,
      lfoFilterMod: true,
      lfoAmpMod: false
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

    // Update active voices
    const now = this.context.currentTime;
    this.activeVoices.forEach(voice => {
      // Update Filter
      voice.filter.frequency.setTargetAtTime(this.config.filterCutoff, now, 0.05); // Base frequency smoothing
      voice.filter.Q.setTargetAtTime(this.config.filterResonance, now, 0.05);

      // Update Osc Mix
      voice.osc1Gain.gain.setTargetAtTime(1 - this.config.oscMix, now, 0.05);
      voice.osc2Gain.gain.setTargetAtTime(this.config.oscMix, now, 0.05);

      // Update Waveforms (Instant)
      if (voice.osc1.type !== this.config.osc1Waveform) voice.osc1.type = this.config.osc1Waveform;
      if (voice.osc2.type !== this.config.osc2Waveform) voice.osc2.type = this.config.osc2Waveform;

      // Update LFO
      voice.lfo.frequency.setTargetAtTime(this.config.lfoRate, now, 0.05);
      if (voice.lfo.type !== this.config.lfoWaveform) voice.lfo.type = this.config.lfoWaveform;

      // Update Mod Depths based on toggles
      const filterDepth = this.config.lfoFilterMod ? this.config.lfoDepth * 2000 : 0;
      const ampDepth = this.config.lfoAmpMod ? this.config.lfoDepth * 0.5 : 0; // 0.5 max volume mod

      voice.lfoGain.gain.setTargetAtTime(filterDepth, now, 0.05);
      voice.lfoAmpGain.gain.setTargetAtTime(ampDepth, now, 0.05);
    });
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
    const tremoloGain = this.context.createGain(); // New node for AM

    // ConstantSource for Filter Envelope Modulation
    // This allows us to have a static base cutoff (updated via config) + dynamic envelope
    const filterEnvSource = this.context.createConstantSource();
    const filterModGain = this.context.createGain();

    // LFO Nodes
    const lfo = this.context.createOscillator();
    const lfoGain = this.context.createGain();    // Filter Mod Depth control
    const lfoAmpGain = this.context.createGain(); // Amp Mod Depth control

    // --- Configuration ---
    osc1.type = this.config.osc1Waveform;
    osc1.frequency.setValueAtTime(finalFreq, now);

    osc2.type = this.config.osc2Waveform;
    osc2.frequency.setValueAtTime(finalFreq, now);

    filter.type = 'lowpass';
    filter.Q.value = this.config.filterResonance;
    // Set base cutoff
    filter.frequency.setValueAtTime(this.config.filterCutoff, now);

    // Oscillator Mix
    osc1Gain.gain.value = 1 - this.config.oscMix;
    osc2Gain.gain.value = this.config.oscMix;

    // LFO Config
    lfo.type = this.config.lfoWaveform;
    lfo.frequency.setValueAtTime(this.config.lfoRate, now);

    // Initial mod depths
    const filterDepth = this.config.lfoFilterMod ? this.config.lfoDepth * 2000 : 0;
    const ampDepth = this.config.lfoAmpMod ? this.config.lfoDepth * 0.5 : 0;

    lfoGain.gain.value = filterDepth;
    lfoAmpGain.gain.value = ampDepth;

    // Tremolo Base Gain
    tremoloGain.gain.value = 1;

    // --- Routing ---
    // Oscs -> Filter -> Amp
    osc1.connect(osc1Gain);
    osc2.connect(osc2Gain);
    osc1Gain.connect(filter);
    osc2Gain.connect(filter);
    filter.connect(ampGain);

    // Amp -> Tremolo -> Dry/Wet Bus
    ampGain.connect(tremoloGain);
    tremoloGain.connect(this.dryGain);
    tremoloGain.connect(this.distortionNode);

    // Filter Mod Routing:
    filterEnvSource.connect(filterModGain);
    filterModGain.connect(filter.frequency);

    // LFO -> Filter
    lfo.connect(lfoGain);
    lfoGain.connect(filter.frequency);

    // LFO -> Amp (Tremolo)
    lfo.connect(lfoAmpGain);
    lfoAmpGain.connect(tremoloGain.gain);


    // --- Envelopes ---

    // Amplitude ADSR
    const amp = this.config.ampADSR;
    // Initializing to 0 immediately prevents "pop" if audio thread is slightly ahead
    ampGain.gain.setValueAtTime(0, now);
    ampGain.gain.linearRampToValueAtTime(1, now + amp.attack);
    ampGain.gain.exponentialRampToValueAtTime(amp.sustain, now + amp.attack + amp.decay);

    // Filter ADSR (Applied to ConstantSource offset)
    const filt = this.config.filterADSR;
    const modAmount = 2000; // How much the envelope affects the cutoff in Hz

    filterEnvSource.offset.setValueAtTime(0, now);
    filterModGain.gain.value = modAmount; // Max modulation depth

    // Envelope shape on the Source Offset (0 to 1)
    filterEnvSource.offset.linearRampToValueAtTime(1, now + filt.attack);
    filterEnvSource.offset.exponentialRampToValueAtTime(filt.sustain, now + filt.attack + filt.decay);

    filterEnvSource.start(now);
    lfo.start(now);
    osc1.start(now);
    osc2.start(now);

    const voice: ActiveVoice = {
      filter,
      osc1,
      osc2,
      osc1Gain,
      osc2Gain,
      filterEnvSource,
      lfo,
      lfoGain,
      lfoAmpGain,
      tremoloGain
    };
    this.activeVoices.add(voice);

    // Return a stop function to trigger release
    return () => {
      const releaseNow = this.context.currentTime;
      // Amp Release
      ampGain.gain.cancelScheduledValues(releaseNow);
      ampGain.gain.setValueAtTime(ampGain.gain.value, releaseNow);
      // Ramp to almost silence (-80dB) then to actual 0 to avoid tail cutoff
      ampGain.gain.exponentialRampToValueAtTime(0.0001, releaseNow + amp.release);
      ampGain.gain.linearRampToValueAtTime(0, releaseNow + amp.release + 0.01);

      // Filter Release
      filterEnvSource.offset.cancelScheduledValues(releaseNow);
      filterEnvSource.offset.setValueAtTime(filterEnvSource.offset.value, releaseNow);
      filterEnvSource.offset.exponentialRampToValueAtTime(0.001, releaseNow + filt.release);

      // Stop & Cleanup
      const stopTime = releaseNow + amp.release + 0.02; // Slight buffer for the linear ramp
      osc1.stop(stopTime);
      osc2.stop(stopTime);
      filterEnvSource.stop(stopTime);
      lfo.stop(stopTime);

      // Cleanup Active Voice after stop
      setTimeout(() => {
        this.activeVoices.delete(voice);
        // Disconnect nodes to help GC
      }, (amp.release + 0.2) * 1000);
    };
  }
}

export const audioEngine = new AudioEngine();
