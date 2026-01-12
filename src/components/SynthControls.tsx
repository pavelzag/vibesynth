import React from 'react';
import { type OscillatorType, type SynthConfig } from '../utils/AudioEngine';
import Knob from './Knob';

interface SynthControlsProps {
    config: SynthConfig;
    onConfigChange: (newConfig: Partial<SynthConfig>) => void;
}

const WAVEFORMS: OscillatorType[] = ['sine', 'triangle', 'sawtooth', 'square'];

const SynthControls: React.FC<SynthControlsProps> = ({ config, onConfigChange }) => {

    const updateEngine = (newConfig: Partial<SynthConfig>) => {
        onConfigChange(newConfig);
    };

    const updateADSR = (type: 'ampADSR' | 'filterADSR', field: keyof SynthConfig['ampADSR'], value: number) => {
        const adsr = { ...config[type], [field]: value };
        updateEngine({ [type]: adsr });
    };

    return (
        <div className="flex flex-col gap-4 w-full text-white select-none">
            <div className="flex flex-col md:flex-row gap-8 justify-between">

                {/* Oscillators */}
                <div className="flex-1 space-y-3">
                    <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400 border-b border-cyan-500/30 pb-1 mb-2 shadow-[0_1px_5px_rgba(34,211,238,0.2)]">Oscillators</h3>
                    <div className="space-y-3">
                        <div>
                            <label className="text-[9px] text-fuchsia-400 block mb-1 font-mono tracking-wider">OSC 1 FORM</label>
                            <div className="flex gap-1">
                                {WAVEFORMS.map(w => (
                                    <button
                                        key={`osc1-${w}`}
                                        onClick={() => updateEngine({ osc1Waveform: w })}
                                        className={`flex-1 py-1 px-1 text-[8px] uppercase font-mono rounded-sm border transition-all ${config.osc1Waveform === w ? 'bg-fuchsia-600 border-fuchsia-400 text-white shadow-[0_0_8px_rgba(192,38,211,0.6)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700'}`}
                                    >
                                        {w.substring(0, 3)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <label className="text-[9px] text-fuchsia-400 block mb-1 font-mono tracking-wider">OSC 2 FORM</label>
                            <div className="flex gap-1">
                                {WAVEFORMS.map(w => (
                                    <button
                                        key={`osc2-${w}`}
                                        onClick={() => updateEngine({ osc2Waveform: w })}
                                        className={`flex-1 py-1 px-1 text-[8px] uppercase font-mono rounded-sm border transition-all ${config.osc2Waveform === w ? 'bg-fuchsia-600 border-fuchsia-400 text-white shadow-[0_0_8px_rgba(192,38,211,0.6)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700'}`}
                                    >
                                        {w.substring(0, 3)}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div className="flex justify-center gap-6 pt-2">
                            <Knob
                                label="Mix"
                                value={config.oscMix}
                                min={0}
                                max={1}
                                onChange={(v) => updateEngine({ oscMix: v })}
                                color="bg-fuchsia-500"
                                size={54}
                            />
                            <Knob
                                label="Octave"
                                value={config.octave}
                                min={-3}
                                max={3}
                                step={1}
                                onChange={(v) => updateEngine({ octave: v })}
                                color="bg-emerald-500"
                                size={54}
                            />
                        </div>
                    </div>
                </div>

                {/* Filter & Global */}
                <div className="flex-[2] flex flex-col gap-4">
                    <div className="flex justify-between items-end border-b border-cyan-500/30 pb-1 mb-2">
                        <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400 shadow-[0_1px_5px_rgba(34,211,238,0.2)]">Filter & FX</h3>
                    </div>

                    <div className="flex flex-col gap-4">
                        {/* Upper Row: Toggles (Cutoff Range & Resonance) */}
                        <div className="flex justify-center gap-8 items-end">
                            {/* Cutoff Range Toggles */}
                            <div className="flex flex-col items-center gap-1">
                                <label className="text-[8px] text-cyan-500/70 font-mono tracking-widest uppercase">Range</label>
                                <div className="flex bg-black/40 p-0.5 rounded border border-cyan-500/20">
                                    {['bass', 'lead', 'wide'].map((r) => (
                                        <button
                                            key={r}
                                            // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                            onClick={() => updateEngine({ cutoffRange: r as any })}
                                            className={`text-[7px] uppercase font-mono px-2 py-1 rounded-sm transition-all leading-none
                                                ${config.cutoffRange === r
                                                    ? 'bg-cyan-500 text-black font-bold shadow-[0_0_10px_rgba(6,182,212,0.5)]'
                                                    : 'text-cyan-500/50 hover:text-cyan-400 hover:bg-white/5'}`}
                                        >
                                            {r}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Resonance Toggles */}
                            <div className="flex flex-col items-center gap-1">
                                <label className="text-[8px] text-cyan-500/70 font-mono tracking-widest uppercase mb-0.5">Resonance</label>
                                <div className="flex bg-black/40 p-0.5 rounded border border-cyan-500/20 w-32">
                                    {[
                                        { label: 'Wait', val: 1 },
                                        { label: 'Punch', val: 6 },
                                        { label: 'Scream', val: 15 }
                                    ].map(opt => (
                                        <button
                                            key={opt.label}
                                            onClick={() => updateEngine({ filterResonance: opt.val })}
                                            className={`flex-1 py-1 text-[7px] uppercase font-mono font-bold rounded-sm transition-all leading-none
                                                ${Math.abs(config.filterResonance - opt.val) < 2
                                                    ? 'bg-cyan-500 text-black shadow-[0_0_10px_rgba(6,182,212,0.6)]'
                                                    : 'text-cyan-500/40 hover:text-cyan-400 hover:bg-white/5'}`}
                                        >
                                            {opt.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Lower Row: Knobs (Cutoff & Distortion) */}
                        <div className="flex justify-center gap-12 pt-1 border-b border-cyan-500/10 pb-4 mb-2">
                            <Knob
                                label="Cutoff"
                                value={config.filterCutoff}
                                min={config.cutoffRange === 'wide' ? 20 : (config.cutoffRange === 'bass' ? 20 : 100)}
                                max={config.cutoffRange === 'wide' ? 12000 : (config.cutoffRange === 'bass' ? 800 : 4000)}
                                step={10}
                                onChange={(v) => updateEngine({ filterCutoff: v })}
                                color="bg-cyan-400"
                                size={54}
                            />
                            <Knob
                                label="Distortion"
                                value={config.distortion}
                                min={0}
                                max={1}
                                step={0.01}
                                onChange={(v) => updateEngine({ distortion: v })}
                                color="bg-red-500"
                                size={54}
                            />
                        </div>
                    </div>

                    {/* Reverb Controls */}
                    <div className="flex flex-col gap-2 items-center bg-white/5 p-3 rounded-xl border border-white/5 min-w-[80px]">
                        <label className="text-[10px] text-fuchsia-400 font-bold tracking-widest uppercase mb-1 drop-shadow-[0_0_5px_rgba(232,121,249,0.5)]">Reverb</label>

                        {/* Preset Toggles */}
                        <div className="flex bg-black/40 p-1 rounded-lg border border-fuchsia-500/20 gap-1 w-full">
                            {['room', 'hall', 'space'].map((r: string) => (
                                <button
                                    key={r}
                                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                                    onClick={() => updateEngine({ reverbPreset: r as any })}
                                    className={`flex-1 py-1 text-[8px] uppercase font-bold rounded transition-all leading-none
                                            ${config.reverbPreset === r
                                            ? 'bg-fuchsia-500 text-black shadow-[0_0_10px_rgba(232,121,249,0.5)]'
                                            : 'text-fuchsia-500/40 hover:text-fuchsia-400 hover:bg-white/5'}`}
                                >
                                    {r}
                                </button>
                            ))}
                        </div>

                        <Knob
                            label="Send"
                            value={config.reverbMix}
                            min={0}
                            max={1}
                            step={0.01}
                            onChange={(v) => updateEngine({ reverbMix: v })}
                            color="bg-fuchsia-400"
                            size={48}
                        />
                    </div>
                </div>

                {/* LFO & Envelopes Container */}
                <div className="flex flex-col md:flex-row gap-4 mt-2">
                    {/* LFO Section */}
                    <div className="flex-1">
                        <div className="flex justify-between items-baseline border-b border-cyan-500/30 pb-1 mb-2 shadow-[0_1px_5px_rgba(34,211,238,0.2)]">
                            <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400">LFO</h3>
                        </div>

                        <div className="space-y-3">
                            {/* Routing Toggles */}
                            <div>
                                <label className="text-[9px] text-yellow-400 block mb-1 font-mono tracking-wider">TARGETS</label>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => updateEngine({ lfoFilterMod: !config.lfoFilterMod })}
                                        className={`flex-1 py-1 px-1 text-[8px] uppercase font-mono rounded-sm border transition-all ${config.lfoFilterMod ? 'bg-yellow-600 border-yellow-400 text-white shadow-[0_0_8px_rgba(234,179,8,0.6)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700'}`}
                                    >
                                        FILTER
                                    </button>
                                    <button
                                        onClick={() => updateEngine({ lfoAmpMod: !config.lfoAmpMod })}
                                        className={`flex-1 py-1 px-1 text-[8px] uppercase font-mono rounded-sm border transition-all ${config.lfoAmpMod ? 'bg-yellow-600 border-yellow-400 text-white shadow-[0_0_8px_rgba(234,179,8,0.6)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700'}`}
                                    >
                                        AMP
                                    </button>
                                </div>
                            </div>

                            <div>
                                <label className="text-[9px] text-yellow-400 block mb-1 font-mono tracking-wider">WAVEFORM</label>
                                <div className="flex gap-1">
                                    {WAVEFORMS.map(w => (
                                        <button
                                            key={`lfo-${w}`}
                                            onClick={() => updateEngine({ lfoWaveform: w })}
                                            className={`flex-1 py-1 px-1 text-[8px] uppercase font-mono rounded-sm border transition-all ${config.lfoWaveform === w ? 'bg-yellow-600 border-yellow-400 text-white shadow-[0_0_8px_rgba(234,179,8,0.6)]' : 'bg-zinc-900 border-zinc-800 text-zinc-500 hover:text-white hover:border-zinc-700'}`}
                                        >
                                            {w.substring(0, 3)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div className="flex justify-center gap-4">
                                <Knob
                                    label="Rate"
                                    value={config.lfoRate}
                                    min={0.01}
                                    max={20}
                                    step={0.01}
                                    onChange={(v) => updateEngine({ lfoRate: v })}
                                    color="bg-yellow-400"
                                    size={40}
                                />
                                <Knob
                                    label="Depth"
                                    value={config.lfoDepth}
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    onChange={(v) => updateEngine({ lfoDepth: v })}
                                    color="bg-yellow-400"
                                    size={40}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Envelopes */}
                    <div className="flex-[2] space-y-2">
                        <h3 className="text-[10px] font-mono uppercase tracking-[0.2em] text-cyan-400 border-b border-cyan-500/30 pb-1 shadow-[0_1px_5px_rgba(34,211,238,0.2)]">Envelopes</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Amp */}
                            <div className="flex flex-col items-center">
                                <h4 className="text-[9px] text-lime-400 font-mono font-semibold mb-2 uppercase tracking-wider text-center">AMP - ADSR</h4>
                                <div className="flex justify-center gap-2">
                                    {['attack', 'decay', 'sustain', 'release'].map((p) => (
                                        <Knob
                                            key={`amp-${p}`}
                                            label={p.substring(0, 3)}
                                            value={config.ampADSR[p as keyof SynthConfig['ampADSR']]}
                                            min={0.01}
                                            max={p === 'sustain' ? 1 : 2}
                                            onChange={(v) => updateADSR('ampADSR', p as keyof SynthConfig['ampADSR'], v)}
                                            size={36}
                                            color="bg-lime-400"
                                        />
                                    ))}
                                </div>
                            </div>
                            {/* Filter Mod */}
                            <div className="flex flex-col items-center">
                                <h4 className="text-[9px] text-cyan-400 font-mono font-semibold mb-2 uppercase tracking-wider text-center">FILTER - ADSR</h4>
                                <div className="flex justify-center gap-2">
                                    {['attack', 'release'].map((p) => (
                                        <Knob
                                            key={`filter-${p}`}
                                            label={p.substring(0, 3)}
                                            value={config.filterADSR[p as keyof SynthConfig['filterADSR']]}
                                            min={0.01}
                                            max={p === 'attack' ? 10 : 2}
                                            onChange={(v) => updateADSR('filterADSR', p as keyof SynthConfig['filterADSR'], v)}
                                            size={36}
                                            color="bg-cyan-400"
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SynthControls;
