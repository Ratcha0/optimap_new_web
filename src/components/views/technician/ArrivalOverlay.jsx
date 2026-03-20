import React, { useState, useRef } from 'react';

export default function ArrivalOverlay({ isVisible, onContinue, onStop }) {
    const [isMinimized, setIsMinimized] = useState(false);
    const [pos, setPos] = useState({ x: 0, y: 0 });
    const dragging = useRef(false);
    const start = useRef({ x: 0, y: 0 });
    const dist = useRef(0);

    if (!isVisible) return null;

    const onPD = (e) => {
        dragging.current = true;
        start.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
        dist.current = 0;
        e.currentTarget.setPointerCapture(e.pointerId);
    };

    const onPM = (e) => {
        if (!dragging.current) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const maxX = (window.innerWidth / 2) - (rect.width / 2) - 10;
        const maxY = 80;
        const minX = -maxX;
        const minY = -(window.innerHeight - 180);

        const nx = Math.max(minX, Math.min(maxX, e.clientX - start.current.x));
        const ny = Math.max(minY, Math.min(maxY, e.clientY - start.current.y));
        
        dist.current += Math.abs(nx - pos.x) + Math.abs(ny - pos.y);
        setPos({ x: nx, y: ny });
    };

    const onPU = () => {
        dragging.current = false;
        if (dist.current < 10) {
            setIsMinimized(false);
            setPos({ x: 0, y: 0 });
        }
    };

    if (isMinimized) {
        return (
            <div 
                className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[10000] touch-none"
                style={{ transform: `translate(calc(-50% + ${pos.x}px), ${pos.y}px)` }}
            >
                <div 
                    onPointerDown={onPD}
                    onPointerMove={onPM}
                    onPointerUp={onPU}
                    className="flex items-center gap-3 bg-black/90 backdrop-blur-md border border-white/10 px-5 py-3 rounded-2xl shadow-2xl active:scale-95 transition-all text-white select-none cursor-move"
                >
                    <div className="w-8 h-8 bg-green-500/20 rounded-xl flex items-center justify-center shrink-0">
                        <svg className="w-4 h-4 text-green-500 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div className="flex flex-col items-start pr-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-green-500">ถึงที่หมายแล้ว</span>
                        <span className="text-xs font-bold text-gray-300">ลากเพื่อย้าย • แตะเปิด</span>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="bg-black border border-white/10 rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-500 relative">
                <button 
                    onClick={() => setIsMinimized(true)}
                    className="absolute top-6 right-6 p-2 text-gray-500 hover:text-white transition-colors"
                >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                <div className="relative mb-8 mt-4">
                    <div className="w-24 h-24 bg-green-500/20 rounded-full flex items-center justify-center animate-pulse">
                        <svg className="w-12 h-12 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3.5" d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                    <div className="absolute -inset-2 border-2 border-green-500/30 rounded-full animate-ping duration-[3000ms]"></div>
                </div>

                <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-tight">ถึงจุดหมายแล้ว!</h2>
                <p className="text-gray-400 text-center text-sm font-medium leading-relaxed mb-10 px-4">
                    คุณมาถึงพิกัดที่ระบุเรียบร้อยแล้ว <br />
                    กรุณาตรวจสอบงานและกดปุ่มด้านล่างเพื่อไปต่อ
                </p>

                <button
                    onClick={onContinue}
                    className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-black py-5 px-8 rounded-2xl transition-all active:scale-95 shadow-lg shadow-blue-500/20 flex items-center justify-center gap-3 group"
                >
                    <span>ดำเนินการต่อ</span>
                    <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                </button>

                <button
                    onClick={onStop}
                    className="w-full mt-3 bg-white/5 hover:bg-white/10 text-gray-400 font-bold py-4 rounded-2xl transition-all active:scale-95"
                >
                    ปิดระบบนำทาง
                </button>
            </div>
        </div>
    );
}
