import React from 'react';

export default function ArrivalOverlay({ isVisible, onContinue }) {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black/80 z-[9999] flex items-center justify-center p-6 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="bg-black border border-white/10 rounded-[2.5rem] w-full max-w-sm p-8 shadow-2xl flex flex-col items-center animate-in zoom-in-95 duration-500">
                <div className="relative mb-8">
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
            </div>
        </div>
    );
}
