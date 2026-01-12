
import React, { useState, useEffect, useRef } from 'react';
import { audioEngine } from '../utils/AudioEngine';

interface SequencerProps {
    currentNote: { note: string; freq: number } | null; // For recording
    onPlayStep: (note: string) => void; // Optional visual feedback to App/Piano?
}

interface StepData {
    note: string;
    freq: number;
    active: boolean;
}

const Sequencer: React.FC<SequencerProps> = ({ currentNote }) => {
    // 16 Steps
    const [steps, setSteps] = useState<StepData[]>(Array(16).fill({ note: '', freq: 0, active: false }));
    const [isPlaying, setIsPlaying] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [currentStep, setCurrentStep] = useState(0);
    const [bpm, setBpm] = useState(120);

    // Refs for timer to avoid closure staleness
    const timerRef = useRef<number | null>(null);
    const stepRef = useRef(0);
    const stepsRef = useRef(steps);

    // Keep ref synced
    useEffect(() => {
        stepsRef.current = steps;
    }, [steps]);

    // Handle incoming note for Recording
    useEffect(() => {
        if (isRecording && currentNote) {
            const newSteps = [...stepsRef.current];

            if (isPlaying) {
                // Live Recording: Quantize to current playing step
                newSteps[stepRef.current] = {
                    note: currentNote.note,
                    freq: currentNote.freq,
                    active: true
                };
                setSteps(newSteps);
            } else {
                // Step Recording: Enter note at selected step and advance
                newSteps[currentStep] = {
                    note: currentNote.note,
                    freq: currentNote.freq,
                    active: true
                };
                setSteps(newSteps);
                // Advance cursor for next step entry
                setCurrentStep((prev) => (prev + 1) % 16);
            }
        }
    }, [currentNote, isRecording, isPlaying]);

    // Scheduler
    useEffect(() => {
        if (isPlaying) {
            const msPerStep = (60000 / bpm) / 4; // 16th notes

            const runStep = () => {
                const current = stepRef.current;
                setCurrentStep(current);

                // Play Note
                const stepData = stepsRef.current[current];
                if (stepData.active) {
                    const stopNote = audioEngine.playNote(stepData.freq);
                    // Short gate times for sequencer
                    setTimeout(() => stopNote(), msPerStep * 0.8);
                }

                // Advance
                stepRef.current = (current + 1) % 16;
                timerRef.current = window.setTimeout(runStep, msPerStep);
            };

            runStep();
        } else {
            if (timerRef.current) clearTimeout(timerRef.current);
            // When stopping, sync stepRef to current visual cursor so it resumes from there?
            // Or just reset? Let's sync stepRef to currentStep for smoother resume.
            stepRef.current = currentStep;
        }

        return () => {
            if (timerRef.current) clearTimeout(timerRef.current);
        };
    }, [isPlaying, bpm]);

    const toggleStep = (index: number) => {
        const newSteps = [...steps];

        // Always select the clicked step for potential editing
        setCurrentStep(index);

        // Toggle active state
        if (newSteps[index].note) {
            newSteps[index] = { ...newSteps[index], active: !newSteps[index].active };
        } else {
            // Default to C4 if enabling an empty step manually
            newSteps[index] = { note: 'C4', freq: 261.63, active: true };
        }
        setSteps(newSteps);
    };

    const randomize = () => {
        const notes = [
            { n: 'C3', f: 130.81 }, { n: 'D#3', f: 155.56 }, { n: 'F3', f: 174.61 }, { n: 'G3', f: 196.00 },
            { n: 'A#3', f: 233.08 }, { n: 'C4', f: 261.63 }, { n: 'D#4', f: 311.13 }, { n: 'G4', f: 392.00 }
        ];
        const newSteps = Array(16).fill(null).map(() => {
            if (Math.random() > 0.4) {
                const pick = notes[Math.floor(Math.random() * notes.length)];
                return { note: pick.n, freq: pick.f, active: true };
            }
            return { note: '', freq: 0, active: false };
        });
        setSteps(newSteps);
    };

    const clear = () => {
        setSteps(Array(16).fill({ note: '', freq: 0, active: false }));
    };

    return (
        <div className="w-full bg-zinc-900/80 border border-white/5 rounded-xl p-4 flex flex-col gap-4 shadow-xl backdrop-blur-md">
            {/* Header: Controls */}
            <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <div className="flex items-center gap-4">
                    {/* BPM */}
                    <div className="flex items-center gap-2 bg-black/50 p-1.5 rounded border border-white/10">
                        <span className="text-[10px] text-cyan-500 font-mono tracking-wider">BPM</span>
                        <div className="w-12 text-center text-red-500 font-mono font-bold text-xl leading-none drop-shadow-[0_0_5px_rgba(239,68,68,0.8)]">
                            {bpm}
                        </div>
                        <div className="flex flex-col gap-0.5">
                            <button onClick={() => setBpm(b => Math.min(300, b + 1))} className="w-4 h-3 bg-zinc-800 hover:bg-zinc-700 text-[8px] text-white flex items-center justify-center rounded-sm">▲</button>
                            <button onClick={() => setBpm(b => Math.max(30, b - 1))} className="w-4 h-3 bg-zinc-800 hover:bg-zinc-700 text-[8px] text-white flex items-center justify-center rounded-sm">▼</button>
                        </div>
                    </div>

                    {/* Transport */}
                    <div className="flex gap-2">
                        <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${isPlaying ? 'bg-green-500/20 border-green-500 text-green-500 shadow-[0_0_15px_rgba(34,197,94,0.3)]' : 'bg-zinc-800 border-zinc-700 text-green-700 hover:text-green-500/50'}`}
                        >
                            {isPlaying ? <div className="w-3 h-3 bg-current rounded-sm" /> : <div className="w-0 h-0 border-t-[6px] border-t-transparent border-l-[10px] border-l-current border-b-[6px] border-b-transparent ml-1" />}
                        </button>
                        <button
                            onClick={() => setIsRecording(!isRecording)}
                            className={`w-10 h-10 flex items-center justify-center rounded-lg border transition-all ${isRecording ? 'bg-red-500/20 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] animate-pulse' : 'bg-zinc-800 border-zinc-700 text-red-900/50 hover:text-red-500/50'}`}
                        >
                            <div className="w-3 h-3 bg-current rounded-full" />
                        </button>
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                    <button onClick={randomize} className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[10px] text-cyan-500 uppercase font-mono tracking-wider">
                        Randomize
                    </button>
                    <button onClick={clear} className="px-3 py-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 rounded text-[10px] text-zinc-500 uppercase font-mono tracking-wider">
                        Clear
                    </button>
                </div>
            </div>

            {/* Steps Grid */}
            <div className="grid grid-cols-8 md:grid-cols-16 gap-1.5 md:gap-2">
                {steps.map((step, i) => {
                    const isCurrent = currentStep === i;
                    return (
                        <button
                            key={i}
                            onClick={() => toggleStep(i)}
                            className={`
                                relative group h-12 md:h-16 rounded border transition-all duration-75 flex flex-col items-center justify-end pb-1 overflow-hidden
                                ${step.active
                                    ? 'bg-cyan-500/20 border-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.3)]'
                                    : 'bg-zinc-900/50 border-white/5 hover:border-white/10'
                                }
                                ${isCurrent ? 'ring-2 ring-white ring-offset-2 ring-offset-black z-10' : ''}
                            `}
                        >
                            {/* Indicator Bars */}
                            {step.active && (
                                <div className="absolute top-0 left-0 w-full h-full bg-cyan-400/10" />
                            )}

                            {/* LED indicator */}
                            <div className={`w-1.5 h-1.5 rounded-full mb-auto mt-2 transition-all ${isCurrent ? (step.active ? 'bg-white shadow-[0_0_10px_white]' : 'bg-white/20') : (step.active ? 'bg-cyan-400' : 'bg-zinc-800')}`} />

                            {/* Note Label */}
                            <span className={`text-[9px] font-mono ${step.active ? 'text-cyan-300' : 'text-zinc-700'}`}>
                                {step.active ? step.note : i + 1}
                            </span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

export default Sequencer;
