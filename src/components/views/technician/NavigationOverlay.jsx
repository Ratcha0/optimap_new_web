import React from 'react';

export default function NavigationOverlay({
    isNavigating,
    isWaitingForContinue,
    currentInstruction,
    currentSpeed,
    autoSnapPaused,
    isImmersive,
    onStopNavigation,
    onContinueNavigation,
    onRecenter
}) {
    if (!isNavigating && currentSpeed <= 0 && !isImmersive) return null;

    return (
        <div className="pointer-events-none absolute inset-0 z-[3000]">
            {isNavigating && !isWaitingForContinue && (
                <div className="absolute top-4 sm:top-6 left-1/2 -translate-x-1/2 w-[92%] sm:w-[90%] max-w-lg pointer-events-auto animate-in slide-in-from-top duration-500">
                    <div className="bg-emerald-600/90 backdrop-blur-xl rounded-2xl sm:rounded-[2rem] p-2.5 sm:p-5 shadow-2xl flex items-center gap-2.5 sm:gap-4 border border-emerald-500/30">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-white/20 rounded-xl sm:rounded-2xl flex items-center justify-center text-white shrink-0">
                            <svg className="w-5 h-5 sm:w-6 sm:h-6 rotate-45" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 10l7-7m0 0l7 7m-7-7v18" />
                            </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-[8px] sm:text-[10px] text-emerald-100 font-black uppercase tracking-widest opacity-60 mb-0.5 sm:mb-1">คำแนะนำเส้นทาง</p>
                            <h3 className="text-white font-black text-xs sm:text-sm uppercase leading-tight truncate">{currentInstruction || 'กำลังคำนวณ...'}</h3>
                        </div>
                        <button
                            onClick={onStopNavigation}
                            className="bg-black/20 hover:bg-black/40 text-white font-black px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg sm:rounded-xl text-[9px] sm:text-[10px] uppercase tracking-widest transition-all active:scale-90 border border-white/10"
                        >
                            สิ้นสุด
                        </button>
                    </div>
                </div>
            )}

            {isNavigating && autoSnapPaused && (
                <button
                    onClick={onRecenter}
                    className="absolute right-6 top-32 pointer-events-auto w-14 h-14 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl shadow-2xl shadow-blue-500/40 flex items-center justify-center transition-all active:scale-90 border border-blue-400/30 animate-in zoom-in duration-300"
                    title="ล็อคกล้องที่ตำแหน่งรถ"
                >
                    <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                </button>
            )}

        </div>
    );
}
