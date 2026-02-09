import React from 'react';

export default function LoadingScreen() {
    return (
        <div className="fixed inset-0 bg-[#0A0A0B] flex flex-col items-center justify-center z-[9999]">
            <div className="relative">

                <div className="absolute inset-0 bg-blue-500/20 blur-[60px] animate-pulse"></div>

                <div className="relative flex flex-col items-center">

                    <div className="w-16 h-16 border-4 border-white/5 border-t-blue-500 rounded-full animate-spin mb-8"></div>

                    <div className="flex flex-col items-center gap-2">
                        <h2 className="text-white font-black text-xl uppercase tracking-[0.3em] ml-[0.3em]">OPTIMAP</h2>
                        <div className="flex items-center gap-2">
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-100"></div>
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-200"></div>
                            <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-bounce delay-300"></div>
                        </div>
                        <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-4">กำลังโหลดข้อมูล...</p>
                    </div>
                </div>
            </div>
        </div>
    );
}
