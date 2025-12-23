
import React from 'react';

interface KeyProps {
    note: string;
    frequency: number;
    isBlack: boolean;
    isActive: boolean;
    onMouseDown: () => void;
    onMouseUp: () => void;
    onMouseEnter: () => void;
}

const Key: React.FC<KeyProps> = ({ isBlack, isActive, onMouseDown, onMouseUp, onMouseEnter }) => {
    // Reduced widths for 3-octave layout
    const baseClasses = "relative cursor-pointer transition-all duration-100 select-none z-10";

    // White Key: w-10 (2.5rem/40px)
    const whiteKeyClasses = `
    w-10 h-48 bg-white border border-gray-300 rounded-b-sm 
    active:bg-gray-200 active:scale-[0.98] origin-top
    ${isActive ? 'bg-gray-200 scale-[0.98] shadow-inner' : 'shadow-md'}
  `;

    // Black Key: w-6 (1.5rem/24px)
    // Negative Margin: -mx-3 (half of w-6) to center on line
    const blackKeyClasses = `
    w-6 h-32 bg-gray-900 border border-black rounded-b-sm z-20 -mx-3
    active:bg-gray-800 active:scale-[0.98] origin-top text-white
    ${isActive ? 'bg-gray-800 scale-[0.98] shadow-inner' : 'shadow-lg'}
  `;

    return (
        <div
            className={`${baseClasses} ${isBlack ? blackKeyClasses : whiteKeyClasses}`}
            onMouseDown={onMouseDown}
            onMouseUp={onMouseUp}
            onMouseLeave={onMouseUp}
            onMouseEnter={(e) => {
                if (e.buttons === 1) onMouseEnter(); // Support dragging
            }}
        >
            {/* Visual shine/reflection for "premium" look */}
            <div className={`absolute pointer-events-none ${isBlack ? 'top-0 left-1 w-4 h-28 bg-gradient-to-b from-gray-700 to-transparent opacity-50 rounded-b-sm' : 'bottom-0 left-0 w-full h-8 bg-gradient-to-t from-gray-100 to-transparent opacity-50'}`} />
        </div>
    );
};

export default Key;
