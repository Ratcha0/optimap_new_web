import React from 'react';
import ManeuverIcon from '../../ui/ManeuverIcon';

export default function HUDOverlay({
    isNavigating,
    nextManeuver,
    currentSpeed,
    remainingDistance,
    eta,
    onClose,
    isHudMode 
}) {
   
    if (!isNavigating || !isHudMode) return null;

    const formatDistance = (m) => {
        if (!m) return '0 m';
        if (m >= 1000) return `${(m / 1000).toFixed(1)} km`;
        return `${Math.round(m)} m`;
    };

    return (
        <div className="fixed inset-0 z-[9999] bg-transparent pointer-events-none p-6 sm:p-12 flex flex-col justify-between"
             style={{ transform: 'scaleX(-1)' }}>
            
            {/* Top Section: Navigation Info shifted to the side */}
            <div className="flex justify-between items-start">
                <div className="flex flex-col items-center gap-1.5 bg-black/30 p-3 rounded-[1.5rem] border-2 border-[#00FF00]/50 shadow-lg">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-xl flex items-center justify-center text-black">
                        <ManeuverIcon 
                            maneuver={nextManeuver && nextManeuver.distance > 500 ? { ...nextManeuver, modifier: 'straight' } : nextManeuver} 
                            className="w-10 h-10 sm:w-12 sm:h-12" 
                        />
                    </div>
                    <div className="text-2xl sm:text-4xl font-black text-[#00FF00] tracking-tighter drop-shadow-[0_0_10px_#00FF00]">
                        {nextManeuver ? formatDistance(nextManeuver.distance) : '---'}
                    </div>
                </div>

                {/* HUD Toggle Close Button (Mirrored) */}
                <button 
                    onClick={onClose}
                    className="bg-white/10 p-4 rounded-full text-white active:scale-95 transition-all pointer-events-auto"
                >
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Middle Section: CLEAR for route line visibility */}
            <div className="flex-grow"></div>

            {/* Bottom Section: Speed and Stats pushed to corners */}
            <div className="flex justify-between items-end">
                {/* Speed on the left - High Lum White */}
                <div className="text-left bg-black/30 px-6 py-2 rounded-[2rem] border border-white/10">
                    <div className="text-6xl sm:text-[9rem] font-black text-white leading-none drop-shadow-[0_0_20px_rgba(255,255,255,0.4)]">
                        {Math.round(currentSpeed * 3.6)}
                    </div>
                </div>

                {/* Stats on the right - High Viz Green */}
                <div className="flex flex-col gap-3 items-end bg-black/30 px-6 py-4 rounded-[2rem] border border-[#00FF00]/20">
                    <div className="text-right">
                        <div className="text-3xl sm:text-6xl font-black text-white leading-none">
                            {remainingDistance ? (remainingDistance / 1000).toFixed(1) : '0.0'}
                        </div>
                    </div>
                    <div className="text-right border-t-2 border-[#00FF00]/30 pt-2">
                        <div className="text-3xl sm:text-6xl font-black text-[#00FF00] leading-none drop-shadow-[0_0_15px_#00FF00]">
                            {eta || '--'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
