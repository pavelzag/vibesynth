
import { useState } from 'react'
import Piano from './components/Piano'
import SynthControls from './components/SynthControls'
import Sequencer from './components/Sequencer'

function App() {
  const [lastPlayedNote, setLastPlayedNote] = useState<{ note: string; freq: number } | null>(null);

  const handleNotePlay = (note: string, freq: number) => {
    setLastPlayedNote({ note, freq });
  };

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

          <SynthControls />
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
