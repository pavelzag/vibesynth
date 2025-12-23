
import React, { useState, useEffect, useCallback, useRef } from 'react';

interface KnobProps {
    value: number;
    min: number;
    max: number;
    step?: number;
    label?: string;
    onChange: (value: number) => void;
    size?: number;
    color?: string;
}

const Knob: React.FC<KnobProps> = ({
    value,
    min,
    max,
    step = 0.01,
    label,
    onChange,
    size = 64,
    color = 'bg-cyan-500' // Using tailwind class logic, but here we might need hex for SVG or just class
}) => {
    const [isDragging, setIsDragging] = useState(false);
    const startY = useRef<number>(0);
    const startValue = useRef<number>(0);

    // Calculate rotation: -135deg to +135deg (total 270deg)
    const normalize = (val: number) => (val - min) / (max - min);
    const rotation = -135 + (normalize(value) * 270);

    const handleMouseDown = useCallback((e: React.MouseEvent) => {
        setIsDragging(true);
        startY.current = e.clientY;
        startValue.current = value;
        document.body.style.cursor = 'ns-resize';
    }, [value]);

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;

            const deltaY = startY.current - e.clientY; // Up is positive
            const range = max - min;
            const sensitivity = 200; // Pixels for full range
            const deltaValue = (deltaY / sensitivity) * range;

            let newValue = startValue.current + deltaValue;

            // Clamp and Step
            newValue = Math.max(min, Math.min(max, newValue));
            if (step) {
                newValue = Math.round(newValue / step) * step;
            }

            onChange(newValue);
        };

        const handleMouseUp = () => {
            setIsDragging(false);
            document.body.style.cursor = 'default';
        };

        if (isDragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
    }, [isDragging, min, max, step, onChange]);

    // Color mapping to hex for SVG (simplified)
    const activeColor = color.includes('indigo') ? '#6366f1' :
        color.includes('purple') ? '#a855f7' :
            color.includes('cyan') ? '#06b6d4' : '#0ea5e9';

    return (
        <div className="flex flex-col items-center gap-2 select-none">
            <div
                className="relative cursor-ns-resize group"
                style={{ width: size, height: size }}
                onMouseDown={handleMouseDown}
            >
                {/* Background Track */}
                <svg width={size} height={size} viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="#1f2937" className="group-hover:fill-gray-700 transition-colors" />

                    {/* Tick Marks (Optional) */}
                    <path d="M50 90 L50 95" stroke="#4b5563" strokeWidth="2" transform="rotate(-135 50 50)" />
                    <path d="M50 90 L50 95" stroke="#4b5563" strokeWidth="2" transform="rotate(135 50 50)" />

                    {/* Indicator */}
                    <g transform={`rotate(${rotation} 50 50)`}>
                        <rect x="47" y="10" width="6" height="20" rx="2" fill={activeColor} />
                    </g>

                    {/* Center Cap */}
                    <circle cx="50" cy="50" r="35" fill="url(#grad1)" stroke="#374151" strokeWidth="1" />
                    <defs>
                        <radialGradient id="grad1" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
                            <stop offset="0%" stopColor="#374151" />
                            <stop offset="100%" stopColor="#111827" />
                        </radialGradient>
                    </defs>
                </svg>
            </div>
            {label && <span className="text-[10px] uppercase font-bold text-white/60 tracking-wider">{label}</span>}
            {/* Value tooltip on hover or just text */}
            <span className="text-[9px] text-white/30 font-mono">{value.toFixed(2)}</span>
        </div>
    );
};

export default Knob;
