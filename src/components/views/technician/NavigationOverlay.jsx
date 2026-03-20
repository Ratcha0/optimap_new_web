import React from 'react';
import ManeuverIcon from '../../ui/ManeuverIcon';

export default function NavigationOverlay({
    isNavigating,
    isWaitingForContinue,
    currentInstruction,
    currentSpeed,
    autoSnapPaused,
    isImmersive,
    onStopNavigation,
    onContinueNavigation,
    onHUDToggle,
    remainingDistance,
    nextManeuver,
    secondNextManeuver,
    isHudMode
}) {
    if ((!isNavigating && currentSpeed <= 0 && !isImmersive) || isHudMode) return null;

    const formatDistance = (m) => {
        if (!m) return '0 ม.';
        if (m >= 1000) return `${(m / 1000).toFixed(1)} กม.`;
        return `${Math.round(m)} ม.`;
    };

    const showSecondManeuver = secondNextManeuver && nextManeuver && nextManeuver.afterDistance < 300;

    return (
        <div className="pointer-events-none absolute inset-0 z-[3000]">
            {isNavigating && !isWaitingForContinue && (
                <div className="absolute top-2 sm:top-4 left-1/2 -translate-x-1/2 w-[94%] sm:w-[90%] max-w-lg pointer-events-auto animate-in slide-in-from-top duration-500">
                    <div className="bg-emerald-600/95 backdrop-blur-2xl rounded-2xl sm:rounded-[2rem] p-2 sm:p-4 shadow-2xl flex items-center gap-2 sm:gap-4 border border-white/10 overflow-hidden relative">
                        <div className="absolute bottom-0 left-0 h-0.5 bg-white/20 w-full"></div>
                        
                        <div className="flex flex-col items-center justify-center shrink-0 min-w-[50px] sm:min-w-[70px]">
                            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-white rounded-xl sm:rounded-2xl flex items-center justify-center text-emerald-600 shadow-xl mb-0.5 sm:mb-1">
                                <ManeuverIcon 
                                    maneuver={nextManeuver && nextManeuver.distance > 500 ? { ...nextManeuver, modifier: 'straight' } : nextManeuver} 
                                    className="w-5 h-5 sm:w-8 sm:h-8" 
                                />
                            </div>
                            <span className="text-white font-black text-[9px] sm:text-xs tracking-tight">
                                {nextManeuver ? formatDistance(nextManeuver.distance) : ''}
                            </span>
                        </div>

                        <div className="flex-1 min-w-0">
                            <p className="text-emerald-100/60 font-black text-[9px] sm:text-[10px] uppercase tracking-widest mb-0.5">
                                {nextManeuver && nextManeuver.distance > 500 ? 'ขับต่อไปตามทาง' : 'เลี้ยวถัดไป'}
                            </p>
                            <h3 className="text-white font-black text-xs sm:text-lg uppercase leading-tight truncate">
                                {nextManeuver && nextManeuver.distance > 500 
                                    ? `ตรงไปอีก ${formatDistance(nextManeuver.distance)} ${nextManeuver.instruction}`
                                    : (nextManeuver?.instruction || currentInstruction || 'ตรงไป')}
                            </h3>
                            
                            {showSecondManeuver && (
                                <div className="mt-0.5 flex items-center gap-1.5 bg-black/10 rounded-lg px-2 py-0.5 w-fit border border-white/5">
                                    <span className="text-emerald-100/80 font-black text-[8px] sm:text-[10px] uppercase tracking-wide">แล้ว</span>
                                    <ManeuverIcon maneuver={secondNextManeuver} className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 text-white" />
                                    <span className="text-white/90 font-bold text-[8px] sm:text-[10px] truncate max-w-[120px]">
                                        {secondNextManeuver.instruction}
                                    </span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <button
                                onClick={onHUDToggle}
                                className="bg-white/10 hover:bg-white/20 text-white font-black px-2.5 sm:px-4 py-1 sm:py-1.5 rounded-lg text-[7px] sm:text-[9px] uppercase tracking-widest transition-all active:scale-90 border border-white/5 shrink-0 flex items-center justify-center gap-1"
                            >
                                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                </svg>
                                HUD
                            </button>
                            <button
                                onClick={onStopNavigation}
                                className="bg-red-500/20 hover:bg-red-500/40 text-red-100 font-black px-2.5 sm:px-4 py-1.5 sm:py-2.5 rounded-lg text-[8px] sm:text-[10px] uppercase tracking-widest transition-all active:scale-90 border border-red-500/20 shrink-0"
                            >
                                สิ้นสุด
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    );
}
