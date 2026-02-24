import React from 'react';
import { FiWifiOff } from 'react-icons/fi';

export default function OfflineWarning({ isNavigating }) {
    return (
        <div className={`fixed ${isNavigating ? 'top-4' : 'top-20'} left-1/2 -translate-x-1/2 z-[9999] w-[90%] max-w-sm animate-in fade-in slide-in-from-top duration-500`}>
            <div className="bg-red-600/95 backdrop-blur-xl border border-red-500/50 rounded-2xl p-4 shadow-2xl flex items-center gap-4">
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0">
                    <FiWifiOff className="w-6 h-6 text-white animate-pulse" />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-white font-black text-sm uppercase tracking-wider">ขาดการเชื่อมต่อ</div>
                    <div className="text-white/80 text-[10px] font-bold leading-tight mt-0.5">
                        ระบบจะไม่สามารถคำนวณเส้นทางใหม่ได้จนกว่าจะกลับมาออนไลน์
                    </div>
                </div>
                <div className="w-1.5 h-1.5 bg-white rounded-full animate-ping"></div>
            </div>
        </div>
    );
}
