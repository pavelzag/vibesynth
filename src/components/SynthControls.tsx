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

                    <div className="flex justify-center gap-8 pt-1">
                        <Knob
                            label="Cutoff"
                            value={config.filterCutoff}
                            min={20}
                            max={10000}
                            step={10}
                            onChange={(v) => updateEngine({ filterCutoff: v })}
                            color="bg-cyan-400"
                            size={54}
                        />
                        <Knob
                            label="Resonance"
                            value={config.filterResonance}
                            min={0}
                            max={20}
                            step={0.1}
                            onChange={(v) => updateEngine({ filterResonance: v })}
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
                                        min={0.1}
                                        max={20}
                                        step={0.1}
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
                                <div>
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
                                <div>
                                    <h4 className="text-[9px] text-cyan-400 font-mono font-semibold mb-2 uppercase tracking-wider text-center">FILTER - ADSR</h4>
                                    <div className="flex justify-center gap-2">
                                        {['attack', 'decay', 'sustain', 'release'].map((p) => (
                                            <Knob
                                                key={`filter-${p}`}
                                                label={p.substring(0, 3)}
                                                value={config.filterADSR[p as keyof SynthConfig['filterADSR']]}
                                                min={0.01}
                                                max={p === 'sustain' ? 1 : 2}
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
        </div>
    );
};

export default SynthControls;
