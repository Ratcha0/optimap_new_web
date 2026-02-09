import React from 'react';

export default function MapSelectionOverlay({ onConfirm, onCancel, message = "กรุณาเลือกตำแหน่งบนแผนที่" }) {
    return (
        <div className="absolute top-10 left-1/2 -translate-x-1/2 z-[2000] w-[calc(100%-3rem)] max-w-sm animate-in slide-in-from-top duration-500">
            <div className="bg-white/90 backdrop-blur-2xl p-5 rounded-[2rem] shadow-2xl border border-blue-500/30 flex flex-col gap-5">
                <div className="flex items-center gap-3 px-2">
                    <div className="w-10 h-10 bg-blue-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        </svg>
                    </div>
                    <div className="text-sm font-black text-gray-900 leading-tight tracking-tight">{message}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={onConfirm}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-500/20 transition-all active:scale-95"
                    >
                        ยืนยันตำแหน่ง
                    </button>
                    <button
                        onClick={onCancel}
                        className="bg-gray-100 hover:bg-gray-200 text-gray-400 font-bold py-4 rounded-xl transition-all active:scale-95"
                    >
                        ยกเลิก
                    </button>
                </div>
            </div>
        </div>
    );
}
