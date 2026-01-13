
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Key from './Key';
import { audioEngine } from '../utils/AudioEngine';

interface NoteDef {
    note: string;
    freq: number;
    type: 'white' | 'black';
}

interface PianoProps {
    onNotePlay?: (note: string, freq: number) => void;
}

const Piano: React.FC<PianoProps> = ({ onNotePlay }) => {
    const [activeNotes, setActiveNotes] = useState<Set<string>>(new Set());
    const activeOscillators = useRef<Map<string, () => void>>(new Map());

    // Generate 3 Octaves: C3 (MIDI 48) to B5 (MIDI 83)
    // Frequency formula: f = 440 * 2^((n - 69) / 12)
    const notes: NoteDef[] = React.useMemo(() => {
        const generated: NoteDef[] = [];
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const startOctave = 3;
        const endOctave = 5; // Inclusive of full octave

        for (let oct = startOctave; oct <= endOctave; oct++) {
            for (let i = 0; i < 12; i++) {
                const midi = oct * 12 + i + 12; // C3 is MIDI 48. 3*12 + 0 + 12 = 48.
                // Wait, standard: C4 = 60.
                // oct=3, i=0 (C) -> 3*12+0 = 36? No. MIDI 60 is C4.
                // MIDI note = (octave + 1) * 12 + noteIndex.
                // C3 = (3+1)*12 + 0 = 48. Correct.

                const freq = 440 * Math.pow(2, (midi - 69) / 12);
                const name = noteNames[i];
                const type = name.includes('#') ? 'black' : 'white';

                generated.push({
                    note: `${name}${oct}`,
                    freq,
                    type,
                });
            }
        }
        // Add High C (C6)
        const c6Midi = (6 + 1) * 12 + 0; // 84
        generated.push({
            note: 'C6',
            freq: 440 * Math.pow(2, (c6Midi - 69) / 12),
            type: 'white'
        });

        return generated;
    }, []);

    const midiNoteToFrequency = (note: number) => {
        return 440 * Math.pow(2, (note - 69) / 12);
    };

    const midiNoteToName = (note: number) => {
        const noteNames = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
        const octave = Math.floor(note / 12) - 1;
        const index = note % 12;
        return `${noteNames[index]}${octave}`;
    };

    const startPlaying = useCallback((note: string, freq: number) => {
        if (activeOscillators.current.has(note)) return;

        const stopNode = audioEngine.playNote(freq);
        activeOscillators.current.set(note, stopNode);

        // Notify parent (Sequencer Recording)
        if (onNotePlay) {
            onNotePlay(note, freq);
        }

        setActiveNotes((prev) => {
            const next = new Set(prev);
            next.add(note);
            return next;
        });
    }, [onNotePlay]);

    const stopPlaying = useCallback((note: string) => {
        const stopNode = activeOscillators.current.get(note);
        if (stopNode) {
            stopNode();
            activeOscillators.current.delete(note);
        }

        setActiveNotes((prev) => {
            const next = new Set(prev);
            next.delete(note);
            return next;
        });
    }, []);

    // Simplified keyboard mapping for just the middle octave (C4-E5 range) to keep it usable
    // or we could map more if needed. For now, let's keep the existing "ASDF" row mapped to C4 start.
    useEffect(() => {
        const keyMap: Record<string, string> = {
            'a': 'C4', 'w': 'C#4', 's': 'D4', 'e': 'D#4', 'd': 'E4', 'f': 'F4', 't': 'F#4',
            'g': 'G4', 'y': 'G#4', 'h': 'A4', 'u': 'A#4', 'j': 'B4', 'k': 'C5', 'o': 'C#5',
            'l': 'D5', 'p': 'D#5', ';': 'E5'
        };

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.repeat) return;
            const noteName = keyMap[e.key.toLowerCase()];
            if (noteName) {
                const noteDef = notes.find(n => n.note === noteName);
                if (noteDef) startPlaying(noteDef.note, noteDef.freq);
            }
        };

        const handleKeyUp = (e: KeyboardEvent) => {
            const noteName = keyMap[e.key];
            if (noteName) {
                stopPlaying(noteName);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);

        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [startPlaying, stopPlaying, notes]);

    // MIDI Support
    useEffect(() => {
        if (!navigator.requestMIDIAccess) return;

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const onMIDIMessage = (message: any) => {
            const [command, note, velocity] = message.data;
            const noteName = midiNoteToName(note);
            // We can just calculate freq on the fly or look it up. Calculating is safer for range.
            const freq = midiNoteToFrequency(note);

            // Note On (144)
            if (command === 144 && velocity > 0) {
                startPlaying(noteName, freq);
            }
            // Note Off (128) or Note On with 0 velocity
            else if (command === 128 || (command === 144 && velocity === 0)) {
                stopPlaying(noteName);
            }
        };

        navigator.requestMIDIAccess().then((access) => {
            // Attach to all inputs
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const inputs = (access as any).inputs.values();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            for (const input of inputs) {
                input.onmidimessage = onMIDIMessage;
            }

            // Handle new connections
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            access.onstatechange = (e: any) => {
                const port = e.port;
                if (port.type === 'input' && port.state === 'connected') {
                    port.onmidimessage = onMIDIMessage;
                }
            };
        });

        // Cleanup isn't strictly necessary for the global listener but good practice if we stored references.
        // MIDI Access object doesn't really have a "disconnect" listener method easily.
    }, [startPlaying, stopPlaying]);

    return (
        <div className="relative w-full flex justify-center">
            <div className="flex justify-center items-start overflow-hidden bg-black p-1 relative z-10 w-full rounded-sm shadow-xl">
                {notes.map((n) => (
                    <Key
                        key={n.note}
                        note={n.note}
                        frequency={n.freq}
                        isBlack={n.type === 'black'}
                        isActive={activeNotes.has(n.note)}
                        onMouseDown={() => startPlaying(n.note, n.freq)}
                        onMouseUp={() => stopPlaying(n.note)}
                        onMouseEnter={() => {
                            startPlaying(n.note, n.freq); // Click-drag support
                        }}
                    />
                ))}
            </div>
        </div>
    );
};

export default Piano;
