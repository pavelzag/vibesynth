
import { useState, useEffect, useRef, useCallback } from 'react';
import Piano from './components/Piano';
import SynthControls from './components/SynthControls';
import Sequencer from './components/Sequencer';
import Oscilloscope from './components/Oscilloscope';
import { audioEngine, type SynthConfig } from './utils/AudioEngine';

function App() {
  const [lastPlayedNote, setLastPlayedNote] = useState<{ note: string; freq: number } | null>(null);

  // Lifted State for Synth Config
  const [config, setConfig] = useState<SynthConfig>({
    osc1Waveform: 'triangle',
    osc2Waveform: 'sawtooth',
    ampADSR: { attack: 0.01, decay: 0.1, sustain: 0.5, release: 0.5 },
    filterADSR: { attack: 0.05, decay: 0.5, sustain: 0.2, release: 0.5 },
    filterCutoff: 1000,
    filterResonance: 6, // Default to "Punch"
    oscMix: 0.5,
    octave: 0,
    distortion: 0,
    lfoWaveform: 'sine',
    lfoRate: 5,
    lfoDepth: 0,
    lfoFilterMod: true,
    lfoAmpMod: false,
    reverbMix: 0,
    reverbPreset: 'hall',
    cutoffRange: 'lead'
  });

  // Ref to hold latest config for MIDI listener without re-binding
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);

  const handleConfigChange = (updates: Partial<SynthConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    audioEngine.updateConfig(newConfig);
  };

  const randomizeConfig = () => {
    const waveforms = ['sine', 'triangle', 'sawtooth', 'square'] as const;
    const ranges = ['bass', 'lead', 'wide'] as const;
    const resonances = [1, 6, 15];
    const presets = ['room', 'hall', 'space'] as const;

    const newConfig: SynthConfig = {
      osc1Waveform: waveforms[Math.floor(Math.random() * waveforms.length)],
      osc2Waveform: waveforms[Math.floor(Math.random() * waveforms.length)],
      oscMix: Math.random(),
      octave: Math.floor(Math.random() * 3) - 1, // -1, 0, 1
      cutoffRange: ranges[Math.floor(Math.random() * ranges.length)],
      filterCutoff: 100 + Math.random() * 3000, // Safe range
      filterResonance: resonances[Math.floor(Math.random() * resonances.length)],
      distortion: Math.random() * 0.5, // Don't allow full distortion randomly
      ampADSR: {
        attack: 0.01 + Math.random() * 0.5,
        decay: 0.1 + Math.random() * 0.5,
        sustain: Math.random(),
        release: 0.1 + Math.random() * 1.0,
      },
      filterADSR: {
        attack: 0.01 + Math.random() * 0.5,
        decay: 0.1 + Math.random() * 0.5,
        sustain: Math.random(),
        release: 0.1 + Math.random() * 1.0,
      },
      lfoWaveform: waveforms[Math.floor(Math.random() * waveforms.length)],
      lfoRate: 0.1 + Math.random() * 10,
      lfoDepth: Math.random(),
      lfoFilterMod: Math.random() > 0.5,
      lfoAmpMod: Math.random() > 0.5,
      reverbMix: Math.random() * 0.6,
      reverbPreset: presets[Math.floor(Math.random() * presets.length)],
    };

    setConfig(newConfig);
    audioEngine.updateConfig(newConfig);
  };

  const handleNotePlay = useCallback((note: string, freq: number) => {
    setLastPlayedNote({ note, freq });
  }, []);

  // MIDI CC Listener (Korg Monologue Mapping)
  useEffect(() => {
    if (!navigator.requestMIDIAccess) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const onMIDIMessage = (message: any) => {
      const [command, data1, data2] = message.data;

      // Control Change (CC) - usually 176 (Channel 1)
      if (command === 176) {
        const ccHandler = (cc: number, value: number) => {
          const norm = value / 127; // 0-1
          // Always read from ref to get latest state including updates from previous events in this tick
          const currentConfig = configRef.current;
          let updates: Partial<SynthConfig> = {};

          switch (cc) {
            case 91: // Reverb Send (Standard MIDI CC)
              updates = { reverbMix: norm };
              break;
            case 43: // Cutoff
              // Scale based on selected range
              let min = 20;
              let max = 10000;
              if (currentConfig.cutoffRange === 'bass') { max = 800; }
              else if (currentConfig.cutoffRange === 'lead') { min = 100; max = 4000; }
              else if (currentConfig.cutoffRange === 'wide') { max = 12000; }

              updates = { filterCutoff: min + norm * (max - min) };
              break;
            case 44: // Resonance (3-State Quantization)
              // 0-42: Smooth (1), 43-85: Punch (6), 86-127: Scream (15)
              if (value < 43) updates = { filterResonance: 1 };
              else if (value < 86) updates = { filterResonance: 6 };
              else updates = { filterResonance: 15 };
              break;
            case 28: // Drive (Mapped to Distortion)
              updates = { distortion: norm };
              break;
            case 24: // LFO Rate
              // Range 0.01 - 20
              updates = { lfoRate: 0.01 + norm * 19.99 };
              break;
            case 26: // LFO Depth
              // Range 0 - 1
              updates = { lfoDepth: norm };
              break;
            case 16: // Attack
              // Range 0.01 - 2
              updates = { ampADSR: { ...currentConfig.ampADSR, attack: 0.01 + norm * 2 } };
              break;
            case 17: // Decay
              updates = { ampADSR: { ...currentConfig.ampADSR, decay: 0.01 + norm * 2 } };
              break;
            case 18: // Sustain
              updates = { ampADSR: { ...currentConfig.ampADSR, sustain: norm } };
              break;
            case 19: // Release
              updates = { ampADSR: { ...currentConfig.ampADSR, release: 0.01 + norm * 5 } };
              break;
          }

          if (Object.keys(updates).length > 0) {
            const newConfig = { ...currentConfig, ...updates };

            // 1. Update React State (Async)
            setConfig(newConfig);

            // 2. Update Audio Engine (Sync)
            audioEngine.updateConfig(newConfig);

            // 3. Update Ref (Sync) - CRITICAL for high-frequency MIDI events
            // This prevents race conditions where the next event reads stale config
            configRef.current = newConfig;
          }
        };
        ccHandler(data1, data2);
      }
    };

    navigator.requestMIDIAccess().then((access) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const inputs = (access as any).inputs.values();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      for (const input of inputs) {
        input.onmidimessage = onMIDIMessage;
      }
    });

    // Cleanup: Remove listeners if possible, though Web MIDI API cleaning is tricky.
    // Since this effect now runs once on mount, we are much safer.
  }, []); // Empty dependency array = Runs once on mount

  return (
    <div className="h-screen w-full flex items-center justify-center bg-gray-950 text-white overflow-hidden relative select-none">
      {/* Background */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-gray-800 via-gray-950 to-black z-0" />

      {/* Synth Chassis - VibeSynth Design */}
      <div className="z-10 relative flex flex-col w-full max-w-5xl bg-zinc-950/90 backdrop-blur-xl rounded-2xl shadow-[0_0_50px_rgba(6,182,212,0.15)] border border-cyan-500/20 p-8 gap-6 transition-all hover:shadow-[0_0_80px_rgba(6,182,212,0.25)]">

        {/* Cyber Lines (Decoration) */}
        <div className="absolute top-0 left-10 w-32 h-[1px] bg-cyan-500/50 shadow-[0_0_10px_rgba(6,182,212,0.8)]" />
        <div className="absolute top-0 right-10 w-32 h-[1px] bg-fuchsia-500/50 shadow-[0_0_10px_rgba(232,121,249,0.8)]" />
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-64 h-[1px] bg-white/20" />

        {/* Branding / Top Panel */}
        <div className="flex justify-between items-end border-b border-white/5 pb-2 px-2">
          <div className="flex flex-col">
            <h1 className="text-5xl font-normal tracking-wider uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-fuchsia-400 drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]" style={{ fontFamily: 'Rubik Glitch, system-ui' }}>
              VIBE<span className="text-fuchsia-500">SYNTH</span>
            </h1>
            <p className="text-zinc-400 text-lg -mt-2 ml-1" style={{ fontFamily: 'Dancing Script, cursive' }}>
              by Pavel Zagalsky
            </p>
          </div>

          <div className="flex gap-3 items-center mb-2">
            <div className="flex gap-1 h-3">
              <div className="w-1 bg-cyan-500/50 rounded-full animate-pulse" />
              <div className="w-1 bg-cyan-500/30 rounded-full animate-pulse delay-75" />
              <div className="w-1 bg-cyan-500/10 rounded-full animate-pulse delay-150" />
            </div>
            <span className="text-[10px] text-cyan-500/70 uppercase tracking-widest font-mono">System Online</span>
            <button
              onClick={randomizeConfig}
              className="ml-4 px-3 py-1 bg-gradient-to-r from-fuchsia-600 to-pink-600 rounded text-[10px] font-bold uppercase tracking-wider text-white shadow-[0_0_10px_rgba(232,121,249,0.5)] hover:bg-fuchsia-500 transition-all hover:scale-105 active:scale-95"
            >
              Randomize! 🎲
            </button>
          </div>
        </div>

        {/* Visualizer */}
        <div className="px-2">
          <Oscilloscope analyser={audioEngine.getAnalyser()} />
        </div>

        {/* Controls Section */}
        <div className="bg-black/40 rounded-xl border border-white/5 p-4 shadow-inner relative overflow-hidden group">
          {/* Subtle glow effect behind controls */}
          <div className="absolute -top-20 -right-20 w-64 h-64 bg-fuchsia-500/10 rounded-full blur-[80px] pointer-events-none" />
          <div className="absolute -bottom-20 -left-20 w-64 h-64 bg-cyan-500/10 rounded-full blur-[80px] pointer-events-none" />

          <SynthControls config={config} onConfigChange={handleConfigChange} />
        </div>

        {/* Sequencer Section */}
        <div className="z-20">
          <Sequencer currentNote={lastPlayedNote} onPlayStep={() => { }} />
        </div>

        {/* Keybed Section */}
        <div className="mt-auto">
          <div className="bg-zinc-950 p-4 pb-8 rounded-b-2xl border-t border-white/10 shadow-lg relative">
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            <Piano onNotePlay={handleNotePlay} />
          </div>
        </div>
      </div>
    </div>
  )
}
export default App
