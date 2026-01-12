import React, { useEffect, useRef } from 'react';

interface OscilloscopeProps {
    analyser: AnalyserNode;
}

const Oscilloscope: React.FC<OscilloscopeProps> = ({ analyser }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        let animationId: number;

        const draw = () => {
            animationId = requestAnimationFrame(draw);

            analyser.getByteTimeDomainData(dataArray);

            // Responsive sizing
            const width = canvas.width;
            const height = canvas.height;

            // Clear with CRT-like dark background
            ctx.fillStyle = '#0a0a0a';
            ctx.fillRect(0, 0, width, height);

            // Draw Grid
            ctx.lineWidth = 1;
            ctx.strokeStyle = 'rgba(0, 255, 0, 0.1)';
            ctx.beginPath();
            // Vertical lines
            for (let i = 0; i < width; i += 40) {
                ctx.moveTo(i, 0);
                ctx.lineTo(i, height);
            }
            // Horizontal lines
            for (let i = 0; i < height; i += 40) {
                ctx.moveTo(0, i);
                ctx.lineTo(width, i);
            }
            ctx.stroke();

            // Draw Waveform
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#00ff00'; // Green Phosphor
            ctx.shadowBlur = 4;
            ctx.shadowColor = '#00ff00'; // Glow

            ctx.beginPath();

            const sliceWidth = width * 1.0 / bufferLength;
            let x = 0;

            for (let i = 0; i < bufferLength; i++) {
                const v = dataArray[i] / 128.0; // 0..2 mapping
                const y = v * height / 2;

                if (i === 0) {
                    ctx.moveTo(x, y);
                } else {
                    ctx.lineTo(x, y);
                }

                x += sliceWidth;
            }

            ctx.lineTo(canvas.width, canvas.height / 2);
            ctx.stroke();

            // Reset shadow for next frame (performance)
            ctx.shadowBlur = 0;
        };

        draw();

        return () => {
            cancelAnimationFrame(animationId);
        };
    }, [analyser]);

    return (
        <div className="w-full h-32 bg-black rounded-xl border-2 border-zinc-800 overflow-hidden shadow-[inset_0_0_20px_rgba(0,0,0,0.8)] relative group">
            {/* Screen Glare Reflection Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-xl" />

            <canvas
                ref={canvasRef}
                width={800}
                height={200}
                className="w-full h-full"
            />
        </div>
    );
};

export default Oscilloscope;
