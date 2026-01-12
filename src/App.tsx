
import { useState, useEffect, useRef, useCallback } from 'react';
import Piano from './components/Piano';
import SynthControls from './components/SynthControls';
import Sequencer from './components/Sequencer';
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
    filterResonance: 5,
    oscMix: 0.5,
    octave: 0,
    distortion: 0,
    lfoWaveform: 'sine',
    lfoRate: 5,
    lfoDepth: 0,
    lfoFilterMod: true,
    lfoAmpMod: false
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
          const currentConfig = configRef.current;
          let updates: Partial<SynthConfig> = {};

          switch (cc) {
            case 43: // Cutoff
              // Range 20 - 10000
              updates = { filterCutoff: 20 + norm * 9980 };
              break;
            case 44: // Resonance
              // Range 0 - 20
              updates = { filterResonance: norm * 20 };
              break;
            case 24: // LFO Rate
              // Range 0.1 - 20
              updates = { lfoRate: 0.1 + norm * 19.9 };
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
            setConfig(newConfig);
            audioEngine.updateConfig(newConfig);
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
        <div className="flex justify-between items-center border-b border-white/5 pb-2 px-2">
          <h1 className="text-3xl font-black tracking-tighter uppercase text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-white to-fuchsia-400 italic drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">
            Vibe<span className="text-white font-thin">Synth</span>
          </h1>
          <div className="flex gap-3 items-center">
            <div className="flex gap-1 h-3">
              <div className="w-1 bg-cyan-500/50 rounded-full animate-pulse" />
              <div className="w-1 bg-cyan-500/30 rounded-full animate-pulse delay-75" />
              <div className="w-1 bg-cyan-500/10 rounded-full animate-pulse delay-150" />
            </div>
            <span className="text-[10px] text-cyan-500/70 uppercase tracking-widest font-mono">System Online</span>
          </div>
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
